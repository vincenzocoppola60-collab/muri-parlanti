import { NextResponse } from "next/server";
import type { RisultatoCanzone } from "@/lib/canzone";

/**
 * Ricerca dei brani per la scelta della canzone da allegare al post-it.
 *
 * Il browser manda qui il testo cercato (titolo o artista) e riceve un elenco
 * di brani da cui scegliere la parte.
 *
 * La ricerca usa YouTube, senza bisogno di nessuna chiave e senza alcun costo:
 * si legge la pagina dei risultati e se ne estraggono i video. Se la variabile
 * YOUTUBE_API_KEY e' impostata si usa l'API ufficiale (piu' stabile), altrimenti
 * si legge direttamente la pagina.
 *
 * Nota: e' l'unica fonte, quindi la UI non mostra nessun selettore di servizio.
 */

export const runtime = "nodejs";

const MAX_Q = 80;
const LIMITE = 20;

export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const q = (sp.get("q") ?? "").trim().slice(0, MAX_Q);

  if (q.length < 2) {
    return NextResponse.json({ ok: true, risultati: [] as RisultatoCanzone[] });
  }

  const chiave = process.env.YOUTUBE_API_KEY?.trim();

  try {
    const risultati = chiave
      ? await cercaConChiave(q, chiave)
      : await cercaSenzaChiave(q);
    return NextResponse.json({ ok: true, risultati });
  } catch {
    return NextResponse.json(
      { ok: false, errore: "Ricerca non disponibile.", risultati: [] },
      { status: 502 }
    );
  }
}

/* ---------------------------- Ricerca (API) ---------------------------- */

type YtItemRicerca = {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    channelTitle?: string;
    thumbnails?: { high?: { url?: string }; medium?: { url?: string } };
  };
};

async function cercaConChiave(q: string, chiave: string): Promise<RisultatoCanzone[]> {
  const ric = new URL("https://www.googleapis.com/youtube/v3/search");
  ric.search = new URLSearchParams({
    part: "snippet",
    type: "video",
    maxResults: String(LIMITE),
    videoCategoryId: "10", // Musica
    q,
    key: chiave,
  }).toString();

  const r = await fetch(ric, { cache: "no-store" });
  if (!r.ok) throw new Error("ricerca");
  const dati = (await r.json().catch(() => null)) as { items?: YtItemRicerca[] } | null;
  const items = dati?.items ?? [];

  const ids = items
    .map((i) => i.id?.videoId)
    .filter((x): x is string => typeof x === "string" && x.length > 0);
  if (!ids.length) return [];

  // Seconda chiamata: durata (per la barra) e verifica dell'incorporabilita'.
  const det = new URL("https://www.googleapis.com/youtube/v3/videos");
  det.search = new URLSearchParams({
    part: "contentDetails,status",
    id: ids.join(","),
    key: chiave,
  }).toString();
  const rd = await fetch(det, { cache: "no-store" });
  const dd = rd.ok
    ? ((await rd.json().catch(() => null)) as {
        items?: {
          id?: string;
          contentDetails?: { duration?: string };
          status?: { embeddable?: boolean };
        }[];
      } | null)
    : null;

  const info = new Map<string, { secondi: number; embeddabile: boolean }>();
  for (const v of dd?.items ?? []) {
    if (!v.id) continue;
    info.set(v.id, {
      secondi: durataIso(v.contentDetails?.duration),
      embeddabile: v.status?.embeddable !== false,
    });
  }

  const fuori: RisultatoCanzone[] = [];
  for (const it of items) {
    const id = it.id?.videoId;
    if (!id) continue;
    const meta = info.get(id);
    if (meta && !meta.embeddabile) continue;
    fuori.push({
      servizio: "youtube",
      id,
      titolo: (it.snippet?.title ?? "").trim(),
      artista: (it.snippet?.channelTitle ?? "").trim(),
      copertina:
        it.snippet?.thumbnails?.high?.url ?? it.snippet?.thumbnails?.medium?.url ?? null,
      durataSec: meta && meta.secondi > 0 ? meta.secondi : null,
      anteprimaDurata: null,
      anteprimaUrl: null,
    });
  }
  return fuori;
}

/* ------------------------ Ricerca (senza chiave) ----------------------- */

