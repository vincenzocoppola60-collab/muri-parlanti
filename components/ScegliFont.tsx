"use client";

import { CATEGORIE, fontDiCategoria } from "@/lib/fonti";
import { useLingua } from "@/lib/i18n";

/**
 * Pannello di scelta del font del post-it.
 *
 * Si apre dall'editor per gli utenti con account. Tutti i font sono
 * disponibili subito (nessun blocco per livello). Sono raggruppati in tre
 * famiglie: a mano, scrittura e graffiti/street.
 */
export default function ScegliFont({
  valore,
  onScegli,
  onChiudi,
}: {
  valore: string | null;
  onScegli: (font: string) => void;
  onChiudi: () => void;
}) {
  const { t } = useLingua();

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-stone-950/70 p-4 backdrop-blur-sm sm:items-center">
      <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-amber-100/20 bg-stone-900/95 p-5 text-amber-50 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-base font-bold">{t("editor.fontScegli")}</p>
          <button
            type="button"
            onClick={onChiudi}
            aria-label={t("editor.annulla")}
            className="rounded-full px-2 py-1 text-lg leading-none text-stone-400 transition hover:text-amber-100"
          >
            ✕
          </button>
        </div>

        {CATEGORIE.map((cat) => {
          const elenco = fontDiCategoria(cat.id);
          if (elenco.length === 0) return null;
          return (
            <div key={cat.id} className="mb-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-amber-200/80">
                {t(cat.chiave)}
              </p>
              <div className="grid grid-cols-4 gap-3">
                {elenco.map((f) => {
                  const attivo = valore === f.codice;
                  return (
                    <button
                      key={f.codice}
                      type="button"
                      onClick={() => onScegli(f.codice)}
                      aria-label={f.nome}
                      aria-pressed={attivo}
                      title={f.nome}
                      className={
                        "relative aspect-square overflow-hidden rounded-lg border transition " +
                        (attivo
                          ? "border-amber-300 bg-stone-800 ring-2 ring-amber-300 ring-offset-2 ring-offset-stone-900"
                          : "border-stone-700 bg-stone-800 opacity-90 hover:border-stone-600 hover:opacity-100")
                      }
                      style={{ fontFamily: `var(${f.variabile})` }}
                    >
                      <span className="flex h-full w-full items-center justify-center p-1 text-center text-base leading-tight">
                        Aa
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        <p className="mt-1 text-center text-xs text-stone-400">
          {t("editor.fontInfo")}
        </p>
      </div>
    </div>
  );
}
