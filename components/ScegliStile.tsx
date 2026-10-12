"use client";

import { N_STILI } from "@/components/StilePostit";
import { useLingua } from "@/lib/i18n";

/**
 * Pannello di scelta dello stile del post-it.
 *
 * Non esiste più il sistema di livelli: le 16 varianti sono tutte disponibili
 * insieme. Lo stile però è riservato a chi ha un account, quindi il menu resta
 * SEMPRE visibile nell'editor ma:
 *  - utente loggato  -> tutte e 16 le varianti sono scegliibili (niente lucchetti);
 *  - ospite          -> le varianti si vedono in anteprima ma non si possono
 *                      scegliere, con un invito a registrarsi.
 *
 * Il numero su ogni riquadro è solo un riferimento visivo.
 */
export default function ScegliStile({
  valore,
  onScegli,
  onChiudi,
  consentito = true,
}: {
  valore: number | null;
  onScegli: (stile: number) => void;
  onChiudi: () => void;
  /** true = l'utente è loggato e può usare gli stili. */
  consentito?: boolean;
}) {
  const { t } = useLingua();
  const stili = Array.from({ length: N_STILI }, (_, i) => i + 1);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-stone-950/70 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md rounded-2xl border border-amber-100/20 bg-stone-900/95 p-5 text-amber-50 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-base font-bold">{t("editor.stileScegli")}</p>
          <button
            type="button"
            onClick={onChiudi}
            aria-label={t("editor.annulla")}
            className="rounded-full px-2 py-1 text-lg leading-none text-stone-400 transition hover:text-amber-100"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {stili.map((n) => {
            const attivo = valore === n;

            if (!consentito) {
              // Ospite: anteprima non toccabile (nessun lucchetto, solo opacità).
              return (
                <div
                  key={n}
                  aria-disabled
                  aria-label={`${t("editor.stile")} ${n}`}
                  className={
                    "stile-swatch stile-" +
                    n +
                    " relative aspect-square cursor-not-allowed overflow-hidden rounded-lg opacity-40"
                  }
                >
                  <span className="stile-sheet" aria-hidden />
                  <span className="absolute bottom-0.5 right-1 text-[9px] font-bold text-stone-700/70">
                    {n}
                  </span>
                </div>
              );
            }

            return (
              <button
                key={n}
                type="button"
                onClick={() => onScegli(n)}
                aria-label={`${t("editor.stile")} ${n}`}
                aria-pressed={attivo}
                className={
                  "stile-swatch stile-" +
                  n +
                  " relative aspect-square overflow-hidden rounded-lg transition " +
                  (attivo
                    ? "ring-2 ring-amber-300 ring-offset-2 ring-offset-stone-900"
                    : "opacity-90 hover:opacity-100 hover:ring-1 hover:ring-amber-100/40")
                }
              >
                <span className="stile-sheet" aria-hidden />
                <span className="absolute bottom-0.5 right-1 text-[9px] font-bold text-stone-700/70">
                  {n}
                </span>
              </button>
            );
          })}
        </div>

        {!consentito && (
          <div className="mt-4 rounded-lg border border-amber-300/30 bg-amber-300/10 p-3 text-center">
            <p className="text-sm font-semibold text-amber-100">
              🔒 {t("editor.stileServeAccount")}
            </p>
            <a
              href="/impostazioni"
              className="mt-3 inline-block rounded-full bg-amber-300 px-5 py-2 text-sm font-bold text-stone-900 transition hover:scale-105"
            >
              {t("nav.creaAccount")}
            </a>
          </div>
        )}

        <p className="mt-3 text-center text-xs text-stone-400">
          {t("editor.stileInfo")}
        </p>
      </div>
    </div>
  );
}
