-- ============================================================
-- Muri Parlanti — Evento con INIZIO/FINE + foto del collettivo (0029)
-- ============================================================
-- COSA FA
--   1. Aggiunge a public.muri i campi:
--        data_inizio → quando COMINCIA l'evento (data + ora);
--        data_fine   → quando FINISCE l'evento (data + ora).
--   2. Rende il muro NON scrivibile dopo la fine dell'evento: il trigger
--      sui post-it rifiuta l'insert se ora > data_fine, anche se lo stato
--      e' ancora 'aperto' (blocco reale lato database, non solo interfaccia).
--   3. Aggiunge public.chiudi_muri_evento_scaduti(): chiude in un colpo i
--      muri-evento il cui data_fine e' passato (chiamabile anche da anon,
--      e' idempotente e sicura).
--   4. Estende public.apri_muro_evento(...) per accettare inizio e fine.
--   5. Aggiunge public.aggiorna_foto_collettivo(p_url): permette all'account
--      del collettivo (owner) di cambiare la PROPRIA foto profilo, senza
--      dargli il permesso di modificare slug/nome o altri collettivi.
--
-- COME SI ESEGUE
--   Supabase -> SQL Editor -> incolla TUTTO -> Run
--   https://supabase.com/dashboard/project/anhndzpiuaxmwwycmnxh/sql/new
-- ============================================================

-- ---------------------------------------------------------------
-- 1) Colonne inizio/fine dell'evento.
-- ---------------------------------------------------------------
alter table public.muri add column if not exists data_inizio timestamptz;
alter table public.muri add column if not exists data_fine timestamptz;

comment on column public.muri.data_inizio is
  'Inizio dell''evento (data e ora). Facoltativo.';
comment on column public.muri.data_fine is
  'Fine dell''evento (data e ora). Dopo questo istante il muro non accetta piu'' pensieri, anche se lo stato e'' ancora aperto.';

-- La fine non puo' precedere l'inizio (quando entrambe sono indicate).
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'muri_finestra_evento_ck') then
    alter table public.muri
      add constraint muri_finestra_evento_ck
      check (data_inizio is null or data_fine is null or data_fine >= data_inizio);
  end if;
end $$;

-- ---------------------------------------------------------------
-- 2) Dati del muro di un post-it (aggiunge data_fine).
-- ---------------------------------------------------------------
-- Drop preventivo OBBLIGATORIO: questa versione cambia il tipo di
-- ritorno rispetto alla precedente (aggiunge data_inizio/data_fine),
-- quindi un semplice CREATE OR REPLACE fallirebbe con 42P13
-- ("cannot change return type of existing function").
drop function if exists public.muro_info(text);

create or replace function public.muro_info(p_slug text)
returns table (
  stato text,
  tipo text,
  collettivo_id uuid,
  data_inizio timestamptz,
  data_fine timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select m.stato, m.tipo, m.collettivo_id, m.data_inizio, m.data_fine
    from public.muri m
   where m.slug = p_slug;
$$;

-- ---------------------------------------------------------------
-- 3) Prima di scrivere un post-it: aggancia il muro e rifiuta se chiuso
--    O se l'evento e' finito (ora > data_fine).
-- ---------------------------------------------------------------
create or replace function public.postit_prepara()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug  text;
  v_info  record;
begin
  -- Riferimento vero al muro: se manca, lo deduciamo dal testo `luogo`.
  if new.muro_slug is null and new.luogo is not null then
    if exists (select 1 from public.muri m where m.slug = new.luogo) then
      new.muro_slug := new.luogo;
    end if;
  end if;

  v_slug := coalesce(new.muro_slug, new.luogo);

  if v_slug is not null then
    select * into v_info from public.muro_info(v_slug);
    if found then
      -- Muro chiuso = blocco reale (AE1).
      if v_info.stato = 'chiuso' then
        raise exception 'muri_muro_chiuso: questo muro e'' chiuso e non accetta nuovi pensieri'
          using errcode = 'P0001';
      end if;
      -- Evento terminato: da data_fine in poi il muro e' in sola lettura.
      if v_info.tipo = 'evento'
         and v_info.data_fine is not null
         and now() > v_info.data_fine then
        raise exception 'muri_evento_finito: l''evento e'' terminato e il muro non accetta piu'' pensieri'
          using errcode = 'P0001';
      end if;
      -- Sul MURO PRINCIPALE scrive solo il creator del collettivo (O1).
      if v_info.tipo = 'principale'
         and (auth.uid() is null or not public.e_organizzatore(v_info.collettivo_id)) then
        raise exception 'muri_solo_creator: sul muro principale scrive solo il creator'
          using errcode = 'P0001';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists postit_prepara_trg on public.postit;
