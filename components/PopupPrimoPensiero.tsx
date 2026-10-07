"use client";

import { useEffect, useRef } from "react";
import { useLingua } from "@/lib/i18n";

/**
 * Piccolo invito che compare UNA SOLA VOLTA, subito dopo che la persona ha
 * pubblicato il suo primo post-it (con o senza account).
 *
 * Volutamente non invasivo: sta al centro dello schermo, non blocca la pagina
 * (niente velo, il tocco dietro resta libero), si chiude con la ✕, con
 * "Va bene" o con Esc, e sparisce da solo dopo un po'.
 */
export default function PopupPrimoPensiero({
  onChiudi,
}: {
  onChiudi: () => void;
}) {
  const { t } = useLingua();
  const pulsanteRef = useRef<HTMLButtonElement>(null);

  // Esc chiude; il tocco resta libero (nessun velo sopra il muro).
  useEffect(() => {
    const suTasto = (e: KeyboardEvent) => {
      if (e.key === "Escape") onChiudi();
    };
    window.addEventListener("keydown", suTasto);
    return () => window.removeEventListener("keydown", suTasto);
  }, [onChiudi]);

  // Si ritira da solo: un invito, non un ostacolo.
  useEffect(() => {
    const timer = window.setTimeout(onChiudi, 11000);
    return () => window.clearTimeout(timer);
  }, [onChiudi]);

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label={t("popup.titolo")}
      className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center p-4"
    >
      <div className="animate-comparsa pointer-events-auto relative w-[min(92vw,26rem)] rounded-2xl border border-amber-100/25 bg-stone-950/95 p-5 shadow-2xl backdrop-blur-md">
        <button
          type="button"
          onClick={onChiudi}
          aria-label={t("comune.chiudi")}
          className="absolute right-2 top-2 rounded-full px-2 py-1 text-stone-500 transition hover:text-amber-100"
        >
          ✕
        </button>

        <p className="pr-6 font-scritta text-2xl leading-tight text-amber-100">
          <span aria-hidden>🧱 </span>
          {t("popup.titolo")}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-stone-300">
          {t("popup.testo")}
        </p>

        <div className="mt-4 flex items-center justify-end">
          <button
            ref={pulsanteRef}
            type="button"
            onClick={onChiudi}
            className="rounded-full bg-amber-300 px-5 py-2 text-sm font-bold text-stone-900 shadow-lg transition hover:scale-105 active:scale-95"
          >
            {t("popup.ok")}
          </button>
        </div>
      </div>
    </div>
  );
}
