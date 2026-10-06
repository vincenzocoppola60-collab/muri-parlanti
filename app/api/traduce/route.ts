import { NextResponse } from "next/server";

/**
 * Traduzione lato server (usata dall'opzione "Traduci i post pubblici").
 *
 * Il browser non chiama mai direttamente un servizio esterno: manda qui il
 * testo e riceve la traduzione. Così la chiave/URL del servizio restano sul
 * server e il client non rivela il testo a terze parti non previste.
 *
 * Ordine di scelta:
 *  1) LIBRETRANSLATE_URL (+ LIBRETRANSLATE_API_KEY opzionale) se configurato;
 *  2) altrimenti l'endpoint pubblico di traduzione di Google;
 *  3) infine MyMemory, se Google non risponde.
 *
 * Nota: l'endpoint "a/single" di Google Translate risponde "Sorry..." (429)
 * alle richieste fatte da un server: si usa percio' l'endpoint
 * clients5/dict-chrome-ex, che restituisce lo stesso servizio in JSON.
 */

const LINGUE_AMMESSE = new Set(["it", "en", "es", "fr", "de"]);
const MAX_CARATTERI = 1200;

type Corpo = { testo?: unknown; a?: unknown };

export async function POST(request: Request) {
  let corpo: Corpo;
  try {
    corpo = (await request.json()) as Corpo;
  } catch {
    return NextResponse.json(
      { ok: false, errore: "Richiesta non valida." },
      { status: 400 }
    );
  }

  const testo = typeof corpo.testo === "string" ? corpo.testo.trim() : "";
  const a = typeof corpo.a === "string" ? corpo.a : "";

  if (!testo) {
    return NextResponse.json(
      { ok: false, errore: "Testo mancante." },
      { status: 400 }
    );
  }
  if (!LINGUE_AMMESSE.has(a)) {
    return NextResponse.json(
      { ok: false, errore: "Lingua non supportata." },
      { status: 400 }
    );
  }
  if (testo.length > MAX_CARATTERI) {
    return NextResponse.json(
      { ok: false, errore: "Testo troppo lungo da tradurre." },
      { status: 400 }
    );
  }

  // L'italiano è la lingua dei testi: nessuna traduzione necessaria.
  if (a === "it") {
    return NextResponse.json({ ok: true, testo, tradotto: false });
  }

  try {
    const tradotto = await traduci(testo, a);
    if (!tradotto) {
      return NextResponse.json(
        { ok: false, errore: "Traduzione non disponibile." },
        { status: 502 }
      );
    }
    return NextResponse.json({ ok: true, testo: tradotto, tradotto: true });
  } catch {
    return NextResponse.json(
      { ok: false, errore: "Servizio di traduzione non raggiungibile." },
      { status: 502 }
    );
  }
}

async function traduci(testo: string, a: string): Promise<string | null> {
  const libre = process.env.LIBRETRANSLATE_URL?.trim();
  if (libre) {
    const esito = await traduciConLibre(libre, testo, a);
    if (esito) return esito;
  }

  const google = await traduciConGoogle(testo, a);
  if (google) return google;

  return traduciConMyMemory(testo, a);
}

async function traduciConLibre(
  baseUrl: string,
  testo: string,
  a: string
): Promise<string | null> {
  const corpo: Record<string, string> = {
    q: testo,
    source: "auto",
    target: a,
    format: "text",
  };
  const chiave = process.env.LIBRETRANSLATE_API_KEY?.trim();
  if (chiave) corpo.api_key = chiave;

  const r = await fetch(baseUrl.replace(/\/$/, "") + "/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
    cache: "no-store",
  });
  if (!r.ok) return null;
  const dati = (await r.json().catch(() => null)) as {
    translatedText?: string;
  } | null;
  const fuori = dati?.translatedText?.trim();
  return fuori || null;
}

/** Header "da browser": l'endpoint pubblico non gradisce gli script. */
const HEADER_BROWSER = {
  Accept: "application/json,text/plain,*/*",
  "Accept-Language": "it-IT,it;q=0.9,en;q=0.8",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
};

async function traduciConGoogle(
  testo: string,
  a: string
): Promise<string | null> {
  const url =
    "https://clients5.google.com/translate_a/t?client=dict-chrome-ex" +
    `&sl=auto&tl=${encodeURIComponent(a)}&q=${encodeURIComponent(testo)}`;

  const r = await fetch(url, { cache: "no-store", headers: HEADER_BROWSER });
  if (!r.ok) return null;

  const dati = (await r.json().catch(() => null)) as unknown;
  return estraiTraduzione(dati);
}

async function traduciConMyMemory(
  testo: string,
  a: string
): Promise<string | null> {
  const url =
    "https://api.mymemory.translated.net/get?langpair=" +
    `it|${encodeURIComponent(a)}&q=${encodeURIComponent(testo)}`;

  const r = await fetch(url, { cache: "no-store", headers: HEADER_BROWSER });
  if (!r.ok) return null;

  const dati = (await r.json().catch(() => null)) as {
    responseData?: { translatedText?: string };
  } | null;

  const fuori = dati?.responseData?.translatedText?.trim();
  return fuori || null;
}

/**
 * Estrae la traduzione dalle due forme possibili della risposta di Google:
 *  - [ ["testo tradotto", "it"] ]      -> dict-chrome-ex
 *  - [ [ ["testo","originale"], ... ] ] -> a/single (piu' frammenti)
 */
function estraiTraduzione(dati: unknown): string | null {
  if (!Array.isArray(dati)) return null;
  const primo = dati[0];

  if (typeof primo === "string") return primo.trim() || null;

  if (Array.isArray(primo) && typeof primo[0] === "string") {
    return (primo[0] as string).trim() || null;
  }

  if (Array.isArray(primo)) {
    const pezzi = (primo as unknown[])
      .map((frammento) =>
        Array.isArray(frammento) && typeof frammento[0] === "string"
          ? frammento[0]
          : ""
      )
      .join("")
      .trim();
    return pezzi || null;
  }

  return null;
}
