"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { caricaApiVideo, formattaSecondi, type YTPlayer } from "@/lib/youtube";

/**
 * Scelta della parte della canzone, in stile "storia di Instagram".
 *
 * NON si vede nessun video: la canzone suona (audio) da un player nascosto e
 * l'utente sceglie il pezzo da tenere trascinando UNA sola barra a forma di
 * onda sonora, esattamente come si fa nei video/instagram stories.
 *
 * La finestra selezionata e' al massimo di 30 secondi; se il brano e' piu'
 * corto, la finestra coincide con tutto il brano.
 */

const MAX_PORZIONE = 30;
const N_BARRE = 56;

export default function PorzioneYouTube({
  videoId,
  onCambia,
  etichette,
}: {
  videoId: string;
  onCambia: (p: { inizio: number; durata: number; fine: number }) => void;
  etichette: {
    istruzioni: string;
    riproduci: string;
    pausa: string;
    carico: string;
    errore: string;
  };
}) {
  const contenitore = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const timer = useRef<number | null>(null);
  const barra = useRef<HTMLDivElement>(null);
  const trascino = useRef(false);
  const avviato = useRef(false);

  const [pronto, setPronto] = useState(false);
  const [errore, setErrore] = useState(false);
  const [durataBrano, setDurataBrano] = useState(0);
  const [inizio, setInizio] = useState(0);
  const [inRiproduzione, setInRiproduzione] = useState(false);

  // Onda sonora finta ma stabile (sempre uguale per lo stesso brano): serve
  // solo a dare l'aspetto tipico delle storie, i dati audio reali non servono.
  const barre = useMemo(() => {
    let h = 2166136261;
    for (let i = 0; i < videoId.length; i++) {
      h ^= videoId.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    const out: number[] = [];
    for (let i = 0; i < N_BARRE; i++) {
      h ^= h << 13;
      h ^= h >>> 17;
      h ^= h << 5;
      out.push(0.22 + ((h >>> 0) % 1000) / 1000 * 0.78);
    }
    return out;
  }, [videoId]);

  const finestra = durataBrano > 0 ? Math.min(MAX_PORZIONE, durataBrano) : MAX_PORZIONE;
  const spostabile = durataBrano - finestra > 0.5;
  const fine = Math.min(inizio + finestra, durataBrano);

  const idxInizio = durataBrano > 0 ? (inizio / durataBrano) * N_BARRE : 0;
  const idxFine = durataBrano > 0 ? (fine / durataBrano) * N_BARRE : N_BARRE;
  const fracInizio = durataBrano > 0 ? inizio / durataBrano : 0;
  const fracFinestra = durataBrano > 0 ? finestra / durataBrano : 1;

  useEffect(() => {
    let annullato = false;
    const nodo = contenitore.current;
    if (!nodo) return;
    caricaApiVideo()
      .then((YT) => {
        if (annullato) return;
        player.current = new YT.Player(nodo, {
          videoId,
          width: 200,
          height: 200,
          playerVars: { rel: 0, modestbranding: 1, playsinline: 1, controls: 0 },
          events: {
            onReady: () => {
              if (annullato) return;
              const d = Math.floor(player.current?.getDuration() ?? 0);
              setPronto(true);
              if (d > 0) setDurataBrano(d);
            },
          },
        });
      })
      .catch(() => {
        if (!annullato) setErrore(true);
      });
    return () => {
      annullato = true;
      fermaTimer();
      try {
        player.current?.destroy();
      } catch {
        // il player potrebbe non essere stato creato
      }
      player.current = null;
    };
  }, [videoId]);

  // La parte scelta va comunicata al genitore per salvarla alla conferma.
  useEffect(() => {
    if (!durataBrano) return;
    onCambia({
      inizio,
      durata: finestra,
      fine: Math.min(inizio + finestra, durataBrano),
    });
  }, [inizio, finestra, durataBrano, onCambia]);

  // All'apertura partiamo da soli (l'utente ha appena toccato la canzone).
  useEffect(() => {
    if (!pronto || durataBrano <= 0 || avviato.current) return;
    avviato.current = true;
    avvia();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pronto, durataBrano]);

  function fermaTimer() {
    if (timer.current) {
      window.clearInterval(timer.current);
      timer.current = null;
    }
  }

  function avvia() {
    const p = player.current;
    if (!p || durataBrano <= 0) return;
    fermaTimer();
    p.seekTo(inizio, true);
    p.playVideo();
    setInRiproduzione(true);
    const limite = Math.min(inizio + finestra, durataBrano);
    timer.current = window.setInterval(() => {
      const pl = player.current;
      if (!pl) return;
      const t = pl.getCurrentTime();
      if (t >= limite - 0.15) {
        pl.pauseVideo();
        setInRiproduzione(false);
        fermaTimer();
      }
    }, 180);
  }

  function pausa() {
    player.current?.pauseVideo();
    setInRiproduzione(false);
    fermaTimer();
  }

  function muovi(clientX: number) {
    const el = barra.current;
    if (!el || durataBrano <= 0) return;
    const r = el.getBoundingClientRect();
    const f = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    const nuovo = Math.min(
      Math.max(f * durataBrano - finestra / 2, 0),
      Math.max(0, durataBrano - finestra)
    );
    setInizio(nuovo);
  }

  function iniziaTrascina(e: React.PointerEvent) {
    if (!spostabile) return;
    trascino.current = true;
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    muovi(e.clientX);
  }

  function duranteTrascina(e: React.PointerEvent) {
    if (trascino.current) muovi(e.clientX);
  }

  function finisciTrascina() {
    if (!trascino.current) return;
    trascino.current = false;
    if (inRiproduzione) avvia();
  }

  return (
    <div>
      {/* Player nascosto: suona l'audio, il video non si vede mai. */}
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

      {errore && (
        <p className="py-3 text-center text-sm font-semibold text-red-800">
          {etichette.errore}
        </p>
      )}
      {!pronto && !errore && (
        <p className="py-3 text-center text-sm text-stone-600">{etichette.carico}</p>
      )}

      {pronto && durataBrano > 0 && (
        <div>
          <p className="mb-2 text-center text-xs font-medium text-stone-600">
            {etichette.istruzioni}
          </p>

          {/* La barra: trascinala per scegliere la parte (stile storie). */}
          <div
            ref={barra}
            role="slider"
            aria-label={etichette.istruzioni}
            aria-valuemin={0}
            aria-valuemax={Math.round(durataBrano)}
            aria-valuenow={Math.round(inizio)}
            tabIndex={0}
            onPointerDown={iniziaTrascina}
            onPointerMove={duranteTrascina}
            onPointerUp={finisciTrascina}
            onPointerCancel={finisciTrascina}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") setInizio((v) => Math.max(0, v - 1));
              if (e.key === "ArrowRight")
                setInizio((v) => Math.min(Math.max(0, durataBrano - finestra), v + 1));
            }}
            className={
              "relative flex h-24 items-end gap-[2px] overflow-hidden rounded-xl bg-stone-900/5 px-1.5 py-1.5 " +
              (spostabile ? "cursor-grab touch-none select-none" : "")
            }
          >
            {barre.map((h, i) => {
              const dentro = i >= idxInizio && i < idxFine;
              return (
                <span
                  key={i}
                  style={{ height: `${h * 100}%` }}
                  className={
                    "flex-1 rounded-[2px] transition-colors " +
                    (dentro ? "bg-amber-500" : "bg-stone-400/40")
                  }
                />
              );
            })}
            {/* Cornice della finestra scelta (i 30 secondi). */}
            <span
              className="pointer-events-none absolute inset-y-0 rounded-lg border-2 border-amber-600"
              style={{
                left: `calc(${fracInizio * 100}% + 6px)`,
                width: `calc(${fracFinestra * 100}% - 12px)`,
              }}
            />
          </div>

          <div className="mt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={inRiproduzione ? pausa : avvia}
              className="flex items-center gap-2 rounded-full border border-stone-900/15 bg-white px-4 py-2 text-sm font-semibold text-stone-800 transition hover:bg-stone-100"
            >
              {inRiproduzione ? etichette.pausa : etichette.riproduci}
            </button>
            <span className="tabular-nums text-xs font-semibold text-stone-700">
              {formattaSecondi(inizio)} – {formattaSecondi(fine)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
