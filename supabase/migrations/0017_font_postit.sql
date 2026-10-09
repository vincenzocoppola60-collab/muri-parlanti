-- ============================================================
-- Muri Parlanti — Font del post-it (0017)
-- Esegui QUESTO script nell'SQL Editor del progetto Supabase:
--   https://supabase.com/dashboard/project/anhndzpiuaxmwwycmnxh/sql
--
-- PERCHE' SERVE
--   Aggiunge la colonna `font` (varchar) alla tabella `postit`, per salvare
--   il font scelto dall'utente (uno dei font OFL, categoria a mano/scrittura/graffiti).
--   Il font e' parte
--   dell'identita' visiva del pensiero, come lo stile grafico.
--
--   La colonna e' nullable: i post-it vecchi (o quelli senza scelta) restano
--   con il font di default (Caveat).
--
--   E' idempotente: puoi rieseguirlo senza problemi.
-- ============================================================

alter table public.postit add column if not exists font varchar(50);

-- Verifica
select
  (select count(*) from information_schema.columns
   where table_name = 'postit' and column_name = 'font') as colonna_ok,
  (select count(*) from public.postit) as postit_totali;