create trigger postit_prepara_trg
  before insert or update of luogo, muro_slug on public.postit
  for each row execute function public.postit_prepara();

-- ---------------------------------------------------------------
-- 4) Chiude i muri-evento il cui data_fine e' passato (idempotente).
--    La si puo' chiamare dall'app quando si apre un muro o un profilo:
--    cosi' lo stato resta coerente anche senza un job pianificato.
-- ---------------------------------------------------------------
create or replace function public.chiudi_muri_evento_scaduti()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  with chiusi as (
    update public.muri
       set stato = 'chiuso'
     where tipo = 'evento'
       and stato = 'aperto'
       and data_fine is not null
       and data_fine < now()
    returning 1
  )
  select count(*) into n from chiusi;
  return n;
end;
$$;

-- ---------------------------------------------------------------
-- 5) Apri un muro-evento (con inizio e fine), chiudendo quello in corso.
-- ---------------------------------------------------------------
drop function if exists public.apri_muro_evento(uuid, text, text, timestamptz);

create or replace function public.apri_muro_evento(
  p_collettivo uuid,
  p_slug text,
  p_nome text,
  p_data_inizio timestamptz default null,
  p_data_fine timestamptz default null
)
returns public.muri
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nuovo public.muri;
begin
  if not public.e_organizzatore(p_collettivo) then
    raise exception 'solo l''organizzatore del collettivo puo'' aprire un muro'
      using errcode = 'P0001';
  end if;

  if p_data_inizio is not null and p_data_fine is not null
     and p_data_fine < p_data_inizio then
    raise exception 'la fine dell''evento non puo'' precedere l''inizio'
      using errcode = 'P0001';
  end if;

  -- Chiude l'eventuale muro-evento ancora aperto (AI1: uno solo alla volta).
  update public.muri
     set stato = 'chiuso'
   where collettivo_id = p_collettivo
     and tipo = 'evento'
     and stato = 'aperto';

  insert into public.muri (slug, nome, collettivo_id, tipo, stato, data_inizio, data_fine)
  values (p_slug, p_nome, p_collettivo, 'evento', 'aperto', p_data_inizio, p_data_fine)
  returning * into v_nuovo;

  return v_nuovo;
end;
$$;

-- ---------------------------------------------------------------
-- 6) L'account del collettivo cambia SOLO la propria foto profilo.
--    Restituisce la riga aggiornata; errore se l'account non ha un
--    collettivo (owner_utente_id unico, 0022).
-- ---------------------------------------------------------------
create or replace function public.aggiorna_foto_collettivo(p_url text)
returns public.collettivi
language plpgsql
security definer
set search_path = public
as $$
declare
  v public.collettivi;
begin
  if auth.uid() is null then
    raise exception 'accedi per cambiare la foto del collettivo'
      using errcode = 'P0001';
  end if;

  update public.collettivi
     set foto_url = p_url
   where owner_utente_id = auth.uid()
  returning * into v;

  if not found then
    raise exception 'nessun collettivo collegato a questo account'
      using errcode = 'P0001';
  end if;

  return v;
end;
$$;

grant execute on function public.muro_info(text) to anon, authenticated;
grant execute on function public.chiudi_muri_evento_scaduti() to anon, authenticated;
grant execute on function public.apri_muro_evento(uuid, text, text, timestamptz, timestamptz) to authenticated;
grant execute on function public.aggiorna_foto_collettivo(text) to authenticated;

-- Verifica.
select slug, nome, tipo, stato, data_inizio, data_fine from public.muri order by creato_il;
