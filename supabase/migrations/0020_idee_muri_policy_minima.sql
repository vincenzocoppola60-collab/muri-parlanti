-- ============================================================
-- Muri Parlanti — FIX MINIMO policy INSERT su idee_muri (0020)
-- ============================================================
-- Diagnosi CERTIFICATA sul database di produzione (11/10/2026):
--   * la tabella public.idee_muri esiste ed ha 2 righe
--   * RLS e' ATTIVA
--   * la funzione public.e_amministratore() ESISTE (0009 applicata)
--   * manca la POLICY DI INSERT -> insert anonimo E autenticato = errore 42501
--
-- Questo file fa SOLO cio' che manca. Eseguilo in:
--   Supabase -> SQL Editor -> New query -> incolla TUTTO -> Run
--   https://supabase.com/dashboard/project/anhndzpiuaxmwwycmnxh/sql/new
--
-- Se il "Run" mostra un errore, copiami IL TESTO DELL'ERRORE.
-- ============================================================

-- PASSO 0 — Fotografia di partenza: quali policy esistono ORA.
-- (deve risultare VUOTO se la policy di insert manca davvero)
select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'idee_muri'
order by cmd;

-- PASSO 1 — RLS attiva (se gia' attiva, non cambia nulla).
alter table public.idee_muri enable row level security;

-- PASSO 2 — LA POLICY CHE MANCA: chiunque puo' inviare una proposta.
drop policy if exists "idee_muri_insert_chiunque" on public.idee_muri;
create policy "idee_muri_insert_chiunque"
  on public.idee_muri
  for insert
  to anon, authenticated
  with check (utente_id is null or utente_id = auth.uid());

-- PASSO 3 — Permesso di scrittura ai ruoli dell'app.
grant usage on schema public to anon, authenticated;
grant insert on public.idee_muri to anon, authenticated;

-- PASSO 4 — Verifica finale: DEVE comparire UNA riga
--   policyname = idee_muri_insert_chiunque | cmd = INSERT | roles = {anon,authenticated}
select policyname, cmd, roles, with_check
from pg_policies
where schemaname = 'public' and tablename = 'idee_muri'
  and cmd = 'INSERT';