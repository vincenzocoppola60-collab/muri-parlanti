-- ============================================================
-- Muri Parlanti — APPLICAZIONE COLLETTIVI/CREATOR (0021-0029)
-- ============================================================
-- Incolla TUTTO questo file nel SQL Editor di Supabase e premi Run.
-- Contiene, in ordine: 0021, 0022, 0023, 0024, 0025, 0026, 0027, 0028, 0029.
-- Ogni sezione e' idempotente (si puo' rieseguire senza danni).
-- ============================================================

-- >>>>>>>>>> migrations/0021_categorie_creator.sql <<<<<<<<<<
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


-- >>>>>>>>>> migrations/0022_collettivi.sql <<<<<<<<<<
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


-- >>>>>>>>>> migrations/0023_muri_collettivo.sql <<<<<<<<<<
-- ============================================================
-- Muri Parlanti — Muri dei collettivi (0023)
-- ============================================================
-- COSA FA
--   Aggiunge a public.muri i campi del modello collettivo:
--     collettivo_id  → il collettivo a cui appartiene il muro (null = muro "classico").
--     tipo           → 'evento' (serata) | 'principale' (bacheca del creator).
--     stato          → 'aperto' | 'chiuso' (per i muri-evento; il principale è sempre aperto).
--     chiuso_il      → quando è stato chiuso.
--     data_evento    → data/ora della serata (per l'eventuale chiusura automatica).
--
--   Vincoli automatici:
--     * UN solo muro 'principale' per collettivo (indice unico parziale);
--     * AL MASSIMO un muro-evento 'aperto' per collettivo (indice unico parziale)
--       → è così che l'app trova "il muro in corso" senza ambiguità (AI1).
--
--   NB: i muri "classici" (senza collettivo) restano esattamente come prima:
--   tipo='evento' di default, ma collettivo_id null → nessun vincolo li tocca.
--
-- COME SI ESEGUE
--   Supabase → SQL Editor → incolla TUTTO → Run
-- ============================================================

alter table public.muri add column if not exists collettivo_id uuid
  references public.collettivi(id) on delete set null;
alter table public.muri add column if not exists tipo text not null default 'evento';
alter table public.muri add column if not exists stato text not null default 'aperto';
alter table public.muri add column if not exists chiuso_il timestamptz;
alter table public.muri add column if not exists data_evento timestamptz;
alter table public.muri add column if not exists dimensione integer;  -- grandezza post-it del creator (muro principale)

comment on column public.muri.tipo is
  'evento = muro di una serata; principale = bacheca/home del collettivo (sempre aperta).';
comment on column public.muri.stato is
  'aperto = si può ancora scrivere; chiuso = sola lettura (blocco reale via trigger su postit).';

-- Vincoli di dominio.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'muri_tipo_ck') then
    alter table public.muri
      add constraint muri_tipo_ck check (tipo in ('evento', 'principale'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'muri_stato_ck') then
    alter table public.muri
      add constraint muri_stato_ck check (stato in ('aperto', 'chiuso'));
  end if;
end $$;

-- Un solo muro 'principale' per collettivo.
create unique index if not exists muri_un_principale
  on public.muri (collettivo_id)
  where tipo = 'principale' and collettivo_id is not null;

-- Al massimo un muro-evento 'aperto' per collettivo (il "muro in corso").
create unique index if not exists muri_un_evento_aperto
  on public.muri (collettivo_id)
  where tipo = 'evento' and stato = 'aperto' and collettivo_id is not null;

create index if not exists muri_collettivo_idx on public.muri (collettivo_id);

-- Verifica.
select slug, nome, tipo, stato, collettivo_id from public.muri order by creato_il;


-- >>>>>>>>>> migrations/0024_postit_muro_fk.sql <<<<<<<<<<
-- ============================================================
-- Muri Parlanti — Legame post-it → muro (FK vera) (0024)
-- ============================================================
-- COSA FA
--   Oggi il post-it è legato al muro SOLO dal campo di testo postit.luogo.
--   Aggiungiamo postit.muro_slug con un RIFERIMENTO VERO a public.muri(slug),
--   riempito (backfill) dai valori già presenti in `luogo`.
--
--   Aggiungiamo anche postit.dimensione (grandezza scelta dal creator per i
--   post-it del muro principale).
--
--   `luogo` NON viene rimossa: resta come compatibilità durante la transizione
--   (l'app continuerà a scriverla insieme a muro_slug). Potrà essere lasciata
--   cadere in una migrazione futura, quando tutto il codice userà muro_slug.
--
-- COME SI ESEGUE
--   Supabase → SQL Editor → incolla TUTTO → Run
-- ============================================================

-- 1) Colonna con riferimento vero (ON DELETE SET NULL: se il muro sparisce,
--    i post-it non vengono cancellati a cascata).
alter table public.postit add column if not exists muro_slug text
  references public.muri(slug) on delete set null;

-- 2) Grandezza scelta dal creator (null = dimensione normale).
alter table public.postit add column if not exists dimensione integer;

