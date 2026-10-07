-- ============================================================
-- Muri Parlanti — Zona di accesso dei muri (0011)
-- Esegui QUESTO script nell'SQL Editor del progetto Supabase:
--   https://supabase.com/dashboard/project/anhndzpiuaxmwwycmnxh/sql
--
-- Cosa fa:
--   Aggiunge la colonna "zona" alla tabella muri: il confine (poligono)
--   disegnato dall'amministratore sulla mappa. Chi scansiona il QR unico
--   apre il muro SOLO se si trova dentro questa zona.
--
--   Formato "zona": array JSON di punti [latitudine, longitudine], ad esempio
--     [[40.8518,14.2681],[40.8520,14.2685],[40.8516,14.2688]]
--   Se "zona" e' vuota/null, l'app ripiega sul vecchio criterio
--   (lat/lng + raggio_m) per non rompere i muri gia' esistenti.
--
--   Nessuna modifica alle policy RLS: la colonna eredita i permessi della
--   tabella muri (tutti leggono, solo l'amministratore scrive).
-- ============================================================

alter table public.muri
  add column if not exists zona jsonb;

comment on column public.muri.zona is
  'Zona di accesso del muro: poligono [[lat,lng],...] disegnato dall''admin. Se null, si usa lat/lng + raggio_m.';

-- Verifica: elenca i muri e se hanno una zona definita.
select slug, nome, (zona is not null) as ha_zona, jsonb_array_length(coalesce(zona, '[]'::jsonb)) as n_punti
from public.muri
order by nome;
