"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { caricaApiVideo, formattaSecondi, type YTPlayer } from "@/lib/youtube";

/**
 * Scelta della parte della canzone, in stile "storia di Instagram".
 *
 * NON si vede nessun video: la canzone suona (audio) da un player nascosto e
 * l'utente sceglie il pezzo da tenere agendo su UNA sola barra a forma di onda
 * sonora, come nelle storie:
 *  - trascinando il CENTRO della finestra la si sposta lungo la canzone;
 *  - tirando i due BORDI si allarga o si stringe la finestra.
 *
 * La durata e' libera da 5 a 30 secondi (se il brano e' piu' corto di 5s la
 * finestra coincide con tutto il brano).
 */

const MIN_PORZIONE = 5;
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
    durata: string;
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
  const modo = useRef<"sposta" | "sinistra" | "destra" | null>(null);
  const avviato = useRef(false);

  const [pronto, setPronto] = useState(false);
  const [errore, setErrore] = useState(false);
  const [durataBrano, setDurataBrano] = useState(0);
  const [inizio, setInizio] = useState(0);
  const [durataScelta, setDurataScelta] = useState(MAX_PORZIONE);
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
      out.push(0.22 + (((h >>> 0) % 1000) / 1000) * 0.78);
    }
    return out;
  }, [videoId]);

  // Limiti della finestra: mai oltre la lunghezza del brano.
  const durataMin = Math.min(MIN_PORZIONE, durataBrano || MIN_PORZIONE);
  const durataMax = Math.min(MAX_PORZIONE, durataBrano || MAX_PORZIONE);
  const finestra = Math.min(Math.max(durataScelta, durataMin), durataMax);
  const fine = Math.min(inizio + finestra, durataBrano);
  const puoiAllargare = durataMax > durataMin;

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
              if (d > 0) {
                setDurataBrano(d);
                setDurataScelta((c) => Math.min(Math.max(c, MIN_PORZIONE), d));
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
      if (pl.getCurrentTime() >= limite - 0.15) {
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

  /** Secondo della canzone sotto il dito, in base alla posizione orizzontale. */
  function secondoDaX(clientX: number): number | null {
    const el = barra.current;
    if (!el || durataBrano <= 0) return null;
    const r = el.getBoundingClientRect();
    const f = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    return f * durataBrano;
  }

  function aggiorna(t: number) {
    const m = modo.current;
    if (m === "sposta") {
      const nuovo = Math.min(
        Math.max(t - finestra / 2, 0),
        Math.max(0, durataBrano - finestra)
      );
      setInizio(nuovo);
    } else if (m === "sinistra") {
      // Il bordo sinistro si muove; quello destro resta fermo.
      const nuovoInizio = Math.min(
        Math.max(t, fine - durataMax, 0),
        Math.max(0, fine - durataMin)
      );
      setInizio(nuovoInizio);
      setDurataScelta(fine - nuovoInizio);
    } else if (m === "destra") {
      // Il bordo destro si muove; quello sinistro resta fermo.
      const nuovoFine = Math.max(
        Math.min(t, inizio + durataMax, durataBrano),
        inizio + durataMin
      );
      setDurataScelta(nuovoFine - inizio);
    }
  }

  function iniziaTrascina(e: React.PointerEvent) {
    const t = secondoDaX(e.clientX);
    if (t === null) return;
    const r = barra.current!.getBoundingClientRect();
    // Zona "maniglia" in secondi, corrispondente a ~18 px ai due lati.
    const soglia = (18 / r.width) * durataBrano;
    if (Math.abs(t - inizio) <= soglia) {
      modo.current = "sinistra";
    } else if (Math.abs(t - fine) <= soglia) {
      modo.current = "destra";
    } else {
      modo.current = "sposta";
    }
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    aggiorna(t);
  }

  function duranteTrascina(e: React.PointerEvent) {
    if (!modo.current) return;
    const t = secondoDaX(e.clientX);
    if (t !== null) aggiorna(t);
  }

  function finisciTrascina() {
    if (!modo.current) return;
    modo.current = null;
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

          {/* La barra: sposta la finestra dal centro, cambia durata dai bordi. */}
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
                setInizio((v) =>
                  Math.min(Math.max(0, durataBrano - finestra), v + 1)
                );
            }}
            className="relative flex h-24 cursor-grab touch-none select-none items-end gap-[2px] overflow-hidden rounded-xl bg-stone-900/5 px-1.5 py-1.5 active:cursor-grabbing"
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
            {/* Cornice della finestra scelta, con i due bordi trascinabili. */}
            <span
              className="pointer-events-none absolute inset-y-0 rounded-lg border-2 border-amber-600"
              style={{
                left: `calc(${fracInizio * 100}% + 6px)`,
                width: `calc(${fracFinestra * 100}% - 12px)`,
              }}
            >
              <span className="absolute -left-1 top-1/2 h-8 w-2 -translate-y-1/2 rounded-full bg-amber-600 shadow" />
              <span className="absolute -right-1 top-1/2 h-8 w-2 -translate-y-1/2 rounded-full bg-amber-600 shadow" />
            </span>
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
              {formattaSecondi(inizio)} – {formattaSecondi(fine)} ·{" "}
              {Math.round(finestra)}s
            </span>
          </div>

          {puoiAllargare && (
            <div className="mt-2">
              <label className="mb-1 flex items-center justify-between text-xs font-semibold text-stone-700">
                <span>{etichette.durata}</span>
                <span className="tabular-nums">{Math.round(finestra)}s</span>
              </label>
              <input
                type="range"
                min={durataMin}
                max={durataMax}
                step={1}
                value={finestra}
                onChange={(e) => {
                  const d = Number(e.target.value);
                  setDurataScelta(d);
                  setInizio((v) =>
                    Math.min(v, Math.max(0, durataBrano - d))
                  );
                }}
                className="w-full accent-amber-600"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
