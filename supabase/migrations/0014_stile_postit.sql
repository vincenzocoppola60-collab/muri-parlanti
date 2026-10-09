-- ============================================================
-- Muri Parlanti — Stile grafico del post-it (0014)
-- Esegui QUESTO script nell'SQL Editor del progetto Supabase:
--   https://supabase.com/dashboard/project/anhndzpiuaxmwwycmnxh/sql
--
-- Cosa fa:
--   Aggiunge la colonna facoltativa postit.stile: un numero (1..16) che
--   indica la variante grafica del post-it scelta dall'amministratore
--   (carta strappata, quadretti, righes, kraft, fumetto, ecc.).
--
--   Se la colonna e' NULL il pensiero viene mostrato con il design
--   classico (sfondo con immagine + nastro): nessuna rottura dei post-it
--   gia' pubblicati.
--
--   Nessuna modifica alle policy RLS: la colonna eredita i permessi della
--   tabella postit. L'app mostra il selettore "Stile" SOLO all'account
--   amministratore, ma il valore e' un semplice interruttore estetico: se
--   qualcuno lo forzasse non otterrebbe altro che un post-it con la grafica
--   scelta (nessun dato sensibile, nessun privilegio).
-- ============================================================

alter table public.postit add column if not exists stile smallint;

comment on column public.postit.stile is
  'Variante grafica del post-it (1..16). Null = design classico.';

-- Verifica: distribuzione degli stili in uso.
select stile, count(*)
from public.postit
group by stile
order by stile nulls first;
