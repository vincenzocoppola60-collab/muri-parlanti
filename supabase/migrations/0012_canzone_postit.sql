-- ============================================================
-- Muri Parlanti — Canzone nei post-it (0012)
-- Esegui QUESTO script nell'SQL Editor del progetto Supabase:
--   https://supabase.com/dashboard/project/anhndzpiuaxmwwycmnxh/sql
--
-- Cosa fa:
--   Aggiunge la colonna facoltativa postit.canzone_url: il link a un brano
--   su un servizio di streaming (Spotify, YouTube, Apple Music, SoundCloud,
--   Deezer). L'app riconosce il servizio e mostra il player ufficiale in un
--   riquadro dentro il post-it.
--
--   Se la colonna e' NULL il pensiero funziona come prima (solo testo e,
--   eventualmente, foto).
--
--   Nessuna modifica alle policy RLS: la colonna eredita i permessi della
--   tabella postit (tutti leggono, chi scrive un pensiero puo' valorizzarla).
-- ============================================================

alter table public.postit add column if not exists canzone_url text;

comment on column public.postit.canzone_url is
  'Link al brano (Spotify/YouTube/Apple Music/SoundCloud/Deezer) allegato al pensiero. Null = nessuna canzone.';

-- Verifica: quanti post-it hanno già una canzone.
select count(*) filter (where canzone_url is not null) as con_canzone,
       count(*)                                        as totale
from public.postit;
