-- ============================================================
-- Muri Parlanti — Pulizia bozze (vecchie strade di esempio)
-- Esegui QUESTO script nell'SQL Editor del progetto Supabase:
--   https://supabase.com/dashboard/project/anhndzpiuaxmwwycmnxh/sql
--
-- Cosa fa: rimuove dai progressi e dai preferiti di TUTTI gli utenti
-- i muri di prova creati prima della rimozione del registro fisso
-- (via-roma, via-napoli, piazza-garibaldi, lungomare).
-- Se non ci sono righe, non succede nulla: è sicuro da eseguire.
-- ============================================================

delete from public.progresso_muri
where luogo in ('via-roma', 'via-napoli', 'piazza-garibaldi', 'lungomare');

delete from public.preferiti
where luogo in ('via-roma', 'via-napoli', 'piazza-garibaldi', 'lungomare');
