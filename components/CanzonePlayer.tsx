"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { caricaApiVideo, type YTPlayer } from "@/lib/youtube";
import { playerDaCanzone, type Player } from "@/lib/canzone";
import { useLingua } from "@/lib/i18n";
import { prendiPalco, lasciaPalco } from "@/lib/riproduzione";

/**
 * Scheda della canzone allegata a un post-it, stile "mini player".
 *
 * Sul post-it compare direttamente una piccola scheda con:
 * - la COPERTINA a sinistra, con un tasto PLAY trasparente sopra: al tocco
 *   diventa PAUSA (e viceversa);
 * - il TITOLO del brano per esteso (va a capo invece di essere tagliato);
 * - l'ARTISTA sotto il titolo.
 *
 * Niente zoom a schermo intero: la scheda resta dentro il post-it.
 *
 * Una sola traccia alla volta: chi parte ferma quello che stava suonando
 * (vedi lib/riproduzione). La riproduzione e' sempre AUDIO (max 30s):
 * - clip YouTube: player nascosto controllato via API;
 * - anteprima audio (Apple/Spotify): <audio> nascosto;
 * - link storico (solo embed ufficiale): al tocco si apre l'embed in linea.
 */
export default function CanzonePlayer({ url }: { url: string }) {
  const player = playerDaCanzone(url);
  if (!player) return null;
  if (player.tipo === "clip-youtube") return <MiniYoutube player={player} />;
  if (player.tipo === "clip-audio") return <MiniAudio player={player} />;
  return <MiniEmbed player={player} />;
}

/**
 * Cornice grafica comune: copertina + tasto play/pausa sopra + testi.
 * I sottocomponenti le passano lo stato e il player nascosto come `children`.
 */
function Scheda({
  player,
  suona,
  onToggle,
  disabilitato = false,
  children,
}: {
  player: Player;
  suona: boolean;
  onToggle: () => void;
  disabilitato?: boolean;
  children?: ReactNode;
}) {
  const { t } = useLingua();
  return (
    <div className="relative mt-2 -mx-2.5 flex items-center gap-2 rounded-lg border border-stone-900/10 bg-white/85 p-1.5 shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        disabled={disabilitato}
        aria-label={t("postit.ascolta")}
        aria-pressed={suona}
        className="group relative h-11 w-11 shrink-0 overflow-hidden rounded-md bg-stone-900/15 disabled:opacity-50"
      >
        {player.copertina ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={player.copertina}
            alt=""
            draggable={false}
            className="h-full w-full object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="flex h-full w-full items-center justify-center text-lg"
          >
            🎵
          </span>
        )}
        {/* Tasto play/pausa trasparente SULLA copertina. */}
        <span
          aria-hidden
          className="absolute inset-0 flex items-center justify-center bg-stone-950/35 text-base text-white transition group-hover:bg-stone-950/50"
        >
          {disabilitato ? "…" : suona ? "⏸" : "▶"}
        </span>
      </button>

      <div className="min-w-0 flex-1">
        <p className="break-words text-[10px] font-semibold leading-snug text-stone-900">
          {player.titolo ?? t("postit.canzone")}
        </p>
        {player.artista && (
          <p className="break-words text-[9px] leading-snug text-stone-500">
            {player.artista}
          </p>
        )}
      </div>

      {children}
    </div>
  );
}

/**
 * Prende il "palco" finche' `suona` e' vero: cosi' partendo ferma chi suonava.
 * Rilascia il palco (o lo cede) quando smette o quando il post-it sparisce.
 */
function usePalco(suona: boolean, ferma: () => void) {
  useEffect(() => {
    if (!suona) return;
    prendiPalco(ferma);
    return () => lasciaPalco(ferma);
  }, [suona, ferma]);
}

