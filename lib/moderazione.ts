/**
 * Moderazione dei contenuti dei post-it.
 *
 * Tre regole, applicate dal livello piu' severo al piu' blando:
 *   1. NSFW      -> parolacce sessuali/esplicite o domini per adulti.
 *   2. linguaggio -> insulti discriminatori (razziali/omofobi/disabilita').
 *   3. link       -> URL, domini e email nel testo o nel nickname.
 *
 * Serve a due scopi:
 *   - lato client (questo file) per il feedback immediato nell'editor;
 *   - lato database (migrazione 0013) come barriera vera, perche' l'insert
 *     dei post-it parte dal browser e non puo' essere l'unica difesa.
 *
 * Il testo viene normalizzato prima del confronto (minuscole, accenti
 * rimossi, separatori compattati) cosi' "c a z z o" viene riconosciuto come
 * "cazzo". Volutamente NON sciogliamo i numeri usati come lettere: una
 * scrittura come "PorCo D1O" passa, perche' non vogliamo essere troppo
 * aggressivi sulle varianti scritte "a mano".
 */

export type MotivoModerazione = "nsfw" | "linguaggio" | "link";

export type EsitoModerazione =
  | { ok: true }
  | { ok: false; motivo: MotivoModerazione; errore: string };

/* ------------------------------------------------------------------ *
 * Parole vietate
 * ------------------------------------------------------------------ */

/** Parolacce generiche: NESSUNA. Le espressive (cazzo/stronzo/merda) e le pesanti (bastardo/coglione/puttana) passano tutte. Restano bloccati solo gli insulti discriminatori (SLUR). */
const PAROLACCE: string[] = [];

/** Insulti discriminatori e slur (razziali/etnici, omofobi, sulla disabilita'): bloccati sempre. */
const SLUR = [
  "negraccio",
  "negro",
  "nigger",
  "nigga",
  "frocio",
  "faggot",
  "fagg0t",
  "retard",
  "terrone",
  "zingaro",
  "handicappato",
  "mongoloide",
  "ritardato",
];

/** Contenuti sessuali/espliciti (NSFW testuale). */
const NSFW_PAROLE = [
  "porno",
  "porn",
  "pornografia",
  "hardcore",
  "xxx",
  "nsfw",
  "sesso",
  "sex",
  "sexting",
  "orgasmo",
  "orgasm",
  "masturbazione",
  "masturbation",
  "masturbare",
  "pompino",
  "blowjob",
  "fellatio",
  "sesso anale",
  "hentai",
  "ecchi",
  "yaoi",
  "yuri",
  "nudista",
  "nudity",
  "naked",
  "penis",
  "pene",
  "vagina",
  "vulva",
  "sperma",
  "cumshot",
  "creampie",
  "escort",
  "onlyfans",
  "chaturbate",
  "transessuale",
];

/** Domini per adulti: un link a questi e' NSFW anche se il testo e' pulito. */
const NSFW_DOMINI = [
  "pornhub",
  "xvideos",
  "xnxx",
  "xhamster",
  "redtube",
  "youporn",
  "porn",
  "brazzers",
  "onlyfans",
  "onlyfan",
  "chaturbate",
  "cam4",
  "livejasmin",
  "stripchat",
  "bongacams",
  "spankbang",
  "eporner",
  "beeg",
  "youjizz",
  "motherless",
  "rule34",
  "nhentai",
  "hanime",
];

/* ------------------------------------------------------------------ *
 * Normalizzazione
 * ------------------------------------------------------------------ */