/**
 * Ricerca senza nessuna chiave API: si legge la pagina dei risultati e si
 * estrae l'oggetto "ytInitialData" che contiene l'elenco dei video. E' la
 * stessa cosa che fa il browser quando apri la pagina, quindi non serve fare
 * nessuna registrazione ne' pagare nulla.
 */
async function cercaSenzaChiave(q: string): Promise<RisultatoCanzone[]> {
  const url =
    "https://www.youtube.com/results?search_query=" +
    encodeURIComponent(q) +
    "&sp=EgIQAQ%253D%253D"; // filtro: solo video (non canali/playlist)

  const r = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      "Accept-Language": "it-IT,it;q=0.9,en;q=0.8",
    },
    cache: "no-store",
  });
  if (!r.ok) throw new Error("ricerca");
  const html = await r.text();

  const dati = estraiJsonDopo(html, "ytInitialData");
  if (!dati) return [];

  const fuori: RisultatoCanzone[] = [];
  const visti = new Set<string>();
  camminaVideo(dati, (v) => {
    const id = typeof v.videoId === "string" ? v.videoId : "";
    if (!id || visti.has(id)) return;
    const titolo = (v.title?.runs?.[0]?.text ?? "").trim();
    if (!titolo) return;
    visti.add(id);
    const thumbs = v.thumbnail?.thumbnails ?? [];
    fuori.push({
      servizio: "youtube",
      id,
      titolo,
      artista: (v.ownerText?.runs?.[0]?.text ?? "").trim(),
      copertina: thumbs.length ? thumbs[thumbs.length - 1]?.url ?? null : null,
      durataSec: durataDaTesto(v.lengthText?.simpleText),
      anteprimaDurata: null,
      anteprimaUrl: null,
    });
  });
  return fuori.slice(0, LIMITE);
}

/** Forma minima (parziale) di un videoRenderer di YouTube. */
type YtVideoRenderer = {
  videoId?: string;
  title?: { runs?: { text?: string }[] };
  ownerText?: { runs?: { text?: string }[] };
  lengthText?: { simpleText?: string };
  thumbnail?: { thumbnails?: { url?: string }[] };
};

/** Attraversa l'albero JSON e richiama la funzione per ogni video trovato. */
function camminaVideo(nodo: unknown, visita: (v: YtVideoRenderer) => void): void {
  if (!nodo || typeof nodo !== "object") return;
  const o = nodo as Record<string, unknown>;
  const v = o.videoRenderer;
  if (v && typeof v === "object") visita(v as YtVideoRenderer);
  for (const chiave in o) camminaVideo(o[chiave], visita);
}

/**
 * Estrae un oggetto JSON dalla pagina a partire da un marcatore, usando il
 * conteggio delle parentesi (piu' sicuro di una espressione regolare).
 */
function estraiJsonDopo(html: string, marcatore: string): unknown {
  const i = html.indexOf(marcatore);
  if (i < 0) return null;
  const inizio = html.indexOf("{", i);
  if (inizio < 0) return null;
  let livello = 0;
  let inStringa = false;
  let escape = false;
  for (let j = inizio; j < html.length; j++) {
    const c = html[j];
    if (inStringa) {
      if (escape) escape = false;
      else if (c === "\\") escape = true;
      else if (c === '"') inStringa = false;
    } else if (c === '"') {
      inStringa = true;
    } else if (c === "{") {
      livello++;
    } else if (c === "}") {
      livello--;
      if (livello === 0) {
        try {
          return JSON.parse(html.slice(inizio, j + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

/** Converte "5:40" (o "1:02:03") in secondi; null se non e' una durata. */
function durataDaTesto(testo: string | undefined): number | null {
  if (!testo) return null;
  const parti = testo.split(":").map((p) => Number(p));
  if (parti.some((n) => !Number.isFinite(n))) return null;
  let sec = 0;
  for (const p of parti) sec = sec * 60 + p;
  return sec > 0 ? sec : null;
}

/** Converte una durata ISO 8601 (PT#H#M#S) in secondi (0 se non valida). */
function durataIso(iso: string | undefined): number {
  if (!iso) return 0;
  const m = /^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!m) return 0;
  const [, g, h, min, s] = m;
  return (
    (Number(g) || 0) * 86400 +
    (Number(h) || 0) * 3600 +
    (Number(min) || 0) * 60 +
    (Number(s) || 0)
  );
}
