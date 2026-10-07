"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLingua } from "@/lib/i18n";

/**
 * Tasto Home sempre visibile (fisso in alto a destra), per tornare alla
 * pagina iniziale da qualsiasi pagina senza dover cercare i link testuali.
 *
 * Nascosto su:
 *  - "/" stessa (sei gia' a casa);
 *  - "/qr/*" (pagine pensate per la stampa, devono restare pulite).
 */
export default function TastoHome() {
  const pathname = usePathname();
  const { t } = useLingua();

  const nascosto = pathname === "/" || (pathname?.startsWith("/qr") ?? false);
  if (nascosto) return null;

  return (
    <Link
      href="/"
      aria-label={t("comune.tornaHome")}
      title={t("comune.tornaHome")}
      className="flex h-11 w-11 items-center justify-center rounded-full border border-amber-100/25 bg-stone-950/70 text-lg text-amber-100 shadow-lg backdrop-blur transition hover:scale-105 active:scale-95"
    >
      <span aria-hidden>🏠</span>
    </Link>
  );
}
