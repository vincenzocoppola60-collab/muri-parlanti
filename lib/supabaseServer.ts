import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Client Supabase per il SERVER (route API). NON importare mai questo file
 * in componenti client: usa la service_role key, che ha pieno accesso al
 * database e non deve mai finire nel browser.
 *
 * La chiave vive in una variabile d'ambiente SENZA prefisso NEXT_PUBLIC_,
 * quindi Next.js non la espone al frontend.
 */
export function getAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Configurazione server mancante: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Client Supabase "anon" lato server: serve per operazioni di auth che
 * devono avvenire con la chiave pubblica (signInWithPassword,
 * resetPasswordForEmail), cosi' il comportamento e' identico a quello
 * del browser ma la logica resta sul server.
 */
export function getAnonServer(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Configurazione server mancante: NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** URL pubblico del sito, per i link di recupero password. */
export function sitoPubblico(): string {
  return (
    process.env.NEXT_PUBLIC_SITO_URL?.replace(/\/$/, "") ??
    "https://muri-parlanti.vercel.app"
  );
}

/** Formato ammesso per lo username (minuscole, numeri, underscore). */
export const FORMATO_USERNAME = /^[a-z0-9_]{3,20}$/;

/** Normalizza un identificativo di accesso: minuscole, senza spazi. */
export function normalizzaUsername(raw: unknown): string {
  return String(raw ?? "").trim().toLowerCase();
}

/** Email minimamente valida. */
export function emailValida(raw: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.trim());
}
