"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useLingua } from "@/lib/i18n";
import { collettiviSeguiti } from "@/lib/follow";
import { elencaCollettivi, type Collettivo } from "@/lib/collettivi";

/**
 * Sezione "Creator che segui" per la home: mostra i collettivi seguiti
 * dall'utente collegato. Non compare per gli ospiti (il follow richiede
 * un account) o se non si segue nessuno.
 */
export default function SezioneCreatorSeguiti() {
  const { utente, caricamento } = useAuth();
  const { t } = useLingua();
  const [seguiti, setSeguiti] = useState<Collettivo[]>([]);

  useEffect(() => {
    if (!utente) {
      setSeguiti([]);
      return;
    }
    let attivo = true;
    (async () => {
      const ids = await collettiviSeguiti();
      if (!attivo || ids.length === 0) {
        if (attivo) setSeguiti([]);
        return;
      }
      const tutti = await elencaCollettivi();
      const set = new Set(ids);
      if (attivo) setSeguiti(tutti.filter((c) => set.has(c.id)));
    })();
    return () => {
      attivo = false;
    };
  }, [utente]);

  if (caricamento || !utente || seguiti.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-5xl px-4">
      <h2 className="font-scritta text-3xl text-amber-100">
        {t("home.creatorSeguiti")}
      </h2>
      <ul className="mt-4 flex flex-wrap gap-3">
        {seguiti.map((c) => (
          <li key={c.id}>
            <Link
              href={`/collettivo/${c.slug}`}
              className="flex items-center gap-2 rounded-full border border-amber-100/25 bg-stone-900/55 px-4 py-2 text-sm font-semibold text-amber-100 shadow-lg backdrop-blur-sm transition hover:bg-stone-900/90"
            >
              <span aria-hidden>{c.emoji ?? "🎪"}</span>
              {c.nome}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
