"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import {
  caricaPreferiti,
  rimuoviPreferito,
  type Preferito,
} from "@/lib/preferiti";
import { nomeLuogo } from "@/lib/luoghi";
import { formattaData } from "@/lib/formato";
import { useLingua } from "@/lib/i18n";

export default function PaginaPreferiti() {
  const { t } = useLingua();
  const { utente, caricamento } = useAuth();
  const [lista, setLista] = useState<Preferito[]>([]);
  const [pronto, setPronto] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    if (!utente) {
      setLista([]);
      setPronto(true);
      return;
    }
    let attivo = true;
    setPronto(false);
    caricaPreferiti(utente.id)
      .then((preferiti) => {
        if (attivo) {
          setLista(preferiti);
          setPronto(true);
        }
      })
      .catch(() => {
        if (attivo) {
          setErrore(t("preferitiPag.errCarico"));
          setPronto(true);
        }
      });
    return () => {
      attivo = false;
    };
  }, [utente]);

  async function rimuovi(p: Preferito) {
    if (!utente) return;
    try {
      await rimuoviPreferito(utente.id, p.id);
      setLista((attuali) => attuali.filter((x) => x.id !== p.id));
    } catch {
      setErrore(t("preferitiPag.errRimuovi"));
    }
  }

  return (
    <main className="relative min-h-dvh">
      <div
        aria-hidden
        className="fixed inset-0 -z-20 bg-cover bg-center"
        style={{ backgroundImage: "url(/images/brain.webp)" }}
      />
      <div
        aria-hidden
        className="fixed inset-0 -z-10 bg-gradient-to-b from-stone-950/80 via-stone-900/55 to-stone-950/90"
      />

      <header className="px-4 pb-2 pt-10 text-center sm:pt-14">
        <Link
          href="/"
          className="mb-3 inline-block text-[11px] font-bold uppercase tracking-[0.25em] text-amber-100/50 transition hover:text-amber-100"
        >
          🧱 Muri Parlanti
        </Link>
        <h1 className="font-scritta text-5xl leading-tight text-amber-100 drop-shadow-md sm:text-6xl">
          {t("preferitiPag.titolo")}
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-stone-300">
          {t("preferitiPag.testo")}
        </p>
      </header>

      <section className="mx-auto mt-8 w-full max-w-3xl px-4 pb-24">
        {caricamento || !pronto ? (
          <p className="text-center text-stone-400">{t("comune.carico")}</p>
        ) : !utente ? (
          <div className="rounded-xl border border-amber-100/20 bg-stone-900/60 p-6 text-center shadow-xl backdrop-blur-sm">
            <p className="font-scritta text-2xl text-amber-100">
              {t("preferitiPag.serveAccount")}
            </p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-stone-300">
              {t("preferitiPag.serveAccountTesto")}
            </p>
            <Link
              href="/impostazioni"
              className="mt-4 inline-block rounded-full bg-amber-300 px-6 py-2.5 text-sm font-bold text-stone-900 shadow-lg transition hover:scale-105 active:scale-95"
            >
              {t("preferitiPag.accedi")}
            </Link>
          </div>
        ) : errore ? (
          <p className="text-center text-sm text-red-300">{errore}</p>
        ) : lista.length === 0 ? (
          <p className="mx-auto max-w-sm text-center text-lg text-stone-200">
            {t("preferitiPag.vuoto")}
          </p>
        ) : (
          /* Prototipo layout · Idea 1 "Griglia di biglietti": tutti i salvati
             a griglia (2 colonne su tablet, 3 su schermi grandi). Ordinato e
             scalabile: il colore del biglietto fa da categoria anche senza
             filtri. */
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {lista.map((p) => (
              <li
                key={p.id}
                className="flex h-full flex-col rounded-xl border border-amber-100/20 bg-stone-900/70 p-4 shadow-lg backdrop-blur-sm"
              >
                <p className="whitespace-pre-wrap break-words text-lg leading-snug text-amber-50">
                  {p.testo}
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-400">
                  <span>
                    ~ {p.nickname}
                    {p.creato_il && (
                      <span className="opacity-70">
                        {" "}
                        · {formattaData(p.creato_il)}
                      </span>
                    )}
                  </span>
                  <Link
                    href={`/muro/${p.luogo}`}
                    className="rounded-full border border-amber-100/30 bg-stone-950/50 px-3 py-1 font-semibold text-amber-100 transition hover:border-amber-100/60 hover:bg-stone-950/80"
                  >
                    🧱 {nomeLuogo(p.luogo)}
                  </Link>
                </div>
                <button
                  type="button"
                  onClick={() => rimuovi(p)}
                  className="mt-auto self-start pt-3 text-xs font-semibold text-stone-500 underline underline-offset-2 transition hover:text-red-300"
                >
                  {t("preferitiPag.rimuoviSalvati")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
