import { NextResponse } from "next/server";
import { MAX_PORZIONE, type RisultatoCanzone } from "@/lib/canzone";

/**
 * Ricerca di brani per la scelta della canzone (stile "music sticker").
 *
 * Il browser non chiama mai direttamente i servizi esterni: manda qui il
 * testo cercato e riceve un elenco di brani. Cosi' eventuali chiavi restano
 * sul server.
 *
 * Fonti:
 *  - YouTube (nessuna chiave): la ricerca legge la pagina dei risultati di
 *    YouTube e ne estrae i video. Nessuna chiave, nessun costo: e' la fonte
 *    che permette di mostrare la CANZONE COMPLETA e di scegliere la porzione.
 *    Se la variabile YOUTUBE_API_KEY e' impostata si usa l'API ufficiale
 *    (piu' stabile), altrimenti si usa la lettura diretta della pagina.
 *  - Spotify Web API (SPOTIFY_CLIENT_ID + SPOTIFY_CLIENT_SECRET, client
 *    credentials): id, copertina e (quando disponibile) l'anteprima audio di
 *    30 secondi;
 *  - iTunes Search API di Apple (nessuna chiave): sempre disponibile, con
 *    anteprima audio ufficiale di 30 secondi.
 *
 * Il parametro "fonte" (tutti|youtube|spotify|apple) filtra la ricerca. Con
 * "tutti" le fonti disponibili vengono interrogate in parallelo e i risultati
 * alternati tra loro. Se una fonte e' richiesta esplicitamente ma non e'
 * disponibile (per esempio Spotify senza chiavi), si risponde con "avviso"
 * per far mostrare un messaggio.
 */

export const runtime = "nodejs";

const MAX_Q = 80;
const LIMITE = 12;
const LIMITE_TOTALE = 15;

type Fonte = "tutti" | "youtube" | "spotify" | "apple";

function normalizzaFonte(x: string | null): Fonte {
  if (x === "youtube" || x === "spotify" || x === "apple") return x;
  return "tutti";
}

export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const q = (sp.get("q") ?? "").trim().slice(0, MAX_Q);
  const fonte = normalizzaFonte(sp.get("fonte"));

  if (q.length < 2) {
    return NextResponse.json({ ok: true, risultati: [] as RisultatoCanzone[] });
  }

  const chiaveYt = process.env.YOUTUBE_API_KEY?.trim();
  const spotifyConfigurato = Boolean(
    process.env.SPOTIFY_CLIENT_ID?.trim() && process.env.SPOTIFY_CLIENT_SECRET?.trim()
  );

  const voleYt = fonte === "tutti" || fonte === "youtube";
  const voleSp = fonte === "tutti" || fonte === "spotify";
  const voleAp = fonte === "tutti" || fonte === "apple";

  // Una fonte richiesta esplicitamente ma non disponibile: avvisiamo la UI.
  // (YouTube ora e' sempre disponibile, quindi non serve segnalarlo.)
  const avviso =
    fonte === "spotify" && !spotifyConfigurato ? "spotify" : undefined;

  const lavori: Promise<RisultatoCanzone[]>[] = [];
  // YouTube c'e' sempre: con la chiave si usa l'API ufficiale, senza chiave si
  // legge la pagina dei risultati. In entrambi i casi e' gratuito.
  if (voleYt)
    lavori.push(
      (chiaveYt ? cercaYouTube(q, chiaveYt) : cercaYouTubeSenzaChiave(q)).catch(
        () => []
      )
    );
  if (voleSp && spotifyConfigurato)
    lavori.push(cercaSpotify(q).catch(() => []));
  if (voleAp) lavori.push(cercaItunes(q).catch(() => []));

  try {
    const gruppi = await Promise.all(lavori);
    const risultati = mescola(gruppi);
    return NextResponse.json({ ok: true, risultati, avviso });
  } catch {
    return NextResponse.json(
      { ok: false, errore: "Ricerca non disponibile.", risultati: [] },
      { status: 502 }
    );
  }
}

/**
 * Alterna i risultati delle diverse fonti (round-robin) cosi' l'elenco non
 * e' dominato da un solo servizio, e rimuove i doppioni titolo+artista.
 */
function mescola(gruppi: RisultatoCanzone[][]): RisultatoCanzone[] {
  const fuori: RisultatoCanzone[] = [];
  const visti = new Set<string>();
  const max = gruppi.reduce((m, g) => Math.max(m, g.length), 0);
  for (let i = 0; i < max; i++) {
    for (const g of gruppi) {
      const r = g[i];
      if (!r) continue;
      const firma = `${r.titolo.toLowerCase()}|${r.artista.toLowerCase()}`;
      if (visti.has(firma)) continue;
      visti.add(firma);
      fuori.push(r);
      if (fuori.length >= LIMITE_TOTALE) return fuori;
    }
  }
  return fuori;
}

/* ------------------------------- iTunes ------------------------------- */

type ItunesBrano = {
  trackId?: number;
  trackName?: string;
  artistName?: string;
  previewUrl?: string;
  artworkUrl100?: string;
  trackTimeMillis?: number;
};

