-- ============================================================
-- Muri Parlanti — Profili pubblici, avatar e post-it firmati (0005)
-- Esegui QUESTO script nell'SQL Editor del progetto Supabase:
--   https://supabase.com/dashboard/project/anhndzpiuaxmwwycmnxh/sql
--
-- Cosa fa:
--   1. Crea la tabella profili (nickname, bio, foto, privacy post-it).
--   2. Crea automaticamente il profilo a ogni nuova registrazione
--      (trigger) e lo crea anche per gli account gia' esistenti.
--   3. Collega i post-it all'account: colonna postit.user_id.
--      I post-it anonimi restano anonimi (user_id null).
--   4. Impedisce di firmare un post-it con l'id di un altro utente.
--   5. Crea il bucket di storage pubblico "avatar" (2MB, immagini),
--      scrivibile solo nella propria cartella <uid>/.
-- ============================================================

-- 1. Tabella profili: una riga per account, leggibile da tutti.
create table if not exists public.profili (
  id            uuid primary key references auth.users(id) on delete cascade,
  nickname      text not null default 'Anonimo' check (char_length(btrim(nickname)) between 1 and 30),
  bio           text check (char_length(bio) <= 200),
  foto_url      text,
  mostra_postit boolean not null default true,
  creato_il     timestamptz not null default now(),
  aggiornato_il timestamptz not null default now()
);

alter table public.profili enable row level security;

drop policy if exists "profili_select_pubblico" on public.profili;
create policy "profili_select_pubblico"
  on public.profili for select
  using (true);

drop policy if exists "profili_insert_own" on public.profili;
create policy "profili_insert_own"
  on public.profili for insert
  to authenticated
  with check (id = auth.uid());

drop policy if exists "profili_update_own" on public.profili;
create policy "profili_update_own"
  on public.profili for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

grant usage on schema public to anon, authenticated;
grant select on public.profili to anon, authenticated;
grant insert, update on public.profili to authenticated;

-- 2. Profilo creato automaticamente alla registrazione
--    (usa il nickname scelto in fase di iscrizione).
create or replace function public.crea_profilo_utente()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profili (id, nickname)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data->>'nickname'), ''), 'Anonimo')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.crea_profilo_utente();

-- Profili per gli account creati prima di questa migrazione.
insert into public.profili (id, nickname)
select u.id, coalesce(nullif(btrim(u.raw_user_meta_data->>'nickname'), ''), 'Anonimo')
from auth.users u
on conflict (id) do nothing;

-- 3. Post-it firmati dall'account (null = anonimo, come prima).
alter table public.postit add column if not exists user_id uuid
  references public.profili(id) on delete set null;

create index if not exists postit_user_id_creato_il_idx
  on public.postit (user_id, creato_il desc);

-- 4. Ognuno firma solo con il proprio id: l'anonimo non puo' spacciarsi
--    per un utente registrato, l'utente registrato non puo' spacciarsi per altri.
drop policy if exists "scrittura anonima sul muro" on public.postit;
drop policy if exists "pubblicazione con identita corretta" on public.postit;
create policy "pubblicazione con identita corretta"
  on public.postit for insert
  with check (user_id is null or user_id = auth.uid());

grant insert on public.postit to anon, authenticated;

-- 5. Bucket "avatar": lettura pubblica, scrittura solo nella propria cartella.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatar',
  'avatar',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = true,
      file_size_limit = 2097152,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "avatar_select_pubblico" on storage.objects;
create policy "avatar_select_pubblico"
  on storage.objects for select
  using (bucket_id = 'avatar');

drop policy if exists "avatar_insert_own" on storage.objects;
create policy "avatar_insert_own"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatar' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatar_update_own" on storage.objects;
create policy "avatar_update_own"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatar' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatar_delete_own" on storage.objects;
create policy "avatar_delete_own"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatar' and (storage.foldername(name))[1] = auth.uid()::text);
