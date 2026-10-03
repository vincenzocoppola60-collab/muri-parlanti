/**
 * Nessun registro fisso di muri: le strade non vengono mostrate finche'
 * non vengono scansionate (e salvate per dispositivo).
 * L'URL /muro/<slug> funziona per qualsiasi slug valido: il nome viene
 * ricavato dal percorso. Questo permette di aggiungere muri futuri
 * senza modificare il codice.
 */
const SLUG_VALIDO = /^[a-z0-9]{2,40}(?:-[a-z0-9]+)*$/;

/**
 * Normalizza un segmento di URL in uno slug valido.
 * Accetta maiuscole, spazi e accenti e li converte.
 * Ritorna null se il valore non e' un luogo utilizzabile.
 */
export function normalizzaLuogo(raw: string): string | null {
  const slug = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

  return SLUG_VALIDO.test(slug) ? slug : null;
}

/** Nome da mostrare, derivato dallo slug (title-case, es. "via-roma" -> "Via Roma"). */
export function nomeLuogo(slug: string): string {
  return slug
    .split("-")
    .map((parola) => parola.charAt(0).toUpperCase() + parola.slice(1))
    .join(" ");
}

/**
 * Estrae lo slug di un muro da un testo qualsiasi (URL del QR, slug, ecc.).
 * Accetta solo URL che puntano a /muro/<slug> oppure slug semplici:
 * un URL generico senza /muro/ viene rifiutato.
 */
export function slugDaTesto(testo: string): string | null {
  const match = testo.match(/\/muro\/([a-z0-9][a-z0-9-]*)/i);
  if (match) return normalizzaLuogo(match[1]);
  if (testo.includes("://") || testo.includes("/")) return null;
  return normalizzaLuogo(testo);
}
