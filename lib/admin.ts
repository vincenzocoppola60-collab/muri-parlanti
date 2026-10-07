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

/** Punto geografico: [latitudine, longitudine]. */
export type Punto = [number, number];

export type MuroAdmin = {
  slug: string;
  nome: string;
  foto_url: string | null;
  lat: number | null;
  lng: number | null;
  raggio_m: number;
  /** Zona di accesso (poligono). null = si usa lat/lng + raggio_m. */
  zona: Punto[] | null;
};

/** Colonne base (esistono anche senza le migrazioni 0009/0011). */
const COLONNE_BASE = "slug, nome, foto_url";
/** Colonne complete (dopo le migrazioni 0009 e 0011). */
const COLONNE_COMPLETE = "slug, nome, foto_url, lat, lng, raggio_m, zona";

/** Converte un valore grezzo in una zona valida (almeno 3 punti), o null. */
function normalizzaZona(raw: unknown): Punto[] | null {
  if (!Array.isArray(raw)) return null;
  const punti: Punto[] = [];
  for (const p of raw) {
    if (Array.isArray(p) && p.length >= 2) {
      const lat = Number(p[0]);
      const lng = Number(p[1]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) punti.push([lat, lng]);
    }
  }
  return punti.length >= 3 ? punti : null;
}

function normalizza(m: Partial<MuroAdmin>): MuroAdmin {
  return {
    slug: String(m.slug ?? ""),
    nome: String(m.nome ?? ""),
    foto_url: m.foto_url ?? null,
    lat: typeof m.lat === "number" ? m.lat : null,
    lng: typeof m.lng === "number" ? m.lng : null,
    raggio_m: typeof m.raggio_m === "number" ? m.raggio_m : 200,
    zona: normalizzaZona(m.zona),
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
 * tutti). Se le migrazioni non sono state eseguite, ricade sulle sole
 * colonne base.
 */
export async function elencaMuri(): Promise<MuroAdmin[]> {
  try {
    const { data, error } = await getSupabase()
      .from("muri")
      .select(COLONNE_COMPLETE)
      .order("nome", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((m) => normalizza(m as Partial<MuroAdmin>));
  } catch {
    const { data } = await getSupabase()
      .from("muri")
      .select(COLONNE_BASE)
      .order("nome", { ascending: true });
    return (data ?? []).map((m) => normalizza(m as Partial<MuroAdmin>));
  }
}

export type EsitoAdmin =
  | { ok: true }
  | { ok: false; errore: string };

/**
 * Crea (o aggiorna) un muro con la sua zona. Deve essere chiamata da
 * un amministratore collegato: la policy RLS rifiuta tutti gli altri.
 */
export async function salvaMuro(input: {
  slug: string;
  nome: string;
  lat?: number | null;
  lng?: number | null;
  raggio_m?: number;
  zona?: Punto[] | null;
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
    if (input.zona !== undefined) riga.zona = input.zona;
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
 * Ripiego per i muri senza zona disegnata.
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
 * Centro (media dei vertici) di un poligono. Serve a fissare lat/lng del muro
 * per centrare la mappa e come ripiego.
 */
export function centroPoligono(poligono: Punto[]): Punto {
  const n = poligono.length || 1;
  const lat = poligono.reduce((s, p) => s + p[0], 0) / n;
  const lng = poligono.reduce((s, p) => s + p[1], 0) / n;
  return [Number(lat.toFixed(6)), Number(lng.toFixed(6))];
}

/**
 * True se il punto (lat, lng) cade dentro il poligono (ray casting).
 * lat e' trattata come Y, lng come X.
 */
export function dentroPoligono(lat: number, lng: number, poligono: Punto[]): boolean {
  let dentro = false;
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const [latI, lngI] = poligono[i];
    const [latJ, lngJ] = poligono[j];
    const interseca =
      lngI > lng !== lngJ > lng &&
      lat < ((latJ - latI) * (lng - lngI)) / (lngJ - lngI) + latI;
    if (interseca) dentro = !dentro;
  }
  return dentro;
}

/**
 * Trova il muro in cui si trova la posizione data.
 *   1. Prima i muri con una zona disegnata: se la posizione cade dentro,
 *      quello e' il muro. (Accesso preciso, voluto.)
 *   2. Ripiego, solo per i muri SENZA zona: il piu' vicino entro raggio_m.
 *      Serve a non rompere i muri creati prima delle zone.
 * Ritorna null se la posizione non appartiene a nessun muro.
 */
export function muroPerPosizione(
  lat: number,
  lng: number,
  muri: MuroAdmin[]
): MuroAdmin | null {
  for (const muro of muri) {
    if (muro.zona && dentroPoligono(lat, lng, muro.zona)) return muro;
  }

  let migliore: { muro: MuroAdmin; distanza: number } | null = null;
  for (const muro of muri) {
    if (muro.zona) continue;
    if (muro.lat === null || muro.lng === null) continue;
    const distanza = distanzaMetri(lat, lng, muro.lat, muro.lng);
    const raggio = muro.raggio_m > 0 ? muro.raggio_m : 200;
    if (distanza > raggio) continue;
    if (!migliore || distanza < migliore.distanza) {
      migliore = { muro, distanza };
    }
  }
  return migliore?.muro ?? null;
}