async function cercaItunes(q: string): Promise<RisultatoCanzone[]> {
  const url =
    "https://itunes.apple.com/search?" +
    new URLSearchParams({
      term: q,
      entity: "song",
      media: "music",
      limit: String(LIMITE),
    }).toString();

  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error("itunes");
  const dati = (await r.json().catch(() => null)) as { results?: ItunesBrano[] } | null;

  const fuori: RisultatoCanzone[] = [];
  const visti = new Set<string>();
  for (const b of dati?.results ?? []) {
    const anteprima = b.previewUrl?.trim();
    const titolo = (b.trackName ?? "").trim();
    const artista = (b.artistName ?? "").trim();
    if (!anteprima || !titolo) continue;
    const firma = `${titolo.toLowerCase()}|${artista.toLowerCase()}`;
    if (visti.has(firma)) continue;
    visti.add(firma);
    fuori.push({
      servizio: "apple",
      id: b.trackId ? String(b.trackId) : firma,
      titolo,
      artista,
      copertina: b.artworkUrl100
        ? b.artworkUrl100.replace(/\/\d+x\d+bb\./, "/200x200bb.")
        : null,
      durataSec: b.trackTimeMillis ? Math.round(b.trackTimeMillis / 1000) : null,
      // L'anteprima ufficiale di Apple dura 30 secondi.
      anteprimaDurata: MAX_PORZIONE,
      anteprimaUrl: anteprima,
    });
  }
  return fuori;
}

/* ------------------------------- Spotify ------------------------------ */

type SpotifyBrano = {
  id?: string;
  name?: string;
  artists?: { name?: string }[];
  album?: { images?: { url?: string; width?: number }[] };
  duration_ms?: number;
  preview_url?: string | null;
};

// Token "client credentials" con cache in memoria finche' non scade.
let tokenSpotify: { valore: string; scadenza: number } | null = null;

async function ottieniTokenSpotify(): Promise<string> {
  if (tokenSpotify && tokenSpotify.scadenza > Date.now() + 30_000) {
    return tokenSpotify.valore;
  }
  const id = process.env.SPOTIFY_CLIENT_ID?.trim();
  const segreto = process.env.SPOTIFY_CLIENT_SECRET?.trim();
  if (!id || !segreto) throw new Error("spotify-config");

  const r = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + Buffer.from(`${id}:${segreto}`).toString("base64"),
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!r.ok) throw new Error("spotify-token");
  const dati = (await r.json().catch(() => null)) as {
    access_token?: string;
    expires_in?: number;
  } | null;
  const valore = dati?.access_token;
  if (!valore) throw new Error("spotify-token");
  tokenSpotify = {
    valore,
    scadenza: Date.now() + (dati?.expires_in ?? 3600) * 1000,
  };
  return valore;
}

async function cercaSpotify(q: string): Promise<RisultatoCanzone[]> {
  const token = await ottieniTokenSpotify();
  const url = new URL("https://api.spotify.com/v1/search");
  url.search = new URLSearchParams({
    q,
    type: "track",
    limit: String(LIMITE),
  }).toString();

  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!r.ok) throw new Error("spotify");
  const dati = (await r.json().catch(() => null)) as {
    tracks?: { items?: SpotifyBrano[] };
  } | null;

  const fuori: RisultatoCanzone[] = [];
  const visti = new Set<string>();
  for (const t of dati?.tracks?.items ?? []) {
    const id = t.id ?? "";
    const titolo = (t.name ?? "").trim();
    if (!id || !titolo) continue;
    const artista = (t.artists ?? [])
      .map((a) => a.name ?? "")
      .filter(Boolean)
      .join(", ");
    const firma = `${titolo.toLowerCase()}|${artista.toLowerCase()}`;
    if (visti.has(firma)) continue;
    visti.add(firma);
    const immagini = t.album?.images ?? [];
    const immagine =
      immagini.find((i) => (i.width ?? 0) >= 160) ?? immagini[0];
    const anteprima = t.preview_url?.trim() || null;
    fuori.push({
      servizio: "spotify",
      id,
      titolo,
      artista,
      copertina: immagine?.url ?? null,
      durataSec: t.duration_ms ? Math.round(t.duration_ms / 1000) : null,
      // Le anteprime Spotify durano 30 secondi (quando disponibili).
      anteprimaDurata: anteprima ? MAX_PORZIONE : null,
      anteprimaUrl: anteprima,
    });
  }
  return fuori;
}

/* ------------------------------- YouTube ------------------------------ */

type YtItemRicerca = {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    channelTitle?: string;
    thumbnails?: { high?: { url?: string }; medium?: { url?: string } };
  };
};

async function cercaYouTube(q: string, chiave: string): Promise<RisultatoCanzone[]> {
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
  if (!r.ok) throw new Error("youtube");
  const dati = (await r.json().catch(() => null)) as { items?: YtItemRicerca[] } | null;
  const items = dati?.items ?? [];

  const ids = items
    .map((i) => i.id?.videoId)
    .filter((x): x is string => typeof x === "string" && x.length > 0);
  if (!ids.length) return [];

  // Seconda chiamata: durata (per lo slider) e verificare che sia embeddabile.
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
    // Salta i video che non consentono l'incorporamento.
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

/* ------------------- YouTube senza chiave (gratis) -------------------- */

/**
 * Ricerca su YouTube senza nessuna chiave API.
 *
 * Si legge la pagina dei risultati (https://www.youtube.com/results) e si
 * estrae l'oggetto "ytInitialData" che contiene l'elenco dei video. E' la
 * stessa cosa che fa il browser quando apri la pagina, quindi non serve fare
 * nessuna registrazione ne' pagare nulla.
 */
async function cercaYouTubeSenzaChiave(q: string): Promise<RisultatoCanzone[]> {
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
  if (!r.ok) throw new Error("youtube");
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
function camminaVideo(
  nodo: unknown,
  visita: (v: YtVideoRenderer) => void
): void {
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
