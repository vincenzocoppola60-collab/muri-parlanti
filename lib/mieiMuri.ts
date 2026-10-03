export type MioMuro = {
  slug: string;
  nome: string;
  salvatoIl: string;
};

const CHIAVE = "muri-parlanti:miei-muri";
export const MASSIMO = 20;

/**
 * Slug delle vecchie strade di esempio (bozze) salvate durante i test,
 * prima della rimozione del registro fisso. Vengono rimosse dai salvati
 * del dispositivo e nascoste dall'elenco account.
 */
const BOZZE_LEGACY = new Set([
  "via-roma",
  "via-napoli",
  "piazza-garibaldi",
  "lungomare",
]);

/** True se lo slug è una delle vecchie bozze di esempio. */
export function isBozzaLegacy(slug: string): boolean {
  return BOZZE_LEGACY.has(slug);
}

/** Muri salvati su questo dispositivo (localStorage). */
export function caricaMieiMuri(): MioMuro[] {
  if (typeof window === "undefined") return [];
  try {
    const crudo = window.localStorage.getItem(CHIAVE);
    if (!crudo) return [];
    const dati: unknown = JSON.parse(crudo);
    if (!Array.isArray(dati)) return [];
    return dati.filter(
      (m): m is MioMuro =>
        typeof m === "object" &&
        m !== null &&
        typeof (m as MioMuro).slug === "string" &&
        typeof (m as MioMuro).nome === "string"
    );
  } catch {
    return [];
  }
}

function persisti(lista: MioMuro[]): void {
  try {
    window.localStorage.setItem(CHIAVE, JSON.stringify(lista.slice(0, MASSIMO)));
  } catch {
    // localStorage non disponibile (es. modalità privata): ignorato.
  }
}

/** Salva un muro tra i tuoi (senza duplicati) e restituisce la lista aggiornata. */
export function salvaMuro(slug: string, nome: string): MioMuro[] {
  const lista = [
    { slug, nome, salvatoIl: new Date().toISOString() },
    ...caricaMieiMuri().filter((m) => m.slug !== slug),
  ];
  persisti(lista);
  return lista;
}

/** Rimuove un muro dai salvati e restituisce la lista aggiornata. */
export function rimuoviMuro(slug: string): MioMuro[] {
  const lista = caricaMieiMuri().filter((m) => m.slug !== slug);
  persisti(lista);
  return lista;
}

/**
 * Rimuove dai salvati del dispositivo le vecchie bozze (strade di esempio).
 * Idempotente: chiamabile a ogni avvio, tocca solo gli slug legacy.
 */
export function pulisciBozze(): MioMuro[] {
  const lista = caricaMieiMuri().filter((m) => !isBozzaLegacy(m.slug));
  persisti(lista);
  return lista;
}
