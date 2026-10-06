"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { LINGUE, useLingua } from "@/lib/i18n";

/**
 * Selettore di lingua in alto a destra (bandiera).
 *
 * Aprendolo si sceglie la lingua dell'interfaccia e, subito sotto, si decide
 * se tradurre o no i post pubblici (quelli degli altri utenti): la scelta
 * resta sul dispositivo e non tocca i post scritti da te.
 * Nascosto su /qr, che deve restare pulita per la stampa.
 */
export default function SelettoreLingua() {
  const pathname = usePathname();
  const {
    lingua,
    datiLingua,
    cambiaLingua,
    traduciPubblici,
    setTraduciPubblici,
    t,
  } = useLingua();
  // Il pannello e' "aperto per" la pagina corrente: cambiando pagina si chiude
  // da solo, senza un effetto che azzera lo stato (e senza render a catena).
  const [apertoPer, setApertoPer] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const pagina = pathname ?? "";
  const aperto = apertoPer === pagina;
  const nascosto = pagina.startsWith("/qr");

  // Si chiude toccando fuori o con Esc.
  useEffect(() => {
    if (!aperto) return;
    const suTocco = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setApertoPer(null);
      }
    };
    const suTasto = (e: KeyboardEvent) => {
      if (e.key === "Escape") setApertoPer(null);
    };
    document.addEventListener("mousedown", suTocco);
    window.addEventListener("keydown", suTasto);
    return () => {
      document.removeEventListener("mousedown", suTocco);
      window.removeEventListener("keydown", suTasto);
    };
  }, [aperto]);

  if (nascosto) return null;

  return (
    <div ref={boxRef} className="fixed right-4 top-4 z-50">
      <button
        type="button"
        onClick={() => setApertoPer(aperto ? null : pagina)}
        aria-haspopup="menu"
        aria-expanded={aperto}
        aria-label={`${t("lingua.titolo")}: ${datiLingua.nome}`}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-amber-100/25 bg-stone-950/70 text-xl shadow-lg backdrop-blur transition hover:scale-105 active:scale-95"
      >
        <span aria-hidden>{datiLingua.bandiera}</span>
      </button>

      {aperto && (
        <div
          role="menu"
          aria-label={t("lingua.titolo")}
          className="animate-comparsa absolute right-0 top-14 w-72 rounded-2xl border border-amber-100/20 bg-stone-950/95 p-3 shadow-2xl backdrop-blur-md"
        >
          <p className="px-1 font-scritta text-xl text-amber-100">
            {t("lingua.scegli")}
          </p>

          <div className="mt-2 flex flex-col gap-1">
            {LINGUE.map((l) => {
              const attiva = l.codice === lingua;
              return (
                <button
                  key={l.codice}
                  type="button"
                  role="menuitemradio"
                  aria-checked={attiva}
                  onClick={() => cambiaLingua(l.codice)}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-base font-semibold text-amber-100 transition ${
                    attiva
                      ? "bg-amber-100/15"
                      : "hover:bg-amber-100/10 active:bg-amber-100/20"
                  }`}
                >
                  <span aria-hidden className="text-xl">
                    {l.bandiera}
                  </span>
                  <span className="flex-1">{l.nome}</span>
                  {attiva && <span aria-hidden>✓</span>}
                </button>
              );
            })}
          </div>

          {/* Opzione "traduci i post pubblici" — accanto alla bandiera. */}
          <div className="mt-3 border-t border-amber-100/10 pt-3">
            <button
              type="button"
              role="switch"
              aria-checked={traduciPubblici}
              onClick={() => setTraduciPubblici(!traduciPubblici)}
              className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-amber-100/10 active:bg-amber-100/20"
            >
              <span className="flex-1">
                <span className="block text-base font-semibold text-amber-100">
                  {t("lingua.traduci")}
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-stone-400">
                  {t("lingua.traduciDescr")}
                </span>
              </span>
              <span
                aria-hidden
                className={`mt-0.5 flex h-6 w-11 flex-none items-center rounded-full p-0.5 transition ${
                  traduciPubblici ? "bg-amber-300" : "bg-stone-700"
                }`}
              >
                <span
                  className={`h-5 w-5 rounded-full bg-stone-950 transition ${
                    traduciPubblici ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
