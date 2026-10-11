-- ============================================================
-- Muri Parlanti — FIX "Fonda un muro": RLS su idee_muri (0019)
-- ============================================================
-- PERCHE' SERVE
--   In produzione l'insert su public.idee_muri falliva con
--     42501  new row violates row-level security policy for table "idee_muri"
--   sia per l'anonimo sia per l'utente collegato (riprodotto dall'app).
--   Causa: la tabella ha RLS ATTIVA ma la policy di INSERT non c'e' (o non
--   combacia). Risultato: nessuno puo' inviare una proposta e la festa
--   (cuori + trombette) non parte mai, perche' l'invio non va a buon fine.
--
-- COSA FA
--   Ricrea da zero, in modo IDEMPOTENTE, tutto quello che serve a idee_muri:
--   tabella, vincoli, funzione+trigger delle 10 parole, RLS e le 4 policy
--   (insert per chiunque, select/update/delete solo admin) e i grant.
--   Puoi eseguirlo piu' volte senza problemi.
--
-- COME SI ESEGUE
--   Supabase -> SQL Editor -> incolla TUTTO questo file -> Run.
--   https://supabase.com/dashboard/project/anhndzpiuaxmwwycmnxh/sql/new
-- ============================================================

-- 1) Tabella (se manca).
create table if not exists public.idee_muri (
  id         uuid primary key default gen_random_uuid(),
  creato_il  timestamptz not null default now(),
  utente_id  uuid references auth.users(id) on delete set null,
  lat        double precision not null,
  lng        double precision not null,
  via        text,
  motivo     text not null,
  stato      text not null default 'nuova'
);

comment on table public.idee_muri is
  'Proposte degli utenti su dove fondare un nuovo muro (sezione "Fonda un muro").';

-- 2) Vincoli di sanita' del dato (idempotenti).
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'idee_muri_lat_ck') then
    alter table public.idee_muri
      add constraint idee_muri_lat_ck check (lat between -90 and 90);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'idee_muri_lng_ck') then
    alter table public.idee_muri
      add constraint idee_muri_lng_ck check (lng between -180 and 180);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'idee_muri_stato_ck') then
    alter table public.idee_muri
      add constraint idee_muri_stato_ck
      check (stato in ('nuova', 'approvata', 'rifiutata'));
  end if;
end $$;

-- 3) Conta-parole + trigger "almeno 10 parole".
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

-- 4) RLS + policy.
alter table public.idee_muri enable row level security;

-- INVIO: chiunque (anonimo o collegato). Un collegato puo' firmare solo a
-- nome proprio; l'anonimo lascia utente_id null.
drop policy if exists "idee_muri_insert_chiunque" on public.idee_muri;
create policy "idee_muri_insert_chiunque"
  on public.idee_muri for insert
  to anon, authenticated
  with check (utente_id is null or utente_id = auth.uid());

-- LETTURA: solo l'amministratore.
drop policy if exists "idee_muri_select_admin" on public.idee_muri;
create policy "idee_muri_select_admin"
  on public.idee_muri for select
  to authenticated
  using (public.e_amministratore());

-- AGGIORNAMENTO stato: solo l'amministratore.
drop policy if exists "idee_muri_update_admin" on public.idee_muri;
create policy "idee_muri_update_admin"
  on public.idee_muri for update
  to authenticated
  using (public.e_amministratore())
  with check (public.e_amministratore());

-- CANCELLAZIONE: solo l'amministratore.
drop policy if exists "idee_muri_delete_admin" on public.idee_muri;
create policy "idee_muri_delete_admin"
  on public.idee_muri for delete
  to authenticated
  using (public.e_amministratore());

-- 5) Permessi a livello di schema/tabella.
grant usage on schema public to anon, authenticated;
grant insert on public.idee_muri to anon, authenticated;
grant select, update, delete on public.idee_muri to authenticated;

-- 6) Verifica: deve elencare le 4 policy appena ricreate.
select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'idee_muri'
order by cmd;