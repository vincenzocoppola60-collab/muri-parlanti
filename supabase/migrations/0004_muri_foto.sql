-- ============================================================
-- Muri Parlanti — Foto dei muri (0004)
-- Esegui QUESTO script nell'SQL Editor del progetto Supabase:
--   https://supabase.com/dashboard/project/anhndzpiuaxmwwycmnxh/sql
--
-- Cosa fa:
--   1. Crea la tabella muri (slug, nome, foto_url): la foto del muro
--      esatto mostrata a chi scansiona il QR.
--   2. RLS: tutti possono leggere, solo utenti loggati possono
--      aggiungere/aggiornare la foto.
--   3. Crea il bucket di storage pubblico "foto-muri" (max 5MB, immagini).
--   4. Registra il primo muro reale: Parco Cerillo.
-- ============================================================

-- 1. Tabella muri: una riga per muro reale con la sua foto.
create table if not exists public.muri (
  slug          text primary key,
  nome          text not null,
  foto_url      text,
  creato_il    timestamptz not null default now(),
  aggiornato_il timestamptz not null default now()
);

alter table public.muri enable row level security;

drop policy if exists "muri_select_pubblico" on public.muri;
create policy "muri_select_pubblico"
  on public.muri for select
  using (true);

drop policy if exists "muri_insert_autenticato" on public.muri;
create policy "muri_insert_autenticato"
  on public.muri for insert
  to authenticated
  with check (true);

drop policy if exists "muri_update_autenticato" on public.muri;
create policy "muri_update_autenticato"
  on public.muri for update
  to authenticated
  using (true);

grant usage on schema public to anon, authenticated;
grant select on public.muri to anon, authenticated;
grant insert, update on public.muri to authenticated;

-- 2. Bucket di storage pubblico per le foto dei muri.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'foto-muri',
  'foto-muri',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists "foto-muri_select" on storage.objects;
create policy "foto-muri_select"
  on storage.objects for select
  using (bucket_id = 'foto-muri');

drop policy if exists "foto-muri_insert" on storage.objects;
create policy "foto-muri_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'foto-muri');

drop policy if exists "foto-muri_update" on storage.objects;
create policy "foto-muri_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'foto-muri');

-- 3. Primo muro reale: Parco Cerillo (la foto si carica dall'app).
insert into public.muri (slug, nome)
values ('parco-cerillo', 'Parco Cerillo')
on conflict (slug) do nothing;
