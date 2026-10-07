"use client";

import { useState } from "react";
import { analizzaCanzone } from "@/lib/canzone";
import { useLingua } from "@/lib/i18n";

/**
 * Player della canzone allegata a un post-it.
 *
 * Per non appesantire il muro (che puo' avere decine di post-it), l'iframe
 * NON viene montato subito: si vede una piccola scheda "Ascolta la canzone"
 * e il player ufficiale si carica solo quando l'utente la tocca. Cosi' non
 * parte nessuna richiesta ai servizi di streaming finche' non serve, e la
 * riproduzione avviene sempre dentro il player ufficiale (anteprima
 * ~30s per Spotify, ecc.).
 */
export default function CanzonePlayer({ url }: { url: string }) {
  const { t } = useLingua();
  const [aperto, setAperto] = useState(false);
  const canzone = analizzaCanzone(url);
  if (!canzone) return null;

  if (!aperto) {
    return (
      <button
        type="button"
        onClick={() => setAperto(true)}
        className="mt-2 flex w-full items-center gap-2 rounded-[3px] border border-stone-900/15 bg-stone-900/10 px-3 py-2 text-left text-sm font-semibold text-stone-800 transition hover:bg-stone-900/20"
      >
        <span aria-hidden>🎵</span>
        <span className="flex-1">{t("postit.ascolta")}</span>
        <span className="rounded-full bg-stone-900/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
          {canzone.etichetta}
        </span>
      </button>
    );
  }

  return (
    <div className="mt-2 overflow-hidden rounded-[3px] border border-stone-900/15 bg-stone-900/10">
      <iframe
        src={canzone.embedUrl}
        title={t("postit.canzone")}
        width="100%"
        height={canzone.altezza}
        style={{ border: 0, display: "block" }}
        loading="lazy"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
