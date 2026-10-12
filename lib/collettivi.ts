import { getSupabase } from "@/lib/supabase";
import { getClienteAuth } from "@/lib/clienteAuth";

/**
 * Collettivi / creator (tabella public.collettivi, 0022 + estensioni 0023).
 *
 * Un collettivo (es. RUINA) e' gestito da UN account condiviso
 * (owner_utente_id). I suoi muri:
 *   - tipo 'principale'  -> bacheca del creator, SEMPRE aperta, senza QR/geo;
 *   - tipo 'evento'      -> muro di una serata, aperto o chiuso.
 * Il QR del collettivo (/c/<slug>) apre il muro-evento in corso; se non c'e',
 * ricade sul muro principale.
 *
 * Tutte le letture usano il client pubblico e degradano senza errori se le
 * migrazioni non sono ancora state applicate (liste vuote / null).
 */

export type Collettivo = {
  id: string;
  slug: string;
  nome: string;
  descrizione: string | null;
  categoria_id: string | null;
  emoji: string | null;
  foto_url: string | null;
  owner_utente_id: string;
  attivo: boolean;
  creato_il: string;
};

export type MuroCollettivo = {
  slug: string;
  nome: string;
  foto_url: string | null;
  tipo: "evento" | "principale";
  stato: "aperto" | "chiuso";
  collettivo_id: string | null;
  data_evento: string | null;
  /** Inizio/fine dell'evento (data + ora) — dopo la fine il muro e' in sola lettura. */
  data_inizio?: string | null;
  data_fine?: string | null;
  chiuso_il: string | null;
  creato_il: string | null;
};

/**
 * Un muro-evento e' scrivibile se non e' stato chiuso a mano E la sua
 * finestra (data_inizio/data_fine) non e' ancora terminata.
 */
export function muroScrivibile(m: MuroCollettivo | null | undefined): boolean {
  if (!m) return false;
  if (m.stato === "chiuso") return false;
  if (m.tipo === "evento" && m.data_fine) {
    const fine = Date.parse(m.data_fine);
    if (Number.isFinite(fine) && Date.now() > fine) return false;
  }
  return true;
}

const COLONNE_COLLETTIVO =
  "id, slug, nome, descrizione, categoria_id, emoji, foto_url, owner_utente_id, attivo, creato_il";

const COLONNE_MURO_FINESTRA =
  "slug, nome, foto_url, tipo, stato, collettivo_id, data_evento, data_inizio, data_fine, chiuso_il, creato_il";
const COLONNE_MURO =
  "slug, nome, foto_url, tipo, stato, collettivo_id, data_evento, chiuso_il, creato_il";

/** Un collettivo dal suo slug pubblico (usato da /c/<slug> e /collettivo/<slug>). */
export async function caricaCollettivo(slug: string): Promise<Collettivo | null> {
  try {
    const { data, error } = await getSupabase()
      .from("collettivi")
      .select(COLONNE_COLLETTIVO)
      .eq("slug", slug)
      .eq("attivo", true)
      .maybeSingle();
    if (error) throw error;
    return (data as Collettivo | null) ?? null;
  } catch {
    return null;
  }
}

/** Il collettivo dell'account collegato (l'organizzatore), se ce n'e' uno. */
export async function caricaMioCollettivo(): Promise<Collettivo | null> {
  try {
    const supabase = getClienteAuth();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from("collettivi")
      .select(COLONNE_COLLETTIVO)
      .eq("owner_utente_id", user.id)
      .maybeSingle();
    if (error) throw error;
    return (data as Collettivo | null) ?? null;
  } catch {
    return null;
  }
}

/** Elenco di tutti i collettivi attivi (home / admin). */
export async function elencaCollettivi(): Promise<Collettivo[]> {
  try {
    const { data, error } = await getSupabase()
      .from("collettivi")
      .select(COLONNE_COLLETTIVO)
      .order("nome", { ascending: true });
    if (error) throw error;
    return (data ?? []) as Collettivo[];
  } catch {
    return [];
  }
}

