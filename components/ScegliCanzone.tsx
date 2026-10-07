"use client";

import { useEffect, useRef, useState } from "react";
import {
  analizzaCanzone,
  embedClipYoutube,
  MAX_PORZIONE,
  serializzaClip,
  type ClipCanzone,
  type RisultatoCanzone,
} from "@/lib/canzone";
import { useLingua } from "@/lib/i18n";

/**
 * Ricerca della canzone da allegare al post-it (stile "music sticker").
 *
 * L'utente cerca un brano, lo ascolta in anteprima e sceglie da quale
 * secondo farlo partire (al massimo 30 secondi, come nelle storie). La scelta
 * viene restituita al chiamante come stringa JSON pronta da salvare su
 * postit.canzone_url.
 *
 * Resta comunque possibile incollare direttamente un link di un servizio:
 * in quel caso non serve nessuna ricerca.
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
  const [inizio, setInizio] = useState(0);
  const [prova, setProva] = useState(0); // rilancia l'anteprima al clic
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

  const link = q.trim() ? analizzaCanzone(q.trim()) : null;

  const durata = scelto?.durataSec ?? null;
  const maxInizio =
    scelto?.servizio === "youtube" && durata
      ? Math.max(0, Math.floor(durata) - MAX_PORZIONE)
      : 0;
  const fine =
    scelto?.servizio === "youtube" && durata
      ? Math.min(inizio + MAX_PORZIONE, Math.floor(durata))
      : null;

  function conferma() {
    if (!scelto) return;
    const clip: ClipCanzone = {
      v: 1,
      servizio: scelto.servizio,
      id: scelto.id,
      titolo: scelto.titolo,
      artista: scelto.artista,
      copertina: scelto.copertina,
      inizio: scelto.servizio === "youtube" ? inizio : 0,
      fine: scelto.servizio === "youtube" ? fine : null,
      anteprima: scelto.anteprimaUrl,
    };
    onScegli(serializzaClip(clip));
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-stone-950/70 p-3 backdrop-blur-sm sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("scegli.titolo")}
        className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-xl bg-stone-100 shadow-2xl"
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
          {link && (
            <button
              type="button"
              onClick={() => onScegli(link.url)}
              className="mt-2 flex w-full items-center gap-2 rounded-lg border border-amber-700/30 bg-amber-100 px-3 py-2 text-left text-sm font-semibold text-amber-900 transition hover:bg-amber-200"
            >
              <span aria-hidden>🔗</span>
              <span className="flex-1">
                {t("scegli.linkUsa")} · {link.etichetta}
              </span>
            </button>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          {scelto ? (
            <div className="rounded-xl border border-stone-900/10 bg-white p-3">
              <div className="flex items-center gap-3">
                {scelto.copertina && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={scelto.copertina}
                    alt=""
                    className="h-14 w-14 rounded-lg object-cover"
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
                  className="rounded-full px-2 py-1 text-sm font-bold text-stone-700 transition hover:bg-stone-900/10"
                >
                  ✕
                </button>
              </div>

              {/* Anteprima */}
              <div className="mt-3 overflow-hidden rounded-lg border border-stone-900/10">
                {scelto.servizio === "apple" && scelto.anteprimaUrl ? (
                  // Anteprima ufficiale di Apple (30 secondi).
                  <audio
                    key={prova}
                    src={scelto.anteprimaUrl}
                    controls
                    autoPlay
                    className="w-full"
                  />
                ) : (
                  <iframe
                    key={`${prova}-${inizio}-${fine ?? ""}`}
                    src={embedClipYoutube(scelto.id, inizio, fine)}
                    title={t("scegli.titolo")}
                    width="100%"
                    height={200}
                    style={{ border: 0, display: "block" }}
                    allow="autoplay; encrypted-media; picture-in-picture"
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                )}
              </div>

              {maxInizio > 0 && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-stone-700">
                    <span>{t("scegli.momento")}</span>
                    <span className="tabular-nums text-stone-900">
                      {formatta(inizio)} – {formatta(fine ?? inizio)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={maxInizio}
                    step={1}
                    value={inizio}
                    onChange={(e) => setInizio(Number(e.target.value))}
                    className="mt-1 w-full accent-amber-600"
                  />
                  <button
                    type="button"
                    onClick={() => setProva((n) => n + 1)}
                    className="mt-1 rounded-full border border-stone-900/20 bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-800 transition hover:bg-stone-200"
                  >
                    {t("scegli.prova")}
                  </button>
                </div>
              )}

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
              {!cercando && !errore && q.trim().length >= 2 && risultati.length === 0 && (
                <p className="py-4 text-center text-sm text-stone-600">
                  {t("scegli.vuoto")}
                </p>
              )}
              <ul className="space-y-1">
                {risultati.map((r) => (
                  <li key={`${r.servizio}-${r.id}`}>
                    <button
                      type="button"
                      onClick={() => {
                        setScelto(r);
                        setInizio(0);
                        setProva((n) => n + 1);
                      }}
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-white"
                    >
                      {r.copertina ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={r.copertina}
                          alt=""
                          className="h-12 w-12 rounded-md object-cover"
                        />
                      ) : (
                        <span className="flex h-12 w-12 items-center justify-center rounded-md bg-stone-200 text-lg">
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
                          {formatta(r.durataSec)}
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

function formatta(secondi: number): string {
  const s = Math.max(0, Math.floor(secondi));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}
