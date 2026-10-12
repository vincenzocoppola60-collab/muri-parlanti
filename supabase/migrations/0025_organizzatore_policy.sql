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
