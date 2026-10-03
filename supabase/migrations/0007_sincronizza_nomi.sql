-- ============================================================
-- Muri Parlanti — I post-it seguono il nome attuale dell'autore (0007)
-- Esegui QUESTO script nell'SQL Editor del progetto Supabase:
--   https://supabase.com/dashboard/project/anhndzpiuaxmwwycmnxh/sql
--
-- Cosa fa:
--   1. Allinea a ritroso il nickname salvato sui post-it firmati al
--      nickname ATTUALE del profilo dell'autore.
--   2. Allinea anche il nickname salvato nei post-it salvati (preferiti).
--   3. Crea un trigger: da ora, quando un utente cambia il nickname nel
--      proprio profilo, TUTTI i suoi post-it (e i salvati che li
--      riguardano) si aggiornano automaticamente al nome attuale.
--      Anche quelli scritti con il nome precedente mostreranno il nome
--      nuovo, ovunque, senza dover fare nient'altro.
--   4. Seconda chance: ricollega i post-it ancora anonimi il cui
--      nickname corrisponde a UN SOLO profilo (stesse regole prudenti
--      della 0006: ignora "Anonimo", non collega se il nome e' doppio).
-- ============================================================

-- 1. Post-it firmati: nickname = nickname attuale del profilo
update public.postit p
set nickname = pr.nickname
from public.profili pr
where p.user_id = pr.id
  and p.nickname is distinct from pr.nickname;

-- 2. Post-it salvati: nickname dell'autore aggiornato
update public.preferiti prf
set nickname = pr.nickname
from public.profili pr
join public.postit p on p.id = prf.postit_id
where p.user_id = pr.id
  and prf.nickname is distinct from pr.nickname;

-- 3. Trigger: ogni cambio nickname nel profilo aggiorna i suoi post-it
create or replace function public.allinea_nickname_postit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.nickname is distinct from old.nickname then
    update public.postit
    set nickname = new.nickname
    where user_id = new.id;

    update public.preferiti
    set nickname = new.nickname
    where postit_id in (select id from public.postit where user_id = new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists on_profilo_nickname_cambiato on public.profili;
create trigger on_profilo_nickname_cambiato
  after update of nickname on public.profili
  for each row execute function public.allinea_nickname_postit();

-- 4. Seconda chance per i post-it anonimi con nome univoco (come 0006)
update public.postit p
set user_id = pr.id
from public.profili pr
where p.user_id is null
  and lower(btrim(p.nickname)) = lower(btrim(pr.nickname))
  and lower(btrim(p.nickname)) <> 'anonimo'
  and (
    select count(*) from public.profili p2
    where lower(btrim(p2.nickname)) = lower(btrim(p.nickname))
  ) = 1;

-- Verifica (opzionale): deve restituire 0 righe
--   select p.id from public.postit p
--   join public.profili pr on pr.id = p.user_id
--   where p.nickname is distinct from pr.nickname;
