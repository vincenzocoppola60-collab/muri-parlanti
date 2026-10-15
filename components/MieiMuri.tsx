"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  isBozzaLegacy,
  MASSIMO,
  pulisciBozze,
  type MioMuro,
} from "@/lib/mieiMuri";
import { caricaProgresso } from "@/lib/progresso";
import { nomeLuogo } from "@/lib/luoghi";
import { useAuth } from "@/lib/auth";
import { useLingua } from "@/lib/i18n";
import { centroPoligono, elencaMuri, type Punto } from "@/lib/admin";
import MappaMieiMuri, { type PinMappa } from "@/components/MappaMieiMuri";

type MuroVisibile = {
  slug: string;
  nome: string;
  /** true = salvato sul dispositivo, false = presente nell'account. */
  locale: boolean;
};

/** Quante card per pagina nella griglia sotto la mappa (2 colonne x 3 righe). */
const PER_PAGINA = 6;
/** Finestra (ms) entro cui due tap sullo stesso muro valgono doppio tap. */
const FINESTRA_DOPPIO_TAP = 300;

export default function MieiMuri() {
  const { t } = useLingua();
  const { utente, caricamento } = useAuth();
  const router = useRouter();
  const [locali, setLocali] = useState<MioMuro[]>([]);
  const [luoghiAccount, setLuoghiAccount] = useState<string[]>([]);
  const [pronto, setPronto] = useState(false);
  const [contoPronto, setContoPronto] = useState(false);
  const [posizioni, setPosizioni] = useState<Record<string, Punto>>({});
  const [selezionato, setSelezionato] = useState<string | null>(null);
  const [pagina, setPagina] = useState(0);
  const timerRef = useRef<number | null>(null);
  const ultimoTapRef = useRef<string | null>(null);

  // Muri salvati su questo dispositivo (le vecchie bozze vengono rimosse).
  // In un microtask: localStorage esiste solo nel client, dopo il mount.
  useEffect(() => {
    let attivo = true;
    Promise.resolve().then(() => {
      if (!attivo) return;
      setLocali(pulisciBozze());
      setPronto(true);
    });
    return () => {
      attivo = false;
    };
  }, []);

  // Muri dell'account (solo da client, dopo il login). Il ramo senza utente
  // viene anch'esso gestito in un microtask, dopo il mount.
  useEffect(() => {
    let attivo = true;
    Promise.resolve().then(() => {
      if (!attivo) return;
      if (!utente) {
        setLuoghiAccount([]);
        setContoPronto(true);
        return;
      }
      caricaProgresso(utente.id)
        .then((resoconto) => {
          if (!attivo) return;
          setLuoghiAccount(
            [...new Set(resoconto.righe.map((r) => r.luogo))].filter(
              (l) => !isBozzaLegacy(l)
            )
          );
          setContoPronto(true);
        })
        .catch(() => {
          if (attivo) setContoPronto(true);
        });
    });
    return () => {
      attivo = false;
    };
  }, [utente]);

  // Posizioni reali dei muri (lettura pubblica, come nella pagina /apri):
  // centro del poligono se il muro ha una zona, altrimenti lat/lng.
  useEffect(() => {
    let attivo = true;
    elencaMuri()
      .then((muri) => {
        if (!attivo) return;
        const pos: Record<string, Punto> = {};
        for (const m of muri) {
          if (m.zona && m.zona.length >= 3) {
            pos[m.slug] = centroPoligono(m.zona);
          } else if (typeof m.lat === "number" && typeof m.lng === "number") {
            pos[m.slug] = [m.lat, m.lng];
          }
        }
        setPosizioni(pos);
      })
      .catch(() => {
        if (attivo) setPosizioni({});
      });
    return () => {
      attivo = false;
    };
  }, []);

  // Allo smontaggio chiude l'eventuale doppio tap in attesa.
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  // Unione senza duplicati: prima i salvati locali, poi quelli dell'account.
  const visibili = useMemo<MuroVisibile[]>(() => {
    const visti = new Set<string>();
    const muri: MuroVisibile[] = [];
    for (const m of locali) {
      if (visti.has(m.slug)) continue;
      visti.add(m.slug);
      muri.push({ slug: m.slug, nome: m.nome, locale: true });
    }
    for (const slug of luoghiAccount) {
      if (visti.has(slug)) continue;
      visti.add(slug);
      muri.push({ slug, nome: nomeLuogo(slug), locale: false });
    }
    return muri.slice(0, MASSIMO);
  }, [locali, luoghiAccount]);

  // Pin per la mappa: solo i muri di cui conosciamo la posizione.
  const pin = useMemo<PinMappa[]>(
    () =>
      visibili.flatMap((m) => {
        const pos = posizioni[m.slug];
        return pos ? { slug: m.slug, nome: m.nome, lat: pos[0], lng: pos[1] } : [];
      }),
    [visibili, posizioni]
  );

  const pagine = Math.max(1, Math.ceil(visibili.length / PER_PAGINA));

  // La pagina corrente rientra sempre nell'intervallo valido (derivato).
  const paginaCorrente = Math.min(pagina, pagine - 1);
  const inPagina = visibili.slice(
    paginaCorrente * PER_PAGINA,
    paginaCorrente * PER_PAGINA + PER_PAGINA
  );

  /**
   * Un tap seleziona il muro e lo mostra sulla mappa; due tap ravvicinati
   * sullo stesso muro lo aprono. Se il secondo tap arriva su un altro muro
   * vale come un nuovo tap singolo.
   */
  const gestisciTap = (slug: string) => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
      if (ultimoTapRef.current === slug) {
        setSelezionato(slug);
        ultimoTapRef.current = null;
        router.push(`/muro/${slug}`);
        return;
      }
    }
    setSelezionato(slug);
    ultimoTapRef.current = slug;
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
    }, FINESTRA_DOPPIO_TAP);
  };

  if (!pronto || caricamento || (utente && !contoPronto)) return null;

  if (visibili.length === 0) {
    return (
      <div className="rounded-lg border border-amber-100/20 bg-stone-900/60 p-6 text-center shadow-xl backdrop-blur-sm">
        <h2 className="font-scritta text-3xl text-amber-100">
          {t("muri.titolo")}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-stone-300">
          {utente ? t("muri.vuotoAccount") : t("muri.vuotoOspite")}
        </p>
        <Link
          href="/scansiona"
          className="mt-4 inline-block rounded-full bg-amber-300 px-6 py-3 text-base font-bold text-stone-900 shadow-lg transition hover:scale-105 active:scale-95"
        >
          {t("muri.scansionaPrimo")}
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-amber-100/20 bg-stone-900/60 p-4 shadow-xl backdrop-blur-sm sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-scritta text-3xl text-amber-100">
          {t("muri.titolo")}
        </h2>
        <Link
          href="/scansiona"
          className="flex-none rounded-full bg-amber-300 px-4 py-1.5 text-sm font-bold text-stone-900 transition hover:scale-105 active:scale-95"
        >
          {t("muri.aggiungi")}
        </Link>
      </div>

      {/* Mappa reale con i segnalibri dei muri visitati */}
      <div className="mt-4">
        <MappaMieiMuri
          pin={pin}
          selezionato={selezionato}
          onSelect={gestisciTap}
        />
      </div>

      {/* Nomi dei muri: griglia 2x3 con frecce ai lati (nessuno scroll) */}
      <div className="mt-4 flex items-center gap-2">
        {pagine > 1 && (
          <button
            type="button"
            onClick={() => setPagina((p) => Math.max(0, p - 1))}
            disabled={paginaCorrente === 0}
            aria-label={t("muri.paginaPrecedente")}
            className="flex-none rounded-full bg-amber-300/90 px-3 py-4 text-xl font-bold leading-none text-stone-900 transition hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
          >
            ‹
          </button>
        )}

        <ul className="grid min-w-0 flex-1 grid-cols-2 gap-2">
          {inPagina.map((m) => (
            <li key={m.slug}>
              <button
                type="button"
                onClick={() => gestisciTap(m.slug)}
                aria-pressed={selezionato === m.slug}
                className={`flex w-full items-center gap-2 rounded-xl border px-2.5 py-2.5 text-left transition ${
                  selezionato === m.slug
                    ? "border-amber-300/80 bg-amber-300/10"
                    : "border-amber-100/15 bg-stone-950/40 hover:border-amber-100/50 hover:bg-stone-950/70"
                }`}
              >
                <span
                  aria-hidden
                  className="flex h-9 w-9 flex-none items-center justify-center rounded-lg border border-amber-100/20 bg-amber-300/15 text-base"
                >
                  🧱
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block break-words font-scritta text-lg leading-tight text-amber-100">
                    {m.nome}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-stone-400">
                    {m.locale
                      ? t("muri.suQuestoTelefono")
                      : t("muri.dalTuAccount")}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>

        {pagine > 1 && (
          <button
            type="button"
            onClick={() => setPagina((p) => Math.min(pagine - 1, p + 1))}
            disabled={paginaCorrente >= pagine - 1}
            aria-label={t("muri.paginaSuccessiva")}
            className="flex-none rounded-full bg-amber-300/90 px-3 py-4 text-xl font-bold leading-none text-stone-900 transition hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
          >
            ›
          </button>
        )}
      </div>
    </div>
  );
}
