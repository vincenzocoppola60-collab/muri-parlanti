-- ============================================================
-- Muri Parlanti — Muro chiuso = blocco reale + modello evento (0026)
-- ============================================================
-- COSA FA
--   1. Trigger su public.postit: quando si scrive un pensiero su un muro
--      CHIUSO, il database RIFIUTA l'insert (muro chiuso = blocco vero,
--      non solo un avviso nell'interfaccia). Decisione AE1.
--   2. Lo stesso trigger riempie postit.muro_slug da postit.luogo quando
--      il riferimento vero non e' ancora stato impostato (compatibilita').
--   3. Trigger su public.muri: il muro "principale" del creator NON puo'
--      mai essere chiuso (resta sempre aperto, decisione O1/AF1) e la data
--      di chiusura viene compilata/azzerata automaticamente.
--   4. Funzione public.apri_muro_evento(...): apre un nuovo muro-evento per
--      un collettivo CHIUDENDO prima quello eventualmente aperto (AI1:
--      il QR del collettivo punta sempre a UN solo muro in corso).
--
-- COME SI ESEGUE
--   Supabase -> SQL Editor -> incolla TUTTO -> Run
--   https://supabase.com/dashboard/project/anhndzpiuaxmwwycmnxh/sql/new
-- ============================================================

-- ---------------------------------------------------------------
-- 1) Il muro di un post-it: dati minimi (slug -> stato/collettivo/tipo).
-- ---------------------------------------------------------------
-- Drop preventivo: rende la migrazione ri-eseguibile anche se una
-- versione piu' recente di muro_info (con piu' colonne) e' gia' presente.
drop function if exists public.muro_info(text);

create or replace function public.muro_info(p_slug text)
returns table (stato text, tipo text, collettivo_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select m.stato, m.tipo, m.collettivo_id
    from public.muri m
   where m.slug = p_slug;
$$;

-- ---------------------------------------------------------------
-- 2) Prima di scrivere un post-it: aggancia il muro e rifiuta se chiuso.
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
-- 3) Il muro principale resta sempre aperto; la data di chiusura
--    segue lo stato del muro.
-- ---------------------------------------------------------------
create or replace function public.muri_coerenza_stato()
returns trigger
language plpgsql
as $$
begin
  if new.tipo = 'principale' then
    -- Il muro principale (bacheca del creator) non si chiude mai.
    new.stato := 'aperto';
    new.chiuso_il := null;
    return new;
  end if;

  if new.stato = 'chiuso' then
    if new.chiuso_il is null then
      new.chiuso_il := now();
    end if;
  else
    new.chiuso_il := null;
  end if;

  return new;
end;
$$;

drop trigger if exists muri_coerenza_stato_trg on public.muri;
create trigger muri_coerenza_stato_trg
  before insert or update of tipo, stato on public.muri
  for each row execute function public.muri_coerenza_stato();

-- ---------------------------------------------------------------
-- 4) Apri un muro-evento per un collettivo (chiudendo quello in corso).
--    Chiamabile dal browser SOLO dall'organizzatore di quel collettivo.
-- ---------------------------------------------------------------
create or replace function public.apri_muro_evento(
  p_collettivo uuid,
  p_slug text,
  p_nome text,
  p_data_evento timestamptz default null
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

  -- Chiude l'eventuale muro-evento ancora aperto (AI1: uno solo alla volta).
  update public.muri
     set stato = 'chiuso'
   where collettivo_id = p_collettivo
     and tipo = 'evento'
     and stato = 'aperto';

  insert into public.muri (slug, nome, collettivo_id, tipo, stato, data_evento)
  values (p_slug, p_nome, p_collettivo, 'evento', 'aperto', p_data_evento)
  returning * into v_nuovo;

  return v_nuovo;
end;
$$;

grant execute on function public.muro_info(text) to anon, authenticated;
grant execute on function public.apri_muro_evento(uuid, text, text, timestamptz) to authenticated;

-- Verifica: trigger e funzione presenti.
select tgname, tgrelid::regclass as tabella
from pg_trigger
where tgname in ('postit_prepara_trg', 'muri_coerenza_stato_trg')
order by tgname;
