/**
 * Suoni dell'interfaccia: due brevi file audio (mp3) serviti da /public/suoni.
 *
 * - `suonaClick()`   -> suono secco di "click" (penna che scatta).
 * - `suonaPenna()`   -> suono di una penna che scrive su un foglio.
 *
 * Vanno chiamati DOPO un gesto dell'utente (il tap su un pulsante), cosi' il
 * browser consente la riproduzione. Se l'audio non e' disponibile non e' un
 * problema: si ignora in silenzio.
 */

const SRC_CLICK = "/suoni/click.mp3";
const SRC_PENNA = "/suoni/penna.mp3";

// Un solo elemento per suono, riusato a ogni tocco: evita di ricreare
// l'oggetto audio ogni volta e rende il secondo tap istantaneo.
let audioClick: HTMLAudioElement | null = null;
let audioPenna: HTMLAudioElement | null = null;

/** Riproduce il suono di "click" (parte al tap su "Lascia un pensiero"). */
export function suonaClick(): void {
  try {
    if (typeof Audio === "undefined") return;
    if (!audioClick) {
      audioClick = new Audio(SRC_CLICK);
      audioClick.preload = "auto";
      audioClick.volume = 0.7;
    }
    // Riavvolge: cosi' un tocco rapido non resta muto se il suono era in corso.
    audioClick.currentTime = 0;
    void audioClick.play().catch(() => {});
  } catch {
    // Nessun audio disponibile: si continua in silenzio.
  }
}

/** Riproduce il suono di una penna che scrive (parte al tap su "Attacca"). */
export function suonaPenna(): void {
  try {
    if (typeof Audio === "undefined") return;
    if (!audioPenna) {
      audioPenna = new Audio(SRC_PENNA);
      audioPenna.preload = "auto";
      audioPenna.volume = 0.9;
    }
    audioPenna.currentTime = 0;
    void audioPenna.play().catch(() => {});
  } catch {
    // Nessun audio disponibile: si continua in silenzio.
  }
}
