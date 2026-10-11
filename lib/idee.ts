import { getClienteAuth } from "@/lib/clienteAuth";

/**
 * "Fonda un muro": le proposte degli utenti.
 *
 * Chiunque (anche senza account) puo' inviare una proposta: un punto sulla
 * mappa, la via ricavata da quel punto e il motivo (almeno 10 parole).
 * Le proposte le legge e le gestisce SOLO l'amministratore: la sicurezza
 * vera e' nel database (RLS, migrazione 0018). Questo file e' il ponte lato
 * app; se la migrazione non e' ancora stata eseguita le funzioni degradano
 * con un errore leggibile invece di rompere l'app.
 */

/** Punto geografico: [latitudine, longitudine]. */
export type Punto = [number, number];

export type StatoIdea = "nuova" | "approvata" | "rifiutata";

export type IdeaIdea = {
  id: string;
  creato_il: string;
  utente_id: string | null;
  lat: number;
  lng: number;
  via: string | null;
  motivo: string;
  stato: StatoIdea;
};

/** Numero minimo di parole richiesto nel "perche'". */
export const PAROLE_MINIME = 10;

/** Conta le parole di un testo (spazi, a capo e tab multipli contano uno). */
export function contaParole(testo: string): number {
  const pulito = testo.trim();
  if (!pulito) return 0;
  return pulito.split(/\s+/).filter(Boolean).length;
}

export type EsitoIdea =
  | { ok: true; id: string }
  | { ok: false; errore: string };

/** Traduce gli errori marcati del database in messaggi leggibili. */
function messaggioErrore(messaggio: string): string {
  if (messaggio.includes("muri_idea:motivo_corto")) {
    return "Il perché deve avere almeno 10 parole.";
  }
  return messaggio;
}

/**
 * Invia una proposta. Firmata con l'account se c'e' un utente collegato,
 * altrimenti anonima. Il punto e il motivo sono obbligatori.
 */
export async function inviaIdea(input: {
  lat: number;
  lng: number;
  via?: string | null;
  motivo: string;
}): Promise<EsitoIdea> {
  try {
    if (!Number.isFinite(input.lat) || !Number.isFinite(input.lng)) {
      return { ok: false, errore: "Indica il punto sulla mappa." };
    }
    if (contaParole(input.motivo) < PAROLE_MINIME) {
      return { ok: false, errore: `Il perché deve avere almeno ${PAROLE_MINIME} parole.` };
    }

    const supabase = getClienteAuth();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const riga: Record<string, unknown> = {
      lat: Number(input.lat.toFixed(6)),
      lng: Number(input.lng.toFixed(6)),
      motivo: input.motivo.trim(),
      utente_id: user?.id ?? null,
    };
    if (input.via) riga.via = input.via;

    const { data, error } = await supabase
      .from("idee_muri")
      .insert(riga)
      .select("id")
      .single();
    if (error) throw new Error(messaggioErrore(error.message));
    return { ok: true, id: String(data.id) };
  } catch (e) {
    return {
      ok: false,
      errore:
        e instanceof Error
          ? messaggioErrore(e.message)
          : "Non sono riuscito a inviare la proposta.",
    };
  }
}

/**
 * Elenca tutte le proposte ricevute (solo amministratore).
 * In caso di errore ritorna una lista vuota.
 */
export async function elencaIdee(): Promise<IdeaIdea[]> {
  try {
    const supabase = getClienteAuth();
    const { data, error } = await supabase
      .from("idee_muri")
      .select("id, creato_il, utente_id, lat, lng, via, motivo, stato")
      .order("creato_il", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: String(r.id),
      creato_il: String(r.creato_il),
      utente_id: r.utente_id ?? null,
      lat: Number(r.lat),
      lng: Number(r.lng),
      via: r.via ?? null,
      motivo: String(r.motivo ?? ""),
      stato: (r.stato as StatoIdea) ?? "nuova",
    }));
  } catch {
    return [];
  }
}

/** Cambia lo stato di moderazione di una proposta (solo amministratore). */
export async function cambiaStatoIdea(
  id: string,
  stato: StatoIdea
): Promise<EsitoIdea> {
  try {
    const supabase = getClienteAuth();
    const { error } = await supabase
      .from("idee_muri")
      .update({ stato })
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true, id };
  } catch (e) {
    return {
      ok: false,
      errore:
        e instanceof Error ? e.message : "Non sono riuscito ad aggiornare lo stato.",
    };
  }
}

/** Cancella una proposta (solo amministratore). */
export async function eliminaIdea(id: string): Promise<EsitoIdea> {
  try {
    const supabase = getClienteAuth();
    const { error } = await supabase.from("idee_muri").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true, id };
  } catch (e) {
    return {
      ok: false,
      errore:
        e instanceof Error ? e.message : "Non sono riuscito a cancellare la proposta.",
    };
  }
}
