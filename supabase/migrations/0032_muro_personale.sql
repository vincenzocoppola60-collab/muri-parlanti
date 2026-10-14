-- ============================================================
-- Muri Parlanti — Muro personale disegnato dall'utente (0032)
-- Esegui QUESTO script nell'SQL Editor del progetto Supabase:
--   https://supabase.com/dashboard/project/anhndzpiuaxmwwycmnxh/sql
--
-- Cosa fa:
--   1. Aggiunge a public.profili le due colonne del muro personale:
--        - muro_url          percorso dell'immagine nello storage (NON un URL
--                            pubblico: serve un URL firmato per aprirla);
--        - muro_aggiornato_il data dell'ultimo disegno salvato.
--   2. Crea il bucket di storage PRIVATO "muri-utente" (max 5MB, immagini).
--      Essendo privato (public = false) nessun file e' raggiungibile senza un
--      URL firmato: gli OSPITI (non registrati) non possono vedere i muri
--      personali degli altri, nemmeno conoscendo il percorso.
--   3. Policy di storage sul bucket:
--        - SELECT      -> solo utenti registrati. Serve per generare l'URL
--                         firmato quando un utente registrato visita il muro
--                         di un altro profilo (requisito: i visitatori vedono
--                         il muro dell'autore solo se hanno un account).
--        - INSERT/UPDATE/DELETE -> ognuno SOLO nella propria cartella <uid>/.
--
-- NB: non si tocca public.profili. La colonna muro_url contiene solo un
-- percorso interno, inutile senza URL firmato, quindi puo' restare leggibile.
-- ============================================================

-- 1. Colonne del muro personale.
alter table public.profili
  add column if not exists muro_url text;

alter table public.profili
  add column if not exists muro_aggiornato_il timestamptz;

-- 2. Bucket PRIVATO per i muri personali.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'muri-utente',
  'muri-utente',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = false,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- 3. Policy di storage sul bucket privato.
--    Lettura: solo account registrati (mai anon/ospiti).
drop policy if exists "muri-utente_select_registrati" on storage.objects;
create policy "muri-utente_select_registrati"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'muri-utente');

--    Scrittura: solo nella propria cartella <uid>/.
drop policy if exists "muri-utente_insert_own" on storage.objects;
create policy "muri-utente_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'muri-utente'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "muri-utente_update_own" on storage.objects;
create policy "muri-utente_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'muri-utente'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'muri-utente'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "muri-utente_delete_own" on storage.objects;
create policy "muri-utente_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'muri-utente'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
