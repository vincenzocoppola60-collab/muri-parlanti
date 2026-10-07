import { NextResponse } from "next/server";
import { MAX_PORZIONE, type RisultatoCanzone } from "@/lib/canzone";

/**
 * Ricerca di brani per la scelta della canzone (stile "music sticker").
 *
 * Il browser non chiama mai direttamente i servizi esterni: manda qui il
 * testo cercato e riceve un elenco di brani. Cosi' eventuali chiavi restano
 * sul server.
 *
 * Ordine di scelta:
 *  1) YouTube Data API, se YOUTUBE_API_KEY e' configurata: permette di
 *     scegliere da quale secondo partire (porzione fino a 30s) sul brano
 *     completo;
 *  2) l'iTunes Search API di Apple (senza chiave): restituisce artisti e
 *     copertine e un'anteprima audio ufficiale di 30 secondi.
 * Se YouTube e' configurata ma non risponde o non trova nulla, si ripiega
 * comunque su iTunes (la ricerca non resta mai bloccata).
 */

export const runtime = "nodejs";

const MAX_Q = 80;
const LIMITE = 12;

export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, MAX_Q);
  if (q.length < 2) {
    return NextResponse.json({ ok: true, risultati: [] as RisultatoCanzone[] });
  }

  const chiave = process.env.YOUTUBE_API_KEY?.trim();
  try {
    // Con la chiave YouTube si prova prima YouTube; se non risponde (o non
    // trova nulla) si ripiega comunque su iTunes, cosi' la ricerca funziona
    // sempre, anche con una chiave scaduta.
    if (chiave) {
      try {
        const yt = await cercaYouTube(q, chiave);
        if (yt.length) return NextResponse.json({ ok: true, risultati: yt });
      } catch {
        // si prosegue con iTunes
      }
    }
    const itunes = await cercaItunes(q);
    return NextResponse.json({ ok: true, risultati: itunes });
  } catch {
    return NextResponse.json(
      { ok: false, errore: "Ricerca non disponibile.", risultati: [] },
      { status: 502 }
    );
  }
}

/* ------------------------------- iTunes ------------------------------- */

type ItunesBrano = {
  trackId?: number;
  trackName?: string;
  artistName?: string;
  collectionName?: string;
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
      // L'anteprima ufficiale di Apple dura 30 secondi.
      durataSec: MAX_PORZIONE,
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
