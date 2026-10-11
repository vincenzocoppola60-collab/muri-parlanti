/**
 * Icone per tema.
 *
 * Stessa struttura del sito, stesso layout: cambiano SOLO i simboli delle
 * icone, come i temi della PSP cambiavano icone e personaggi. Ogni tema ha
 * il suo "carattere" ma mantiene il significato di ogni voce.
 */
import type { CodiceTema } from "./temi";

export type ChiaveIcona =
  | "home"
  | "profilo"
  | "ospite"
  | "mieiMuri"
  | "fondaMuro"
  | "salvati"
  | "scansiona"
  | "impostazioni"
  | "admin"
  | "attacca";

/** Icone per ciascun tema. `ambra` = le emoji storiche dell'app. */
export const ICONE_TEMA: Record<CodiceTema, Record<ChiaveIcona, string>> = {
  // Tema di partenza: emoji classiche.
  ambra: {
    home: "🏠",
    profilo: "🧑",
    ospite: "👤",
    mieiMuri: "🧱",
    fondaMuro: "🏗️",
    salvati: "❤️",
    scansiona: "📷",
    impostazioni: "⚙️",
    admin: "🛠️",
    attacca: "📌",
  },
  // Tema "Oceano": personaggi e cose del mare.
  oceano: {
    home: "🏝️",
    profilo: "🧜",
    ospite: "🐬",
    mieiMuri: "🪸",
    fondaMuro: "⚓",
    salvati: "🐚",
    scansiona: "🤿",
    impostazioni: "🧭",
    admin: "🐙",
    attacca: "🌊",
  },
  // Tema "Magenta": mondo dolce e luccicante.
  magenta: {
    home: "🏩",
    profilo: "🦄",
    ospite: "🧸",
    mieiMuri: "🍭",
    fondaMuro: "💎",
    salvati: "💖",
    scansiona: "🔮",
    impostazioni: "🎛️",
    admin: "👑",
    attacca: "🎀",
  },
};

/** Icona del tema richiesto (o del tema di partenza se manca). */
export function iconaTema(codice: CodiceTema, chiave: ChiaveIcona): string {
  return ICONE_TEMA[codice]?.[chiave] ?? ICONE_TEMA.ambra[chiave];
}
