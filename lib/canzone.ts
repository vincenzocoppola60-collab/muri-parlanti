/**
 * Canzoni allegate ai post-it.
 *
 * L'utente incolla il link di un brano da un servizio di streaming; qui
 * riconosciamo il servizio e costruiamo l'URL del player ufficiale da
 * mostrare in un <iframe>. Il player ufficiale mostra sempre un'anteprima
 * della traccia (Spotify ~30s, YouTube, Apple Music, ...), quindi non
 * gestiamo noi la riproduzione ne' servono chiavi API: si usano solo gli
 * embed pubblici dei servizi.
 *
 * Servizi supportati: Spotify, YouTube (video/playlist), Apple Music,
 * SoundCloud, Deezer.
 */

export type Servizio = "spotify" | "youtube" | "apple" | "soundcloud" | "deezer";

export type Canzone = {
  servizio: Servizio;
  /** URL canonico da salvare su postit.canzone_url. */
  url: string;
  /** URL del player, da mettere in un <iframe>. */
  embedUrl: string;
  /** Altezza consigliata del player (px). */
  altezza: number;
  /** Etichetta leggibile del servizio, per il badge in UI. */
  etichetta: string;
};

/** Aggiunge https:// se manca lo schema; scarta valori palesemente non URL. */
function normalizza(ingresso: string): string | null {
  const s = ingresso.trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  // Altri schemi (ftp:, data:, javascript:...) non ci interessano.
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) return null;
  if (!/^[^\s/]+\.[^\s/]+/.test(s)) return null;
  return `https://${s}`;
}

/** Gli id dei video YouTube sono alfanumerici con - e _. */
const ID_VIDEO = /^[A-Za-z0-9_-]{6,}$/;

function spotify(host: string, u: URL): Canzone | null {
  if (!/(^|\.)spotify\.com$/.test(host)) return null;
  const pezzi = u.pathname.split("/").filter(Boolean);
  // Salta un eventuale prefisso di localizzazione: /intl-it/track/...
  if (pezzi[0] && /^intl-[a-z]{2}$/i.test(pezzi[0])) pezzi.shift();
  const tipo = pezzi[0];
  const id = pezzi[1];
  const tipi = ["track", "album", "playlist", "episode", "artist", "show"];
  if (!tipo || !id || !tipi.includes(tipo)) return null;
  const altezza =
    tipo === "track" ? 152 : tipo === "episode" || tipo === "show" ? 232 : 352;
  return {
    servizio: "spotify",
    url: `https://open.spotify.com/${tipo}/${id}`,
    embedUrl: `https://open.spotify.com/embed/${tipo}/${id}`,
    altezza,
    etichetta: "Spotify",
  };
}

function youtube(host: string, u: URL): Canzone | null {
  // youtube.com e music.youtube.com (ma NON youtu.be, gestito a parte).
  if (!/(^|\.)youtube\.com$/.test(host)) return null;
  const pezzi = u.pathname.split("/").filter(Boolean);

  // Playlist: /playlist?list=ID
  const list = u.searchParams.get("list");
  if (pezzi[0] === "playlist" && list) {
    return {
      servizio: "youtube",
      url: `https://www.youtube.com/playlist?list=${list}`,
      embedUrl: `https://www.youtube.com/embed/videoseries?list=${list}`,
      altezza: 220,
      etichetta: "YouTube",
    };
  }

  let id = u.searchParams.get("v");
  if (!id && ["embed", "shorts", "live", "v"].includes(pezzi[0] ?? "")) {
    id = pezzi[1] ?? null;
  }
  if (!id || !ID_VIDEO.test(id)) return null;
  return {
    servizio: "youtube",
    url: `https://www.youtube.com/watch?v=${id}`,
    embedUrl: `https://www.youtube.com/embed/${id}`,
    altezza: 220,
    etichetta: "YouTube",
  };
}