comment on column public.postit.muro_slug is
  'Riferimento vero al muro (public.muri.slug). Sostituisce pian piano il testo `luogo`.';
comment on column public.postit.dimensione is
  'Grandezza di visualizzazione scelta dal creator (solo post-it del muro principale). null = normale.';

-- 3) Backfill: dove muro_slug è vuoto e `luogo` corrisponde a un muro esistente.
update public.postit p
   set muro_slug = p.luogo
 where p.muro_slug is null
   and p.luogo is not null
   and exists (select 1 from public.muri m where m.slug = p.luogo);

create index if not exists postit_muro_slug_idx on public.postit (muro_slug);

-- Verifica: quanti post-it hanno il riferimento vero.
select
  count(*) as totale,
  count(muro_slug) as con_riferimento,
  count(*) - count(muro_slug) as senza_riferimento
from public.postit;


-- >>>>>>>>>> migrations/0025_organizzatore_policy.sql <<<<<<<<<<
-- ============================================================
-- Muri Parlanti — Ruolo organizzatore + policy sui muri (0025)
-- ============================================================
-- COSA FA
--   1. Funzione public.e_organizzatore(collettivo): TRUE se chi chiama è
--      l'account proprietario di quel collettivo.
--   2. Funzione public.collettivo_del_muro(slug): il collettivo di un muro.
--   3. Policy su public.muri: le azioni di scrittura sono consentite
--      all'ADMIN **oppure** all'ORGANIZZATORE del collettivo di quel muro.
--      (Le vecchie policy *_admin restano: le policy permissive si sommano.)
--   4. Policy su public.postit: l'organizzatore può cancellare i post-it
--      dei muri del PROPRIO collettivo (M1).
--
-- PRINCIPIO
--   "Può gestire i muri chi è admin O organizzatore di quel collettivo."
--   RUINA gestisce RUINA e nient'altro.
--
-- COME SI ESEGUE
--   Supabase → SQL Editor → incolla TUTTO → Run
-- ============================================================

-- 1) Chi è l'organizzatore di un collettivo?
create or replace function public.e_organizzatore(p_collettivo uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.collettivi c
     where c.id = p_collettivo
       and c.owner_utente_id = auth.uid()
  );
$$;

-- 2) Il collettivo di un muro (usato dalle policy su postit).
create or replace function public.collettivo_del_muro(p_slug text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select m.collettivo_id from public.muri m where m.slug = p_slug;
$$;

-- 3) Policy muri: admin O organizzatore del collettivo della riga.
drop policy if exists "muri_insert_organizzatore" on public.muri;
create policy "muri_insert_organizzatore"
  on public.muri for insert
  to authenticated
  with check (
    collettivo_id is not null and public.e_organizzatore(collettivo_id)
  );

drop policy if exists "muri_update_organizzatore" on public.muri;
create policy "muri_update_organizzatore"
  on public.muri for update
  to authenticated
  using (
    collettivo_id is not null and public.e_organizzatore(collettivo_id)
  )
  with check (
    collettivo_id is not null and public.e_organizzatore(collettivo_id)
  );

drop policy if exists "muri_delete_organizzatore" on public.muri;
create policy "muri_delete_organizzatore"
  on public.muri for delete
  to authenticated
  using (
    collettivo_id is not null and public.e_organizzatore(collettivo_id)
  );

-- 4) Policy postit: l'organizzatore cancella i post-it dei muri del suo collettivo.
--    (La vecchia postit_delete_admin resta valida.)
drop policy if exists "postit_delete_organizzatore" on public.postit;
create policy "postit_delete_organizzatore"
  on public.postit for delete
  to authenticated
  using (
    public.e_organizzatore(
      public.collettivo_del_muro(coalesce(muro_slug, luogo))
    )
  );

-- Grant: l'organizzatore deve poter scrivere sui muri (delete compreso).
grant usage on schema public to anon, authenticated;
grant insert, update, delete on public.muri to authenticated;
grant delete on public.postit to authenticated;

-- Verifica: elenca le policy nuove.
select policyname, cmd, roles
from pg_policies
where schemaname = 'public' and tablename in ('muri', 'postit')
  and policyname like '%organizzatore%'
order by tablename, cmd;


