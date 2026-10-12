-- ============================================================
-- Muri Parlanti — Notifiche ai follower (0028)
-- ============================================================
-- COSA FA
--   Crea la tabella public.notifiche e il "fan-out": quando il creator
--   pubblica un nuovo post-it sul MURO PRINCIPALE del collettivo, il
--   database crea UNA notifica per OGNI follower di quel collettivo
--   (decisione: i follower ricevono notifiche quando il creator pubblica).
--
--   Il fan-out avviene via trigger AFTER INSERT su public.postit, solo per i
--   muri di tipo 'principale' dei collettivi. I post-it sui muri-evento o sui
--   muri classici NON generano notifiche.
--
-- RLS
--   Ogni utente vede/segna-lette/cancella SOLO le proprie notifiche.
--   L'insert avviene solo dal trigger (funzione security definer): nessun
--   utente puo' creare notifiche a mano.
--
-- COME SI ESEGUE
--   Supabase -> SQL Editor -> incolla TUTTO -> Run
-- ============================================================

create table if not exists public.notifiche (
  id            uuid primary key default gen_random_uuid(),
  utente_id     uuid not null references auth.users(id) on delete cascade,   -- destinatario
  tipo          text not null default 'nuovo_postit',
  collettivo_id uuid references public.collettivi(id) on delete set null,
  muro_slug     text,
  postit_id     uuid references public.postit(id) on delete cascade,
  titolo        text not null,
  testo         text,
  letta         boolean not null default false,
  creato_il     timestamptz not null default now()
);

comment on table public.notifiche is
  'Notifiche in-app. Nascono dal trigger di fan-out: quando un creator pubblica sul muro principale, i follower ricevono una notifica.';

alter table public.notifiche enable row level security;

drop policy if exists "notifiche_select_proprio" on public.notifiche;
create policy "notifiche_select_proprio"
  on public.notifiche for select
  to authenticated
  using (utente_id = auth.uid());

drop policy if exists "notifiche_update_proprio" on public.notifiche;
create policy "notifiche_update_proprio"
  on public.notifiche for update
  to authenticated
  using (utente_id = auth.uid())
  with check (utente_id = auth.uid());

drop policy if exists "notifiche_delete_proprio" on public.notifiche;
create policy "notifiche_delete_proprio"
  on public.notifiche for delete
  to authenticated
  using (utente_id = auth.uid());

grant usage on schema public to anon, authenticated;
grant select, update, delete on public.notifiche to authenticated;

create index if not exists notifiche_utente_idx
  on public.notifiche (utente_id, creato_il desc);

-- ---------------------------------------------------------------
-- Fan-out: nuovo post-it sul muro principale -> notifica ai follower.
-- ---------------------------------------------------------------
create or replace function public.notifica_follower()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_collettivo uuid;
  v_tipo       text;
  v_nome       text;
  v_slug       text;
begin
  v_slug := coalesce(new.muro_slug, new.luogo);
  if v_slug is null then
    return new;
  end if;

  select m.collettivo_id, m.tipo
    into v_collettivo, v_tipo
    from public.muri m
   where m.slug = v_slug;

  -- Solo il muro principale di un collettivo genera notifiche.
  if v_collettivo is null or v_tipo <> 'principale' then
    return new;
  end if;

  select nome into v_nome from public.collettivi where id = v_collettivo;

  insert into public.notifiche
    (utente_id, tipo, collettivo_id, muro_slug, postit_id, titolo, testo)
  select
    f.utente_id,
    'nuovo_postit',
    v_collettivo,
    v_slug,
    new.id,
    coalesce(v_nome, 'Collettivo') || ' ha pubblicato un nuovo pensiero',
    left(coalesce(new.testo, ''), 140)
  from public.follow f
  where f.collettivo_id = v_collettivo;

  return new;
end;
$$;

drop trigger if exists notifica_follower_trg on public.postit;
create trigger notifica_follower_trg
  after insert on public.postit
  for each row execute function public.notifica_follower();

-- Verifica.
select count(*) as notifiche_totali from public.notifiche;
