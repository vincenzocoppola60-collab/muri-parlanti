"use client";

import { useSyncExternalStore } from "react";
import {
  EVENTO_TEMA,
  TEMA_PREDEFINITO,
  leggiTemaSalvato,
  type CodiceTema,
} from "./temi";

/**
 * Si iscrive ai cambi del tema: l'evento emesso da applicaTema (stessa
 * scheda) e "storage" (altre schede). useSyncExternalStore rilegge il valore
 * da localStorage a ogni notifica, senza setState dentro un effetto.
 */
function iscrivi(callback: () => void): () => void {
  window.addEventListener(EVENTO_TEMA, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENTO_TEMA, callback);
    window.removeEventListener("storage", callback);
  };
}

/**
 * Legge il tema attivo sul dispositivo e si aggiorna quando cambia.
 * Sul server (hydration) restituisce il tema predefinito, cosi' non rompe
 * l'idratazione; lato client si allinea subito al valore salvato.
 */
export function useTema(): CodiceTema {
  return useSyncExternalStore(iscrivi, leggiTemaSalvato, () => TEMA_PREDEFINITO);
}
