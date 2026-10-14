"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useLingua } from "@/lib/i18n";

/**
 * Invito all'account per chi non e' registrato.
 *
 * Compare quando un OSPITE tocca il nickname di un autore: senza account non si
 * possono aprire i profili degli altri. Non blocca nulla (si chiude subito) e
 * porta al pannello account in /impostazioni, dove si crea l'account o si
 * accede. Vedi components/PostIt.tsx per il punto di aggancio.
 */
export default function ModaleRegistrazione({
  onChiudi,
}: {
  onChiudi: () => void;
}) {
  const { t } = useLingua();

  // Chiudibile con Esc (accessibilita' da tastiera).
  useEffect(() => {
    const alTasto = (e: KeyboardEvent) => {
      if (e.key === "Escape") onChiudi();
    };
    window.addEventListener("keydown", alTasto);
    return () => window.removeEventListener("keydown", alTasto);
  }, [onChiudi]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-stone-950/85 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="invito-titolo"
      onClick={onChiudi}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-amber-100/25 bg-stone-900/95 p-5 text-left shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-amber-200/70">
          {t("invito.occhiello")}
        </p>
        <h2
          id="invito-titolo"
          className="mt-1 font-scritta text-3xl leading-tight text-amber-100"
        >
          {t("invito.titolo")}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-stone-300">
          {t("invito.testo")}
        </p>

        {/* Due strade esplicite: creare l'account o entrare in quello che si ha
            gia'. Portano a /impostazioni, che apre il modulo nella modalita'
            giusta (?modo=registrati / ?modo=accedi). */}
        <div className="mt-5 flex flex-col gap-2">
          <Link
            href="/impostazioni?modo=registrati"
            onClick={onChiudi}
            className="w-full rounded-full bg-amber-300 px-4 py-2.5 text-center text-sm font-bold text-stone-900 shadow-lg transition hover:scale-[1.02] active:scale-95"
          >
            {t("invito.crea")}
          </Link>
          <Link
            href="/impostazioni?modo=accedi"
            onClick={onChiudi}
            className="w-full rounded-full border border-amber-100/30 px-4 py-2.5 text-center text-sm font-semibold text-amber-100 transition hover:bg-stone-950/60"
          >
            {t("invito.entra")}
          </Link>
          <button
            type="button"
            onClick={onChiudi}
            className="mt-1 self-center rounded-full px-3 py-1.5 text-xs font-semibold text-stone-400 transition hover:text-stone-200"
          >
            {t("invito.dopo")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
