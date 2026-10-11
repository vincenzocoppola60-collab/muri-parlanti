/**
 * Temi dell'interfaccia.
 *
 * Un tema NON tocca i dati: cambia la "grafica" del sito. Oltre ai colori
 * (le variabili di Tailwind rimappate in app/globals.css) un tema puo' cambiare
 * il font generale e le cornici dei riquadri: e' quello che fa "graffiti"
 * (font marker + cornici disegnate a mano). Le ICONE del menu restano sempre le
 * stesse (quelle classiche), come richiesto.
 *
 * La scelta resta sul dispositivo (localStorage) e, per ora, e' proposta solo
 * agli amministratori nella pagina delle impostazioni.
 */

export type CodiceTema = "ambra" | "graffiti";

export type Tema = {
  codice: CodiceTema;
  /** Chiave di traduzione del nome (vedi lib/i18n.tsx: tema.ambra, tema.graffiti). */
  chiave: string;
  /** Due colori di anteprima: [accento, sfondo]. */
  anteprima: [string, string];
};

/** I temi disponibili. Il primo (ambra) e' quello attuale dell'app. */
export const TEMI: Tema[] = [
  { codice: "ambra", chiave: "tema.ambra", anteprima: ["#ffd236", "#0c0a09"] },
  { codice: "graffiti", chiave: "tema.graffiti", anteprima: ["#ffd236", "#1c1917"] },
];

export const TEMA_PREDEFINITO: CodiceTema = "ambra";
export const TEMA_KEY = "muri-parlanti:tema";

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
 * sempre la grafica di partenza.
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
}
