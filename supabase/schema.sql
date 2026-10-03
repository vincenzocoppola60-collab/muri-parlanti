-- ============================================================
-- Muri Parlanti · Schema v1
-- Eseguire nel Supabase SQL Editor (Dashboard -> SQL Editor -> New query)
-- ============================================================

-- 1) Tabella principale
create table if not exists public.postit (
  id uuid primary key default gen_random_uuid(),
  testo text not null check (char_length(btrim(testo)) between 1 and 500),
  nickname text not null default 'Anonimo' check (char_length(nickname) <= 30),
  luogo text not null check (luogo ~ '^[a-z0-9]{2,40}(-[a-z0-9]+)*$'),
  creato_il timestamptz not null default now()
);

-- 2) Indice: ogni muro = query su luogo, ordinata per data
create index if not exists postit_luogo_creato_il_idx
  on public.postit (luogo, creato_il desc);

-- 3) Row Level Security: si puo' solo leggere e aggiungere.
--    Nessuno puo' cancellare o modificare i messaggi.
alter table public.postit enable row level security;

create policy "lettura pubblica del muro"
  on public.postit for select
  using (true);

create policy "scrittura anonima sul muro"
  on public.postit for insert
  with check (true);

-- 4) Permessi espliciti per l'utente anonimo (la key pubblica nel frontend)
grant select, insert on public.postit to anon;

-- ============================================================
-- 5) Seed dimostrativo (opzionale, si puo' cancellare)
-- ============================================================
insert into public.postit (testo, nickname, luogo, creato_il) values
  ('Oggi ho visto un tramonto bellissimo da qui.', 'Marco82', 'via-roma', now() - interval '26 minutes'),
  ('Questa citta sa ancora sorprendermi. Grazie.', 'Luna90', 'via-roma', now() - interval '2 hours'),
  ('Sono passato di qui ogni giorno per dieci anni. Oggi e l ultima volta. Ciao.', 'Un passante', 'via-roma', now() - interval '5 hours'),
  ('Il cornetto piu buono della citta e da Giovanni, due isolati a est. Fidatevi.', 'Pippo', 'via-roma', now() - interval '9 hours'),
  ('Qui mi sono dichiarata alla persona che amo. Ha detto si.', 'Gioia', 'via-roma', now() - interval '1 day'),
  ('Per chi passa: domani e un altro giorno. Lo so per certo.', 'Anonimo', 'via-roma', now() - interval '1 day 6 hours'),
  ('Qualcuno ha una penna? Il mio telefono e scarico.', 'Marco82', 'via-roma', now() - interval '2 days'),
  ('L estate 2026 non la dimentichero mai.', 'Anonimo', 'via-roma', now() - interval '3 days'),
  ('Il murales nuovo e bellissimo. Chi l ha fatto si faccia vivo.', 'Vera', 'via-roma', now() - interval '4 days'),
  ('Prima o poi tornero qui. Promesso.', 'Luca', 'via-roma', now() - interval '6 days'),
  ('Il pane di questo quartiere profuma come la mia infanzia.', 'Ninetta', 'via-roma', now() - interval '9 days'),
  ('C e ancora chi si ferma a leggere. Non e tutto perduto.', 'Lo scrittore', 'via-roma', now() - interval '12 days'),

  ('Ho lasciato una moneta nella fontana. Il desiderio e per tutti voi.', 'Anonimo', 'piazza-garibaldi', now() - interval '40 minutes'),
  ('Qui il sabato sera c e sempre qualcuno con una chitarra. Venite.', 'Bea', 'piazza-garibaldi', now() - interval '3 hours'),
  ('Mia nonna mi portava qui a dar da mangiare ai piccioni. Ora ci porto mia figlia.', 'Ale', 'piazza-garibaldi', now() - interval '1 day'),
  ('La piazza piu bella della citta, e non cambio idea.', 'Enzo', 'piazza-garibaldi', now() - interval '2 days'),
  ('Grazie a chi ha raccolto il mio portafoglio ieri. Il mondo e migliore di come sembra.', 'Anonimo', 'piazza-garibaldi', now() - interval '3 days'),
  ('Incontrarsi qui alle 18 e la nostra tradizione da vent anni.', 'I gemelli', 'piazza-garibaldi', now() - interval '5 days'),

  ('Il mare profuma di casa.', 'Luna90', 'lungomare', now() - interval '1 hour'),
  ('Tramonto da dieci e lode. Tornero.', 'Kai', 'lungomare', now() - interval '4 hours'),
  ('Ho nuotato fino al tramonto. Consigliatissimo.', 'Splash', 'lungomare', now() - interval '1 day'),
  ('Le onde raccontano storie, se stai in silenzio.', 'Anonimo', 'lungomare', now() - interval '2 days'),
  ('Prima passeggiata dell anno senza giacca. La primavera e arrivata.', 'Margherita', 'lungomare', now() - interval '4 days'),

  ('La pizza qui e una religione.', 'Tony', 'via-napoli', now() - interval '2 hours'),
  ('Il caos di via Napoli e la sua anima. Non cambiatela mai.', 'Anonimo', 'via-napoli', now() - interval '1 day'),
  ('Troppi motorini. Ma la colazione e divina.', 'Fra', 'via-napoli', now() - interval '2 days'),
  ('Ogni angolo nasconde un pezzo di storia. Guardate in alto.', 'Guida', 'via-napoli', now() - interval '3 days');
