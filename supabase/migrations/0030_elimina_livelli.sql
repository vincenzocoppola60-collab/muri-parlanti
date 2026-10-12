-- ============================================================
-- Muri Parlanti — Eliminazione del sistema di livelli (0030)
-- Esegui QUESTO script nell'SQL Editor del progetto Supabase:
--   https://supabase.com/dashboard/project/anhndzpiuaxmwwycmnxh/sql
--
-- PERCHE' SERVE
--   La migrazione 0016 ha messo nel DATABASE la barriera che lega gli
--   stili del post-it al livello dell'utente: il trigger
--   `postit_valida_stile_trigger` rifiuta un insert con uno stile
--   superiore al livello di chi scrive (errore "muri_stile:bloccato").
--   Finche' quella barriera resta, sbloccare gli stili SOLO nell'app non
--   basta: il database continuerebbe a rifiutare le varianti 4..16 per
--   gli utenti di livello basso.
--
-- COSA FA
--   1) Sostituisce il trigger con un validatore senza livelli:
--      controllo di intervallo (1..16) + stili riservati a chi ha un
--      account (user_id non nullo).
--      => gli stili si sbloccano tutti insieme, ma solo per i loggati.
--         Gli ospiti vedono il menu ma ricevono l'errore muri_stile:bloccato.
--   2) Rimuove le funzioni del vecchio sistema (livello_utente,
--      stile_livello_minimo).
--   3) Rimuove la tabella bonus_livelli (bonus XP: non piu' usata).
--   NON tocca progresso_muri: resta per i conteggi (muri visitati /
--   pensieri lasciati), che non sono "livelli".
--
--   E' idempotente: puoi rieseguirlo senza problemi.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Nuovo validatore dello stile: SOLO intervallo 1..16.
--    (Sostituisce la versione della 0016 che confrontava il livello.)
-- ------------------------------------------------------------
create or replace function public.postit_valida_stile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Nessuno stile scelto: design classico, sempre lecito.
  if new.stile is null then
    return new;
  end if;

  -- Fuori dall'intervallo 1..16: valore non valido.
  if new.stile < 1 or new.stile > 16 then
    raise exception 'muri_stile:invalid' using errcode = 'check_violation';
  end if;

  -- ----------------------------------------------------------
  -- STILI RISERVATI A CHI HA UN ACCOUNT
  --   L'app mostra sempre il menu "Stile" nell'editor, ma applica la
  --   variante SOLO agli utenti loggati: agli ospiti spieghiamo di
  --   registrarsi. La stessa regola e' replicata lato DB perche' lo
  --   stile puo' essere inviato direttamente alla REST di Supabase
  --   senza passare dall'app.
  --   (Per rendere gli stili liberi anche agli anonimi, commenta le 3
  --   righe dell'if qui sotto.)
  -- ----------------------------------------------------------
  if new.user_id is null then
    raise exception 'muri_stile:bloccato' using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

-- Ricrea il trigger puntando al nuovo validatore.
drop trigger if exists postit_valida_stile_trigger on public.postit;
create trigger postit_valida_stile_trigger
  before insert or update of stile on public.postit
  for each row execute function public.postit_valida_stile();

-- ------------------------------------------------------------
-- 2) Funzioni del vecchio sistema di livelli: non piu' usate.
--    (Il trigger sopra non le chiama piu'.)
-- ------------------------------------------------------------
drop function if exists public.livello_utente(uuid);
drop function if exists public.stile_livello_minimo(smallint);

-- ------------------------------------------------------------
-- 3) Tabella bonus dei livelli: non piu' usata.
--    RIMUOVE anche i dati dei bonus gia' riscattati (non servono piu').
--    Se preferisci conservarli, commenta questa riga.
-- ------------------------------------------------------------
drop table if exists public.bonus_livelli;

-- ------------------------------------------------------------
-- 4) Verifiche
-- ------------------------------------------------------------
-- a) Il trigger esiste ancora (validatore minimo) e le funzioni vecchie no.
select
  (select count(*) from pg_proc where proname = 'postit_valida_stile') as validatore_ok,
  (select count(*) from pg_proc where proname in
     ('livello_utente', 'stile_livello_minimo')) as funzioni_vecchie_rimaste,
  (select count(*) from pg_trigger where tgname = 'postit_valida_stile_trigger') as trigger_ok;

-- b) Distribuzione degli stili in uso (controllo di sanita').
select stile, count(*)
from public.postit
group by stile
order by stile nulls first;
