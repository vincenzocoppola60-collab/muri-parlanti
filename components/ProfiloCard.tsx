"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import AccessoForm from "@/components/AccessoForm";
import { caricaMioProfilo, urlAvatar, type Profilo } from "@/lib/profili";
import { useLingua } from "@/lib/i18n";

/**
 * Scheda COMPATTA della home.
 *
 * - Ospite: invito + modulo di accesso.
 * - Utente: saluto, scorciatoia al profilo e uscita.
 *
 * Il sistema di livelli/punti e' stato eliminato. La gestione del profilo
 * (bio, foto, username) e le liste dei post-it stanno nella pagina profilo
 * (GestioneProfilo), visibili solo al proprietario dell'account.
 */
export default function ProfiloCard() {
  const { t } = useLingua();
  const { utente, caricamento, nickname, esci } = useAuth();
  const [profilo, setProfilo] = useState<Profilo | null>(null);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    let attivo = true;
    if (!utente) {
      // Nessun account: niente da caricare, sblocchiamo la vista fuori dal
      // corpo sincrono dell'effetto.
      Promise.resolve().then(() => {
        if (attivo) setPronto(true);
      });
      return () => {
        attivo = false;
      };
    }
    caricaMioProfilo()
      .then((esito) => {
        if (!attivo) return;
        setProfilo(esito.profilo);
        setPronto(true);
      })
      .catch(() => {
        if (attivo) setPronto(true);
      });
    return () => {
      attivo = false;
    };
  }, [utente]);

  if (caricamento || !pronto) return null;

  if (!utente) {
    return (
      <div className="mx-auto w-full max-w-md">
        <h2 className="font-scritta text-3xl text-amber-100">
          {t("profilo.noAccountTitolo")}
        </h2>
        <p className="mb-4 mt-2 max-w-md text-sm text-stone-300">
          {t("profilo.noAccountTesto")}
        </p>
        <AccessoForm />
      </div>
    );
  }

  const nome = profilo?.nickname || nickname || t("profilo.tu");
  const avatar = urlAvatar(profilo);
  const iniziale = (nome || "?").trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="mx-auto w-full max-w-md rounded-xl border border-amber-100/20 bg-stone-900/60 p-5 shadow-xl backdrop-blur-sm">
      <Link
        href={`/profilo/${utente.id}`}
        className="flex min-w-0 items-center gap-3"
      >
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatar}
            alt={t("profilo.fotoAlt", { nome })}
            className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-amber-300/60"
          />
        ) : (
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-amber-300 font-scritta text-2xl font-bold text-stone-900">
            {iniziale}
          </span>
        )}
        <span className="min-w-0">
          <span className="block truncate font-scritta text-3xl text-amber-100">
            {t("profilo.ciao", { nome })}
          </span>
          <span className="block text-xs text-stone-400">
            {t("profilo.ilMioProfilo")}
          </span>
        </span>
      </Link>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Link
          href={`/profilo/${utente.id}`}
          className="rounded-full border border-amber-100/30 px-3 py-2 text-center text-sm font-semibold text-amber-100 transition hover:bg-stone-950/60"
        >
          {t("profilo.ilMioProfilo")}
        </Link>
        <button
          type="button"
          onClick={esci}
          className="rounded-full border border-amber-100/30 px-3 py-2 text-center text-sm font-semibold text-stone-300 transition hover:bg-stone-950/60"
        >
          {t("profilo.esci")}
        </button>
      </div>
    </div>
  );
}
