"use client";

import {
  FONTI,
  fontSbloccato,
  livelloMinimoFont,
  prossimoFontSblocco,
} from "@/lib/fonti";
import { useLingua } from "@/lib/i18n";

/**
 * Pannello di scelta del font del post-it.
 *
 * Si apre dall'editor per gli utenti con account: i font si sbloccano
 * salendo di livello (vedi lib/fonti.ts). Le varianti ancora bloccate
 * appaiono in grigio con un lucchetto e non sono toccabili; l'amministratore
 * vede invece tutti i 20 font disponibili.
 */
export default function ScegliFont({
  valore,
  onScegli,
  onChiudi,
  livelloUtente = 1,
  amministratore = false,
}: {
  valore: string | null;
  onScegli: (font: string) => void;
  onChiudi: () => void;
  livelloUtente?: number;
  amministratore?: boolean;
}) {
  const { t } = useLingua();

  const fontOk = (codice: (typeof FONTI)[number]["codice"]) =>
    amministratore || fontSbloccato(codice, livelloUtente);

  const prossimo = prossimoFontSblocco(livelloUtente);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-stone-950/70 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md rounded-2xl border border-amber-100/20 bg-stone-900/95 p-5 text-amber-50 shadow-2xl">
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

        <div className="grid grid-cols-4 gap-3">
          {FONTI.map((f, idx) => {
            const attivo = valore === f.codice;
            const ok = fontOk(f.codice);
            const lv = livelloMinimoFont(f.codice);

            if (!ok) {
              return (
                <div
                  key={f.codice}
                  aria-disabled
                  title={t("editor.fontBloccato", { n: lv })}
                  aria-label={`${t("editor.font")} ${f.nome} — ${t(
                    "editor.fontBloccato",
                    { n: lv }
                  )}`}
                  className="relative flex aspect-square cursor-not-allowed items-center justify-center overflow-hidden rounded-lg border border-stone-700 bg-stone-800 opacity-40 grayscale"
                  style={{ fontFamily: `var(${f.variabile})` }}
                >
                  <span className="text-[10px] leading-tight">Aa</span>
                  <span className="absolute inset-0 flex items-center justify-center text-lg drop-shadow">
                    🔒
                  </span>
                  <span className="absolute bottom-0.5 right-1 text-[9px] font-bold text-stone-900/70">
                    {lv}
                  </span>
                </div>
              );
            }

            return (
              <button
                key={f.codice}
                type="button"
                onClick={() => onScegli(f.codice)}
                aria-label={`${t("editor.font")} ${f.nome}`}
                aria-pressed={attivo}
                className={
                  "relative aspect-square overflow-hidden rounded-lg border transition " +
                  (attivo
                    ? "border-amber-300 bg-stone-800 ring-2 ring-amber-300 ring-offset-2 ring-offset-stone-900"
                    : "border-stone-700 bg-stone-800 opacity-90 hover:border-stone-600 hover:opacity-100")
                }
                style={{ fontFamily: `var(${f.variabile})` }}
              >
                <span className="flex h-full w-full items-center justify-center text-[10px] leading-tight">
                  Aa
                </span>
                <span className="absolute bottom-0.5 right-1 text-[9px] font-bold text-stone-700/70">
                  {idx + 1}
                </span>
              </button>
            );
          })}
        </div>

        {!amministratore && (
          <p className="mt-4 text-center text-xs text-stone-400">
            {prossimo === null
              ? t("editor.fontTutti")
              : t("editor.fontSalita", { n: prossimo.livello })}
          </p>
        )}
        <p className="mt-1 text-center text-xs text-stone-400">
          {t("editor.fontInfo")}
        </p>
      </div>
    </div>
  );
}
