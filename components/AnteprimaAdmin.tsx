"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { eAmministratore } from "@/lib/admin";

/**
 * Anteprima riservata all'amministratore.
 *
 * Quando l'utente connesso e' un amministratore aggiunge la classe
 * `anteprima-admin` a <html>: il CSS (app/globals.css) mostra cosi' le prove
 * grafiche (post-it quadrati, 3 colonne, giallo standard, data senza orario,
 * titoli in grassetto). Tutti gli altri utenti non vedono nessuna differenza.
 */
export default function AnteprimaAdmin() {
  const { utente } = useAuth();

  useEffect(() => {
    let attivo = true;
    if (!utente) return;
    eAmministratore()
      .then((si) => {
        if (attivo && si) {
          document.documentElement.classList.add("anteprima-admin");
        }
      })
      .catch(() => {
        // Senza risposta dal database l'anteprima resta spenta: nessun errore.
      });
    return () => {
      attivo = false;
    };
  }, [utente]);

  return null;
}