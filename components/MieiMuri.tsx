"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  caricaMieiMuri,
  isBozzaLegacy,
  MASSIMO,
  pulisciBozze,
  type MioMuro,
} from "@/lib/mieiMuri";
import { caricaProgresso } from "@/lib/progresso";
import { nomeLuogo } from "@/lib/luoghi";
import { useAuth } from "@/lib/auth";
import { useLingua } from "@/lib/i18n";

type MuroVisibile = {
  slug: string;
  nome: string;
  /** true = salvato sul dispositivo, false = presente nell'account. */
  locale: boolean;
};

export default function MieiMuri() {
  const { t } = useLingua();
  const { utente, caricamento } = useAuth();
  const [locali, setLocali] = useState<MioMuro[]>([]);
  const [luoghiAccount, setLuoghiAccount] = useState<string[]>([]);
  const [pronto, setPronto] = useState(false);
  const [contoPronto, setContoPronto] = useState(false);

  // Muri salvati su questo dispositivo (le vecchie bozze vengono rimosse).
  useEffect(() => {
    setLocali(pulisciBozze());
    setPronto(true);
  }, []);

  // Muri dell'account (solo da client, dopo il login).
  useEffect(() => {
    if (!utente) {
      setLuoghiAccount([]);
      setContoPronto(true);
      return;
    }
    let attivo = true;
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
    return () => {
      attivo = false;
    };
  }, [utente]);

  if (!pronto || caricamento || (utente && !contoPronto)) return null;

  // Unione senza duplicati: prima i salvati locali, poi quelli dell'account.
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
  const visibili = muri.slice(0, MASSIMO);

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
    /* Prototipo layout · Idea 1 "Lista a schede": una riga per muro, con
       miniatura, nome e da dove arriva (questo telefono / il tuo account).
       Semplice e scalabile, come un elenco di biglietti. */
    <div className="rounded-lg border border-amber-100/20 bg-stone-900/60 p-5 shadow-xl backdrop-blur-sm">
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

      <ul className="mt-4 flex flex-col gap-2">
        {visibili.map((m) => (
          <li key={m.slug}>
            <Link
              href={`/muro/${m.slug}`}
              className="group flex items-center gap-3 rounded-xl border border-amber-100/15 bg-stone-950/40 px-3 py-3 transition hover:border-amber-100/50 hover:bg-stone-950/70"
            >
              <span
                aria-hidden
                className="flex h-11 w-11 flex-none items-center justify-center rounded-lg border border-amber-100/20 bg-amber-300/15 text-xl"
              >
                🧱
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-scritta text-xl text-amber-100">
                  {m.nome}
                </span>
                <span className="mt-0.5 block text-xs text-stone-400">
                  {m.locale ? t("muri.suQuestoTelefono") : t("muri.dalTuAccount")}
                </span>
              </span>
              <span
                aria-hidden
                className="flex-none text-lg text-amber-100/50 transition group-hover:text-amber-100"
              >
                ›
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