-- >>>>>>>>>> migrations/0026_blocco_muro_chiuso.sql <<<<<<<<<<
-- ============================================================
-- Muri Parlanti — Muro chiuso = blocco reale + modello evento (0026)
-- ============================================================
-- COSA FA
--   1. Trigger su public.postit: quando si scrive un pensiero su un muro
--      CHIUSO, il database RIFIUTA l'insert (muro chiuso = blocco vero,
--      non solo un avviso nell'interfaccia). Decisione AE1.
--   2. Lo stesso trigger riempie postit.muro_slug da postit.luogo quando
--      il riferimento vero non e' ancora stato impostato (compatibilita').
--   3. Trigger su public.muri: il muro "principale" del creator NON puo'
--      mai essere chiuso (resta sempre aperto, decisione O1/AF1) e la data
--      di chiusura viene compilata/azzerata automaticamente.
--   4. Funzione public.apri_muro_evento(...): apre un nuovo muro-evento per
--      un collettivo CHIUDENDO prima quello eventualmente aperto (AI1:
--      il QR del collettivo punta sempre a UN solo muro in corso).
--
-- COME SI ESEGUE
--   Supabase -> SQL Editor -> incolla TUTTO -> Run
--   https://supabase.com/dashboard/project/anhndzpiuaxmwwycmnxh/sql/new
-- ============================================================

-- ---------------------------------------------------------------
-- 1) Il muro di un post-it: dati minimi (slug -> stato/collettivo/tipo).
-- ---------------------------------------------------------------
-- Drop preventivo: se la funzione esiste gia' con un tipo di ritorno
-- diverso (versione piu' vecchia), CREATE OR REPLACE fallirebbe (42P13).
drop function if exists public.muro_info(text);

create or replace function public.muro_info(p_slug text)
returns table (stato text, tipo text, collettivo_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select m.stato, m.tipo, m.collettivo_id
    from public.muri m
   where m.slug = p_slug;
$$;

-- ---------------------------------------------------------------
-- 2) Prima di scrivere un post-it: aggancia il muro e rifiuta se chiuso.
-- ---------------------------------------------------------------
create or replace function public.postit_prepara()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug  text;
  v_info  record;
begin
  -- Riferimento vero al muro: se manca, lo deduciamo dal testo `luogo`.
  if new.muro_slug is null and new.luogo is not null then
    if exists (select 1 from public.muri m where m.slug = new.luogo) then
      new.muro_slug := new.luogo;
    end if;
  end if;

  v_slug := coalesce(new.muro_slug, new.luogo);

  if v_slug is not null then
    select * into v_info from public.muro_info(v_slug);
    if found and v_info.stato = 'chiuso' then
      raise exception 'muri_muro_chiuso: questo muro e'' chiuso e non accetta nuovi pensieri'
        using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists postit_prepara_trg on public.postit;
create trigger postit_prepara_trg
  before insert or update of luogo, muro_slug on public.postit
  for each row execute function public.postit_prepara();

-- ---------------------------------------------------------------
-- 3) Il muro principale resta sempre aperto; la data di chiusura
--    segue lo stato del muro.
-- ---------------------------------------------------------------
create or replace function public.muri_coerenza_stato()
returns trigger
language plpgsql
as $$
begin
  if new.tipo = 'principale' then
    -- Il muro principale (bacheca del creator) non si chiude mai.
    new.stato := 'aperto';
    new.chiuso_il := null;
    return new;
  end if;

  if new.stato = 'chiuso' then
    if new.chiuso_il is null then
      new.chiuso_il := now();
    end if;
  else
    new.chiuso_il := null;
  end if;

  return new;
end;
$$;

drop trigger if exists muri_coerenza_stato_trg on public.muri;
create trigger muri_coerenza_stato_trg
  before insert or update of tipo, stato on public.muri
  for each row execute function public.muri_coerenza_stato();

-- ---------------------------------------------------------------
-- 4) Apri un muro-evento per un collettivo (chiudendo quello in corso).
--    Chiamabile dal browser SOLO dall'organizzatore di quel collettivo.
-- ---------------------------------------------------------------
create or replace function public.apri_muro_evento(
  p_collettivo uuid,
  p_slug text,
  p_nome text,
  p_data_evento timestamptz default null
)
returns public.muri
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nuovo public.muri;
begin
  if not public.e_organizzatore(p_collettivo) then
    raise exception 'solo l''organizzatore del collettivo puo'' aprire un muro'
      using errcode = 'P0001';
  end if;

  -- Chiude l'eventuale muro-evento ancora aperto (AI1: uno solo alla volta).
  update public.muri
     set stato = 'chiuso'
   where collettivo_id = p_collettivo
     and tipo = 'evento'
     and stato = 'aperto';

  insert into public.muri (slug, nome, collettivo_id, tipo, stato, data_evento)
  values (p_slug, p_nome, p_collettivo, 'evento', 'aperto', p_data_evento)
  returning * into v_nuovo;

  return v_nuovo;
