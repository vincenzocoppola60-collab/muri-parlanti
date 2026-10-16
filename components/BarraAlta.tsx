"use client";

import { useEffect, useRef, useState } from "react";
import CampanellaNotifiche from "./CampanellaNotifiche";
import TastoHome from "./TastoHome";
import SelettoreLingua from "./SelettoreLingua";

/** Movimento minimo (px) perché la barra reagisca: evita tremolii. */
const SOGLIA_MOVIMENTO = 8;
/** Sotto questa posizione la barra resta sempre visibile (in cima alla pagina). */
const SOGLIA_IN_CIMA = 64;

/**
 * Barra dei comandi in alto a destra (campanella, Home, lingua).
 *
 * Resta fissa e tenuta dentro le safe area del telefono. Scendendo con la
 * pagina si ritira verso l'alto e risale appena si torna a scorrere in su: così
 * non copre mai i pulsanti del contenuto (es. «Aggiungi muro»), ma è sempre a
 * portata di dito. Le pagine riservano lo spazio in cima con `.sotto-barra-alta`.
 */
export default function BarraAlta() {
  const [nascosta, setNascosta] = useState(false);
  const ultimaY = useRef(0);
  const inAttesa = useRef(false);

  useEffect(() => {
    ultimaY.current = window.scrollY;

    const alScorrimento = () => {
      // Una sola lettura per frame: lo scroll è un evento "caldo".
      if (inAttesa.current) return;
      inAttesa.current = true;
      window.requestAnimationFrame(() => {
        inAttesa.current = false;
        const y = window.scrollY;
        const delta = y - ultimaY.current;
        if (Math.abs(delta) < SOGLIA_MOVIMENTO) return;

        if (y <= SOGLIA_IN_CIMA) {
          // In cima la barra è sempre visibile.
          setNascosta(false);
        } else if (delta > 0) {
          // Si scende: la barra si ritira per non coprire il contenuto.
          setNascosta(true);
        } else {
          // Si risale: la barra torna disponibile.
          setNascosta(false);
        }
        ultimaY.current = y;
      });
    };

    window.addEventListener("scroll", alScorrimento, { passive: true });
    return () => window.removeEventListener("scroll", alScorrimento);
  }, []);

  return (
    <div
      className={`barra-alta${nascosta ? " barra-alta--nascosta" : ""}`}
      aria-hidden={nascosta || undefined}
    >
      <CampanellaNotifiche />
      <TastoHome />
      <SelettoreLingua />
    </div>
  );
}
