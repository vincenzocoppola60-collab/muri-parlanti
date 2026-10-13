"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useLingua } from "@/lib/i18n";
import { formattaData } from "@/lib/formato";
import {
  cancellaNotifica,
  contaNonLette,
  elencaNotifiche,
  segnaLetta,
  segnaTutteLette,
  type Notifica,
} from "@/lib/notifiche";

/**
 * Prototipo layout · Idea 3 "Campanella a tendina" (F7).
 *
 * Una campanella nella barra in alto a destra che apre una piccola tendina
 * con le notifiche recenti, senza dover cambiare pagina. Riusa le stesse
 * funzioni del database della pagina /notifiche: nessun permesso cambia,
 * cambia solo il modo di mostrarle.
 *
 * Compare SOLO per chi ha un account (le notifiche sono dei registrati) e
 * resta nascosta sulle pagine /qr, come il resto della barra.
 */
export default function CampanellaNotifiche() {
  const pathname = usePathname();
  const { utente, caricamento } = useAuth();
  const { t } = useLingua();

  const [aperto, setAperto] = useState(false);
  const [notifiche, setNotifiche] = useState<Notifica[]>([]);
  const [nonLette, setNonLette] = useState(0);
  const [carico, setCarico] = useState(false);

  const scatola = useRef<HTMLDivElement | null>(null);

  const nascosto = pathname?.startsWith("/qr") ?? false;

  // Chiude la tendina a ogni cambio pagina.
  useEffect(() => {
    setAperto(false);
  }, [pathname]);

  // Il pallino delle non lette si aggiorna quando l'account e' pronto.
  useEffect(() => {
    if (caricamento || !utente) {
      setNonLette(0);
      return;
    }
    let attivo = true;
    contaNonLette()
      .then((n) => attivo && setNonLette(n))
      .catch(() => attivo && setNonLette(0));
    return () => {
      attivo = false;
    };
  }, [caricamento, utente]);

  const carica = useCallback(async () => {
    setCarico(true);
    const lista = await elencaNotifiche(12);
    setNotifiche(lista);
    setNonLette(lista.filter((n) => !n.letta).length);
    setCarico(false);
  }, []);

  // All'apertura carica l'elenco aggiornato.
  useEffect(() => {
    if (aperto) carica();
  }, [aperto, carica]);

  // Chiude con Esc o toccando fuori dalla tendina.
  useEffect(() => {
    if (!aperto) return;
    const suTasto = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAperto(false);
    };
    const suTocco = (e: MouseEvent) => {
      if (scatola.current && !scatola.current.contains(e.target as Node)) {
        setAperto(false);
      }
    };
    window.addEventListener("keydown", suTasto);
    window.addEventListener("mousedown", suTocco);
    return () => {
      window.removeEventListener("keydown", suTasto);
      window.removeEventListener("mousedown", suTocco);
    };
  }, [aperto]);

  async function apri(n: Notifica) {
    if (!n.letta) {
      setNotifiche((lista) =>
        lista.map((x) => (x.id === n.id ? { ...x, letta: true } : x))
      );
      setNonLette((c) => Math.max(0, c - 1));
      await segnaLetta(n.id);
    }
  }

  async function rimuovi(id: string) {
    const n = notifiche.find((x) => x.id === id);
    setNotifiche((lista) => lista.filter((x) => x.id !== id));
    if (n && !n.letta) setNonLette((c) => Math.max(0, c - 1));
    await cancellaNotifica(id);
  }

  async function tutteLette() {
    setNotifiche((lista) => lista.map((x) => ({ ...x, letta: true })));
    setNonLette(0);
    await segnaTutteLette();
  }

  if (nascosto || caricamento || !utente) return null;

  return (
    <div ref={scatola} className="relative">
      <button
        type="button"
        onClick={() => setAperto((v) => !v)}
        aria-label={t("campanella.titolo")}
        aria-expanded={aperto}
        title={t("campanella.titolo")}
        className="relative flex h-11 w-11 items-center justify-center rounded-full border border-amber-100/25 bg-stone-950/70 text-lg text-amber-100 shadow-lg backdrop-blur transition hover:scale-105 active:scale-95"
      >
        <span aria-hidden>🔔</span>
        {nonLette > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-amber-300 px-1 text-[0.65rem] font-bold text-stone-900">
            {nonLette > 9 ? "9+" : nonLette}
          </span>
        )}
      </button>

      {aperto && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-amber-100/20 bg-stone-950/95 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-amber-100/10 px-4 py-3">
            <span className="font-scritta text-xl text-amber-100">
              {t("campanella.titolo")}
            </span>
            {nonLette > 0 && (
              <span className="rounded-full bg-amber-300/20 px-2 py-0.5 text-xs font-semibold text-amber-100">
                {t("campanella.nuove", { n: nonLette })}
              </span>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-3">
            {carico ? (
              <p className="px-1 py-6 text-center text-sm text-stone-400">…</p>
            ) : notifiche.length === 0 ? (
              <p className="px-1 py-6 text-center text-sm text-stone-400">
                {t("campanella.vuote")}
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {notifiche.map((n) => (
                  <li
                    key={n.id}
                    className={`rounded-lg border p-3 transition ${
                      n.letta
                        ? "border-amber-100/10 bg-stone-900/45"
                        : "border-amber-300/40 bg-stone-900/70"
                    }`}
                  >
                    <p className="flex items-center gap-2 font-scritta text-lg text-amber-100">
                      {!n.letta && (
                        <span
                          aria-hidden
                          className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-amber-300"
                        />
                      )}
                      <span className="truncate">{n.titolo}</span>
                    </p>
                    {n.testo && (
                      <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-stone-300">
                        {n.testo}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-stone-500">
                      {formattaData(n.creato_il)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                      {n.muro_slug && (
                        <Link
                          href={`/muro/${n.muro_slug}`}
                          onClick={() => {
                            apri(n);
                            setAperto(false);
                          }}
                          className="rounded-full bg-amber-300 px-3 py-1.5 font-bold text-stone-900 transition hover:scale-105"
                        >
                          {t("notifiche.apri")}
                        </Link>
                      )}
                      {!n.letta && (
                        <button
                          type="button"
                          onClick={() => apri(n)}
                          className="rounded-full border border-amber-100/30 px-3 py-1.5 font-semibold text-amber-100 transition hover:bg-stone-950/50"
                        >
                          {t("notifiche.segnaUna")}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => rimuovi(n.id)}
                        className="rounded-full border border-red-400/40 px-3 py-1.5 font-semibold text-red-300 transition hover:bg-red-500/10"
                      >
                        {t("notifiche.cancella")}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-amber-100/10 px-3 py-2.5">
            {nonLette > 0 ? (
              <button
                type="button"
                onClick={tutteLette}
                className="rounded-full border border-amber-100/30 px-3 py-1.5 text-xs font-semibold text-amber-100 transition hover:bg-stone-950/50"
              >
                {t("notifiche.segnaTutte")}
              </button>
            ) : (
              <span />
            )}
            <Link
              href="/notifiche"
              onClick={() => setAperto(false)}
              className="text-xs font-semibold text-amber-100/90 transition hover:text-amber-100"
            >
              {t("campanella.vediTutte")}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
