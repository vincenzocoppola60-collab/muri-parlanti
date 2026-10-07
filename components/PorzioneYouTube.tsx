"use client";

import { useEffect, useRef, useState } from "react";
import { MAX_PORZIONE, MIN_PORZIONE } from "@/lib/canzone";

/**
 * Player della canzone COMPLETA con scelta di una parte (max 30 secondi).
 *
 * Usa l'API IFrame ufficiale di YouTube: la canzone intera viene mostrata nel
 * player (con la barra di avanzamento e l'anteprima), cosi' l'utente puo'
 * ascoltarla e poi scegliere da quale secondo partire e per quanti secondi
 * (al massimo 30, ma anche meno). Il pulsante "Prova" fa sentire solo la parte
 * scelta, fermandosi da solo alla fine.
 *
 * Funziona solo per YouTube: e' l'unico, fra i servizi richiesti, che consente
 * di suonare il brano intero in una pagina web (Apple e Spotify danno solo
 * un'anteprima ufficiale di 30 secondi per le app di terze parti).
 */

type YTPlayer = {
  getDuration: () => number;
  getCurrentTime: () => number;
  seekTo: (secondi: number, consentito?: boolean) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  destroy: () => void;
};

type YTNamespace = {
  Player: new (elemento: HTMLElement, opzioni: Record<string, unknown>) => YTPlayer;
};

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

// L'API IFrame si carica una sola volta per tutta l'app.
let promessaApi: Promise<YTNamespace> | null = null;

function caricaApiYouTube(): Promise<YTNamespace> {
  if (typeof window !== "undefined" && window.YT?.Player) {
    return Promise.resolve(window.YT);
  }
  if (promessaApi) return promessaApi;
  promessaApi = new Promise<YTNamespace>((risolvi, rifiuta) => {
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
  return promessaApi;
}

export default function PorzioneYouTube({
  videoId,
  onCambia,
  etichette,
}: {
  videoId: string;
  onCambia: (p: { inizio: number; durata: number; fine: number }) => void;
  etichette: {
    inizio: string;
    durata: string;
    prova: string;
    carico: string;
    errore: string;
  };
}) {
  const contenitore = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const timer = useRef<number | null>(null);
  const [durataBrano, setDurataBrano] = useState(0);
  const [pronto, setPronto] = useState(false);
  const [errore, setErrore] = useState(false);
  const [inizio, setInizio] = useState(0);
  const [durata, setDurata] = useState(MAX_PORZIONE);

  useEffect(() => {
    let annullato = false;
    const nodo = contenitore.current;
    if (!nodo) return;
    caricaApiYouTube()
      .then((YT) => {
        if (annullato) return;
        player.current = new YT.Player(nodo, {
          videoId,
          width: "100%",
          height: 200,
          playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
          events: {
            onReady: () => {
              if (annullato) return;
              const d = Math.floor(player.current?.getDuration() ?? 0);
              setPronto(true);
              if (d > 0) {
                setDurataBrano(d);
                setDurata((corrente) =>
                  Math.min(MAX_PORZIONE, Math.max(MIN_PORZIONE, Math.min(corrente, d)))
                );
              }
            },
          },
        });
      })
      .catch(() => {
        if (!annullato) setErrore(true);
      });
    return () => {
      annullato = true;
      if (timer.current) {
        window.clearInterval(timer.current);
        timer.current = null;
      }
      try {
        player.current?.destroy();
      } catch {
        // il player potrebbe non essere stato creato: nulla da fare
      }
      player.current = null;
    };
  }, [videoId]);

  const durataMax = Math.min(MAX_PORZIONE, durataBrano || MAX_PORZIONE);
  const durataMin = Math.min(MIN_PORZIONE, durataMax);
  const durataCorretta = Math.min(Math.max(durata, durataMin), durataMax);
  const fine = Math.min(inizio + durataCorretta, durataBrano || durataCorretta);

  // Comunica al genitore la parte scelta (per salvarla alla conferma).
  useEffect(() => {
    if (!durataBrano) return;
    onCambia({
      inizio,
      durata: durataCorretta,
      fine: Math.min(inizio + durataCorretta, durataBrano),
    });
  }, [inizio, durataCorretta, durataBrano, onCambia]);

  function scorriInizio(valore: number) {
    setInizio(Math.max(0, Math.min(valore, Math.max(0, durataBrano - durataCorretta))));
  }

  function scorriDurata(valore: number) {
    const d = Math.min(Math.max(valore, durataMin), durataMax);
    setDurata(d);
    setInizio((i) => Math.min(i, Math.max(0, durataBrano - d)));
  }

  function prova() {
    const p = player.current;
    if (!p) return;
    if (timer.current) {
      window.clearInterval(timer.current);
      timer.current = null;
    }
    p.seekTo(inizio, true);
    p.playVideo();
    const limite = inizio + durataCorretta;
    timer.current = window.setInterval(() => {
      const pl = player.current;
      if (!pl) return;
      if (pl.getCurrentTime() >= limite - 0.15) {
        pl.pauseVideo();
        if (timer.current) {
          window.clearInterval(timer.current);
          timer.current = null;
        }
      }
    }, 200);
  }

  return (
    <div>
      <div className="overflow-hidden rounded-lg border border-stone-900/10 bg-black">
        <div ref={contenitore} />
      </div>

      {errore && (
        <p className="mt-2 text-center text-sm font-semibold text-red-800">
          {etichette.errore}
        </p>
      )}
      {!pronto && !errore && (
        <p className="mt-2 text-center text-sm text-stone-600">{etichette.carico}</p>
      )}

      {pronto && durataBrano > 0 && (
        <div className="mt-3 space-y-3">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-stone-700">
              <span>{etichette.inizio}</span>
              <span className="tabular-nums text-stone-900">
                {formatta(inizio)} – {formatta(fine)}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={Math.max(0, durataBrano - durataCorretta)}
              step={1}
              value={Math.min(inizio, Math.max(0, durataBrano - durataCorretta))}
              disabled={durataBrano - durataCorretta <= 0}
              onChange={(e) => scorriInizio(Number(e.target.value))}
              className="mt-1 w-full accent-amber-600"
            />
          </div>
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-stone-700">
              <span>{etichette.durata}</span>
              <span className="tabular-nums text-stone-900">{durataCorretta}s</span>
            </div>
            <input
              type="range"
              min={durataMin}
              max={durataMax}
              step={1}
              value={durataCorretta}
              disabled={durataMax <= durataMin}
              onChange={(e) => scorriDurata(Number(e.target.value))}
              className="mt-1 w-full accent-amber-600"
            />
          </div>
          <button
            type="button"
            onClick={prova}
            className="rounded-full border border-stone-900/20 bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-800 transition hover:bg-stone-200"
          >
            {etichette.prova}
          </button>
        </div>
      )}
    </div>
  );
}

function formatta(secondi: number): string {
  const s = Math.max(0, Math.floor(secondi));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}
