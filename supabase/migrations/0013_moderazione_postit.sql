-- ============================================================
-- Muri Parlanti — Moderazione dei post-it (0013)
-- Esegui QUESTO script nell'SQL Editor del progetto Supabase:
--   https://supabase.com/dashboard/project/anhdzpiuaxmwwycmnxh/sql
--
-- Cosa fa:
--   Aggiunge un trigger BEFORE INSERT/UPDATE sulla tabella public.postit che
--   applica le stesse tre regole del filtro lato client (lib/moderazione.ts):
--     1. NSFW       -> lessico sessuale o domini per adulti;
--     2. linguaggio -> insulti discriminatori (razziali/omofobi/disabilita').
--     3. link       -> URL, domini, email, @handle nel testo o nel nickname.
--
--   Perche' serve: l'insert dei post-it parte dal browser (nessuna API route),
--   quindi il filtro client e' aggirabile (si puo' chiamare la REST di Supabase
--   direttamente). Il trigger e' la barriera autorevole.
--
--   L'insert violato fallisce con un errore il cui messaggio contiene la marca
--   "muri_moderazione:<motivo>"; l'app lo riconosce e mostra un avviso pulito.
--
--   Le liste non bloccano il campo canzone_url (che di suo e' un link lecito).
-- ============================================================

-- ------------------------------------------------------------
-- Helper di normalizzazione (stessa logica di sbase/deLeet del client).
-- ------------------------------------------------------------

-- Minuscole + accenti rimossi.
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

-- Forma "compatta": minuscole, accenti via, leet sciolto, nessun separatore.
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

-- Forma "spaziata": separatori -> singolo spazio.
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

-- True se il testo contiene una voce della lista.
--   - sempre con confini di parola sulla forma spaziata;
--   - in piu', sulla forma compatta per le voci di almeno 5 lettere, cosi'
--     si intercettano le lettere distanziate ad arte ("p o r c o d i o").
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
-- Funzione di trigger
-- ------------------------------------------------------------
create or replace function public.postit_moderazione()
returns trigger
language plpgsql
as $$
declare
  -- NB: array vuoto SEMPRE tipizzato (array[]::text[]). Senza il cast
  -- PostgreSQL solleva 42P18 "cannot determine type of empty array" anche
  -- solo entrando nella funzione: il trigger fallirebbe OGNI insert.
  parolacce text[] := array[]::text[]; -- nessuna parolaccia generica bloccata
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
-- Aggancio del trigger alla tabella
-- ------------------------------------------------------------
drop trigger if exists postit_moderazione_trigger on public.postit;
create trigger postit_moderazione_trigger
  before insert or update of testo, nickname on public.postit
  for each row execute function public.postit_moderazione();

-- Verifica: i post-it gia' presenti NON vengono toccati (il trigger agisce
-- solo su insert/update). Questo conteggio mostra quanti, in teoria, sarebbero
-- bloccati se ripubblicati.
select count(*) filter (where public.muri_contiene(testo, array['cazzo','merda']) or public.muri_contiene(testo, array['sesso','porno'])) as sospetti,
       count(*) as totale
from public.postit;
