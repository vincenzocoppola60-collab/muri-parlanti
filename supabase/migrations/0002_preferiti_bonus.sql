-- ============================================================
-- Muri Parlanti — Preferiti e bonus di livello
-- Esegui QUESTO script nell'SQL Editor del progetto Supabase:
--   https://supabase.com/dashboard/project/anhndzpiuaxmwwycmnxh/sql
--
-- Cosa fa:
--   1. Crea la tabella preferiti (post-it salvati dall'utente).
--   2. Crea la tabella bonus_livelli (bonus punti assegnati a ogni livello).
--   3. Attiva Row Level Security e concede i privilegi ad authenticated.
-- ============================================================

-- 1. Preferiti: snapshot del post-it (testo/nickname copiati, così
--    il preferito resta anche se il post-it originale viene rimosso).
create table if not exists public.preferiti (
  id         uuid primary key default gen_random_uuid(),
  utente_id  uuid not null references auth.users(id) on delete cascade,
  postit_id  uuid not null,
  luogo      text not null,
  testo      text not null,
  nickname   text not null,
  creato_il  timestamptz not null default now(),
  unique (utente_id, postit_id)
);

alter table public.preferiti enable row level security;

drop policy if exists "preferiti_select_own" on public.preferiti;
create policy "preferiti_select_own"
  on public.preferiti for select
  using (auth.uid() = utente_id);

drop policy if exists "preferiti_insert_own" on public.preferiti;
create policy "preferiti_insert_own"
  on public.preferiti for insert
  with check (auth.uid() = utente_id);

drop policy if exists "preferiti_delete_own" on public.preferiti;
create policy "preferiti_delete_own"
  on public.preferiti for delete
  using (auth.uid() = utente_id);

-- 2. Bonus di livello: una riga per ogni livello il cui bonus è stato
--    assegnato (assegnazione automatica lato app, idempotente).
create table if not exists public.bonus_livelli (
  utente_id    uuid not null references auth.users(id) on delete cascade,
  livello      integer not null,
  riscattato_il timestamptz not null default now(),
  primary key (utente_id, livello)
);

alter table public.bonus_livelli enable row level security;

drop policy if exists "bonus_livelli_select_own" on public.bonus_livelli;
create policy "bonus_livelli_select_own"
  on public.bonus_livelli for select
  using (auth.uid() = utente_id);

drop policy if exists "bonus_livelli_insert_own" on public.bonus_livelli;
create policy "bonus_livelli_insert_own"
  on public.bonus_livelli for insert
  with check (auth.uid() = utente_id);

-- 3. Privilegi: solo utenti loggati.
grant usage on schema public to anon, authenticated;
grant select, insert, delete on public.preferiti to authenticated;
grant select, insert on public.bonus_livelli to authenticated;
