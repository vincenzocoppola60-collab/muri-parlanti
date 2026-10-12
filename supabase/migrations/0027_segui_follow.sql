-- ============================================================
-- Muri Parlanti — Follow di un collettivo (0027)
-- ============================================================
-- COSA FA
--   Crea la tabella public.follow: legame "utente segue un collettivo".
--
--   IMPORTANTE (decisione AG / membri):
--     * FOLLOWER = utente registrato che segue Ruina. NON e' un membro.
--     * MEMBRO  = chi condivide le credenziali dell'account del collettivo
--                 (owner_utente_id in public.collettivi). Non usa questa tabella.
--   Il follow e' "hard": richiede un account (solo authenticated).
--
-- RLS
--   Ogni utente vede/crea/cancella SOLO i propri follow.
--   Il numero di follower (per la pagina pubblica) passa dalla funzione
--   public.conta_follower(...) (security definer), non da un SELECT libero.
--
-- COME SI ESEGUE
--   Supabase -> SQL Editor -> incolla TUTTO -> Run
-- ============================================================

create table if not exists public.follow (
  utente_id     uuid not null references auth.users(id) on delete cascade,
  collettivo_id uuid not null references public.collettivi(id) on delete cascade,
  creato_il     timestamptz not null default now(),
  primary key (utente_id, collettivo_id)
);

comment on table public.follow is
  'Chi segue un collettivo (account che segue Ruina). NON sono i membri del collettivo.';
comment on column public.follow.utente_id is
  'Utente registrato che segue il collettivo.';
comment on column public.follow.collettivo_id is
  'Collettivo seguito (public.collettivi.id).';

alter table public.follow enable row level security;

drop policy if exists "follow_select_proprio" on public.follow;
create policy "follow_select_proprio"
  on public.follow for select
  to authenticated
  using (utente_id = auth.uid());

drop policy if exists "follow_insert_proprio" on public.follow;
create policy "follow_insert_proprio"
  on public.follow for insert
  to authenticated
  with check (utente_id = auth.uid());

drop policy if exists "follow_delete_proprio" on public.follow;
create policy "follow_delete_proprio"
  on public.follow for delete
  to authenticated
  using (utente_id = auth.uid());

grant usage on schema public to anon, authenticated;
grant select, insert, delete on public.follow to authenticated;

create index if not exists follow_collettivo_idx on public.follow (collettivo_id);

-- Numero di follower di un collettivo (leggibile da tutti, senza esporre gli id).
create or replace function public.conta_follower(p_collettivo uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int from public.follow where collettivo_id = p_collettivo;
$$;

-- I collettivi seguiti dall'utente collegato (per la sezione "Creator seguiti").
create or replace function public.collettivi_seguiti()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select collettivo_id from public.follow where utente_id = auth.uid();
$$;

grant execute on function public.conta_follower(uuid) to anon, authenticated;
grant execute on function public.collettivi_seguiti() to authenticated;

-- Verifica.
select public.conta_follower(id) as follower, slug, nome
from public.collettivi order by creato_il;
