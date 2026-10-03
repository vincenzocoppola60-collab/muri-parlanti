import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/**
 * Client Supabase per il browser con sessione PERSISTENTE.
 * A differenza di getSupabase() (sessione non persistent, usata da server/postit),
 * questo client ricorda l'utente tra una navigazione e l'altra (localStorage),
 * necessario per account, progressi e livelli.
 * Va usato SOLO in componenti client (funziona sul browser, non in SSR).
 */
export function getClienteAuth(): SupabaseClient {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Variabili Supabase mancanti: aggiungi NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
    );
  }

  client = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return client;
}
