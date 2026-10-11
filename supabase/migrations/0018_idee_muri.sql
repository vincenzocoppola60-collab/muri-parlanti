-- ============================================================
-- Muri Parlanti — Idee degli utenti: "Fonda un muro" (0018)
-- Esegui QUESTO script nell'SQL Editor del progetto Supabase:
--   https://supabase.com/dashboard/project/anhndzpiuaxmwwycmnxh/sql
--
-- COSA FA
--   Crea la tabella "idee_muri": le proposte inviate dagli utenti che pensano
--   che in un certo posto dovrebbe nascere un nuovo muro. Ognuna contiene UN
--   punto sulla mappa (lat/lng), la via ricavata da quel punto, il motivo
--   scritto dall'utente (almeno 10 parole) e uno stato per la moderazione.
--
--   Regole di accesso (RLS):
--     - CHIUNQUE (anche senza account) puo' INVIARE una proposta.
--     - Le proposte le legge SOLO l'amministratore (dati sensibili: la
--       posizione indicata e il pensiero di chi l'ha scritto).
--     - Solo l'amministratore puo' cambiare stato o cancellare una proposta.
--
--   E' idempotente: puoi rieseguirlo senza problemi.
-- ============================================================

-- 1) Tabella delle proposte.
create table if not exists public.idee_muri (
  id         uuid primary key default gen_random_uuid(),
  creato_il  timestamptz not null default now(),
  -- Chi l'ha proposta (null se anonimo).
  utente_id  uuid references auth.users(id) on delete set null,
  -- Il PUNTO indicato sulla mappa.
  lat        double precision not null,
  lng        double precision not null,
  -- Via/indirizzo ricavato dal punto (reverse geocoding). Puo' mancare.
  via        text,
  -- Il "perche'" scritto dall'utente (minimo 10 parole, controllato lato app
  -- e di nuovo qui sotto).
  motivo     text not null,
  -- Stato di moderazione: 'nuova' | 'approvata' | 'rifiutata'.
  stato      text not null default 'nuova'
);

comment on table public.idee_muri is
  'Proposte degli utenti su dove fondare un nuovo muro (sezione "Fonda un muro").';

-- 2) Vincoli di sanita' del dato: coordinate valide e motivo minimo.
--    Il minimo "10 parole" e' ricalcolato qui per non fidarsi del browser.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'idee_muri_lat_ck'
  ) then
    alter table public.idee_muri
      add constraint idee_muri_lat_ck check (lat between -90 and 90);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'idee_muri_lng_ck'
  ) then
    alter table public.idee_muri
      add constraint idee_muri_lng_ck check (lng between -180 and 180);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'idee_muri_stato_ck'
  ) then
    alter table public.idee_muri
      add constraint idee_muri_stato_ck
      check (stato in ('nuova', 'approvata', 'rifiutata'));
  end if;
end $$;

-- Funzione: conta le parole di un testo (per il vincolo delle 10 parole).
create or replace function public.conta_parole(p_testo text)
returns integer
language sql
immutable
as $$
  select coalesce(
    array_length(
      regexp_split_to_array(btrim(coalesce(p_testo, '')), '\s+'),
      1
    ),
    0
  )
  where btrim(coalesce(p_testo, '')) <> '';
$$;

-- Trigger: rifiuta un motivo con meno di 10 parole (marcatore "muri_idea:").
create or replace function public.idee_muri_valida()
returns trigger
language plpgsql
as $$
begin
  if public.conta_parole(new.motivo) < 10 then
    raise exception 'muri_idea:motivo_corto'
      using hint = 'Il perche'' deve avere almeno 10 parole.';
  end if;
  return new;
end;
$$;

drop trigger if exists idee_muri_valida_trg on public.idee_muri;
create trigger idee_muri_valida_trg
  before insert on public.idee_muri
  for each row execute function public.idee_muri_valida();

-- 3) RLS.
alter table public.idee_muri enable row level security;

-- Invio: chiunque (anonimo o utente collegato). Un utente collegato puo'
-- firmare solo a nome proprio; l'anonimo lascia utente_id null.
drop policy if exists "idee_muri_insert_chiunque" on public.idee_muri;
create policy "idee_muri_insert_chiunque"
  on public.idee_muri for insert
  to anon, authenticated
  with check (utente_id is null or utente_id = auth.uid());

-- Lettura: solo l'amministratore (vede posizioni e pensieri altrui).
drop policy if exists "idee_muri_select_admin" on public.idee_muri;
create policy "idee_muri_select_admin"
  on public.idee_muri for select
  to authenticated
  using (public.e_amministratore());

-- Aggiornamento stato: solo l'amministratore.
drop policy if exists "idee_muri_update_admin" on public.idee_muri;
create policy "idee_muri_update_admin"
  on public.idee_muri for update
  to authenticated
  using (public.e_amministratore())
  with check (public.e_amministratore());

-- Cancellazione: solo l'amministratore.
drop policy if exists "idee_muri_delete_admin" on public.idee_muri;
create policy "idee_muri_delete_admin"
  on public.idee_muri for delete
  to authenticated
  using (public.e_amministratore());

-- 4) Permessi a livello di tabella.
grant insert on public.idee_muri to anon, authenticated;
grant select, update, delete on public.idee_muri to authenticated;

-- 5) Verifica.
select id, creato_il, lat, lng, via, left(motivo, 40) as motivo, stato
from public.idee_muri
order by creato_il desc;