/** YouTube: player nascosto, si sente solo la porzione scelta (max 30s). */
function MiniYoutube({
  player,
}: {
  player: Extract<Player, { tipo: "clip-youtube" }>;
}) {
  const contenitore = useRef<HTMLDivElement>(null);
  const pl = useRef<YTPlayer | null>(null);
  const timer = useRef<number | null>(null);
  const [pronto, setPronto] = useState(false);
  const [suona, setSuona] = useState(false);

  const limite =
    player.fine && player.fine > player.inizio ? player.fine : player.inizio + 30;

  // Unica funzione di stop (identita' stabile): usata dal tasto e dal palco.
  const ferma = useCallback(() => {
    if (timer.current) {
      window.clearInterval(timer.current);
      timer.current = null;
    }
    try {
      pl.current?.pauseVideo();
    } catch {
      // player non ancora pronto
    }
    setSuona(false);
  }, []);

  usePalco(suona, ferma);

  useEffect(() => {
    let annullato = false;
    const nodo = contenitore.current;
    if (!nodo) return;
    caricaApiVideo()
      .then((YT) => {
        if (annullato) return;
        pl.current = new YT.Player(nodo, {
          videoId: player.id,
          width: 200,
          height: 200,
          playerVars: { rel: 0, modestbranding: 1, playsinline: 1, controls: 0 },
          events: {
            onReady: () => {
              if (!annullato) setPronto(true);
            },
          },
        });
      })
      .catch(() => {
        // Se l'API non carica, il tasto resta disabilitato.
      });
    return () => {
      annullato = true;
      ferma();
      try {
        pl.current?.destroy();
      } catch {
        // nulla
      }
      pl.current = null;
    };
  }, [player.id, ferma]);

  function avvia() {
    const p = pl.current;
    if (!p) return;
    if (timer.current) window.clearInterval(timer.current);
    p.seekTo(player.inizio, true);
    p.playVideo();
    setSuona(true);
    timer.current = window.setInterval(() => {
      const cur = pl.current;
      if (!cur) return;
      if (cur.getCurrentTime() >= limite - 0.15) {
        ferma();
      }
    }, 200);
  }

  return (
    <Scheda
      player={player}
      suona={suona}
      disabilitato={!pronto}
      onToggle={suona ? ferma : avvia}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: -9999,
          top: 0,
          width: 200,
          height: 200,
          overflow: "hidden",
        }}
      >
        <div ref={contenitore} />
      </div>
    </Scheda>
  );
}

/** Anteprima audio (Apple/Spotify): <audio> nascosto, si parte dal secondo scelto. */
function MiniAudio({
  player,
}: {
  player: Extract<Player, { tipo: "clip-audio" }>;
}) {
  const rif = useRef<HTMLAudioElement>(null);
  const [suona, setSuona] = useState(false);
  const fine = player.durata ? player.inizio + player.durata : null;

  const ferma = useCallback(() => {
    const a = rif.current;
    if (a) a.pause();
    setSuona(false);
  }, []);

  usePalco(suona, ferma);
  // Se il post-it sparisce mentre suona, fermiamo l'audio.
  useEffect(() => () => ferma(), [ferma]);

  useEffect(() => {
    const a = rif.current;
    if (!a) return;
    const vai = () => {
      if (
        player.inizio > 0 &&
        Number.isFinite(a.duration) &&
        player.inizio < a.duration
      ) {
        a.currentTime = player.inizio;
      }
    };
    if (a.readyState >= 1) vai();
    else a.addEventListener("loadedmetadata", vai, { once: true });
    return () => a.removeEventListener("loadedmetadata", vai);
  }, [player.src, player.inizio]);

  function toggle() {
    const a = rif.current;
    if (!a) return;
    if (a.paused) {
      a.play()
        .then(() => setSuona(true))
        .catch(() => {
          // Autoplay bloccato: resta in pausa.
        });
    } else {
      ferma();
    }
  }

  return (
    <Scheda player={player} suona={suona} onToggle={toggle}>
      <audio
        ref={rif}
        src={player.src}
        preload="metadata"
        onPlay={() => setSuona(true)}
        onPause={() => setSuona(false)}
        onTimeUpdate={(e) => {
          const a = e.currentTarget;
          if (fine && a.currentTime >= fine) {
            ferma();
            a.currentTime = player.inizio;
          }
        }}
      />
    </Scheda>
  );
}

/** Link storico senza anteprima: al tocco si apre l'embed ufficiale in linea. */
function MiniEmbed({
  player,
}: {
  player: Extract<Player, { tipo: "embed" }>;
}) {
  const [aperto, setAperto] = useState(false);

  // Chiudere l'embed (smontare l'iframe) ferma la riproduzione: vale come stop.
  const ferma = useCallback(() => setAperto(false), []);

  usePalco(aperto, ferma);

  return (
    <div>
      <Scheda
        player={player}
        suona={aperto}
        onToggle={() => setAperto((v) => !v)}
      />
      {aperto && (
        <iframe
          src={player.embedUrl}
          title={player.titolo ?? player.etichetta}
          width="100%"
          height={player.altezza}
          style={{ border: 0, marginTop: 6, borderRadius: 8 }}
          loading="lazy"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      )}
    </div>
  );
}