function youtuBe(host: string, u: URL): Canzone | null {
  if (host !== "youtu.be") return null;
  const id = u.pathname.split("/").filter(Boolean)[0];
  if (!id || !ID_VIDEO.test(id)) return null;
  return {
    servizio: "youtube",
    url: `https://www.youtube.com/watch?v=${id}`,
    embedUrl: `https://www.youtube.com/embed/${id}`,
    altezza: 220,
    etichetta: "YouTube",
  };
}

function apple(host: string, u: URL): Canzone | null {
  if (!/(^|\.)music\.apple\.com$/.test(host)) return null;
  // music.apple.com/<storefront>/<tipo>/<slug>/<id>
  const pezzi = u.pathname.split("/").filter(Boolean);
  const tipo = pezzi.find((p) =>
    ["song", "album", "playlist", "music-video"].includes(p)
  );
  if (!tipo) return null;
  return {
    servizio: "apple",
    url: `https://music.apple.com${u.pathname}`,
    embedUrl: `https://embed.music.apple.com${u.pathname}`,
    altezza: tipo === "song" ? 175 : 450,
    etichetta: "Apple Music",
  };
}

function soundcloud(host: string, u: URL): Canzone | null {
  if (host !== "soundcloud.com" && !host.endsWith(".soundcloud.com")) return null;
  // Il nostro dominio di embed (w.soundcloud.com) non e' un link utente.
  if (host.startsWith("w.") || host.startsWith("m.")) return null;
  const canonico = `https://soundcloud.com${u.pathname}`;
  const embedUrl =
    "https://w.soundcloud.com/player/?url=" +
    encodeURIComponent(canonico) +
    "&color=%23f59e0b&auto_play=false&hide_related=true" +
    "&show_comments=false&show_user=true&show_reposts=false&visual=false";
  return {
    servizio: "soundcloud",
    url: canonico,
    embedUrl,
    altezza: 166,
    etichetta: "SoundCloud",
  };
}

function deezer(host: string, u: URL): Canzone | null {
  if (!/(^|\.)deezer\.com$/.test(host)) return null;
  const pezzi = u.pathname.split("/").filter(Boolean);
  // deezer.com/track/ID  oppure  deezer.com/<cc>/track/ID
  const idx = pezzi.findIndex((p) => ["track", "album", "playlist"].includes(p));
  if (idx < 0) return null;
  const tipo = pezzi[idx];
  const id = pezzi[idx + 1];
  if (!id || !/^\d+$/.test(id)) return null;
  return {
    servizio: "deezer",
    url: `https://www.deezer.com/${tipo}/${id}`,
    embedUrl: `https://widget.deezer.com/widget/dark/${tipo}/${id}`,
    altezza: tipo === "track" ? 300 : 420,
    etichetta: "Deezer",
  };
}

/**
 * Analizza il link incollato dall'utente. Ritorna i dati del player, oppure
 * null se il link non e' un brano di un servizio supportato.
 */
export function analizzaCanzone(ingresso: string): Canzone | null {
  const url = normalizza(ingresso);
  if (!url) return null;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase().replace(/^www\./, "");
  return (
    spotify(host, u) ??
    youtube(host, u) ??
    youtuBe(host, u) ??
    apple(host, u) ??
    soundcloud(host, u) ??
    deezer(host, u)
  );
}

/* ------------------------------------------------------------------ */
/* Ricerca in-app (stile "music sticker") e scelta di una porzione.    */
/* ------------------------------------------------------------------ */

/**
 * Con la ricerca in-app l'utente non incolla piu' un link: sceglie un
 * brano da un elenco e decide da quale secondo far partire l'ascolto
 * (porzione di al massimo 30 secondi, come nelle storie di Instagram).
 *
 * La scelta viene salvata su postit.canzone_url come piccola stringa JSON,
 * cosi' non serve nessuna nuova colonna ne' migrazione aggiuntiva. I vecchi
 * post-it con un semplice link continuano a funzionare: qui sotto riconosciamo
 * entrambi i formati.
 */

