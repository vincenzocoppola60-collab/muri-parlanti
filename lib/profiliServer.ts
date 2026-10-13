import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Preferito } from "@/lib/preferiti";

/**
 * Letture PUBBLICHE dei dati di profilo che le policy RLS tengono privati.
 *
 * La tabella public.preferiti e' leggibile solo dal proprietario: per mostrare
 * i post-it salvati nella bacheca pubblica di un altro utente servono privilegi
 * elevati. Questo modulo usa la SERVICE ROLE key e va quindi usato SOLO lato
 * server (server component o server action), mai importato in un componente
 * client: la chiave non e' NEXT_PUBLIC, quindi non finisce mai nel bundle.
 *
 * La visibilita' (profili.mostra_salvati) viene comunque controllata dal
 * chiamante prima di esporre i dati.
 */

/** Quanti post-it salvati si caricano al massimo in una lettura. */
export const LIMITE_SALVATI = 500;

const COLONNE = "id, postit_id, luogo, testo, nickname, creato_il";

let admin: SupabaseClient | null = null;

/** Client con service role (letture amministrative). null se la chiave manca. */
function getAdmin(): SupabaseClient | null {
  if (admin) return admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chiave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chiave) return null;
  admin = createClient(url, chiave, { auth: { persistSession: false } });
  return admin;
}

/**
 * Post-it salvati da un utente (pagina profilo pubblico, lato server).
 * Legge con la service role key perche' le RLS non li esporrebbero.
 */
export async function caricaPreferitiDiUtente(
  userId: string,
  limite = LIMITE_SALVATI,
  offset = 0
): Promise<Preferito[]> {
  const client = getAdmin();
  if (!client) return [];
  try {
    const da = offset > 0 ? Math.floor(offset) : 0;
    const { data, error } = await client
      .from("preferiti")
      .select(COLONNE)
      .eq("utente_id", userId)
      .order("creato_il", { ascending: false })
      .range(da, da + limite - 1);
    if (error) return [];
    return (data ?? []) as Preferito[];
  } catch {
    return [];
  }
}

/** Numero totale di post-it salvati da un utente. */
export async function contaPreferitiDiUtente(userId: string): Promise<number> {
  const client = getAdmin();
  if (!client) return 0;
  try {
    const { count, error } = await client
      .from("preferiti")
      .select("id", { count: "exact", head: true })
      .eq("utente_id", userId);
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}
