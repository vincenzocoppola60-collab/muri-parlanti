-- ============================================================
-- Muri Parlanti — Muri dei collettivi (0023)
-- ============================================================
-- COSA FA
--   Aggiunge a public.muri i campi del modello collettivo:
--     collettivo_id  → il collettivo a cui appartiene il muro (null = muro "classico").
--     tipo           → 'evento' (serata) | 'principale' (bacheca del creator).
--     stato          → 'aperto' | 'chiuso' (per i muri-evento; il principale è sempre aperto).
--     chiuso_il      → quando è stato chiuso.
--     data_evento    → data/ora della serata (per l'eventuale chiusura automatica).
--
--   Vincoli automatici:
--     * UN solo muro 'principale' per collettivo (indice unico parziale);
--     * AL MASSIMO un muro-evento 'aperto' per collettivo (indice unico parziale)
--       → è così che l'app trova "il muro in corso" senza ambiguità (AI1).
--
--   NB: i muri "classici" (senza collettivo) restano esattamente come prima:
--   tipo='evento' di default, ma collettivo_id null → nessun vincolo li tocca.
--
-- COME SI ESEGUE
--   Supabase → SQL Editor → incolla TUTTO → Run
-- ============================================================

alter table public.muri add column if not exists collettivo_id uuid
  references public.collettivi(id) on delete set null;
alter table public.muri add column if not exists tipo text not null default 'evento';
alter table public.muri add column if not exists stato text not null default 'aperto';
alter table public.muri add column if not exists chiuso_il timestamptz;
alter table public.muri add column if not exists data_evento timestamptz;
alter table public.muri add column if not exists dimensione integer;  -- grandezza post-it del creator (muro principale)

comment on column public.muri.tipo is
  'evento = muro di una serata; principale = bacheca/home del collettivo (sempre aperta).';
comment on column public.muri.stato is
  'aperto = si può ancora scrivere; chiuso = sola lettura (blocco reale via trigger su postit).';

-- Vincoli di dominio.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'muri_tipo_ck') then
    alter table public.muri
      add constraint muri_tipo_ck check (tipo in ('evento', 'principale'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'muri_stato_ck') then
    alter table public.muri
      add constraint muri_stato_ck check (stato in ('aperto', 'chiuso'));
  end if;
end $$;

-- Un solo muro 'principale' per collettivo.
create unique index if not exists muri_un_principale
  on public.muri (collettivo_id)
  where tipo = 'principale' and collettivo_id is not null;

-- Al massimo un muro-evento 'aperto' per collettivo (il "muro in corso").
create unique index if not exists muri_un_evento_aperto
  on public.muri (collettivo_id)
  where tipo = 'evento' and stato = 'aperto' and collettivo_id is not null;

create index if not exists muri_collettivo_idx on public.muri (collettivo_id);

-- Verifica.
select slug, nome, tipo, stato, collettivo_id from public.muri order by creato_il;
