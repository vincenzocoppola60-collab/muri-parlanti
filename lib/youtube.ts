/**
 * Accesso all'API IFrame di YouTube (lato browser).
 *
 * Serve per riprodurre SOLO l'audio di un brano senza mostrare il video:
 * il player viene creato dentro un elemento fuori dallo schermo e da li'
 * controlliamo avvio, posizione e stop.
 *
 * L'API si carica una volta sola per tutta la pagina: le richieste successive
 * riusano la stessa promessa.
 */

export type YTPlayer = {
  getDuration: () => number;
  getCurrentTime: () => number;
  seekTo: (secondi: number, consentito?: boolean) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  destroy: () => void;
};

export type YTNamespace = {
  Player: new (
    elemento: HTMLElement,
    opzioni: Record<string, unknown>
  ) => YTPlayer;
};

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let promessa: Promise<YTNamespace> | null = null;

/** Carica (o riusa) l'API IFrame di YouTube e risolve con lo spazio dei nomi YT. */
export function caricaApiVideo(): Promise<YTNamespace> {
  if (typeof window !== "undefined" && window.YT?.Player) {
    return Promise.resolve(window.YT);
  }
  if (promessa) return promessa;
  promessa = new Promise<YTNamespace>((risolvi, rifiuta) => {
    const precedente = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      precedente?.();
      if (window.YT?.Player) risolvi(window.YT);
      else rifiuta(new Error("youtube-api"));
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    document.head.appendChild(script);
  });
  return promessa;
}

/** Formatta un numero di secondi come m:ss. */
export function formattaSecondi(secondi: number): string {
  const s = Math.max(0, Math.floor(secondi));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}
