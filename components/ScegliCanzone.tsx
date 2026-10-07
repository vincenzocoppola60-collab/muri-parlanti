"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PorzioneYouTube from "@/components/PorzioneYouTube";
import { formattaSecondi } from "@/lib/youtube";
import {
  serializzaClip,
  type ClipCanzone,
  type RisultatoCanzone,
} from "@/lib/canzone";
import { useLingua } from "@/lib/i18n";

/**
 * Scelta della canzone da allegare al post-it.
 *
 * Stile "storia di Instagram": si cerca un brano per titolo o artista, i
 * risultati compaiono subito sotto e, toccandone uno, si sceglie la parte con
 * UNA sola barra a forma di onda sonora (durata libera da 5 a 30 secondi).
 * Non si vede mai
 * nessun video: si ascolta e basta.
 */

export default function ScegliCanzone({
  onScegli,
  onChiudi,
}: {
  onScegli: (valore: string) => void;
  onChiudi: () => void;
}) {
  const { t } = useLingua();
  const [q, setQ] = useState("");
  const [risultati, setRisultati] = useState<RisultatoCanzone[]>([]);
  const [cercando, setCercando] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [scelto, setScelto] = useState<RisultatoCanzone | null>(null);
  const [porzione, setPorzione] = useState({
    inizio: 0,
    durata: 30,
    fine: 30,
  });
  const campoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    campoRef.current?.focus();
  }, []);

  // Ricerca con un piccolo ritardo, per non chiamare il server a ogni tasto.
  useEffect(() => {
    const testo = q.trim();
    const id = setTimeout(async () => {
      if (testo.length < 2) {
        setRisultati([]);
        setCercando(false);
        setErrore(null);
        return;
      }
      setCercando(true);
      setErrore(null);
      try {
        const r = await fetch(`/api/canzone/cerca?q=${encodeURIComponent(testo)}`);
        const dati = (await r.json().catch(() => null)) as {
          ok?: boolean;
          risultati?: RisultatoCanzone[];
        } | null;
        if (!r.ok || !dati?.ok) throw new Error("ricerca");
        setRisultati(dati.risultati ?? []);
      } catch {
        setRisultati([]);
        setErrore(t("scegli.errore"));
      } finally {
        setCercando(false);
      }
    }, 350);
    return () => clearTimeout(id);
  }, [q, t]);

  const aggiornaPorzione = useCallback(
    (p: { inizio: number; durata: number; fine: number }) => setPorzione(p),
    []
  );

  function conferma() {
    if (!scelto) return;
    const clip: ClipCanzone = {
      v: 1,
      servizio: "youtube",
      id: scelto.id,
      titolo: scelto.titolo,
      artista: scelto.artista,
      copertina: scelto.copertina,
      inizio: porzione.inizio,
      durata: porzione.durata,
      fine: porzione.fine,
      anteprima: null,
    };
    onScegli(serializzaClip(clip));
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-stone-950/70 p-3 backdrop-blur-sm sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("scegli.titolo")}
        className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-stone-100 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-stone-900/10 px-4 py-3">
          <h2 className="text-base font-bold text-stone-900">
            🎵 {t("scegli.titolo")}
          </h2>
          <button
            type="button"
            onClick={onChiudi}
            aria-label={t("scegli.annulla")}
            className="rounded-full px-2 py-1 text-lg font-bold text-stone-700 transition hover:bg-stone-900/10"
          >
            ✕
          </button>
        </div>

        <div className="px-4 py-3">
          <input
            ref={campoRef}
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setScelto(null);
            }}
            placeholder={t("scegli.placeholder")}
            className="w-full rounded-full border border-stone-900/20 bg-white px-4 py-2.5 text-base text-stone-900 placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          {scelto ? (
            <div className="rounded-2xl border border-stone-900/10 bg-white p-3">
              <div className="flex items-center gap-3">
                {scelto.copertina && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={scelto.copertina}
                    alt=""
                    className="h-14 w-14 rounded-xl object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-stone-900">
                    {scelto.titolo}
                  </p>
                  <p className="truncate text-xs text-stone-600">{scelto.artista}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setScelto(null)}
                  aria-label={t("scegli.annulla")}
                  className="rounded-full px-2 py-1 text-sm font-bold text-stone-700 transition hover:bg-stone-900/10"
                >
                  ✕
                </button>
              </div>

              <div className="mt-3">
                <PorzioneYouTube
                  key={scelto.id}
                  videoId={scelto.id}
                  onCambia={aggiornaPorzione}
                  etichette={{
                    istruzioni: t("scegli.istruzioni"),
                    durata: t("scegli.durata"),
                    riproduci: t("scegli.riproduci"),
                    pausa: t("scegli.pausa"),
                    carico: t("scegli.caricoPlayer"),
                    errore: t("scegli.errorePlayer"),
                  }}
                />
              </div>

              <button
                type="button"
                onClick={conferma}
                className="mt-3 w-full rounded-full bg-stone-900 px-4 py-2.5 text-sm font-bold text-amber-100 transition hover:bg-stone-800"
              >
                {t("scegli.aggiungi")}
              </button>
            </div>
          ) : (
            <>
              {cercando && (
                <p className="py-4 text-center text-sm text-stone-600">
                  {t("scegli.cercando")}
                </p>
              )}
              {!cercando && errore && (
                <p className="py-4 text-center text-sm font-semibold text-red-800">
                  {errore}
                </p>
              )}
              {!cercando &&
                !errore &&
                q.trim().length >= 2 &&
                risultati.length === 0 && (
                  <p className="py-4 text-center text-sm text-stone-600">
                    {t("scegli.vuoto")}
                  </p>
                )}
              <ul className="space-y-1">
                {risultati.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => setScelto(r)}
                      className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-white"
                    >
                      {r.copertina ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={r.copertina}
                          alt=""
                          className="h-12 w-12 rounded-lg object-cover"
                        />
                      ) : (
                        <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-stone-200 text-lg">
                          🎵
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-stone-900">
                          {r.titolo}
                        </span>
                        <span className="block truncate text-xs text-stone-600">
                          {r.artista}
                        </span>
                      </span>
                      {r.durataSec ? (
                        <span className="shrink-0 text-xs tabular-nums text-stone-500">
                          {formattaSecondi(r.durataSec)}
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
