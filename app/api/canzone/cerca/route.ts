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
 *  - YouTube Data API (YOUTUBE_API_KEY): brano completo, permette di scegliere
 *    da quale secondo partire e per quanti secondi (porzione fino a 30s);
 *  - Spotify Web API (SPOTIFY_CLIENT_ID + SPOTIFY_CLIENT_SECRET, client
 *    credentials): id, copertina e (quando disponibile) l'anteprima audio di
 *    30 secondi;
 *  - iTunes Search API di Apple (nessuna chiave): sempre disponibile, con
 *    anteprima audio ufficiale di 30 secondi.
 *
 * Il parametro "fonte" (tutti|youtube|spotify|apple) filtra la ricerca. Con
 * "tutti" le fonti configurate vengono interrogate in parallelo e i risultati
 * alternati tra loro. Se una fonte non e' configurata ma e' richiesta
 * esplicitamente, si risponde con "avviso" per far mostrare un messaggio.
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

  // Una fonte richiesta esplicitamente ma non configurata: avvisiamo la UI.
  const avviso =
    fonte === "youtube" && !chiaveYt
      ? "youtube"
      : fonte === "spotify" && !spotifyConfigurato
        ? "spotify"
        : undefined;

  const lavori: Promise<RisultatoCanzone[]>[] = [];
  if (voleYt && chiaveYt) lavori.push(cercaYouTube(q, chiaveYt).catch(() => []));
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