end;
$$;

grant execute on function public.muro_info(text) to anon, authenticated;
grant execute on function public.apri_muro_evento(uuid, text, text, timestamptz) to authenticated;

-- Verifica: trigger e funzione presenti.
select tgname, tgrelid::regclass as tabella
from pg_trigger
where tgname in ('postit_prepara_trg', 'muri_coerenza_stato_trg')
order by tgname;


-- >>>>>>>>>> migrations/0027_segui_follow.sql <<<<<<<<<<
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


-- >>>>>>>>>> migrations/0028_notifiche.sql <<<<<<<<<<
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




-- >>>>>>>>>> migrations/0029_evento_inizio_fine.sql <<<<<<<<<<
-- ============================================================
-- Muri Parlanti — Evento con INIZIO/FINE + foto del collettivo (0029)
-- ============================================================
-- COSA FA
--   1. Aggiunge a public.muri i campi:
--        data_inizio → quando COMINCIA l'evento (data + ora);
--        data_fine   → quando FINISCE l'evento (data + ora).
--   2. Rende il muro NON scrivibile dopo la fine dell'evento: il trigger
--      sui post-it rifiuta l'insert se ora > data_fine, anche se lo stato
--      e' ancora 'aperto' (blocco reale lato database, non solo interfaccia).
--   3. Aggiunge public.chiudi_muri_evento_scaduti(): chiude in un colpo i
--      muri-evento il cui data_fine e' passato (chiamabile anche da anon,
--      e' idempotente e sicura).
--   4. Estende public.apri_muro_evento(...) per accettare inizio e fine.
--   5. Aggiunge public.aggiorna_foto_collettivo(p_url): permette all'account
--      del collettivo (owner) di cambiare la PROPRIA foto profilo, senza
--      dargli il permesso di modificare slug/nome o altri collettivi.
--
-- COME SI ESEGUE
--   Supabase -> SQL Editor -> incolla TUTTO -> Run
--   https://supabase.com/dashboard/project/anhndzpiuaxmwwycmnxh/sql/new
-- ============================================================

-- ---------------------------------------------------------------
-- 1) Colonne inizio/fine dell'evento.
-- ---------------------------------------------------------------
alter table public.muri add column if not exists data_inizio timestamptz;
alter table public.muri add column if not exists data_fine timestamptz;

comment on column public.muri.data_inizio is
  'Inizio dell''evento (data e ora). Facoltativo.';
comment on column public.muri.data_fine is
  'Fine dell''evento (data e ora). Dopo questo istante il muro non accetta piu'' pensieri, anche se lo stato e'' ancora aperto.';

-- La fine non puo' precedere l'inizio (quando entrambe sono indicate).
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'muri_finestra_evento_ck') then
    alter table public.muri
      add constraint muri_finestra_evento_ck
      check (data_inizio is null or data_fine is null or data_fine >= data_inizio);
  end if;
end $$;

-- ---------------------------------------------------------------
-- 2) Dati del muro di un post-it (aggiunge data_fine).
-- ---------------------------------------------------------------
-- Drop preventivo: cambia il tipo di ritorno (aggiunge data_inizio/
-- data_fine), quindi CREATE OR REPLACE da solo non basta (42P13).
drop function if exists public.muro_info(text);

create or replace function public.muro_info(p_slug text)
returns table (
  stato text,
  tipo text,
  collettivo_id uuid,
  data_inizio timestamptz,
  data_fine timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select m.stato, m.tipo, m.collettivo_id, m.data_inizio, m.data_fine
    from public.muri m
   where m.slug = p_slug;
$$;

-- ---------------------------------------------------------------
-- 3) Prima di scrivere un post-it: aggancia il muro e rifiuta se chiuso
--    O se l'evento e' finito (ora > data_fine).
-- ---------------------------------------------------------------
create or replace function public.postit_prepara()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug  text;
  v_info  record;
