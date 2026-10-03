-- ============================================================
-- Muri Parlanti — Foto nei post-it (0008)
-- Esegui QUESTO script nell'SQL Editor del progetto Supabase:
--   https://supabase.com/dashboard/project/anhndzpiuaxmwwycmnxh/sql
--
-- Cosa fa:
--   1. Aggiunge la colonna postit.foto_url (facoltativa): l'URL pubblico
--      della foto allegata a un pensiero.
--   2. Crea il bucket di storage pubblico "foto-postit" (max 5MB, immagini).
--   3. Policy di storage: lettura pubblica; caricamento consentito sia agli
--      utenti registrati sia agli ospiti (anon), perche' anche chi lascia un
--      pensiero in anonimo puo' aggiungere una foto.
--
-- Dopo l'esecuzione i post-it con foto funzionano subito, senza ricompilare
-- l'app: l'APK carica sempre il sito in produzione.
-- ============================================================

-- 1. Colonna facoltativa sul post-it.
alter table public.postit add column if not exists foto_url text;

-- 2. Bucket di storage pubblico per le foto dei pensieri.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'foto-postit',
  'foto-postit',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = true,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- 3. Policy di storage: tutti possono vedere, chiunque scriva un pensiero
--    (anche in anonimo) puo' caricare una foto.
drop policy if exists "foto-postit_select" on storage.objects;
create policy "foto-postit_select"
  on storage.objects for select
  using (bucket_id = 'foto-postit');

drop policy if exists "foto-postit_insert" on storage.objects;
create policy "foto-postit_insert"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'foto-postit');
