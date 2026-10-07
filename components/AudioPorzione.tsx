"use client";

import { useEffect, useRef } from "react";

/**
 * Riproduttore di una porzione di un'anteprima audio.
 *
 * L'<audio> parte dal secondo "inizio" e, se "durata" e' indicata, si ferma
 * automaticamente dopo tanti secondi. Serve per far sentire solo la parte
 * scelta della canzone (al massimo 30s) invece dell'anteprima intera.
 *
 * Vale sia per le anteprime di Apple Music sia per quelle di Spotify (quando
 * disponibili): sono entrambe file audio di circa 30 secondi.
 */
export default function AudioPorzione({
  src,
  inizio,
  durata,
  autoPlay = true,
  className,
}: {
  src: string;
  inizio: number;
  durata: number | null;
  autoPlay?: boolean;
  className?: string;
}) {
  const rif = useRef<HTMLAudioElement>(null);

  // Porta la riproduzione all'inizio scelto appena i metadati sono pronti.
  useEffect(() => {
    const a = rif.current;
    if (!a) return;
    const vai = () => {
      if (inizio > 0 && Number.isFinite(a.duration) && inizio < a.duration) {
        a.currentTime = inizio;
      }
    };
    if (a.readyState >= 1) vai();
    else a.addEventListener("loadedmetadata", vai, { once: true });
    return () => a.removeEventListener("loadedmetadata", vai);
  }, [src, inizio]);

  return (
    <audio
      ref={rif}
      src={src}
      controls
      autoPlay={autoPlay}
      onTimeUpdate={(e) => {
        if (durata && durata > 0) {
          const fine = inizio + durata;
          if (e.currentTarget.currentTime >= fine) {
            e.currentTarget.pause();
            e.currentTarget.currentTime = inizio;
          }
        }
      }}
      className={className}
    />
  );
}
