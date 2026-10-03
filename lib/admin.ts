import { getClienteAuth } from "@/lib/clienteAuth";
import { getSupabase } from "@/lib/supabase";

/**
 * Amministratore dei muri.
 *
 * La sicurezza vera e' nel database (RLS): la tabella `amministratori`
 * contiene le sole persone autorizzate a creare/modificare/cancellare i muri
 * e a svuotare i post-it. Questo file e' solo il ponte lato app verso quelle
 * policy; se la migrazione 0009 non e' ancora stata eseguita, tutte le
 * funzioni degradano senza rompere l'app (ritornano false / liste vuote).
 */

export type MuroAdmin = {
  slug: string;
  nome: string;
  foto_url: string | null;
  lat: number | null;
  lng: number | null;
  raggio_m: number;
};

/** Colonne base (esistono anche senza la migrazione 0009). */
const COLONNE_BASE = "slug, nome, foto_url";
/** Colonne complete (dopo la migrazione 0009). */
const COLONNE_COMPLETE = "slug, nome, foto_url, lat, lng, raggio_m";

function conRaggio(m: Partial<MuroAdmin>): MuroAdmin {
  return {
    slug: String(m.slug ?? ""),
    nome: String(m.nome ?? ""),
    foto_url: m.foto_url ?? null,
    lat: typeof m.lat === "number" ? m.lat : null,
    lng: typeof m.lng === "number" ? m.lng : null,
    raggio_m: typeof m.raggio_m === "number" ? m.raggio_m : 200,
  };
}

/**
 * True se l'utente collegato e' amministratore.
 * Richiede una sessione attiva: senza login ritorna false.
 */
export async function eAmministratore(): Promise<boolean> {
  try {
    const supabase = getClienteAuth();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from("amministratori")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();
    if (error) return false;
    return Boolean(data);
  } catch {
    return false;
  }
}

/**
 * Elenco di tutti i muri. Usa il client pubblico (i muri sono leggibili da
 * tutti). Se la 0009 non e' stata eseguita, ricade sulle sole colonne base.
 */
export async function elencaMuri(): Promise<MuroAdmin[]> {
  try {
    const { data, error } = await getSupabase()
      .from("muri")
      .select(COLONNE_COMPLETE)
      .order("nome", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((m) => conRaggio(m as Partial<MuroAdmin>));
  } catch {
    const { data } = await getSupabase()
      .from("muri")
      .select(COLONNE_BASE)
      .order("nome", { ascending: true });
    return (data ?? []).map((m) => conRaggio(m as Partial<MuroAdmin>));
  }
}

export type EsitoAdmin =
  | { ok: true }
  | { ok: false; errore: string };

/**
 * Crea (o aggiorna) un muro con le sue coordinate. Deve essere chiamata da
 * un amministratore collegato: la policy RLS rifiuta tutti gli altri.
 */
export async function salvaMuro(input: {
  slug: string;
  nome: string;
  lat?: number | null;
  lng?: number | null;
  raggio_m?: number;
  foto_url?: string | null;
}): Promise<EsitoAdmin> {
  try {
    const supabase = getClienteAuth();
    const riga: Record<string, unknown> = {
      slug: input.slug,
      nome: input.nome,
      aggiornato_il: new Date().toISOString(),
    };
    if (typeof input.lat === "number") riga.lat = input.lat;
    if (typeof input.lng === "number") riga.lng = input.lng;
    if (typeof input.raggio_m === "number") riga.raggio_m = input.raggio_m;
    if (input.foto_url !== undefined) riga.foto_url = input.foto_url;

    const { error } = await supabase
      .from("muri")
      .upsert(riga, { onConflict: "slug" });
    if (error) throw new Error(error.message);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      errore:
        e instanceof Error
          ? e.message
          : "Non sono riuscito a salvare il muro.",
    };
  }
}

/** Cancella un muro (solo amministratore). */
export async function cancellaMuro(slug: string): Promise<EsitoAdmin> {
  try {
    const supabase = getClienteAuth();
    const { error } = await supabase.from("muri").delete().eq("slug", slug);
    if (error) throw new Error(error.message);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      errore:
        e instanceof Error
          ? e.message
          : "Non sono riuscito a cancellare il muro.",
    };
  }
}

/**
 * Svuota tutti i post-it di un muro (solo amministratore).
 * Ritorna il numero di pensieri rimossi, quando il database lo riporta.
 */
export async function svuotaPostit(
  luogo: string
): Promise<EsitoAdmin & { rimossi?: number }> {
  try {
    const supabase = getClienteAuth();
    const { error } = await supabase.from("postit").delete().eq("luogo", luogo);
    if (error) throw new Error(error.message);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      errore:
        e instanceof Error
          ? e.message
          : "Non sono riuscito a svuotare il muro.",
    };
  }
}

/**
 * Distanza in metri fra due punti (formula di Haversine).
 * Serve per il QR unico: capire quale muro e' il piu' vicino a chi apre il QR.
 */
export function distanzaMetri(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // raggio terrestre in metri
  const rad = (gradi: number) => (gradi * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rad(lat1)) *
      Math.cos(rad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Trova il muro piu' vicino alle coordinate date, entro il suo raggio_m.
 * Ritorna { muro, distanza } oppure null se nessun muro e' abbastanza vicino.
 */
export function muroPiuVicino(
  lat: number,
  lng: number,
  muri: MuroAdmin[]
): { muro: MuroAdmin; distanza: number } | null {
  let migliore: { muro: MuroAdmin; distanza: number } | null = null;

  for (const muro of muri) {
    if (muro.lat === null || muro.lng === null) continue;
    const distanza = distanzaMetri(lat, lng, muro.lat, muro.lng);
    const raggio = muro.raggio_m > 0 ? muro.raggio_m : 200;
    if (distanza > raggio) continue;
    if (!migliore || distanza < migliore.distanza) {
      migliore = { muro, distanza };
    }
  }
  return migliore;
}
