-- ============================================================
-- Muri Parlanti — Riconnetti i vecchi post-it ai profili (0006)
-- Esegui QUESTO script nell'SQL Editor del progetto Supabase:
--   https://supabase.com/dashboard/project/anhndzpiuaxmwwycmnxh/sql
--
-- Perche': i post-it pubblicati PRIMA del fix della firma (e quelli
-- pubblicati mentre la firma falliva) hanno user_id null, quindi il
-- nome dell'autore non e' cliccabile. Questo script li ricollega al
-- profilo quando il nickname corrisponde a UN SOLO profilo esistente.
--
-- Sicurezza della corrispondenza:
--   - ignora i nickname "Anonimo" (veri anonimi restano anonimi);
--   - se due profili hanno lo stesso nickname, NON collega nulla
--     (meglio anonimo che attribuire al sbaglio);
--   - confronto senza maiuscole/minuscole e senza spazi ai bordi.
-- ============================================================

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

-- Verifica (opzionale): i post-it con firma ora devono avere user_id:
--   select nickname, count(*) filter (where user_id is not null) as firmati,
--          count(*) filter (where user_id is null) as anonimi
--   from public.postit group by nickname order by firmati desc;
