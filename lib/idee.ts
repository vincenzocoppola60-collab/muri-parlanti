import { getClienteAuth } from "@/lib/clienteAuth";

/**
 * "Fonda un muro": le proposte degli utenti.
 *
 * Solo un utente REGISTRATO puo' inviare una proposta: un punto sulla mappa,
 * la via ricavata da quel punto e il motivo (almeno 10 parole).
 * L'invio passa dalla rotta server /api/idee, che verifica il token di sessione
 * e scrive con la service_role key: cosi' funziona anche se la policy di
 * INSERT sulla tabella non e' configurata (aggirando l'errore 42501 RLS).
 * Le proposte le legge e le gestisce SOLO l'amministratore.
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
 * Invia una proposta a nome dell'utente collegato. Serve una sessione valida:
 * senza accesso la funzione rifiuta (il muro lo fonda solo chi e' registrato).
 * Il punto e il motivo sono obbligatori.
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

    // Token di sessione dell'utente collegato (se non c'e', non si invia).
    const supabase = getClienteAuth();
    const { data: sessione } = await supabase.auth.getSession();
    const token = sessione.session?.access_token;
    if (!token) {
      return { ok: false, errore: "Devi accedere per proporre un muro." };
    }

    // L'invio vero avviene sul server, che scrive scavalzando la RLS.
    const r = await fetch("/api/idee", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        lat: input.lat,
        lng: input.lng,
        via: input.via ?? null,
        motivo: input.motivo,
      }),
    });
    const dati = (await r.json().catch(() => null)) as {
      ok?: boolean;
      id?: string;
      errore?: string;
    } | null;

    if (!r.ok || !dati?.ok || !dati.id) {
      return {
        ok: false,
        errore: messaggioErrore(dati?.errore ?? "Invio non riuscito. Riprova."),
      };
    }
    return { ok: true, id: String(dati.id) };
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
