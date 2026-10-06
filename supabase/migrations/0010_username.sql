-- ============================================================
-- Muri Parlanti — Username unico per l'accesso (0010)
-- Esegui QUESTO script nell'SQL Editor del progetto Supabase:
--   https://supabase.com/dashboard/project/anhndzpiuaxmwwycmnxh/sql
--
-- Cosa fa:
--   1. Aggiunge la colonna "username" ai profili.
--   2. Rende lo username UNICO (senza distinzione maiuscole/minuscole).
--   3. Impone il formato: 3-20 caratteri tra lettere minuscole,
--      numeri e underscore.
--
-- Perche': Supabase Auth identifica gli account con un'email. Con lo
-- username salvato qui, le rotte API lato server possono tradurre
-- "username" nell'account corrispondente, permettendo l'accesso con
-- username (o email) e il recupero password tramite email di recupero.
-- ============================================================

-- 1. Colonna username (null per gli account che non l'hanno ancora scelto).
alter table public.profili
  add column if not exists username text;

-- 2. Unicita' senza distinzione di maiuscole (indice parziale: ignora i null).
create unique index if not exists profili_username_unico
  on public.profili (lower(username))
  where username is not null;

-- 3. Formato dello username.
alter table public.profili
  drop constraint if exists profili_username_formato;
alter table public.profili
  add constraint profili_username_formato
  check (username is null or username ~ '^[a-z0-9_]{3,20}$');

-- Verifica: mostra gli account che hanno gia' uno username.
select id, username, nickname
from public.profili
where username is not null
order by username;
