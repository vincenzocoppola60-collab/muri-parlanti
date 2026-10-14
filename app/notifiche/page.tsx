"use client";

import SfondoMuro from "@/components/SfondoMuro";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useLingua } from "@/lib/i18n";
import { formattaData } from "@/lib/formato";
import {
  cancellaNotifica,
  elencaNotifiche,
  segnaLetta,
  segnaTutteLette,
  type Notifica,
} from "@/lib/notifiche";

/**
 * Pagina delle notifiche (S2).
 *
 * Le notifiche nascono dal database quando un creator che segui pubblica un
 * nuovo pensiero sul muro principale del proprio collettivo. Qui l'utente le
 * legge, le segna come lette e le cancella.
 */
export default function PaginaNotifiche() {
  const { utente, caricamento } = useAuth();
  const { t } = useLingua();
  const [notifiche, setNotifiche] = useState<Notifica[]>([]);
  const [carico, setCarico] = useState(true);

  const ricarica = useCallback(async () => {
    setCarico(true);
    const lista = await elencaNotifiche();
    setNotifiche(lista);
    setCarico(false);
  }, []);

  useEffect(() => {
    if (caricamento) return;
    if (!utente) {
      setNotifiche([]);
      setCarico(false);
      return;
    }
    ricarica();
  }, [caricamento, utente, ricarica]);

  async function apri(n: Notifica) {
    if (!n.letta) {
      setNotifiche((lista) =>
        lista.map((x) => (x.id === n.id ? { ...x, letta: true } : x))
      );
      await segnaLetta(n.id);
    }
  }

  async function rimuovi(id: string) {
    setNotifiche((lista) => lista.filter((x) => x.id !== id));
    await cancellaNotifica(id);
  }

  async function tutteLette() {
    setNotifiche((lista) => lista.map((x) => ({ ...x, letta: true })));
    await segnaTutteLette();
  }

  const nonLette = notifiche.filter((n) => !n.letta).length;

  return (
    <main className="relative min-h-dvh pb-16">
      <SfondoMuro />
      <div
        aria-hidden
        className="fixed inset-0 -z-10 bg-gradient-to-b from-stone-950/85 via-stone-900/60 to-stone-950/90"
      />

      <div className="mx-auto w-full max-w-2xl px-4 pt-24">
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-scritta text-4xl text-amber-100">
            {t("notifiche.titolo")}
          </h1>
          {nonLette > 0 && (
            <button
              type="button"
              onClick={tutteLette}
              className="rounded-full border border-amber-100/30 px-4 py-2 text-xs font-semibold text-amber-100 transition hover:bg-stone-950/50"
            >
              {t("notifiche.segnaTutte")}
            </button>
          )}
        </div>

        {caricamento || carico ? (
          <p className="scritta-sistema mt-8 text-sm">…</p>
        ) : !utente ? (
          <p className="scritta-sistema mt-8 text-sm">{t("notifiche.accedi")}</p>
        ) : notifiche.length === 0 ? (
          <p className="scritta-sistema mt-8 text-sm">{t("notifiche.vuote")}</p>
        ) : (
          <ul className="mt-6 flex flex-col gap-3">
            {notifiche.map((n) => (
              <li
                key={n.id}
                className={`rounded-xl border p-4 shadow-lg backdrop-blur-sm transition ${
                  n.letta
                    ? "border-amber-100/10 bg-stone-900/45"
                    : "border-amber-300/40 bg-stone-900/70"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-scritta text-xl text-amber-100">
                      {!n.letta && (
                        <span
                          aria-hidden
                          className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-amber-300"
                        />
                      )}
                      <span className="truncate">{n.titolo}</span>
                    </p>
                    {n.testo && (
                      <p className="mt-1 text-sm leading-relaxed text-stone-300">
                        {n.testo}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-stone-500">
                      {formattaData(n.creato_il)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  {n.muro_slug && (
                    <Link
                      href={`/muro/${n.muro_slug}`}
                      onClick={() => apri(n)}
                      className="rounded-full bg-amber-300 px-4 py-2 text-xs font-bold text-stone-900 transition hover:scale-105"
                    >
                      {t("notifiche.apri")}
                    </Link>
                  )}
                  {!n.letta && (
                    <button
                      type="button"
                      onClick={() => apri(n)}
                      className="rounded-full border border-amber-100/30 px-4 py-2 text-xs font-semibold text-amber-100 transition hover:bg-stone-950/50"
                    >
                      {t("notifiche.segnaUna")}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => rimuovi(n.id)}
                    className="rounded-full border border-red-400/40 px-4 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/10"
                  >
                    {t("notifiche.cancella")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <Link
          href="/"
          className="scritta-sistema mt-10 inline-block text-sm hover:underline"
        >
          {t("comune.tornaHomeFreccia")}
        </Link>
      </div>
    </main>
  );
}
