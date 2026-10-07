"use client";

import { useEffect, useRef, useState } from "react";
import { caricaApiVideo, type YTPlayer } from "@/lib/youtube";

/**
 * Riproduce SOLO la parte scelta di una canzone, senza mostrare il video.
 *
 * Il player YouTube viene creato fuori dallo schermo: si sente la musica ma
 * nessun video compare. Parte dal secondo scelto e si ferma da solo alla fine
 * della porzione (max 30s). Mostra un semplice tasto ascolta/pausa e una barra
 * di avanzamento.
 */
export default function PlayerAudioYoutube({
  id,
  inizio,
  fine,
}: {
  id: string;
  inizio: number;
  fine: number | null;
}) {
  const contenitore = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const timer = useRef<number | null>(null);
  const [pronto, setPronto] = useState(false);
  const [suona, setSuona] = useState(false);
  const [progresso, setProgresso] = useState(0);

  const limite = fine && fine > inizio ? fine : inizio + 30;
  const lunghezza = Math.max(1, limite - inizio);

  useEffect(() => {
    let annullato = false;
    const nodo = contenitore.current;
    if (!nodo) return;
    caricaApiVideo()
      .then((YT) => {
        if (annullato) return;
        player.current = new YT.Player(nodo, {
          videoId: id,
          width: 200,
          height: 200,
          playerVars: { rel: 0, modestbranding: 1, playsinline: 1, controls: 0 },
          events: {
            onReady: () => {
              if (!annullato) setPronto(true);
            },
          },
        });
      })
      .catch(() => {
        // Se l'API non carica, resta il tasto disabilitato: meglio di un errore.
      });
    return () => {
      annullato = true;
      if (timer.current) window.clearInterval(timer.current);
      try {
        player.current?.destroy();
      } catch {
        // nulla
      }
      player.current = null;
    };
  }, [id]);

  function fermaTimer() {
    if (timer.current) {
      window.clearInterval(timer.current);
      timer.current = null;
    }
  }

  function avvia() {
    const p = player.current;
    if (!p) return;
    fermaTimer();
    p.seekTo(inizio, true);
    p.playVideo();
    setSuona(true);
    timer.current = window.setInterval(() => {
      const pl = player.current;
      if (!pl) return;
      const t = pl.getCurrentTime();
      setProgresso(Math.min(1, Math.max(0, (t - inizio) / lunghezza)));
      if (t >= limite - 0.15) {
        pl.pauseVideo();
        setSuona(false);
        setProgresso(0);
        fermaTimer();
      }
    }, 200);
  }

  function pausa() {
    player.current?.pauseVideo();
    setSuona(false);
    fermaTimer();
  }

  return (
    <div className="px-3 py-2">
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: -9999,
          top: 0,
          width: 200,
          height: 200,
          overflow: "hidden",
        }}
      >
        <div ref={contenitore} />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={suona ? pausa : avvia}
          disabled={!pronto}
          aria-label={suona ? "pausa" : "ascolta"}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-900 text-amber-100 transition hover:bg-stone-800 disabled:opacity-40"
        >
          {suona ? "⏸" : "▶"}
        </button>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-900/15">
          <div
            className="h-full rounded-full bg-amber-600 transition-[width] duration-200"
            style={{ width: `${progresso * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