/** Elenco dei collettivi per il pannello admin (anche disattivati). */
export async function elencaCollettiviAdmin(): Promise<Collettivo[]> {
  try {
    const { data, error } = await getSupabase()
      .from("collettivi")
      .select(COLONNE_COLLETTIVO)
      .order("creato_il", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Collettivo[];
  } catch {
    return [];
  }
}

/**
 * Legge i muri di un collettivo provando prima le colonne con inizio/fine
 * (migrazione 0029) e poi quelle "storiche": cosi' l'elenco funziona anche
 * prima che la migrazione sia stata applicata.
 */
async function leggiMuri(collettivoId: string): Promise<MuroCollettivo[]> {
  for (const colonne of [COLONNE_MURO_FINESTRA, COLONNE_MURO]) {
    try {
      const { data, error } = await getSupabase()
        .from("muri")
        .select(colonne)
        .eq("collettivo_id", collettivoId)
        .order("creato_il", { ascending: false });
      if (error) throw error;
      // `colonne` e' una stringa costruita a runtime: il client Supabase non
      // riesce a dedurre la riga, quindi il cast passa per `unknown`.
      return (data ?? []) as unknown as MuroCollettivo[];
    } catch {
      // Prova la variante successiva (colonne non ancora presenti).
    }
  }
  return [];
}

/** Tutti i muri di un collettivo, dal piu' recente (bacheca). */
export async function elencaMuriCollettivo(
  collettivoId: string
): Promise<MuroCollettivo[]> {
  return leggiMuri(collettivoId);
}

/** Il muro-evento APERTO (in corso) di un collettivo, se esiste (AI1). */
export async function muroInCorso(
  collettivoId: string
): Promise<MuroCollettivo | null> {
  const muri = await leggiMuri(collettivoId);
  return (
    muri.find((m) => m.tipo === "evento" && muroScrivibile(m)) ?? null
  );
}

/** Il muro principale (bacheca) di un collettivo, se esiste. */
export async function muroPrincipale(
  collettivoId: string
): Promise<MuroCollettivo | null> {
  try {
    const { data, error } = await getSupabase()
      .from("muri")
      .select(COLONNE_MURO)
      .eq("collettivo_id", collettivoId)
      .eq("tipo", "principale")
      .maybeSingle();
    if (error) throw error;
    return (data as unknown as MuroCollettivo | null) ?? null;
  } catch {
    return null;
  }
}

/** La destinazione del QR del collettivo: muro in corso, o muro principale. */
export async function muroDestinazione(
  collettivoId: string
): Promise<MuroCollettivo | null> {
  const inCorso = await muroInCorso(collettivoId);
  if (inCorso) return inCorso;
  return muroPrincipale(collettivoId);
}

/** Il collettivo a cui appartiene un muro (per mostrare l'icona accanto al nome). */
export async function collettivoDelMuro(
  muroSlug: string
): Promise<Collettivo | null> {
  try {
    const { data, error } = await getSupabase()
      .from("muri")
      .select("collettivo_id, collettivi:collettivo_id(" + COLONNE_COLLETTIVO + ")")
      .eq("slug", muroSlug)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const c = (data as { collettivi?: unknown }).collettivi;
    if (Array.isArray(c)) return (c[0] as Collettivo) ?? null;
    return (c as Collettivo | null) ?? null;
  } catch {
    return null;
  }
}

/**
 * Crea/aggiorna un collettivo. Deve essere chiamata da un amministratore:
 * la policy RLS rifiuta tutti gli altri (0022).
 */
export async function salvaCollettivo(input: {
  id?: string;
  slug: string;
  nome: string;
  descrizione?: string | null;
  categoria_id?: string | null;
  emoji?: string | null;
  foto_url?: string | null;
  owner_utente_id?: string;
  attivo?: boolean;
}): Promise<{ ok: true; collettivo: Collettivo } | { ok: false; errore: string }> {
  try {
    const supabase = getClienteAuth();
    const riga: Record<string, unknown> = {
      slug: input.slug,
      nome: input.nome,
      descrizione: input.descrizione ?? null,
      categoria_id: input.categoria_id ?? null,
      emoji: input.emoji ?? null,
      foto_url: input.foto_url ?? null,
      attivo: input.attivo ?? true,
    };
    if (input.owner_utente_id) riga.owner_utente_id = input.owner_utente_id;

    if (input.id) {
      const { data, error } = await supabase
        .from("collettivi")
        .update(riga)
        .eq("id", input.id)
        .select(COLONNE_COLLETTIVO)
        .single();
      if (error || !data) throw error ?? new Error("aggiornamento fallito");
      return { ok: true, collettivo: data as Collettivo };
    }

    const { data, error } = await supabase
      .from("collettivi")
      .insert(riga)
      .select(COLONNE_COLLETTIVO)
      .single();
    if (error || !data) throw error ?? new Error("creazione fallita");
    return { ok: true, collettivo: data as Collettivo };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "operazione non riuscita";
    return { ok: false, errore: msg };
  }
}

/**
 * Crea un muro del collettivo (principale o evento). Admin o organizzatore.
 * La sicurezza e' nella RLS (0025).
 */
export async function creaMuroCollettivo(input: {
  slug: string;
  nome: string;
  collettivo_id: string;
  tipo: "evento" | "principale";
  data_evento?: string | null;
  data_inizio?: string | null;
  data_fine?: string | null;
}): Promise<{ ok: true; muro: MuroCollettivo } | { ok: false; errore: string }> {
  try {
    const riga: Record<string, unknown> = {
      slug: input.slug,
      nome: input.nome,
      collettivo_id: input.collettivo_id,
      tipo: input.tipo,
      stato: "aperto",
    };
    // Le colonne inizio/fine esistono solo dopo la migrazione 0029: le
    // includiamo solo quando sono state davvero compilate.
    if (input.data_evento) riga.data_evento = input.data_evento;
    if (input.data_inizio) riga.data_inizio = input.data_inizio;
    if (input.data_fine) riga.data_fine = input.data_fine;

    const { data, error } = await getClienteAuth()
      .from("muri")
      .insert(riga)
      .select(COLONNE_MURO)
      .single();
    if (error || !data) throw error ?? new Error("creazione muro fallita");
    return { ok: true, muro: data as MuroCollettivo };
  } catch (e) {
    return {
      ok: false,
      errore: e instanceof Error ? e.message : "Operazione non riuscita.",
    };
  }
}

/**
 * Apre un nuovo muro-evento per il collettivo, chiudendo quello in corso
 * (funzione DB apri_muro_evento, 0026). Solo l'organizzatore puo' farlo.
 */
export async function apriMuroEvento(input: {
  collettivoId: string;
  slug: string;
  nome: string;
  dataInizio?: string | null;
  dataFine?: string | null;
}): Promise<{ ok: true; muro: MuroCollettivo } | { ok: false; errore: string }> {
  try {
    const { data, error } = await getClienteAuth().rpc("apri_muro_evento", {
      p_collettivo: input.collettivoId,
      p_slug: input.slug,
      p_nome: input.nome,
      p_data_inizio: input.dataInizio ?? null,
      p_data_fine: input.dataFine ?? null,
    });
    if (error || !data) throw error ?? new Error("apertura muro fallita");
    return { ok: true, muro: data as MuroCollettivo };
  } catch (e) {
    return {
      ok: false,
      errore: e instanceof Error ? e.message : "Operazione non riuscita.",
    };
  }
}

/** Chiude un muro (sola lettura). Admin o organizzatore (RLS 0025). */
export async function chiudiMuro(slug: string): Promise<boolean> {
  try {
    const { error } = await getClienteAuth()
      .from("muri")
      .update({ stato: "chiuso" })
      .eq("slug", slug);
    return !error;
  } catch {
    return false;
  }
}

/** Riapre un muro (torna scrivibile). Admin o organizzatore (RLS 0025). */
export async function riapriMuro(slug: string): Promise<boolean> {
  try {
    const { error } = await getClienteAuth()
      .from("muri")
      .update({ stato: "aperto" })
      .eq("slug", slug);
    return !error;
  } catch {
    return false;
  }
}

/** Trasforma un testo libero in uno slug valido (minuscole, numeri, trattini). */
export function slugify(testo: string): string {
  return testo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/^-+|-+$/g, "");
}

