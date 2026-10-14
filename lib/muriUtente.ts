import { getClienteAuth } from "@/lib/clienteAuth";

/**
 * Muro personale dell'utente (sfondo disegnato con l'editor a canvas).
 *
 * Sicurezza — il muro NON e' pubblico:
 *   - vive nel bucket PRIVATO "muri-utente" (vedi 0032_muro_personale.sql);
 *   - per aprirlo serve un URL firmato, generato solo da un client autenticato
 *     (la policy di storage consente la lettura ai soli utenti registrati);
 *   - un ospite non registrato non ha ne' lettura ne' URL: non puo' vedere il
 *     muro personale di nessuno.
 */

const BUCKET = "muri-utente";
/** Durata dell'URL firmato: 1 ora. */
const SCADENZA_FIRMA = 3600;

const SEGNALE_MIGRAZIONE =
  /PGRST205|PGRST204|schema cache|does not exist|relation .* does not exist|column .* does not exist/i;

export const MESSAGGIO_MURO_MIGRAZIONE =
  "Il database non e' ancora pronto per i muri personali. Esegui nell'SQL Editor di Supabase: supabase/migrations/0032_muro_personale.sql";

export type EsitoMuro = { ok: true } | { ok: false; errore: string };

/** Percorso (mai URL) del muro dell'utente nello storage privato. */
export function percorsoMuro(userId: string, versione: number | string): string {
  return `${userId}/muro-${versione}.jpg`;
}

/**
 * URL firmato del muro personale di `userId`, oppure null.
 *
 * Restituisce null anche quando il visitatore non e' autenticato: gli ospiti
 * non vedono i muri personali degli altri. La firma scade dopo 1 ora e viene
 * rigenerata a ogni apertura della pagina.
 */
export async function urlMuroFirmato(userId: string): Promise<string | null> {
  if (!userId) return null;
  try {
    const supabase = getClienteAuth();
    const { data: sessione } = await supabase.auth.getSession();
    // Ospite: nessun accesso ai muri personali (nemmeno al proprio).
    if (!sessione.session) return null;

    const { data: riga, error } = await supabase
      .from("profili")
      .select("muro_url")
      .eq("id", userId)
      .maybeSingle();
    if (error || !riga?.muro_url) return null;

    const { data: firmato, error: erroreFirma } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(riga.muro_url as string, SCADENZA_FIRMA);
    if (erroreFirma || !firmato?.signedUrl) return null;

    return firmato.signedUrl;
  } catch {
    return null;
  }
}

/**
 * Salva il muro personale dell'utente connesso.
 *
 * Usa un nome FILE VERSIONATO (muro-<timestamp>.jpg): ogni salvataggio crea un
 * oggetto nuovo, cosi' il browser non mostra mai una versione vecchia in cache
 * e la nuova immagine compare subito. Il file precedente viene poi rimosso.
 */
export async function salvaMuro(blob: Blob): Promise<EsitoMuro> {
  try {
    const supabase = getClienteAuth();
    const { data } = await supabase.auth.getUser();
    const utente = data.user;
    if (!utente) return { ok: false, errore: "Accedi per salvare il tuo muro." };

    const versione = Date.now();
    const percorso = percorsoMuro(utente.id, versione);

    const { error: erroreUpload } = await supabase.storage
      .from(BUCKET)
      .upload(percorso, blob, {
        contentType: "image/jpeg",
        upsert: true,
        cacheControl: "0",
      });

    if (erroreUpload) {
      return {
        ok: false,
        errore: SEGNALE_MIGRAZIONE.test(erroreUpload.message)
          ? MESSAGGIO_MURO_MIGRAZIONE
          : "Non e' stato possibile caricare il disegno. Riprova.",
      };
    }

    const { error: erroreProfilo } = await supabase
      .from("profili")
      .upsert({
        id: utente.id,
        muro_url: percorso,
        muro_aggiornato_il: new Date().toISOString(),
      });

    if (erroreProfilo) {
      return {
        ok: false,
        errore: SEGNALE_MIGRAZIONE.test(erroreProfilo.message)
          ? MESSAGGIO_MURO_MIGRAZIONE
          : "Salvataggio non riuscito. Riprova.",
      };
    }

    // Pulizia: elimina i vecchi file dello stesso utente (best effort).
    void pulisciVecchieVersioni(utente.id, percorso);

    return { ok: true };
  } catch {
    return { ok: false, errore: "Errore di rete. Riprova." };
  }
}

/** Rimuove i muri precedenti dell'utente, lasciando solo `percorsoTenere`. */
async function pulisciVecchieVersioni(
  userId: string,
  percorsoTenere: string
): Promise<void> {
  try {
    const supabase = getClienteAuth();
    const { data: elenco } = await supabase.storage
      .from(BUCKET)
      .list(userId, { limit: 100 });
    if (!elenco?.length) return;
    const nomeTenere = percorsoTenere.split("/").pop();
    const daRimuovere = elenco
      .filter((o) => o.name !== nomeTenere)
      .map((o) => `${userId}/${o.name}`);
    if (daRimuovere.length) {
      await supabase.storage.from(BUCKET).remove(daRimuovere);
    }
  } catch {
    // Pulizia non essenziale: se fallisce, il muro nuovo funziona comunque.
  }
}

/** Rimuove il muro personale dell'utente connesso (file + riferimento). */
export async function rimuoviMuro(): Promise<EsitoMuro> {
  try {
    const supabase = getClienteAuth();
    const { data } = await supabase.auth.getUser();
    const utente = data.user;
    if (!utente) return { ok: false, errore: "Accedi per modificare il tuo muro." };

    const { data: elenco } = await supabase.storage
      .from(BUCKET)
      .list(utente.id, { limit: 100 });
    if (elenco?.length) {
      await supabase.storage
        .from(BUCKET)
        .remove(elenco.map((o) => `${utente.id}/${o.name}`));
    }

    const { error } = await supabase
      .from("profili")
      .update({ muro_url: null, muro_aggiornato_il: null })
      .eq("id", utente.id);

    if (error) {
      return {
        ok: false,
        errore: SEGNALE_MIGRAZIONE.test(error.message)
          ? MESSAGGIO_MURO_MIGRAZIONE
          : "Rimozione non riuscita. Riprova.",
      };
    }
    return { ok: true };
  } catch {
    return { ok: false, errore: "Errore di rete. Riprova." };
  }
}

/** Evento sul browser: il muro personale e' cambiato, lo sfondo si aggiorna. */
export const EVENTO_MURO = "muri-parlanti:muro-aggiornato";

/** Segnala a tutti gli sfondi (SfondoMuro) di ricaricare l'immagine. */
export function annunciaMuroAggiornato(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVENTO_MURO));
}
