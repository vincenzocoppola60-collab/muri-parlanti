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