/** Cancella un collettivo (solo admin, RLS 0022). */
export async function cancellaCollettivo(id: string): Promise<boolean> {
  try {
    const { error } = await getClienteAuth()
      .from("collettivi")
      .delete()
      .eq("id", id);
    return !error;
  } catch {
    return false;
  }
}
/**
 * Foto profilo del collettivo (quadrata).
 *
 * Il file va nel bucket pubblico "avatar", nella cartella dell'account
 * (la policy di storage consente di scrivere solo nella propria cartella).
 * Il nome cambia a ogni caricamento: cosi' l'URL pubblico cambia e non
 * resta in cache la vecchia immagine.
 */
export type EsitoFotoCollettivo =
  | { ok: true; url: string }
  | { ok: false; errore: string };

export async function caricaFotoCollettivoBlob(
  blob: Blob
): Promise<EsitoFotoCollettivo> {
  try {
    const supabase = getClienteAuth();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, errore: "Accedi prima di cambiare la foto." };

    const percorso = `${user.id}/collettivo-${Date.now()}.jpg`;
    const { error } = await supabase.storage
      .from("avatar")
      .upload(percorso, blob, { contentType: "image/jpeg", upsert: true });
    if (error) return { ok: false, errore: "Caricamento non riuscito." };

    const { data: pubblico } = supabase.storage
      .from("avatar")
      .getPublicUrl(percorso);
    return { ok: true, url: pubblico.publicUrl };
  } catch {
    return { ok: false, errore: "Errore di rete. Riprova." };
  }
}

/** Salva la foto (gia' caricata) sul proprio collettivo (RPC 0029). */
export async function salvaFotoCollettivo(
  url: string
): Promise<{ ok: true; collettivo: Collettivo } | { ok: false; errore: string }> {
  try {
    const { data, error } = await getClienteAuth().rpc(
      "aggiorna_foto_collettivo",
      { p_url: url }
    );
    if (error || !data) throw error ?? new Error("salvataggio fallito");
    return { ok: true, collettivo: data as Collettivo };
  } catch (e) {
    return {
      ok: false,
      errore: e instanceof Error ? e.message : "Operazione non riuscita.",
    };
  }
}

/**
 * Chiude i muri-evento scaduti (data_fine passata). Idempotente: la si puo'
 * chiamare all'apertura di una pagina, anche da anonimi.
 */
export async function chiudiMuriScaduti(): Promise<void> {
  try {
    await getSupabase().rpc("chiudi_muri_evento_scaduti");
  } catch {
    // Nessun problema: senza la funzione lo stato resta quello salvato.
  }
}
