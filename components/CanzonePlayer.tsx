"use client";

import { useState } from "react";
import AudioPorzione from "@/components/AudioPorzione";
import PlayerAudioYoutube from "@/components/PlayerAudioYoutube";
import { playerDaCanzone } from "@/lib/canzone";
import { useLingua } from "@/lib/i18n";

/**
 * Player della canzone allegata a un post-it.
 *
 * Per non appesantire il muro (che puo' avere decine di post-it), il player
 * NON viene montato subito: si vede una piccola scheda "Ascolta la canzone" e
 * il contenuto si carica solo quando l'utente la tocca.
 *
 * La canzone parte sempre e solo in AUDIO: nessun video viene mostrato, ne'
 * nell'editor ne' sul muro. Si sente la porzione scelta (max 30s).
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
      </button>
    );
  }

  return (
    <div className="mt-2 overflow-hidden rounded-[3px] border border-stone-900/15 bg-stone-900/10">
      {player.tipo === "clip-audio" ? (
        <AudioPorzione
          src={player.src}
          inizio={player.inizio}
          durata={player.durata}
          className="block w-full"
        />
      ) : player.tipo === "clip-youtube" ? (
        // Audio-only: il video resta nascosto.
        <PlayerAudioYoutube
          id={player.id}
          inizio={player.inizio}
          fine={player.fine}
        />
      ) : (
        <iframe
          src={player.embedUrl}
          title={t("postit.canzone")}
          width="100%"
          height={player.altezza}
          style={{ border: 0, display: "block" }}
          loading="lazy"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      )}
    </div>
  );
}
