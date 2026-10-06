"use client";

import { useLingua } from "@/lib/i18n";

/**
 * Piccolo involucro per usare le traduzioni dentro le pagine server.
 *
 * Le pagine (server component) non possono chiamare useLingua(): questo
 * componente client recupera il testo nella lingua attiva e lo tiene aggiornato
 * quando l'utente cambia lingua.
 */
export default function Testo({
  chiave,
  valori,
  className,
}: {
  chiave: string;
  valori?: Record<string, string | number>;
  className?: string;
}) {
  const { t } = useLingua();
  return <span className={className}>{t(chiave, valori)}</span>;
}
