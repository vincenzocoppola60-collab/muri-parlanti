/**
 * Font disponibili per i post-it.
 *
 * Tutti OFL (Google Fonts): liberi anche per uso commerciale.
 * Stile: writing, graffiti, a mano, script, street.
 *
 * I 20 font sono esposti da next/font come variabili CSS sul <html>
 * (es. --font-caveat); qui teniamo codice, nome e variabile, piu' la regola
 * di sblocco per livello (la stessa idea degli stili, vedi lib/stili.ts).
 */

export type CodiceFont =
  | "caveat"
  | "shadows-into-light"
  | "indie-flower"
  | "patrick-hand"
  | "architects-daughter"
  | "amatic-sc"
  | "coming-soon"
  | "kalam"
  | "gloria-hallelujah"
  | "satisfy"
  | "pacifico"
  | "sacramento"
  | "kaushan-script"
  | "rock-salt"
  | "bad-script"
  | "alex-brush"
  | "permanent-marker"
  | "bangers"
  | "shrikhand"
  | "creepster";

export const FONTI: readonly {
  codice: CodiceFont;
  nome: string;
  variabile: string;
}[] = [
  { codice: "caveat", nome: "Caveat", variabile: "--font-caveat" },
  {
    codice: "shadows-into-light",
    nome: "Shadows Into Light",
    variabile: "--font-shadows-into-light",
  },
  {
    codice: "indie-flower",
    nome: "Indie Flower",
    variabile: "--font-indie-flower",
  },
  {
    codice: "patrick-hand",
    nome: "Patrick Hand",
    variabile: "--font-patrick-hand",
  },
  {
    codice: "architects-daughter",
    nome: "Architects Daughter",
    variabile: "--font-architects-daughter",
  },
  { codice: "amatic-sc", nome: "Amatic SC", variabile: "--font-amatic-sc" },
  {
    codice: "coming-soon",
    nome: "Coming Soon",
    variabile: "--font-coming-soon",
  },
  { codice: "kalam", nome: "Kalam", variabile: "--font-kalam" },
  {
    codice: "gloria-hallelujah",
    nome: "Gloria Hallelujah",
    variabile: "--font-gloria-hallelujah",
  },
  { codice: "satisfy", nome: "Satisfy", variabile: "--font-satisfy" },
  { codice: "pacifico", nome: "Pacifico", variabile: "--font-pacifico" },
  { codice: "sacramento", nome: "Sacramento", variabile: "--font-sacramento" },
  {
    codice: "kaushan-script",
    nome: "Kaushan Script",
    variabile: "--font-kaushan-script",
  },
  { codice: "rock-salt", nome: "Rock Salt", variabile: "--font-rock-salt" },
  { codice: "bad-script", nome: "Bad Script", variabile: "--font-bad-script" },
  {
    codice: "alex-brush",
    nome: "Alex Brush",
    variabile: "--font-alex-brush",
  },
  {
    codice: "permanent-marker",
    nome: "Permanent Marker",
    variabile: "--font-permanent-marker",
  },
  { codice: "bangers", nome: "Bangers", variabile: "--font-bangers" },
  { codice: "shrikhand", nome: "Shrikhand", variabile: "--font-shrikhand" },
  { codice: "creepster", nome: "Creepster", variabile: "--font-creepster" },
] as const;

export const N_FONTI = FONTI.length;

/**
 * Livello minimo richiesto per ogni font (indice 0 = primo font).
 * Distribuzione sulle 7 soglie di `lib/livelli.ts` (max livello 7).
 */
export const LIVELLO_MINIMO_FONT: readonly number[] = [
  1, 1, 1, 1, // 1-4   → Neofita
  2, 2, 2, //    5-7   → Esploratore
  3, 3, 3, //    8-10  → Vagabondo
  4, 4, 4, //    11-13 → Viaggiatore
  5, 5, 5, //    14-16 → Cronista
  6, 6, //       17-18 → Narratore
  7, 7, //       19-20 → Leggenda dei muri
];

/** Trova il font dal codice. */
export function fontDaCodice(
  c: CodiceFont | null | undefined
): (typeof FONTI)[number] | null {
  if (!c) return null;
  return FONTI.find((f) => f.codice === c) ?? null;
}

/** True se il codice è valido. */
export function eCodiceFont(v: unknown): v is CodiceFont {
  return typeof v === "string" && FONTI.some((f) => f.codice === v);
}

/** Livello minimo per usare un font (1 se il codice non è valido). */
export function livelloMinimoFont(codice: CodiceFont | null | undefined): number {
  const i = FONTI.findIndex((f) => f.codice === codice);
  if (i < 0) return 1;
  return LIVELLO_MINIMO_FONT[i] ?? 1;
}

/** True se l'utente a questo livello può usare il font indicato. */
export function fontSbloccato(
  codice: CodiceFont | null | undefined,
  livelloUtente: number
): boolean {
  return livelloUtente >= livelloMinimoFont(codice);
}

/**
 * Primo font ancora bloccato e il livello che lo sblocca, per invitare a
 * salire di livello. null se sono già tutti disponibili.
 */
export function prossimoFontSblocco(
  livelloUtente: number
): { codice: CodiceFont; livello: number } | null {
  for (const f of FONTI) {
    const lv = livelloMinimoFont(f.codice);
    if (livelloUtente < lv) return { codice: f.codice, livello: lv };
  }
  return null;
}

/** CSS font-family per un codice. */
export function cssFontFamily(codice: CodiceFont): string {
  const f = fontDaCodice(codice);
  return f ? `var(${f.variabile})` : "var(--font-caveat)";
}
