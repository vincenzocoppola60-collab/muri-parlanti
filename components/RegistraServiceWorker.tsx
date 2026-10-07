"use client";

import { useEffect } from "react";

/**
 * Registra il service worker (public/sw.js).
 * Serve solo a poter salvare l'app sulla Home e ad aprirla a schermo intero:
 * non cambia il comportamento del sito quando la rete c'e'.
 *
 * In piu' tiene l'app aggiornata: quando esce una nuova versione del sito,
 * l'app salvata sulla Home la scarica e ricarica da sola. Senza questo, su
 * iPhone un'app aggiunta alla Home poteva restare per giorni sulla versione
 * vecchia (ed e' il motivo per cui il tasto Home sembrava "sparito").
 */
export default function RegistraServiceWorker() {
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    let ricaricatoPerAggiornamento = false;

    // Quando un nuovo service worker prende il controllo, ricarica la pagina
    // una sola volta per mostrare subito la versione nuova.
    const suCambioControllo = () => {
      if (ricaricatoPerAggiornamento) return;
      ricaricatoPerAggiornamento = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      suCambioControllo
    );

    let registrazione: ServiceWorkerRegistration | undefined;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((reg) => {
        registrazione = reg;
      })
      .catch(() => {
        // Senza service worker il sito funziona lo stesso: nessun errore mostrato.
      });

    // Controlla se c'e' una versione nuova quando l'app torna in primo piano
    // o cambia scheda: e' il momento in cui l'utente la sta per guardare.
    const controllaAggiornamento = () => {
      if (document.visibilityState === "visible") registrazione?.update().catch(() => {});
    };
    document.addEventListener("visibilitychange", controllaAggiornamento);
    const timer = window.setInterval(controllaAggiornamento, 60 * 60 * 1000);

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        suCambioControllo
      );
      document.removeEventListener("visibilitychange", controllaAggiornamento);
      window.clearInterval(timer);
    };
  }, []);

  return null;
}