"use client";

import { useLingua } from "@/lib/i18n";

/**
 * Crediti per il creatore del progetto.
 *
 * PER CAMBIARE IL LINK: modifica la costante INSTAGRAM_URL qui sotto con
 * il link del tuo profilo (es. "https://www.instagram.com/tuonome/").
 * Il nome mostrato (@...) viene ricavato automaticamente dal link.
 */
export const INSTAGRAM_URL = "https://www.instagram.com/tempofermo_/";

function handleDaUrl(url: string): string {
  const pulito = url.replace(/\/+$/, "");
  const m = pulito.match(/instagram\.com\/([^/?#]+)/i);
  return m?.[1] ?? "tuo_instagram";
}

function IconaInstagram({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

/** Casella crediti in evidenza (footer della home). */
export function Crediti() {
  const { t } = useLingua();
  return (
    <div className="mx-auto mt-6 max-w-xs rounded-xl border border-amber-100/20 bg-stone-900/50 px-5 py-4 text-center shadow-lg backdrop-blur-sm">
      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-amber-200/70">
        {t("crediti.ideaBy")}
      </p>
      <a
        href={INSTAGRAM_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t("crediti.instagram")}
        className="mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 font-scritta text-2xl leading-none text-amber-100 transition hover:bg-amber-100/10 hover:text-amber-50"
      >
        <IconaInstagram className="h-5 w-5" />
        <span>@{handleDaUrl(INSTAGRAM_URL)}</span>
      </a>
    </div>
  );
}

/** Versione compatta per il fondo del menu laterale. */
export function CreditiCompatto() {
  const { t } = useLingua();
  return (
    <a
      href={INSTAGRAM_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="block text-center text-[11px] leading-relaxed text-stone-500 transition hover:text-amber-100"
    >
      {t("crediti.ideaBy")}{" "}
      <span className="font-semibold text-stone-400">
        @{handleDaUrl(INSTAGRAM_URL)}
      </span>
    </a>
  );
}
