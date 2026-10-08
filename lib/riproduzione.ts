"use client";

/**
 * Coordinatore della riproduzione audio tra i post-it.
 *
 * Sul muro possono esserci decine di post-it, ognuno con la sua canzone.
 * Serve che vada UNA traccia alla volta: quando ne parte una, quella che
 * stava suonando viene fermata prima.
 *
 * Ogni player registra una funzione che lo mette in pausa; chi parte per primo
 * "prende il palco" e fa fermare il precedente. Lo stato vive a livello di
 * modulo (una sola istanza per tutta la pagina).
 */
type Ferma = () => void;

let attivo: Ferma | null = null;

/** Ferma chi sta suonando (se diverso) e prende il palco per `ferma`. */
export function prendiPalco(ferma: Ferma): void {
  if (attivo && attivo !== ferma) {
    try {
      attivo();
    } catch {
      // un player gia' smontato non deve bloccare l'avvio del nuovo
    }
  }
  attivo = ferma;
}

/** Rilascia il palco se e' ancora il nostro (pausa, fine, smontaggio). */
export function lasciaPalco(ferma: Ferma): void {
  if (attivo === ferma) attivo = null;
}
