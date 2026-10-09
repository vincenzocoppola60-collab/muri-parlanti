-- ============================================================
-- Muri Parlanti — FIX del trigger moderazione + colonna stile (0015)
-- Esegui QUESTO script nell'SQL Editor del progetto Supabase:
--   https://supabase.com/dashboard/project/anhndzpiuaxmwwycmnxh/sql
--
-- PERCHE' SERVE (bug bloccante)
--   La migrazione 0013 dichiarava `parolacce text[] := array[];`.
--   Un array vuoto senza cast (`array[]`) non ha tipo: PostgreSQL solleva
--   42P18 "cannot determine type of empty array" appena entra nella funzione.
--   Essendo il trigger BEFORE INSERT, OGNI pubblicazione di un post-it
--   falliva, e il sito mostrava:
--     "Non sono riuscito ad attaccare il Post-it. Riprova."
--
--   Questo script sostituisce la funzione con la versione corretta
--   (`array[]::text[]`) e, insieme, aggiunge la colonna postit.stile
--   (migrazione 0014) cosi' la scelta della grafica del post-it viene salvata.
--
--   E' idempotente: puoi rieseguirlo senza problemi.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Helper di normalizzazione (identici a 0013, ricreati per sicurezza)
-- ------------------------------------------------------------
create or replace function public.muri_sbase(t text)
returns text
language sql
immutable
as $$
  select translate(
    lower(coalesce(t, '')),
    'àáâãäåèéêëìíîïòóôõöùúûüçñý',
    'aaaaaaeeeeiiiiooooouuuucny'
  );
$$;

create or replace function public.muri_compatto(t text)
returns text
language sql
immutable
as $$
  select regexp_replace(
    translate(public.muri_sbase(t), '@$!|', 'asii'),
    '[^a-z0-9]', '', 'g'
  );
$$;

create or replace function public.muri_spaziato(t text)
returns text
language sql
immutable
as $$
  select regexp_replace(
    translate(public.muri_sbase(t), '@$!|', 'asii'),
    '[^a-z0-9]+', ' ', 'g'
  );
$$;

create or replace function public.muri_contiene(testo text, voci text[])
returns boolean
language plpgsql
immutable
as $$
declare
  sp text := public.muri_spaziato(testo);
  cp text := public.muri_compatto(testo);
  v text;
  vc text;
begin
  foreach v in array voci loop
    if sp ~ ('(^|\s)' || v || '(\s|$)') then
      return true;
    end if;
    vc := regexp_replace(v, '[^a-z0-9]', '', 'g');
    if length(vc) >= 5 and position(vc in cp) > 0 then
      return true;
    end if;
  end loop;
  return false;
end;
$$;

-- ------------------------------------------------------------
-- 2) Funzione di trigger CORRETTA (fix array vuoto tipizzato)
-- ------------------------------------------------------------
create or replace function public.postit_moderazione()
returns trigger
language plpgsql
as $$
declare
  -- FIX 0015: array vuoto SEMPRE tipizzato. Senza `::text[]` PostgreSQL
  -- solleva 42P18 "cannot determine type of empty array" a ogni insert.
  parolacce text[] := array[]::text[];
  slur text[] := array[
    'negraccio','negro','nigger','nigga','frocio','faggot',
    'fagg0t','retard','terrone','zingaro','handicappato',
    'mongoloide','ritardato'
  ];
  nsfw_parole text[] := array[
    'porno','porn','pornografia','hardcore','xxx','nsfw','sesso','sex',
    'sexting','orgasmo','orgasm','masturbazione','masturbation','masturbare',
    'pompino','blowjob','fellatio','sesso anale','hentai','ecchi','yaoi',
    'yuri','nudista','nudity','naked','penis','pene',
    'vagina','vulva','sperma','cumshot','creampie','escort','onlyfans',
    'chaturbate','transessuale'
  ];
  nsfw_domini text[] := array[
    'pornhub','xvideos','xnxx','xhamster','redtube','youporn','porn',
    'brazzers','onlyfans','onlyfan','chaturbate','cam4','livejasmin',
    'stripchat','bongacams','spankbang','eporner','beeg','youjizz',
    'motherless','rule34','nhentai','hanime'
  ];
  tutto text;
  grezzo text;
  compatto text;
  d text;
begin
  tutto := coalesce(new.testo, '') || ' ' || coalesce(new.nickname, '');
  grezzo := public.muri_sbase(tutto);
  compatto := public.muri_compatto(tutto);

  -- 1) NSFW: domini per adulti o lessico sessuale.
  foreach d in array nsfw_domini loop
    if position(d in compatto) > 0 then
      raise exception 'muri_moderazione:nsfw' using errcode = 'check_violation';
    end if;
  end loop;
  if public.muri_contiene(tutto, nsfw_parole) then
    raise exception 'muri_moderazione:nsfw' using errcode = 'check_violation';
  end if;

  -- 2) Linguaggio: insulti discriminatori.
  if public.muri_contiene(tutto, parolacce)
     or public.muri_contiene(tutto, slur) then
    raise exception 'muri_moderazione:linguaggio' using errcode = 'check_violation';
  end if;

  -- 3) Link nel testo o nel nickname.
  if grezzo ~ 'https?://'
     or grezzo ~ 'www\.[a-z0-9-]+\.[a-z]{2,}'
     or grezzo ~ '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}'
     or grezzo ~ '\y[a-z0-9][a-z0-9-]{0,62}\.(com|net|org|edu|gov|mil|int|info|biz|io|co|it|de|fr|es|nl|uk|us|eu|ru|cn|to|ly|gl|be|tv|me|app|dev|xyz|online|site|shop|store|link|click|top|live|cc|ws|tk|ml|ga|cf|gq|club)\y'
     or grezzo ~ '[a-z0-9-]{2,}\s*(\(dot\)|\(punto\)|\[\.\]|\(\.\))'
     or grezzo ~ '(^|\s)@[a-z0-9._]{3,}'
  then
    raise exception 'muri_moderazione:link' using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

-- ------------------------------------------------------------
-- 3) (Ri)aggancio del trigger
-- ------------------------------------------------------------
drop trigger if exists postit_moderazione_trigger on public.postit;
create trigger postit_moderazione_trigger
  before insert or update of testo, nickname on public.postit
  for each row execute function public.postit_moderazione();

-- ------------------------------------------------------------
-- 4) Colonna stile grafico (da migrazione 0014)
-- ------------------------------------------------------------
alter table public.postit add column if not exists stile smallint;
comment on column public.postit.stile is
  'Variante grafica del post-it (1..16). Null = design classico.';

-- ------------------------------------------------------------
-- 5) Verifiche
-- ------------------------------------------------------------
-- a) La funzione di moderazione e il trigger ora non falliscono piu'.
-- b) La colonna stile esiste.
select
  (select count(*) from pg_proc where proname = 'postit_moderazione') as funzione_ok,
  (select count(*) from information_schema.columns
     where table_schema = 'public' and table_name = 'postit' and column_name = 'stile') as colonna_stile_ok,
  (select count(*) from public.postit) as postit_totali;
