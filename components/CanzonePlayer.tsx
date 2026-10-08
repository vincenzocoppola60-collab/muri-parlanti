"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import AudioPorzione from "@/components/AudioPorzione";
import PlayerAudioYoutube from "@/components/PlayerAudioYoutube";
import { playerDaCanzone } from "@/lib/canzone";
import { useLingua } from "@/lib/i18n";

/**
 * Player della canzone allegata a un post-it.
 *
 * Per non appesantire il muro (che puo' avere decine di post-it), il player
 * NON viene montato subito: sul post-it si vede una piccola scheda "Ascolta la
 * canzone" e il contenuto si carica solo quando l'utente la tocca.
 *
 * I post-it del muro stanno in 3 colonne, quindi la scheda e' larga meno di
 * 90px: copertina e titolo messi fianco a fianco NON ci stanno (il titolo
 * spariva). Percio' il player si apre in un OVERLAY a schermo tramite un
 * portale su <body>: cosi' esce dal flusso della card (larga pochi pixel),
 * copre tutto e titolo, artista e controlli restano leggibili. Il portale
 * compare solo dopo il mount, quindi server e client restano identici.
 *
 * La canzone parte sempre e solo in AUDIO: nessun video viene mostrato, ne'
 * nell'editor ne' sul muro. Si sente la porzione scelta (max 30s).
 */
export default function CanzonePlayer({ url }: { url: string }) {
  const { t } = useLingua();
  const [aperto, setAperto] = useState(false);
  const [montato, setMontato] = useState(false);
  const player = playerDaCanzone(url);

  useEffect(() => {
    setMontato(true);
  }, []);

  if (!player) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setAperto(true)}
        className="mt-2 flex w-full items-center gap-2 rounded-[3px] border border-stone-900/15 bg-stone-900/10 px-3 py-2 text-left text-sm font-semibold text-stone-800 transition hover:bg-stone-900/20"
      >
        <span aria-hidden>🎵</span>
        <span className="flex-1 truncate">{t("postit.ascolta")}</span>
      </button>

      {montato &&
        aperto &&
        createPortal(
          <div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-stone-950/90 p-4 backdrop-blur-sm"
            onClick={() => setAperto(false)}
            role="dialog"
            aria-modal="true"
            aria-label={t("postit.ascolta")}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-stone-900/10 bg-stone-100 p-4 shadow-2xl"
            >
              <button
                type="button"
                onClick={() => setAperto(false)}
                aria-label={t("comune.chiudi")}
                className="absolute right-3 top-3 z-10 rounded-full px-2 py-1 text-lg font-bold text-stone-600 transition hover:bg-stone-900/10 hover:text-stone-900"
              >
                ✕
              </button>

              {/* Copertina, titolo e artista: qui c'e' spazio, si vedono tutti. */}
              <div className="flex items-center gap-3 pr-8">
                {player.copertina ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={player.copertina}
                    alt=""
                    draggable={false}
                    className="h-16 w-16 shrink-0 rounded-xl object-cover shadow-sm"
                  />
                ) : (
                  <span
                    aria-hidden
                    className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-stone-900/15 text-2xl"
                  >
                    🎵
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-bold text-stone-900">
                    {player.titolo ?? t("postit.canzone")}
                  </p>
                  {player.artista && (
                    <p className="truncate text-sm text-stone-600">
                      {player.artista}
                    </p>
                  )}
                  <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                    {player.etichetta}
                  </p>
                </div>
              </div>

              {/* Controlli di ascolto, sotto la scheda. */}
              <div className="mt-3">
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
            </div>
          </div>,
          document.body
        )}
    </>
  );
}