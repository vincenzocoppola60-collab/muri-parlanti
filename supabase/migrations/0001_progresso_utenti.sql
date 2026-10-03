-- ============================================================
-- Muri Parlanti — Account, progressi e livelli
-- Esegui QUESTO script nell'SQL Editor del progetto Supabase:
--   https://supabase.com/dashboard/project/anhndzpiuaxmwwycmnxh/sql
--
-- Cosa fa:
--   1. Crea la tabella progresso_muri (progressi per utente per muro).
--   2. Attiva Row Level Security e limita l'accesso al solo proprietario.
--   3. Concede i privilegi al ruolo authenticated.
-- ============================================================

-- 1. Tabella progresso per utente per muro.
--    xp = punti accumulati su QUESTO muro (incrementata al primo accesso).
--    Una riga sola per (utente, muro): il vincolo univoco evita doppioni.
create table if not exists public.progresso_muri (
  id           uuid primary key default gen_random_uuid(),
  utente_id    uuid not null references auth.users(id) on delete cascade,
  luogo        text not null,
  xp           integer not null default 0,
  pensieri     integer not null default 0,
  prima_visita timestamptz not null default now(),
  unique (utente_id, luogo)
);

-- 2. RLS: ogni utente vede e modifica solo i propri progressi.
alter table public.progresso_muri enable row level security;

drop policy if exists "progresso_muri_select_own" on public.progresso_muri;
create policy "progresso_muri_select_own"
  on public.progresso_muri
  for select
  using (auth.uid() = utente_id);

drop policy if exists "progresso_muri_insert_own" on public.progresso_muri;
create policy "progresso_muri_insert_own"
  on public.progresso_muri
  for insert
  with check (auth.uid() = utente_id);

drop policy if exists "progresso_muri_update_own" on public.progresso_muri;
create policy "progresso_muri_update_own"
  on public.progresso_muri
  for update
  using (auth.uid() = utente_id);

-- 3. Privilegi: solo il ruolo authenticated (utente loggato) accede.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.progresso_muri to authenticated;

-- ============================================================
-- NIENTE da aggiungere qui sotto.
-- Il nickname dell'utente vive nei metadati dell'account (user_metadata),
-- gestito automaticamente da Supabase Auth: nessuna tabella extra.
-- ============================================================
