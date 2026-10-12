-- ============================================================
-- Muri Parlanti — Legame post-it → muro (FK vera) (0024)
-- ============================================================
-- COSA FA
--   Oggi il post-it è legato al muro SOLO dal campo di testo postit.luogo.
--   Aggiungiamo postit.muro_slug con un RIFERIMENTO VERO a public.muri(slug),
--   riempito (backfill) dai valori già presenti in `luogo`.
--
--   Aggiungiamo anche postit.dimensione (grandezza scelta dal creator per i
--   post-it del muro principale).
--
--   `luogo` NON viene rimossa: resta come compatibilità durante la transizione
--   (l'app continuerà a scriverla insieme a muro_slug). Potrà essere lasciata
--   cadere in una migrazione futura, quando tutto il codice userà muro_slug.
--
-- COME SI ESEGUE
--   Supabase → SQL Editor → incolla TUTTO → Run
-- ============================================================

-- 1) Colonna con riferimento vero (ON DELETE SET NULL: se il muro sparisce,
--    i post-it non vengono cancellati a cascata).
alter table public.postit add column if not exists muro_slug text
  references public.muri(slug) on delete set null;

-- 2) Grandezza scelta dal creator (null = dimensione normale).
alter table public.postit add column if not exists dimensione integer;

comment on column public.postit.muro_slug is
  'Riferimento vero al muro (public.muri.slug). Sostituisce pian piano il testo `luogo`.';
comment on column public.postit.dimensione is
  'Grandezza di visualizzazione scelta dal creator (solo post-it del muro principale). null = normale.';

-- 3) Backfill: dove muro_slug è vuoto e `luogo` corrisponde a un muro esistente.
update public.postit p
   set muro_slug = p.luogo
 where p.muro_slug is null
   and p.luogo is not null
   and exists (select 1 from public.muri m where m.slug = p.luogo);

create index if not exists postit_muro_slug_idx on public.postit (muro_slug);

-- Verifica: quanti post-it hanno il riferimento vero.
select
  count(*) as totale,
  count(muro_slug) as con_riferimento,
  count(*) - count(muro_slug) as senza_riferimento
from public.postit;