/** Durata massima della porzione che si puo' far sentire (secondi). */
export const MAX_PORZIONE = 30;

/** Durata minima della porzione scelta dall'utente (secondi). */
export const MIN_PORZIONE = 5;

/** Brano trovato con la ricerca, prima della scelta della porzione. */
export type RisultatoCanzone = {
  servizio: "youtube" | "apple" | "spotify";
  /** id del video YouTube, del brano iTunes o della traccia Spotify. */
  id: string;
  titolo: string;
  artista: string;
  /** URL della copertina (o null). */
  copertina: string | null;
  /** Durata del brano completo in secondi, se nota. */
  durataSec: number | null;
  /**
   * Lunghezza (secondi) dell'anteprima audio riproducibile, quando c'e':
   * serve all'editor per sapere entro quale intervallo far scegliere l'inizio.
   */
  anteprimaDurata: number | null;
  /** URL dell'anteprima audio (Apple/iTunes, Spotify), altrimenti null. */
  anteprimaUrl: string | null;
};

/** Scelta salvata su postit.canzone_url (JSON). */
export type ClipCanzone = {
  /** Versione del formato: ci permette di evolvere senza rompere i vecchi. */
  v: 1;
  servizio: "youtube" | "apple" | "spotify";
  id: string;
  titolo: string;
  artista: string;
  copertina: string | null;
  /** Secondo da cui parte l'ascolto. */
  inizio: number;
  /**
   * Durata scelta della porzione in secondi (al massimo 30). Null per i
   * vecchi salvataggi o quando si ascolta un'anteprima intera.
   */
  durata: number | null;
  /** Secondo in cui finisce l'ascolto (YouTube), ricavato da inizio+durata. */
  fine: number | null;
  /** URL dell'anteprima audio (Apple/Spotify), altrimenti null. */
  anteprima: string | null;
};

/**
 * Dati comuni a ogni player: etichetta del servizio e, quando noti, titolo,
 * artista e copertina del brano. Servono a mostrare la scheda con copertina e
 * titolo (stile "music sticker") con i controlli di ascolto sotto.
 */
type PlayerBase = {
  etichetta: string;
  titolo: string | null;
  artista: string | null;
  copertina: string | null;
};

/** Player pronto da mostrare, ricavato da un link o da una scelta JSON. */
export type Player =
  | (PlayerBase & { tipo: "embed"; embedUrl: string; altezza: number })
  | (PlayerBase & {
      tipo: "clip-youtube";
      id: string;
      inizio: number;
      fine: number | null;
    })
  | (PlayerBase & {
      tipo: "clip-audio";
      src: string;
      inizio: number;
      durata: number | null;
    });

/** Serializza la scelta per salvarla su postit.canzone_url. */
export function serializzaClip(clip: ClipCanzone): string {
  return JSON.stringify(clip);
}

/** Legge una scelta JSON salvata su postit.canzone_url (o null se non e' JSON). */
export function leggiClip(valore: string | null | undefined): ClipCanzone | null {
  const s = (valore ?? "").trim();
  if (!s.startsWith("{")) return null;
  let dati: unknown;
  try {
    dati = JSON.parse(s);
  } catch {
    return null;
  }
  if (!dati || typeof dati !== "object") return null;
  const o = dati as Record<string, unknown>;
  if (o.v !== 1) return null;
  const servizio = o.servizio;
  if (servizio !== "youtube" && servizio !== "apple" && servizio !== "spotify")
    return null;
  const id = typeof o.id === "string" ? o.id : "";
  if (!id) return null;
  const num = (x: unknown, difetto: number) =>
    typeof x === "number" && Number.isFinite(x) && x >= 0 ? x : difetto;
  const testo = (x: unknown) => (typeof x === "string" ? x : "");
  const nullo = (x: unknown) => (typeof x === "string" && x ? x : null);
  const inizio = num(o.inizio, 0);
  const fine = o.fine === null ? null : num(o.fine, 0);
  // I vecchi salvataggi non avevano "durata": la ricaviamo dalla fine.
  const durata =
    o.durata === null
      ? null
      : o.durata === undefined
        ? fine !== null && fine > inizio
          ? fine - inizio
          : null
        : num(o.durata, 0);
  return {
    v: 1,
    servizio,
    id,
    titolo: testo(o.titolo),
    artista: testo(o.artista),
    copertina: nullo(o.copertina),
    inizio,
    durata,
    fine,
    anteprima: nullo(o.anteprima),
  };
}

