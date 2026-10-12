-- ============================================================
-- Muri Parlanti — Categorie creator (0021)
-- ============================================================
-- COSA FA
--   1. Crea la tabella categorie_creator (lista fissa gestita dall'admin).
--   2. Inserisce le categorie seed (es. "creator eventi club" = 🕺).
--   3. RLS: SELECT pubblico (serve all'app per mostrare la lista),
--      INSERT/UPDATE/DELETE solo admin.
--
-- COME SI ESEGUE
--   Supabase → SQL Editor → incolla TUTTO → Run
--   https://supabase.com/dashboard/project/anhndzpiuaxmwwycmnxh/sql/new
-- ============================================================

-- 1) Tabella categorie_creator.
create table if not exists public.categorie_creator (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null unique,
  emoji      text not null,
  ordine     integer not null unique,  -- per ordinare la lista nell'app
  attivo     boolean not null default true,
  creato_il  timestamptz not null default now()
);

comment on table public.categorie_creator is
  'Categorie dei creator/collettivi (es. "creator eventi club"), gestite dall''admin.';

comment on column public.categorie_creator.emoji is
  'Emoji predefinita della categoria (usa per notifiche e UI).';

comment on column public.categorie_creator.ordine is
  'Ordine di visualizzazione nell''app (minore = prima).';

-- 2) RLS: tutti leggono, solo admin scrive.
alter table public.categorie_creator enable row level security;

drop policy if exists "categorie_creator_select_pubblico" on public.categorie_creator;
create policy "categorie_creator_select_pubblico"
  on public.categorie_creator for select
  using (true);

drop policy if exists "categorie_creator_insert_admin" on public.categorie_creator;
create policy "categorie_creator_insert_admin"
  on public.categorie_creator for insert
  to authenticated
  with check (public.e_amministratore());

drop policy if exists "categorie_creator_update_admin" on public.categorie_creator;
create policy "categorie_creator_update_admin"
  on public.categorie_creator for update
  to authenticated
  using (public.e_amministratore())
  with check (public.e_amministratore());

drop policy if exists "categorie_creator_delete_admin" on public.categorie_creator;
create policy "categorie_creator_delete_admin"
  on public.categorie_creator for delete
  to authenticated
  using (public.e_amministratore());

grant usage on schema public to anon, authenticated;
grant select on public.categorie_creator to anon, authenticated;
grant insert, update, delete on public.categorie_creator to authenticated;

-- 3) Seed: categorie iniziali.
--    (L'admin potrà aggiungerne/rimuoverne/modificarle dopo.)
insert into public.categorie_creator (nome, emoji, ordine) values
  ('creator eventi club', '🕺', 1),
  ('artista', '🎨', 2),
  ('associazione', '🤝', 3),
  ('musica dal vivo', '🎸', 4),
  ('arte urbana', '🖼️', 5)
on conflict (nome) do nothing;

-- 4) Verifica: deve risultare 5 righe.
select id, nome, emoji, ordine, attivo
from public.categorie_creator
order by ordine;
