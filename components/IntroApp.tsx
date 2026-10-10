"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useLingua } from "@/lib/i18n";

/**
 * Intro all'apertura dell'app.
 *
 * Si mostra a OGNI apertura (caricamento) dell'app, non alla navigazione
 * interna: il componente vive nel layout root, che viene montato una volta
 * per ogni apertura/refresh e non viene rimontato spostandosi fra le pagine.
 * Chiudendo e riaprendo l'app riparte da capo.
 *
 * Scena: sfondo neutro -> il post-it si "scrive" parola per parola
 * ("A che stai pensando?") -> zoom sul post-it -> si apre l'app.
 * È tutto in CSS/SVG: nessun video, ~KB, nitido su ogni schermo e istantaneo.
 *
 * Fa anche da copertura del caricamento: resta finché l'app non è pronta
 * (durata fissa) e si può saltare con un tocco.
 */

/** Durata totale dell'animazione (ms). */
const DURATA_MS = 3400;
/** Durata (ms) con "movimento ridotto" attivo. */
const DURATA_RIDOTTA_MS = 1200;
/** Dissolvenza finale del velo (ms), allineata alla keyframe CSS. */
const DISSOLVENZA_MS = 600;

/** Parole scritte sul post-it, una alla volta (in quest'ordine). */
const PAROLE = ["A", "che", "stai", "pensando?"];

/** Media query per il rispetto delle preferenze di movimento ridotto. */
const QUERY_RIDOTTO = "(prefers-reduced-motion: reduce)";
function sottoscriviRidotto(cb: () => void) {
  const mq = window.matchMedia(QUERY_RIDOTTO);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
function leggiRidotto() {
  return window.matchMedia(QUERY_RIDOTTO).matches;
}
function leggiRidottoServer() {
  return false;
}

export default function IntroApp() {
  const { t } = useLingua();
  const [uscito, setUscito] = useState(false);
  const [nascosto, setNascosto] = useState(false);
  const ridotto = useSyncExternalStore(
    sottoscriviRidotto,
    leggiRidotto,
    leggiRidottoServer
  );
  const timer = useRef<number | null>(null);

  useEffect(() => {
    timer.current = window.setTimeout(
      () => setUscito(true),
      ridotto ? DURATA_RIDOTTA_MS : DURATA_MS
    );
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [ridotto]);

  // Dopo la dissolvenza smonto del tutto il velo.
  useEffect(() => {
    if (!uscito) return;
    const id = window.setTimeout(() => setNascosto(true), DISSOLVENZA_MS);
    return () => window.clearTimeout(id);
  }, [uscito]);

  const salta = () => {
    if (timer.current) window.clearTimeout(timer.current);
    window.setTimeout(() => setUscito(true), 0);
  };

  if (nascosto) return null;

  return (
    <div
      className={
        "intro-app" +
        (uscito ? " intro-app--uscito" : "") +
        (ridotto ? " intro-app--ridotto" : "")
      }
      onClick={salta}
      role="presentation"
    >
      <div className="intro-app__stage">
        <div className="intro-app__postit">
          <p className="intro-app__testo">
            {PAROLE.map((parola) => (
              <span key={parola} className="intro-app__parola">
                {parola}
              </span>
            ))}
          </p>
          {/* Matita stilizzata che "segue" la scrittura. */}
          <svg
            className="intro-app__pen"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="M14.06 6.19l3.75 3.75L6.75 21H3v-3.75L14.06 6.19z"
              fill="#1c1917"
            />
            <path
              d="M16.19 4.06l1.44-1.44a2 2 0 0 1 2.83 0l.92.92a2 2 0 0 1 0 2.83l-1.44 1.44-3.75-3.75z"
              fill="#44403c"
            />
          </svg>
        </div>
      </div>

      <button type="button" className="intro-app__salta" onClick={salta}>
        {t("intro.salta")}
      </button>
    </div>
  );
}