/**
 * Normalizza un valore scelto nell'editor (link oppure JSON) nella forma da
 * salvare: il link canonico del servizio oppure il JSON ripulito.
 */
export function normalizzaCanzone(valore: string): string | null {
  const clip = leggiClip(valore);
  if (clip) return serializzaClip(clip);
  const c = analizzaCanzone(valore);
  return c ? c.url : null;
}

/** Descrizione breve del brano scelto, per la scheda nell'editor. */
export function descrizioneCanzone(valore: string): string | null {
  const clip = leggiClip(valore);
  if (clip) {
    const { titolo, artista } = scomponiCanzone(clip.titolo || null, clip.artista || null);
    const base = titolo || clip.titolo || clip.id;
    return artista ? `${base} · ${artista}` : base;
  }
  const c = analizzaCanzone(valore);
  return c ? c.etichetta : null;
}

/**
 * Se il brano e' un singolo video YouTube, restituisce il suo id (altrimenti
 * null: per esempio per le playlist o per gli altri servizi). Serve per aprire
 * il selettore della parte sulla canzone completa partendo da un link.
 */
export function idVideoYoutube(canzone: Canzone): string | null {
  if (canzone.servizio !== "youtube") return null;
  const m = /\/embed\/([A-Za-z0-9_-]{6,})(?:\?|$)/.exec(canzone.embedUrl);
  return m ? m[1] : null;
}

/** URL del player Spotify (embed pubblico) di una traccia. */
export function embedSpotify(id: string): string {
  return `https://open.spotify.com/embed/track/${encodeURIComponent(id)}`;
}

/** URL del player YouTube di una porzione (start/end). */
export function embedClipYoutube(
  id: string,
  inizio: number,
  fine: number | null
): string {
  const p = new URLSearchParams();
  if (inizio > 0) p.set("start", String(Math.floor(inizio)));
  if (fine && fine > inizio) p.set("end", String(Math.floor(fine)));
  p.set("rel", "0");
  p.set("modestbranding", "1");
  p.set("playsinline", "1");
  return `https://www.youtube.com/embed/${id}?${p.toString()}`;
}

/**
 * Parole tipiche delle indicazioni tra parentesi che NON fanno parte del nome
 * della traccia ("(Official Video)", "(Audio)", "(Lyric Video)"...).
 */
const PARENTESI_DESCRITTIVE =
  /(official|video|audio|lyric|visual|hd|4k|mv|clip|remix|version|edit|prod\.?|explicit|clean|trailer|performance|live|instrumental)/i;

/**
 * Ripulisce titolo e artista di una traccia per la scheda del post-it:
 * - toglie dal titolo il nome dell'artista che lo precede ("Artista - Titolo"),
 *   ormai ripetuto nella riga sotto;
 * - toglie le indicazioni tra parentesi descrittive ("(Official Video)",
 *   "(Audio)"...);
 * - sposta il featuring ("ft."/"feat."/"featuring"/"with") dal titolo alla
 *   riga dell'artista, che diventa "Artista ft. Ospite".
 *
 * Le MAIUSCOLE originali restano invariate. Se non riconosce nulla, lascia il
 * valore di partenza.
 */
