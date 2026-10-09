/**
 * Font disponibili per i post-it.
 *
 * Tutti OFL (Google Fonts): liberi anche per uso commerciale.
 * Tre famiglie: a mano (handwriting), scrittura (script), graffiti/street.
 *
 * IMPORTANTE: i font NON sono legati al sistema di punti/livelli. Sono tutti
 * disponibili subito per chiunque abbia un account (vedi ScegliFont.tsx).
 *
 * I font sono esposti da next/font come variabili CSS sul <html>
 * (es. --font-caveat); qui teniamo codice, nome, categoria e variabile.
 */

export type CategoriaFont = "a-mano" | "scrittura" | "graffiti";

export type CodiceFont =
  // A mano
  | "caveat"
  | "shadows-into-light"
  | "indie-flower"
  | "patrick-hand"
  | "architects-daughter"
  | "kalam"
  | "gloria-hallelujah"
  | "coming-soon"
  // Scrittura
  | "satisfy"
  | "pacifico"
  | "sacramento"
  | "kaushan-script"
  | "alex-brush"
  | "bad-script"
  | "amatic-sc"
  // Graffiti / street
  | "permanent-marker"
  | "rock-salt"
  | "bangers"
  | "shrikhand"
  | "creepster"
  | "sedgwick-ave"
  | "rubik-spray-paint"
  | "rubik-wet-paint"
  | "nosifer"
  | "titan-one"
  | "luckiest-guy"
  | "bungee";

export type VoceFont = {
  codice: CodiceFont;
  nome: string;
  categoria: CategoriaFont;
  variabile: string;
};

export const FONTI: readonly VoceFont[] = [
  // ── A mano ────────────────────────────────────────────────────────────
  { codice: "caveat", nome: "Caveat", categoria: "a-mano", variabile: "--font-caveat" },
  {
    codice: "shadows-into-light",
    nome: "Shadows Into Light",
    categoria: "a-mano",
    variabile: "--font-shadows-into-light",
  },
  {
    codice: "indie-flower",
    nome: "Indie Flower",
    categoria: "a-mano",
    variabile: "--font-indie-flower",
  },
  {
    codice: "patrick-hand",
    nome: "Patrick Hand",
    categoria: "a-mano",
    variabile: "--font-patrick-hand",
  },
  {
    codice: "architects-daughter",
    nome: "Architects Daughter",
    categoria: "a-mano",
    variabile: "--font-architects-daughter",
  },
  { codice: "kalam", nome: "Kalam", categoria: "a-mano", variabile: "--font-kalam" },
  {
    codice: "gloria-hallelujah",
    nome: "Gloria Hallelujah",
    categoria: "a-mano",
    variabile: "--font-gloria-hallelujah",
  },
  {
    codice: "coming-soon",
    nome: "Coming Soon",
    categoria: "a-mano",
    variabile: "--font-coming-soon",
  },

  // ── Scrittura ─────────────────────────────────────────────────────────
  { codice: "satisfy", nome: "Satisfy", categoria: "scrittura", variabile: "--font-satisfy" },
  { codice: "pacifico", nome: "Pacifico", categoria: "scrittura", variabile: "--font-pacifico" },
  {
    codice: "sacramento",
    nome: "Sacramento",
    categoria: "scrittura",
    variabile: "--font-sacramento",
  },
  {
    codice: "kaushan-script",
    nome: "Kaushan Script",
    categoria: "scrittura",
    variabile: "--font-kaushan-script",
  },
  {
    codice: "alex-brush",
    nome: "Alex Brush",
    categoria: "scrittura",
    variabile: "--font-alex-brush",
  },
  {
    codice: "bad-script",
    nome: "Bad Script",
    categoria: "scrittura",
    variabile: "--font-bad-script",
  },
  { codice: "amatic-sc", nome: "Amatic SC", categoria: "scrittura", variabile: "--font-amatic-sc" },

  // ── Graffiti / street ─────────────────────────────────────────────────
  {
    codice: "permanent-marker",
    nome: "Permanent Marker",
    categoria: "graffiti",
    variabile: "--font-permanent-marker",
  },
  {
    codice: "rock-salt",
    nome: "Rock Salt",
    categoria: "graffiti",
    variabile: "--font-rock-salt",
  },
  { codice: "bangers", nome: "Bangers", categoria: "graffiti", variabile: "--font-bangers" },
  {
    codice: "shrikhand",
    nome: "Shrikhand",
    categoria: "graffiti",
    variabile: "--font-shrikhand",
  },
  {
    codice: "creepster",
    nome: "Creepster",
    categoria: "graffiti",
    variabile: "--font-creepster",
  },
  {
    codice: "sedgwick-ave",
    nome: "Sedgwick Ave",
    categoria: "graffiti",
    variabile: "--font-sedgwick-ave",
  },
  {
    codice: "rubik-spray-paint",
    nome: "Rubik Spray Paint",
    categoria: "graffiti",
    variabile: "--font-rubik-spray-paint",
  },
  {
    codice: "rubik-wet-paint",
    nome: "Rubik Wet Paint",
    categoria: "graffiti",
    variabile: "--font-rubik-wet-paint",
  },
  { codice: "nosifer", nome: "Nosifer", categoria: "graffiti", variabile: "--font-nosifer" },
  {
    codice: "titan-one",
    nome: "Titan One",
    categoria: "graffiti",
    variabile: "--font-titan-one",
  },
  {
    codice: "luckiest-guy",
    nome: "Luckiest Guy",
    categoria: "graffiti",
    variabile: "--font-luckiest-guy",
  },
  { codice: "bungee", nome: "Bungee", categoria: "graffiti", variabile: "--font-bungee" },
] as const;

export const N_FONTI = FONTI.length;

/** Ordine e etichetta i18n delle categorie (per il selettore). */
export const CATEGORIE: readonly { id: CategoriaFont; chiave: string }[] = [
  { id: "a-mano", chiave: "editor.fontCatAMano" },
  { id: "scrittura", chiave: "editor.fontCatScrittura" },
  { id: "graffiti", chiave: "editor.fontCatGraffiti" },
];

/** Trova il font dal codice. */
export function fontDaCodice(
  c: CodiceFont | null | undefined
): VoceFont | null {
  if (!c) return null;
  return FONTI.find((f) => f.codice === c) ?? null;
}

/** True se il codice è valido. */
export function eCodiceFont(v: unknown): v is CodiceFont {
  return typeof v === "string" && FONTI.some((f) => f.codice === v);
}

/** Font di una data categoria. */
export function fontDiCategoria(cat: CategoriaFont): VoceFont[] {
  return FONTI.filter((f) => f.categoria === cat);
}

/** CSS font-family per un codice. */
export function cssFontFamily(codice: CodiceFont): string {
  const f = fontDaCodice(codice);
  return f ? `var(${f.variabile})` : "var(--font-caveat)";
}