begin
  -- Riferimento vero al muro: se manca, lo deduciamo dal testo `luogo`.
  if new.muro_slug is null and new.luogo is not null then
    if exists (select 1 from public.muri m where m.slug = new.luogo) then
      new.muro_slug := new.luogo;
    end if;
  end if;

  v_slug := coalesce(new.muro_slug, new.luogo);

  if v_slug is not null then
    select * into v_info from public.muro_info(v_slug);
    if found then
      -- Muro chiuso = blocco reale (AE1).
      if v_info.stato = 'chiuso' then
        raise exception 'muri_muro_chiuso: questo muro e'' chiuso e non accetta nuovi pensieri'
          using errcode = 'P0001';
      end if;
      -- Evento terminato: da data_fine in poi il muro e' in sola lettura.
      if v_info.tipo = 'evento'
         and v_info.data_fine is not null
         and now() > v_info.data_fine then
        raise exception 'muri_evento_finito: l''evento e'' terminato e il muro non accetta piu'' pensieri'
          using errcode = 'P0001';
      end if;
      -- Sul MURO PRINCIPALE scrive solo il creator del collettivo (O1).
      if v_info.tipo = 'principale'
         and (auth.uid() is null or not public.e_organizzatore(v_info.collettivo_id)) then
        raise exception 'muri_solo_creator: sul muro principale scrive solo il creator'
          using errcode = 'P0001';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists postit_prepara_trg on public.postit;
create trigger postit_prepara_trg
  before insert or update of luogo, muro_slug on public.postit
  for each row execute function public.postit_prepara();

-- ---------------------------------------------------------------
-- 4) Chiude i muri-evento il cui data_fine e' passato (idempotente).
--    La si puo' chiamare dall'app quando si apre un muro o un profilo:
--    cosi' lo stato resta coerente anche senza un job pianificato.
-- ---------------------------------------------------------------
create or replace function public.chiudi_muri_evento_scaduti()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  with chiusi as (
    update public.muri
       set stato = 'chiuso'
     where tipo = 'evento'
       and stato = 'aperto'
       and data_fine is not null
       and data_fine < now()
    returning 1
  )
  select count(*) into n from chiusi;
  return n;
end;
$$;

-- ---------------------------------------------------------------
-- 5) Apri un muro-evento (con inizio e fine), chiudendo quello in corso.
-- ---------------------------------------------------------------
drop function if exists public.apri_muro_evento(uuid, text, text, timestamptz);

create or replace function public.apri_muro_evento(
  p_collettivo uuid,
  p_slug text,
  p_nome text,
  p_data_inizio timestamptz default null,
  p_data_fine timestamptz default null
)
returns public.muri
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nuovo public.muri;
begin
  if not public.e_organizzatore(p_collettivo) then
    raise exception 'solo l''organizzatore del collettivo puo'' aprire un muro'
      using errcode = 'P0001';
  end if;

  if p_data_inizio is not null and p_data_fine is not null
     and p_data_fine < p_data_inizio then
    raise exception 'la fine dell''evento non puo'' precedere l''inizio'
      using errcode = 'P0001';
  end if;

  -- Chiude l'eventuale muro-evento ancora aperto (AI1: uno solo alla volta).
  update public.muri
     set stato = 'chiuso'
   where collettivo_id = p_collettivo
     and tipo = 'evento'
     and stato = 'aperto';

  insert into public.muri (slug, nome, collettivo_id, tipo, stato, data_inizio, data_fine)
  values (p_slug, p_nome, p_collettivo, 'evento', 'aperto', p_data_inizio, p_data_fine)
  returning * into v_nuovo;

  return v_nuovo;
end;
$$;

-- ---------------------------------------------------------------
-- 6) L'account del collettivo cambia SOLO la propria foto profilo.
--    Restituisce la riga aggiornata; errore se l'account non ha un
--    collettivo (owner_utente_id unico, 0022).
-- ---------------------------------------------------------------
create or replace function public.aggiorna_foto_collettivo(p_url text)
returns public.collettivi
language plpgsql
security definer
set search_path = public
as $$
declare
  v public.collettivi;
begin
  if auth.uid() is null then
    raise exception 'accedi per cambiare la foto del collettivo'
      using errcode = 'P0001';
  end if;

  update public.collettivi
     set foto_url = p_url
   where owner_utente_id = auth.uid()
  returning * into v;

  if not found then
    raise exception 'nessun collettivo collegato a questo account'
      using errcode = 'P0001';
  end if;

  return v;
end;
$$;

grant execute on function public.muro_info(text) to anon, authenticated;
grant execute on function public.chiudi_muri_evento_scaduti() to anon, authenticated;
grant execute on function public.apri_muro_evento(uuid, text, text, timestamptz, timestamptz) to authenticated;
grant execute on function public.aggiorna_foto_collettivo(text) to authenticated;

-- Verifica.
select slug, nome, tipo, stato, data_inizio, data_fine from public.muri order by creato_il;
