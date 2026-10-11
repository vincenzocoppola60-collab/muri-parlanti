"use client";

import { useEffect, useState } from "react";
import { useLingua } from "@/lib/i18n";
import {
  applicaTema,
  leggiTemaSalvato,
  TEMI,
  TEMA_PREDEFINITO,
  type CodiceTema,
} from "@/lib/temi";

/**
 * Selettore del tema (colori) dell'app.
 *
 * Mostra una pallina con i colori di ogni tema; scegliendone uno la palette
 * cambia subito (l'attributo `data-tema` su <html>, vedi app/globals.css) e la
 * scelta resta sul dispositivo. Pensato per la pagina Impostazioni e mostrato,
 * per ora, solo agli amministratori.
 */
export default function SelettoreTema() {
  const { t } = useLingua();
  // Il server non conosce la scelta salvata: si parte dal predefinito e si
  // legge il valore reale subito dopo il mount (cosi' non diverge l'idratazione).
  const [tema, setTema] = useState<CodiceTema>(TEMA_PREDEFINITO);

  // Lettura dopo il primo render (come fa la lingua): il server non conosce la
  // scelta salvata, cosi' non si innesca una divergenza di idratazione.
  useEffect(() => {
    const id = window.setTimeout(() => setTema(leggiTemaSalvato()), 0);
    return () => window.clearTimeout(id);
  }, []);

  function scegli(codice: CodiceTema) {
    setTema(codice);
    applicaTema(codice);
  }

  return (
    <section className="mt-4 rounded-lg border border-amber-100/20 bg-stone-900/60 p-6 shadow-xl backdrop-blur-sm">
      <h2 className="font-scritta text-xl text-amber-100">
        {t("impost.tema")}
      </h2>
      <p className="mt-2 text-xs text-stone-400">{t("impost.temaNota")}</p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {TEMI.map((x) => {
          const attivo = x.codice === tema;
          return (
            <button
              key={x.codice}
              type="button"
              onClick={() => scegli(x.codice)}
              aria-pressed={attivo}
              className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-sm font-semibold transition ${
                attivo
                  ? "border-amber-300 bg-amber-100/10 text-amber-100"
                  : "border-amber-100/20 text-stone-300 hover:border-amber-100/50 hover:text-amber-100"
              }`}
            >
              <span
                aria-hidden
                className="h-9 w-9 rounded-full border border-white/20 shadow"
                style={{
                  background: `linear-gradient(135deg, ${x.anteprima[0]} 50%, ${x.anteprima[1]} 50%)`,
                }}
              />
              <span>{t(x.chiave)}</span>
              <span
                className={`text-[10px] uppercase tracking-wide ${
                  attivo ? "text-amber-300" : "text-transparent"
                }`}
              >
                {t("tema.attivo")}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