export function scomponiCanzone(
  titolo: string | null,
  artista: string | null
): { titolo: string | null; artista: string | null } {
  const originale = (titolo ?? "").trim();
  if (!originale) return { titolo, artista };

  let t = originale;
  const a = (artista ?? "").trim();

  // 1) "Artista - Titolo" -> "Titolo"
  if (
    a &&
    t.length > a.length &&
    t.slice(0, a.length).toLowerCase() === a.toLowerCase()
  ) {
    const dopo = t
      .slice(a.length)
      .replace(/^\s*[-\u2013\u2014:|\u2022\u00b7]\s*/, "")
      .trim();
    if (dopo.length >= 2) t = dopo;
  }

  // 2) featuring -> riga artista
  let featuring = "";
  const mft = /\s*(?:[([]\s*)?(?:ft\.?|feat\.?|featuring|with)\s+([^)\]]+?)\s*[)\]]?\s*$/i.exec(t);
  if (mft) {
    featuring = mft[1].trim();
    t = t.slice(0, mft.index).trim();
  }

  // 3) parentesi descrittive via (solo se contengono una parola tipica, per non
  //    cancellare titoli che usano le parentesi di proposito)
  t = t
    .replace(/\(([^)]*)\)/g, (m, dentro) =>
      PARENTESI_DESCRITTIVE.test(dentro) ? " " : m
    )
    .replace(/\[([^\]]*)\]/g, (m, dentro) =>
      PARENTESI_DESCRITTIVE.test(dentro) ? " " : m
    )
    .replace(/\s{2,}/g, " ")
    .trim();
  t = t.replace(/\s*[-\u2013\u2014:|\u2022\u00b7]\s*$/, "").trim();

  const titoloPulito = t.length >= 2 ? t : originale;

  let artistaFinale: string | null = a || null;
  if (featuring) {
    artistaFinale = a ? `${a} ft. ${featuring}` : featuring;
  }

  return { titolo: titoloPulito, artista: artistaFinale };
}

/**
 * Costruisce il player da mostrare sul muro a partire dal valore salvato
 * (link storico oppure JSON della ricerca). Ritorna null se non c'e' nulla
 * di riproducibile.
 */
export function playerDaCanzone(valore: string | null | undefined): Player | null {
  const clip = leggiClip(valore);
  if (clip) {
    const { titolo, artista } = scomponiCanzone(clip.titolo || null, clip.artista || null);
    const copertina = clip.copertina;
    if (clip.servizio === "youtube") {
      const fine =
        clip.fine ?? (clip.durata !== null ? clip.inizio + clip.durata : null);
      return {
        tipo: "clip-youtube",
        id: clip.id,
        inizio: clip.inizio,
        fine,
        etichetta: "YouTube",
        titolo,
        artista,
        copertina,
      };
    }
    // Anteprima audio (Apple Music o Spotify con preview_url): la riproduciamo
    // noi per far partire l'ascolto dal secondo scelto.
    if (clip.anteprima) {
      return {
        tipo: "clip-audio",
        src: clip.anteprima,
        inizio: clip.inizio,
        durata: clip.durata,
        etichetta: clip.servizio === "spotify" ? "Spotify" : "Apple Music",
        titolo,
        artista,
        copertina,
      };
    }
    if (clip.servizio === "spotify") {
      // Nessuna anteprima disponibile: player ufficiale (parte dall'inizio).
      return {
        tipo: "embed",
        embedUrl: embedSpotify(clip.id),
        altezza: 152,
        etichetta: "Spotify",
        titolo,
        artista,
        copertina,
      };
    }
    if (clip.servizio === "apple") {
      return {
        tipo: "embed",
        embedUrl: `https://embed.music.apple.com/song/${encodeURIComponent(clip.id)}`,
        altezza: 175,
        etichetta: "Apple Music",
        titolo,
        artista,
        copertina,
      };
    }
    return null;
  }
  const c = analizzaCanzone(valore ?? "");
  if (!c) return null;
  // Link storico incollato: del brano conosciamo solo il servizio.
  return {
    tipo: "embed",
    embedUrl: c.embedUrl,
    altezza: c.altezza,
    etichetta: c.etichetta,
    titolo: null,
    artista: null,
    copertina: null,
  };
}
