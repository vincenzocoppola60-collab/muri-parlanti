"use client";

import { useLingua } from "@/lib/i18n";

export default function PulsanteStampa() {
  const { t } = useLingua();
  return (
    <button
      onClick={() => window.print()}
      className="rounded-full bg-amber-300 px-5 py-2 text-sm font-bold text-stone-900 shadow-xl transition hover:scale-105"
    >
      {t("qr.stampa")}
    </button>
  );
}
