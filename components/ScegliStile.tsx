"use client";

import { N_STILI } from "@/components/StilePostit";
import {
  livelloMinimoStile,
  prossimoSblocco,
  stileSbloccato,
} from "@/lib/stili";
import { useLingua } from "@/lib/i18n";

/**
 * Pannello di scelta dello stile del post-it.
 *
 * Si apre dall'editor per gli utenti con account: gli stili si sbloccano
 * salendo di livello (vedi lib/stili.ts). Le varianti ancora bloccate
 * appaiono in grigio con un lucchetto e non sono toccabili; l'amministratore
 * vede invece tutte le 16 varianti disponibili.
 *
 * Il numero su ogni riquadro è solo un riferimento visivo.
 */
export default function ScegliStile({
  valore,
  onScegli,
  onChiudi,
  livelloUtente = 1,
  amministratore = false,
}: {
  valore: number | null;
  onScegli: (stile: number) => void;
  onChiudi: () => void;
  /** Livello dell'utente collegato (0/1 = principiante). */
  livelloUtente?: number;
  /** Se true ignora i limiti di livello (accesso completo). */
  amministratore?: boolean;
}) {
  const { t } = useLingua();
  const stili = Array.from({ length: N_STILI }, (_, i) => i + 1);
  const prossimo = prossimoSblocco(livelloUtente);

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
            const sbloccato = amministratore || stileSbloccato(n, livelloUtente);
            const livello = livelloMinimoStile(n);

            if (!sbloccato) {
              return (
                <div
                  key={n}
                  aria-disabled
                  title={t("editor.stileBloccato", { n: livello })}
                  aria-label={`${t("editor.stile")} ${n} — ${t("editor.stileBloccato", {
                    n: livello,
                  })}`}
                  className="stile-swatch stile-n relative flex aspect-square cursor-not-allowed items-center justify-center overflow-hidden rounded-lg opacity-40 grayscale"
                >
                  <span className="stile-sheet" aria-hidden />
                  <span className="absolute inset-0 flex items-center justify-center text-lg drop-shadow">
                    🔒
                  </span>
                  <span className="absolute bottom-0.5 right-1 text-[9px] font-bold text-stone-900/70">
                    {livello}
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

        {!amministratore && (
          <p className="mt-4 text-center text-xs text-stone-400">
            {prossimo
              ? t("editor.stileSalita", {
                  stile: prossimo.stile,
                  nome: t(`livello.${prossimo.livello}`),
                })
              : t("editor.stileTutti")}
          </p>
        )}
        <p className="mt-1 text-center text-xs text-stone-400">
          {t("editor.stileInfo")}
        </p>
      </div>
    </div>
  );
}
