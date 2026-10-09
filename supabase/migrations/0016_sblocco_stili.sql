-- ============================================================
-- Muri Parlanti — Sblocco stili per livello (0016)
-- Esegui QUESTO script nell'SQL Editor del progetto Supabase:
--   https://supabase.com/dashboard/project/anhndzpiuaxmwwycmnxh/sql
--
-- PERCHE' SERVE
--   Gli stili del post-it (1..16) si sbloccano salendo di livello: le prime
--   varianti sono subito disponibili, l'ultima (16) e' riservata al livello 7
--   ("Leggenda dei muri"). La regola e' scritta anche lato app
--   (lib/stili.ts), ma l'insert del post-it parte dal browser: senza un
--   controllo nel database chiunque potrebbe inviare `stile = 16` alla REST
--   di Supabase. Questo trigger e' la barriera autorevole.
--
--   Un insert con stile non consentito fallisce con un messaggio marcato
--   "muri_stile:bloccato"; l'app lo riconosce e lo mostra come avviso pulito.
--
--   L'AMMINISTRATORE non ha limiti (usa tutte le 16 varianti).
--   E' idempotente: puoi rieseguirlo senza problemi.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Livello minimo richiesto da ogni stile.
--    Allineato a lib/stili.ts (LIVELLO_MINIMO_STILE):
--      1-3 -> 1,  4-5 -> 2,  6-7 -> 3,  8-10 -> 4,
--      11-12 -> 5, 13-14 -> 6, 15-16 -> 7.
-- ------------------------------------------------------------
create or replace function public.stile_livello_minimo(p_stile smallint)
returns integer
language sql
immutable
as $$
  select case
    when p_stile is null then 1
    when p_stile between 1 and 3 then 1
    when p_stile between 4 and 5 then 2
    when p_stile between 6 and 7 then 3
    when p_stile between 8 and 10 then 4
    when p_stile between 11 and 12 then 5
    when p_stile between 13 and 14 then 6
    when p_stile between 15 and 16 then 7
    else 1
  end;
$$;

-- ------------------------------------------------------------
-- 2) Livello di un utente, dallo stesso totale XP dell'app:
--      somma di progresso_muri.xp
--      + bonus dei livelli gia' riscattati (bonus_livelli).
--    Soglie cumulative identiche a lib/livelli.ts.
--    SECURITY DEFINER: legge i progressi dell'utente pur essendo invocata
--    da un insert (che non ha visibilita' sulle righe altrui via RLS).
-- ------------------------------------------------------------
create or replace function public.livello_utente(p_utente uuid)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  tot integer := 0;
  lv integer := 1;
  r record;
begin
  if p_utente is null then
    return 1;
  end if;

  -- XP dai muri visitati / pensieri lasciati.
  if to_regclass('public.progresso_muri') is not null then
    select coalesce(sum(xp), 0)
      into tot
      from public.progresso_muri
     where utente_id = p_utente;
  end if;

  -- Bonus dei livelli gia' riscattati (i valori sono in lib/livelli.ts).
  if to_regclass('public.bonus_livelli') is not null then
    for r in
      select b.livello from public.bonus_livelli b where b.utente_id = p_utente
    loop
      tot := tot + case r.livello
        when 2 then 10
        when 3 then 15
        when 4 then 20
        when 5 then 30
        when 6 then 40
        when 7 then 60
        else 0
      end;
    end loop;
  end if;

  -- Soglie cumulative: il livello piu' alto con soglia <= totale.
  for r in
    select numero, soglia
      from (values
        (1, 0), (2, 20), (3, 45), (4, 80),
        (5, 130), (6, 200), (7, 320)
      ) as t(numero, soglia)
     order by soglia
  loop
    if tot >= r.soglia then
      lv := r.numero;
    end if;
  end loop;

  return lv;
end;
$$;

-- ------------------------------------------------------------
-- 3) Trigger di validazione dello stile sul post-it.
-- ------------------------------------------------------------
create or replace function public.postit_valida_stile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  lv integer;
  req integer;
begin
  -- Nessuno stile scelto: design classico, sempre lecito.
  if new.stile is null then
    return new;
  end if;

  -- Fuori dall'intervallo 1..16: valore non valido.
  if new.stile < 1 or new.stile > 16 then
    raise exception 'muri_stile:invalid' using errcode = 'check_violation';
  end if;

  -- Amministratore: nessun limite di livello.
  if new.user_id is not null
     and to_regclass('public.amministratori') is not null
  then
    if exists (select 1 from public.amministratori a where a.id = new.user_id) then
      return new;
    end if;
  end if;

  -- Un pensiero anonimo (senza account) non puo' avere stile.
  if new.user_id is null then
    raise exception 'muri_stile:bloccato' using errcode = 'check_violation';
  end if;

  -- Il livello dell'autore deve bastare per lo stile scelto.
  lv := public.livello_utente(new.user_id);
  req := public.stile_livello_minimo(new.stile);
  if lv < req then
    raise exception 'muri_stile:bloccato' using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists postit_valida_stile_trigger on public.postit;
create trigger postit_valida_stile_trigger
  before insert or update of stile on public.postit
  for each row execute function public.postit_valida_stile();

-- ------------------------------------------------------------
-- 4) Privilegi (lettura delle funzioni di comodo lato client).
-- ------------------------------------------------------------
grant execute on function public.stile_livello_minimo(smallint) to anon, authenticated;
grant execute on function public.livello_utente(uuid) to anon, authenticated;

-- ------------------------------------------------------------
-- 5) Verifiche
-- ------------------------------------------------------------
-- a) Le tre funzioni esistono.
-- b) Esempio: il tuo livello calcolato dal DB (sostituisci l'email).
select
  (select count(*) from pg_proc where proname in
     ('stile_livello_minimo', 'livello_utente', 'postit_valida_stile')) as funzioni_ok,
  (select count(*) from public.postit) as postit_totali;
