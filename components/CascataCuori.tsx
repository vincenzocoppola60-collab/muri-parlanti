"use client";

import { useEffect, useMemo, useRef } from "react";

/**
 * Festa dopo il PRIMO invio di una proposta "Fonda un muro":
 * cascata di cuori + trombette da compleanno.
 *
 * - I cuori sono emoji che cadono dall'alto (animazione in globals.css).
 * - Le trombette sono SUONATE dal browser con la Web Audio API: nessun file
 *   audio da scaricare, funziona anche offline. Un breve "ta-da!" con due
 *   trombe e una nota finale piu' acuta, come una festa.
 * - Il componente si smonta da solo dopo la durata dell'effetto.
 * - Con "prefers-reduced-motion" i cuori non cadono: resta solo il suono, e
 *   il suono non parte mai senza un gesto dell'utente (lo invocchiamo dopo
 *   il tap sul pulsante, quindi il browser lo consente).
 */
type Props = {
  /** Simboli da far cadere (default: cuori). */
  cuori?: string[];
  /** Quanti cuori far cadere. */
  quantita?: number;
  /** Durata della cascata in millisecondi. */
  durataMs?: number;
  /** True quando la festa deve partire. Cambiando a true si riavvia. */
  attiva: boolean;
  /** Chiamata quando la festa e' finita (per smontarla). */
  onFine?: () => void;
};

const CUORI_DEFAULT = ["❤️", "💛", "🧡", "💜", "💖", "💕"];

/**
 * Numero pseudo-casuale 0..1 STABILE e PURO a partire da un indice.
 * Non usiamo Math.random() durante il render (produrrebbe valori instabili
 * fra un re-render e l'altro); questa formula da' comunque una cascata varia.
 */
function casualePuro(indice: number, seme: number): number {
  const x = Math.sin((indice + 1) * 127.1 + seme * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export default function CascataCuori({
  cuori = CUORI_DEFAULT,
  quantita = 60,
  durataMs = 4200,
  attiva,
  onFine,
}: Props) {
  const suonatoRef = useRef(false);

  // Posizioni casuali stabili: generate solo quando la festa parte.
  const pezzi = useMemo(() => {
    if (!attiva) return [];
    return Array.from({ length: quantita }, (_, i) => ({
      id: i,
      simbolo: cuori[i % cuori.length],
      left: casualePuro(i, 1) * 100, // %
      ritardo: casualePuro(i, 2) * 1.6, // s
      durata: 2.2 + casualePuro(i, 3) * 2.0, // s
      misura: 20 + casualePuro(i, 4) * 26, // px
    }));
  }, [attiva, cuori, quantita]);

  // Suona le trombette una sola volta per ogni festa.
  useEffect(() => {
    if (!attiva) {
      suonatoRef.current = false;
      return;
    }
    if (suonatoRef.current) return;
    suonatoRef.current = true;
    suonaTrombette();
  }, [attiva]);

  // Smonta da solo a fine cascata.
  useEffect(() => {
    if (!attiva) return;
    const id = window.setTimeout(() => onFine?.(), durataMs);
    return () => window.clearTimeout(id);
  }, [attiva, durataMs, onFine]);

  if (!attiva || pezzi.length === 0) return null;

  return (
    <div className="cuori-festa" aria-hidden>
      {pezzi.map((p) => (
        <span
          key={p.id}
          className="cuore-cascata"
          style={{
            left: `${p.left}%`,
            fontSize: `${p.misura}px`,
            animationDelay: `${p.ritardo}s`,
            animationDuration: `${p.durata}s`,
          }}
        >
          {p.simbolo}
        </span>
      ))}
    </div>
  );
}

/**
 * "Ta-da!" di trombette da compleanno con la Web Audio API.
 * Due trombe che salgono (do-mi-sol-do) e un tocco finale piu' lungo.
 * Se il browser blocca l'audio, si ignora in silenzio: la festa resta visiva.
 */
export function suonaTrombette(): void {
  try {
    const AudioCtx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const ora = ctx.currentTime;
    const uscita = ctx.createGain();
    uscita.gain.value = 0.16; // volume garbato
    uscita.connect(ctx.destination);

    // Un filtro passabasso dà quel timbro "di plastica" della trombetta.
    const filtro = ctx.createBiquadFilter();
    filtro.type = "lowpass";
    filtro.frequency.value = 3200;
    filtro.connect(uscita);

    // Le note del "ta-da!" (Hz): do5, mi5, sol5, do6.
    const note = [
      { f: 523.25, t: 0.0, d: 0.18 },
      { f: 659.25, t: 0.16, d: 0.18 },
      { f: 783.99, t: 0.32, d: 0.18 },
      { f: 1046.5, t: 0.48, d: 0.55 },
    ];

    for (const n of note) {
      // Due oscillatori leggermente scordati = suono piu' pieno, "da festa".
      for (const detune of [-7, 7]) {
        const osc = ctx.createOscillator();
        osc.type = "sawtooth";
        osc.frequency.value = n.f;
        osc.detune.value = detune;

        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, ora + n.t);
        g.gain.exponentialRampToValueAtTime(0.9, ora + n.t + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, ora + n.t + n.d);

        osc.connect(g);
        g.connect(filtro);
        osc.start(ora + n.t);
        osc.stop(ora + n.t + n.d + 0.05);
      }
    }

    // Chiude il contesto audio quando ha finito (risparmia risorse).
    window.setTimeout(() => {
      void ctx.close().catch(() => {});
    }, 1600);
  } catch {
    // Nessun audio disponibile: non è un problema, la festa resta visiva.
  }
}
