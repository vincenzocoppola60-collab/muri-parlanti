"use client";

import { useEffect, useState } from "react";
import { useLingua } from "@/lib/i18n";
import {
  caricaMieiMuri,
  rimuoviMuro,
  salvaMuro,
} from "@/lib/mieiMuri";

export default function SalvaMuroButton({
  luogo,
  nome,
}: {
  luogo: string;
  nome: string;
}) {
  const { t } = useLingua();
  const [salvato, setSalvato] = useState(false);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    setSalvato(caricaMieiMuri().some((m) => m.slug === luogo));
    setPronto(true);
  }, [luogo]);

  if (!pronto) return null;

  function alterna() {
    if (salvato) {
      rimuoviMuro(luogo);
      setSalvato(false);
    } else {
      salvaMuro(luogo, nome);
      setSalvato(true);
    }
  }

  return (
    <button
      type="button"
      onClick={alterna}
      className={
        salvato
          ? "mt-3 rounded-full border border-amber-100/40 bg-amber-100/10 px-4 py-1.5 text-sm font-semibold text-amber-100 transition hover:bg-amber-100/20"
          : "mt-3 rounded-full border border-amber-100/30 bg-stone-950/40 px-4 py-1.5 text-sm font-semibold text-amber-100/90 transition hover:border-amber-100/60 hover:bg-stone-950/70"
      }
    >
      {salvato ? t("muri.neiTuoi") : t("muri.salva")}
    </button>
  );
}
