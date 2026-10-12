-- ============================================================
-- Muri Parlanti — Collettivi / creator (0022)
-- ============================================================
-- COSA FA
--   Crea la tabella collettivi: un collettivo (es. RUINA) è gestito da UN
--   account condiviso ("CREATOR RUINA"). Il legame è owner_utente_id,
--   UNICO: 1 account ↔ 1 collettivo (decisione AG).
--
--   La "categoria" punta a categorie_creator (0021) e porta con sé l'emoji.
--
-- RLS
--   SELECT pubblico (tutti vedono i collettivi).
--   INSERT/UPDATE/DELETE solo admin (W1: solo l'admin crea i creator).
--   Le azioni sui MURI del collettivo sono regolate in 0025.
--
-- COME SI ESEGUE
--   Supabase → SQL Editor → incolla TUTTO → Run
--   https://supabase.com/dashboard/project/anhndzpiuaxmwwycmnxh/sql/new
-- ============================================================

create table if not exists public.collettivi (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique,                  -- es. 'ruina' (usato in /c/<slug>)
  nome             text not null,                         -- es. 'RUINA Collettivo'
  descrizione      text,
  categoria_id     uuid references public.categorie_creator(id) on delete set null,
  emoji            text,                                   -- emoji propria (di default quella della categoria)
  foto_url         text,
  owner_utente_id  uuid not null unique references auth.users(id) on delete restrict,
  attivo           boolean not null default true,
  creato_il        timestamptz not null default now()
);

comment on table public.collettivi is
  'Collettivi/creator (es. RUINA). Un account condiviso per collettivo (owner_utente_id).';
comment on column public.collettivi.owner_utente_id is
  'Account (condiviso dai membri) che gestisce i muri di questo collettivo. Unico: 1 account ↔ 1 collettivo.';
comment on column public.collettivi.slug is
  'Slug pubblico del collettivo: la pagina /c/<slug> è la destinazione del QR del manifesto.';

-- Vincolo sullo slug: minuscole, numeri, trattini (come i muri).
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'collettivi_slug_ck') then
    alter table public.collettivi
      add constraint collettivi_slug_ck check (slug ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$');
  end if;
end $$;

alter table public.collettivi enable row level security;

drop policy if exists "collettivi_select_pubblico" on public.collettivi;
create policy "collettivi_select_pubblico"
  on public.collettivi for select
  using (true);

drop policy if exists "collettivi_insert_admin" on public.collettivi;
create policy "collettivi_insert_admin"
  on public.collettivi for insert
  to authenticated
  with check (public.e_amministratore());

drop policy if exists "collettivi_update_admin" on public.collettivi;
create policy "collettivi_update_admin"
  on public.collettivi for update
  to authenticated
  using (public.e_amministratore())
  with check (public.e_amministratore());

drop policy if exists "collettivi_delete_admin" on public.collettivi;
create policy "collettivi_delete_admin"
  on public.collettivi for delete
  to authenticated
  using (public.e_amministratore());

grant usage on schema public to anon, authenticated;
grant select on public.collettivi to anon, authenticated;
grant insert, update, delete on public.collettivi to authenticated;

-- Verifica.
select slug, nome, owner_utente_id, attivo from public.collettivi order by creato_il;