/** Minuscole + accenti rimossi (NFD). */
function sbase(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Scioglie il "leetspeak": solo i simboli speciali, non i numeri (per non bloccare "PorCo D1O"). */
function deLeet(s: string): string {
  return s
    .replace(/@/g, "a")
    .replace(/\$/g, "s")
    .replace(/!/g, "i")
    .replace(/\|/g, "i");
}

/** Forma "compatta": minuscole, leet sciolto, via tutti i separatori. */
function compatta(s: string): string {
  return deLeet(sbase(s)).replace(/[^a-z0-9]/g, "");
}

/** Forma "spaziata": separatori -> singolo spazio, con bordi pieni. */
function spaziata(s: string): string {
  return ` ${deLeet(sbase(s)).replace(/[^a-z0-9]+/g, " ").trim()} `;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Cerca una voce della lista nel testo.
 * - Sempre con confini di parola sulla forma spaziata (evita di colpire
 *   parole innocue che contengono la sequenza, es. "pass" vs "ass").
 * - In piu', sulla forma compatta per le voci lunghe (>= 5 lettere), cosi'
 *   si intercettano gli spazi/asterischi inseriti ad arte ("p o r c o d i o").
 */
function contieneParola(testo: string, voci: string[]): boolean {
  const sp = spaziata(testo);
  const cp = compatta(testo);
  for (const voce of voci) {
    const voceSp = spaziata(voce).trim();
    const re = new RegExp(`(?:^|\\s)${escapeRegex(voceSp)}(?:\\s|$)`, "i");
    if (re.test(sp)) return true;

    const voceCp = compatta(voce);
    if (voceCp.length >= 5 && cp.includes(voceCp)) return true;
  }
  return false;
}

/* ------------------------------------------------------------------ *
 * Rilevamento link
 * ------------------------------------------------------------------ */

/** TLD comuni usati per riconoscere un dominio scritto "nudo". */
const TLD =
  "com|net|org|edu|gov|mil|int|info|biz|io|co|it|de|fr|es|nl|uk|us|eu|ru|cn|to|ly|gl|be|tv|me|app|dev|xyz|online|site|shop|store|link|click|top|live|cc|ws|tk|ml|ga|cf|gq|club|xyz";

const RE_URL = /https?:\/\/[^\s]+/i;
const RE_WWW = /www\.[a-z0-9-]+\.[a-z]{2,}/i;
const RE_DOMINIO = new RegExp(
  `\\b[a-z0-9][a-z0-9-]{0,62}\\.(?:${TLD})\\b`,
  "i"
);
const RE_EMAIL = /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/i;
/** Dominio offuscato: "esempio [.] com" o "esempio (dot) it". */
const RE_DOMINIO_OFFUSCATO = new RegExp(
  `[a-z0-9-]{2,}\\s*(?:\\(\\s*(?:dot|punto)\\s*\\)|\\[\\s*\\.\\s*\\]|\\(\\s*\\.\\s*\\)|\\bdot\\b|\\bpunto\\b)\\s*(?:${TLD})\\b`,
  "i"
);
/** Handle social che di fatto sono un contatto: @nome, t.me/xxx, wa.me/xxx. */
const RE_HANDLE = /(?:^|\s)@[a-z0-9._]{3,}/i;

/** True se il testo contiene un link/URL/email/dominio. */
export function contieneLink(testo: string): boolean {
  const s = sbase(testo);
  if (!s.trim()) return false;
  if (RE_URL.test(s)) return true;
  if (RE_WWW.test(s)) return true;
  if (RE_EMAIL.test(s)) return true;
  // Il controllo dominio nudo richiede almeno una lettera nell'etichetta,
  // per non scambiare "3.5" o "1.2" per un dominio.
  if (RE_DOMINIO.test(s) && /[a-z]/.test(s.match(RE_DOMINIO)?.[0] ?? "")) {
    return true;
  }
  if (RE_DOMINIO_OFFUSCATO.test(s)) return true;
  if (RE_HANDLE.test(s)) return true;
  return false;
}

/** True se il testo contiene un dominio per adulti. */
export function contieneDominioNsfw(testo: string): boolean {
  const s = compatta(testo);
  return NSFW_DOMINI.some((d) => s.includes(d));
}

/* ------------------------------------------------------------------ *
 * Verifica complessiva
 * ------------------------------------------------------------------ */

const MESSAGGI: Record<MotivoModerazione, string> = {
  nsfw: "Il contenuto sembra di natura sessuale e non e' ammesso sul muro.",
  linguaggio:
    "Il pensiero contiene parole offensive e non puo' essere pubblicato.",
  link: "I link non sono ammessi nei pensieri. Usa il campo canzone per la musica.",
};

/**
 * Verifica un contenuto (testo + nickname) e ritorna il primo motivo di
 * rifiuto, oppure { ok: true }.
 */
export function verificaContenuto(input: {
  testo?: string | null;
  nickname?: string | null;
}): EsitoModerazione {
  const testo = input.testo ?? "";
  const nickname = input.nickname ?? "";
  const tutto = `${testo}\n${nickname}`;

  // 1) NSFW: dominio per adulti o lessico sessuale.
  if (contieneDominioNsfw(tutto) || contieneParola(tutto, NSFW_PAROLE)) {
    return { ok: false, motivo: "nsfw", errore: MESSAGGI.nsfw };
  }

  // 2) Linguaggio: insulti discriminatori.
  if (
    contieneParola(tutto, PAROLACCE) ||
    contieneParola(tutto, SLUR)
  ) {
    return { ok: false, motivo: "linguaggio", errore: MESSAGGI.linguaggio };
  }

  // 3) Link nel testo o nel nickname (il campo canzone e' separato e lecito).
  if (contieneLink(testo) || contieneLink(nickname)) {
    return { ok: false, motivo: "link", errore: MESSAGGI.link };
  }

  return { ok: true };
}

/** Errore leggibile per un motivo (utile dove serve solo il messaggio). */
export function messaggioMotivo(motivo: MotivoModerazione): string {
  return MESSAGGI[motivo];
}

/** Chiave i18n del messaggio, per mostrarlo nella lingua dell'utente. */
export function chiaveMotivo(motivo: MotivoModerazione): string {
  return `mod.${motivo}`;
}
