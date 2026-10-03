-- ============================================================
-- Muri Parlanti — Amministratore unico + Muri geolocalizzati (0009)
-- Esegui QUESTO script nell'SQL Editor del progetto Supabase:
--   https://supabase.com/dashboard/project/anhndzpiuaxmwwycmnxh/sql
--
-- Cosa fa:
--   1. Crea la tabella "amministratori": l'elenco (di norma UNA persona)
--      che puo' creare e gestire i muri.
--   2. Funzione public.e_amministratore(): dice se chi chiama e' admin.
--   3. Aggiunge le coordinate GPS ai muri (lat, lng, raggio_m): servono
--      per il QR unico + geolocalizzazione.
--   4. Ristringe le policy della tabella muri: SOLO l'amministratore puo'
--      inserire, aggiornare o cancellare un muro. Chiunque puo' leggerli.
--   5. (Facoltativo) Permette all'amministratore di cancellare i post-it
--      dall'app; per tutti gli altri i pensieri restano non cancellabili.
--
--   ALLA FINE c'e' la riga per designarti amministratore: cambia l'email
--   con la TUA e togli il commento (leggi in fondo).
-- ============================================================

-- 1. Tabella amministratori: una riga per ogni persona autorizzata.
create table if not exists public.amministratori (
  id        uuid primary key references auth.users(id) on delete cascade,
  creato_il timestamptz not null default now()
);

alter table public.amministratori enable row level security;

-- Un admin puo' leggere la lista (serve alla pagina di controllo).
-- Nessuno puo' scrivere la lista dall'app: si gestisce solo da qui (SQL Editor).
drop policy if exists "amministratori_select_admin" on public.amministratori;
create policy "amministratori_select_admin"
  on public.amministratori for select
  to authenticated
  using (id = auth.uid());

grant usage on schema public to anon, authenticated;
grant select on public.amministratori to authenticated;

-- 2. Funzione di comodo: TRUE se chi sta chiamando e' amministratore.
create or replace function public.e_amministratore()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.amministratori a where a.id = auth.uid()
  );
$$;

-- 3. Coordinate GPS sui muri (per il QR unico).
alter table public.muri add column if not exists lat      double precision;
alter table public.muri add column if not exists lng      double precision;
alter table public.muri add column if not exists raggio_m integer not null default 200;

comment on column public.muri.lat is 'Latitudine del muro (GPS).';
comment on column public.muri.lng is 'Longitudine del muro (GPS).';
comment on column public.muri.raggio_m is 'Raggio in metri entro cui il QR unico riconosce questo muro.';

-- 4. RLS muri: scrive SOLO l'amministratore; tutti leggono.
--    (Sostituiscono le vecchie policy "muri_insert_autenticato"/"update".)
drop policy if exists "muri_insert_autenticato" on public.muri;
drop policy if exists "muri_update_autenticato" on public.muri;
drop policy if exists "muri_insert_admin" on public.muri;
create policy "muri_insert_admin"
  on public.muri for insert
  to authenticated
  with check (public.e_amministratore());

drop policy if exists "muri_update_admin" on public.muri;
create policy "muri_update_admin"
  on public.muri for update
  to authenticated
  using (public.e_amministratore())
  with check (public.e_amministratore());

drop policy if exists "muri_delete_admin" on public.muri;
create policy "muri_delete_admin"
  on public.muri for delete
  to authenticated
  using (public.e_amministratore());

-- 5. (Facoltativo) Solo l'amministratore puo' cancellare i post-it.
--    Utile per svuotare il muro dall'app. Per gli altri i pensieri
--    restano non modificabili e non cancellabili, come prima.
drop policy if exists "postit_delete_admin" on public.postit;
create policy "postit_delete_admin"
  on public.postit for delete
  to authenticated
  using (public.e_amministratore());

grant delete on public.postit to authenticated;

-- ============================================================
-- 6. DESIGNA IL TUO ACCOUNT COME AMMINISTRATORE.
--    Email gia' impostata: vincenzocoppola60@gmail.com
--    (designa l'account che ha QUESTA email; on conflict = idempotente)
-- ============================================================
insert into public.amministratori (id)
select id from auth.users where email = 'vincenzocoppola60@gmail.com'
on conflict (id) do nothing;

-- Verifica: deve elencare la tua email. Se non compare nulla, significa che
-- nessun account usa 'vincenzocoppola60@gmail.com': crea prima l'account
-- (Supabase -> Authentication -> Add user, oppure signup dall'app) e riesegui
-- SOLO il blocco insert qui sopra.
select a.id, u.email
from public.amministratori a
join auth.users u on u.id = a.id;
