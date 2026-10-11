/**
 * Temi dell'interfaccia (colori).
 *
 * Il tema NON tocca i dati: cambia solo la palette dell'app rimappando le
 * variabili colore di Tailwind v4 (vedi app/globals.css, i selettori
 * `html[data-tema="..."]`). La scelta resta sul dispositivo (localStorage) e,
 * per ora, e' proposta solo agli amministratori nella pagina delle impostazioni.
 */

export type CodiceTema = "ambra" | "oceano" | "magenta";

export type Tema = {
  codice: CodiceTema;
  /** Chiave di traduzione del nome (vedi lib/i18n.tsx: tema.ambra, ecc.). */
  chiave: string;
  /** Due colori di anteprima: [accento, sfondo]. */
  anteprima: [string, string];
};

/** I temi disponibili. Il primo (ambra) e' quello attuale dell'app. */
export const TEMI: Tema[] = [
  { codice: "ambra", chiave: "tema.ambra", anteprima: ["#ffd236", "#0c0a09"] },
  { codice: "oceano", chiave: "tema.oceano", anteprima: ["#93c5fd", "#020617"] },
  { codice: "magenta", chiave: "tema.magenta", anteprima: ["#f9a8d4", "#09090b"] },
];

export const TEMA_PREDEFINITO: CodiceTema = "ambra";
export const TEMA_KEY = "muri-parlanti:tema";

/**
 * Evento emesso su window quando il tema cambia. Serve ai componenti (icone)
 * per ridisegnarsi subito, senza ricaricare la pagina (vedi lib/useTema.ts).
 */
export const EVENTO_TEMA = "muri-parlanti:tema-cambiato";

/** True se il valore e' un codice di tema valido. */
export function eCodiceTema(valore: string | null): valore is CodiceTema {
  return !!valore && TEMI.some((t) => t.codice === valore);
}

/** Legge il tema salvato sul dispositivo (o quello predefinito). */
export function leggiTemaSalvato(): CodiceTema {
  if (typeof window === "undefined") return TEMA_PREDEFINITO;
  try {
    const salvato = window.localStorage.getItem(TEMA_KEY);
    return eCodiceTema(salvato) ? salvato : TEMA_PREDEFINITO;
  } catch {
    return TEMA_PREDEFINITO;
  }
}

/**
 * Applica il tema: aggiorna `data-tema` su <html> (per il CSS) e lo ricorda
 * sul dispositivo. Il tema predefinito non mette l'attributo, cosi' si usa
 * sempre la palette di partenza di Tailwind.
 */
export function applicaTema(codice: CodiceTema): void {
  if (typeof document !== "undefined") {
    if (codice === TEMA_PREDEFINITO) {
      document.documentElement.removeAttribute("data-tema");
    } else {
      document.documentElement.setAttribute("data-tema", codice);
    }
  }
  try {
    window.localStorage.setItem(TEMA_KEY, codice);
  } catch {
    // localStorage non disponibile (privacy mode): la scelta vale per la sessione.
  }
  // Avvisa la UI (icone del menu, ecc.) che il tema e' cambiato.
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(EVENTO_TEMA));
  }
}
