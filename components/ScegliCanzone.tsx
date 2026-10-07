"use client";

import { useEffect, useRef, useState } from "react";
import AudioPorzione from "@/components/AudioPorzione";
import {
  analizzaCanzone,
  embedClipYoutube,
  embedSpotify,
  MAX_PORZIONE,
  MIN_PORZIONE,
  serializzaClip,
  type ClipCanzone,
  type RisultatoCanzone,
} from "@/lib/canzone";
import { useLingua } from "@/lib/i18n";

/**
 * Ricerca della canzone da allegare al post-it (stile "music sticker").
 *
 * L'utente cerca un brano, sceglie la fonte (Tutti/YouTube/Spotify/Apple),
 * lo ascolta in anteprima e decide da quale secondo farlo partire e per
 * quanti secondi (porzione fino a 30s, ma anche meno). La scelta viene
 * restituita al chiamante come stringa JSON pronta da salvare su
 * postit.canzone_url.
 *
 * Resta comunque possibile incollare direttamente un link di un servizio:
 * in quel caso non serve nessuna ricerca.
 */

type Fonte = "tutti" | "youtube" | "spotify" | "apple";

export default function ScegliCanzone({
  onScegli,
  onChiudi,
}: {
  onScegli: (valore: string) => void;
  onChiudi: () => void;
}) {
  const { t } = useLingua();
  const [q, setQ] = useState("");
  const [fonte, setFonte] = useState<Fonte>("tutti");
  const [risultati, setRisultati] = useState<RisultatoCanzone[]>([]);
  const [cercando, setCercando] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [avviso, setAvviso] = useState<string | null>(null);
  const [scelto, setScelto] = useState<RisultatoCanzone | null>(null);
  const [inizio, setInizio] = useState(0);
  const [durataScelta, setDurataScelta] = useState(MAX_PORZIONE);
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
        setAvviso(null);
        return;
      }
      setCercando(true);
      setErrore(null);
      setAvviso(null);
      try {
        const r = await fetch(
          `/api/canzone/cerca?q=${encodeURIComponent(testo)}&fonte=${fonte}`
        );
        const dati = (await r.json().catch(() => null)) as {
          ok?: boolean;
          risultati?: RisultatoCanzone[];
          avviso?: string;
        } | null;
        if (!r.ok || !dati?.ok) throw new Error("ricerca");
        setRisultati(dati.risultati ?? []);
        setAvviso(dati.avviso ?? null);
      } catch {
        setRisultati([]);
        setErrore(t("scegli.errore"));
      } finally {
        setCercando(false);
      }
    }, 350);
    return () => clearTimeout(id);
  }, [q, fonte, t]);

  const link = q.trim() ? analizzaCanzone(q.trim()) : null;

  // Ampiezza entro cui si puo' scegliere la porzione:
  //  - YouTube: l'intero brano;
  //  - Apple/Spotify con anteprima: la durata dell'anteprima (~30s).
  const contenitore = scelto
    ? scelto.servizio === "youtube"
      ? scelto.durataSec
      : scelto.anteprimaUrl
        ? scelto.anteprimaDurata
        : null
    : null;
  const contenitoreMax = contenitore ? Math.floor(contenitore) : 0;
  const durataMax = Math.min(MAX_PORZIONE, contenitoreMax);
  const durataMin = Math.min(MIN_PORZIONE, durataMax);
  const haPorzione = contenitoreMax > 0;
  const durata = Math.min(Math.max(durataScelta, durataMin), durataMax);
  const maxInizio = haPorzione ? Math.max(0, contenitoreMax - durata) : 0;
  const fine = haPorzione ? Math.min(inizio + durata, contenitoreMax) : null;

  function apri(r: RisultatoCanzone) {
    setScelto(r);
    setInizio(0);
    setProva((n) => n + 1);
    const cont =
      r.servizio === "youtube"
        ? r.durataSec
        : r.anteprimaUrl
          ? r.anteprimaDurata
          : null;
    setDurataScelta(
      cont ? Math.min(MAX_PORZIONE, Math.floor(cont)) : MAX_PORZIONE
    );
  }

  function conferma() {
    if (!scelto) return;
    const clip: ClipCanzone = {
      v: 1,
      servizio: scelto.servizio,
      id: scelto.id,
      titolo: scelto.titolo,
      artista: scelto.artista,
      copertina: scelto.copertina,
      inizio: haPorzione ? inizio : 0,
      durata: haPorzione ? durata : null,
      fine: scelto.servizio === "youtube" && haPorzione ? fine : null,
      anteprima: scelto.anteprimaUrl,
    };
    onScegli(serializzaClip(clip));
  }

  const fonti: { id: Fonte; label: string }[] = [
    { id: "tutti", label: t("scegli.fonteTutti") },
    { id: "youtube", label: "YouTube" },
    { id: "spotify", label: "Spotify" },
    { id: "apple", label: "Apple" },
  ];

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

          {/* Filtro della fonte: mostra solo i risultati di un servizio. */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {fonti.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setFonte(f.id);
                  setScelto(null);
                }}
                aria-pressed={fonte === f.id}
                className={
                  "rounded-full border px-3 py-1 text-xs font-semibold transition " +
                  (fonte === f.id
                    ? "border-stone-900 bg-stone-900 text-amber-100"
                    : "border-stone-900/20 bg-white text-stone-700 hover:bg-stone-200")
                }
              >
                {f.label}
              </button>
            ))}
          </div>

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
                {scelto.servizio === "youtube" ? (
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
                ) : scelto.anteprimaUrl ? (
                  <AudioPorzione
                    key={prova}
                    src={scelto.anteprimaUrl}
                    inizio={inizio}
                    durata={durata}
                    className="block w-full"
                  />
                ) : (
                  // Spotify senza anteprima disponibile: player ufficiale.
                  <iframe
                    key={prova}
                    src={embedSpotify(scelto.id)}
                    title={t("scegli.titolo")}
                    width="100%"
                    height={152}
                    style={{ border: 0, display: "block" }}
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                )}
              </div>

              {haPorzione ? (
                <div className="mt-3 space-y-3">
                  <div>
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
                      disabled={maxInizio <= 0}
                      onChange={(e) => setInizio(Number(e.target.value))}
                      className="mt-1 w-full accent-amber-600"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-stone-700">
                      <span>{t("scegli.durata")}</span>
                      <span className="tabular-nums text-stone-900">
                        {formatta(durata)} ({durata}s)
                      </span>
                    </div>
                    <input
                      type="range"
                      min={durataMin}
                      max={durataMax}
                      step={1}
                      value={durata}
                      disabled={durataMax <= durataMin}
                      onChange={(e) => {
                        const d = Number(e.target.value);
                        setDurataScelta(d);
                        setInizio((i) => Math.min(i, Math.max(0, contenitoreMax - d)));
                      }}
                      className="mt-1 w-full accent-amber-600"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setProva((n) => n + 1)}
                    className="rounded-full border border-stone-900/20 bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-800 transition hover:bg-stone-200"
                  >
                    {t("scegli.prova")}
                  </button>
                </div>
              ) : (
                <p className="mt-3 text-xs text-stone-600">
                  {t("scegli.senzaPorzione")}
                </p>
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
              {!cercando && !errore && avviso && (
                <p className="py-4 text-center text-sm font-semibold text-amber-800">
                  {avviso === "spotify"
                    ? t("scegli.spotifyNonConfigurato")
                    : t("scegli.youtubeNonConfigurato")}
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
                      onClick={() => apri(r)}
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
                      <span className="shrink-0 text-right">
                        <span className="block text-[10px] font-bold uppercase tracking-wide text-stone-500">
                          {etichettaServizio(r.servizio)}
                        </span>
                        {r.durataSec ? (
                          <span className="block text-xs tabular-nums text-stone-500">
                            {formatta(r.durataSec)}
                          </span>
                        ) : null}
                      </span>
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

function etichettaServizio(servizio: RisultatoCanzone["servizio"]): string {
  if (servizio === "youtube") return "YouTube";
  if (servizio === "spotify") return "Spotify";
  return "Apple";
}

function formatta(secondi: number): string {
  const s = Math.max(0, Math.floor(secondi));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}
