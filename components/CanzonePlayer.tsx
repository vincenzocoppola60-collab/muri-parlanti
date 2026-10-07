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
      {/* Copertina e titolo del brano, con i controlli di ascolto SOTTO. */}
      {(player.copertina || player.titolo) && (
        <div className="flex items-center gap-3 px-3 pt-3">
          {player.copertina ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={player.copertina}
              alt=""
              draggable={false}
              className="h-12 w-12 shrink-0 rounded-md object-cover"
            />
          ) : (
            <span
              aria-hidden
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-stone-900/15 text-lg"
            >
              🎵
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-stone-900">
              {player.titolo ?? t("postit.canzone")}
            </p>
            {player.artista && (
              <p className="truncate text-xs text-stone-700">{player.artista}</p>
            )}
          </div>
        </div>
      )}
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
