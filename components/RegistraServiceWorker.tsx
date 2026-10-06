"use client";

import { useEffect } from "react";

/**
 * Registra il service worker (public/sw.js).
 * Serve solo a poter salvare l'app sulla Home e ad aprirla a schermo intero:
 * non cambia il comportamento del sito quando la rete c'e'.
 */
export default function RegistraServiceWorker() {
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Senza service worker il sito funziona lo stesso: nessun errore mostrato.
    });
  }, []);

  return null;
}
