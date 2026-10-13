-- ============================================================
-- Muri Parlanti — Privacy dei post-it salvati (0031)
-- Esegui QUESTO script nell'SQL Editor del progetto Supabase:
--   https://supabase.com/dashboard/project/anhndzpiuaxmwwycmnxh/sql
--
-- Cosa fa:
--   1. Aggiunge profili.mostra_salvati: interruttore che decide se i
--      post-it salvati (tabella preferiti) compaiono nella bacheca
--      pubblica del profilo. Default true, come mostra_postit.
--
-- Nota sulle policy: la tabella public.preferiti resta leggibile SOLO dal
-- proprietario (policy "preferiti_select_own"). La lettura dei salvati di
-- un altro utente per il profilo pubblico avviene esclusivamente lato
-- server con la service role key (vedi lib/profiliServer.ts), quindi NON
-- serve allargare le policy RLS.
-- ============================================================

alter table public.profili
  add column if not exists mostra_salvati boolean not null default true;
