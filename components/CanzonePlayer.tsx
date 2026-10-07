"use client";

import { useState } from "react";
import { embedClipYoutube, playerDaCanzone } from "@/lib/canzone";
import { useLingua } from "@/lib/i18n";

/**
 * Player della canzone allegata a un post-it.
 *
 * Per non appesantire il muro (che puo' avere decine di post-it), il player
 * NON viene montato subito: si vede una piccola scheda "Ascolta la canzone"
 * e il contenuto si carica solo quando l'utente la tocca. Cosi' non parte
 * nessuna richiesta ai servizi di streaming finche' non serve.
 *
 * Sono possibili tre casi:
 *  - link a un servizio (Spotify, Apple Music, ...): player ufficiale in iframe;
 *  - brano YouTube scelto con la ricerca: iframe che parte dal secondo scelto;
 *  - brano scelto con la ricerca (anteprima Apple): audio di 30 secondi.
 */
export default function CanzonePlayer({ url }: { url: string }) {
  const { t } = useLingua();
  const [aperto, setAperto] = useState(false);
  const player = playerDaCanzone(url);
  if (!player) return null;

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
          {player.etichetta}
        </span>
      </button>
    );
  }

  return (
    <div className="mt-2 overflow-hidden rounded-[3px] border border-stone-900/15 bg-stone-900/10">
      {player.tipo === "clip-audio" ? (
        <audio
          src={player.src}
          controls
          autoPlay
          className="block w-full"
        />
      ) : (
        <iframe
          src={
            player.tipo === "embed"
              ? player.embedUrl
              : embedClipYoutube(player.id, player.inizio, player.fine)
          }
          title={t("postit.canzone")}
          width="100%"
          height={player.tipo === "embed" ? player.altezza : 200}
          style={{ border: 0, display: "block" }}
          loading="lazy"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      )}
    </div>
  );
}
