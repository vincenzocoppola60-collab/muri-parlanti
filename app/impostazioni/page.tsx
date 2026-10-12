"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import AccessoForm from "@/components/AccessoForm";
import { useLingua } from "@/lib/i18n";
import { eAmministratore } from "@/lib/admin";
import SelettoreTema from "@/components/SelettoreTema";

/**
 * Pagina Impostazioni — VERSIONE SNELLA.
 *
 * La gestione del profilo (foto, username, biografia, post-it lasciati e
 * salvati) NON e' piu' qui: si trova nella pagina "Il mio profilo"
 * (componente GestioneProfilo). Qui restano solo:
 *   - l'accesso (per chi non ha ancora un account);
 *   - la scelta del tema, visibile per ora al solo amministratore.
 */
export default function PaginaImpostazioni() {
  const { t } = useLingua();
  const { utente, caricamento, esci } = useAuth();

  // La sezione "Tema" e' sperimentale: per ora la vede solo l'amministratore.
  const [sonoAdmin, setSonoAdmin] = useState(false);

  // Riconosce l'amministratore (tabella `amministratori`): solo a lui
  // mostriamo la scelta del tema. Senza sessione la risposta e' false.
  useEffect(() => {
    let attivo = true;
    const id = window.setTimeout(async () => {
      const si = await eAmministratore().catch(() => false);
      if (attivo) setSonoAdmin(si);
    }, 0);
    return () => {
      attivo = false;
      window.clearTimeout(id);
    };
  }, [utente]);

  if (caricamento) {
    return (
      <main className="relative flex min-h-dvh items-center justify-center">
        <div
          aria-hidden
          className="fixed inset-0 -z-20 bg-cover bg-center"
          style={{ backgroundImage: "url(/images/brain.webp)" }}
        />
        <div aria-hidden className="fixed inset-0 -z-10 bg-stone-950/85" />
        <p className="font-scritta text-2xl text-amber-100">
          {t("impost.apro")}
        </p>
      </main>
    );
  }

  // Nessun account: mostriamo solo il modulo di accesso/registrazione.
  if (!utente) {
    return (
      <main className="relative min-h-dvh">
        <div
          aria-hidden
          className="fixed inset-0 -z-20 bg-cover bg-center"
          style={{ backgroundImage: "url(/images/brain.webp)" }}
        />
        <div aria-hidden className="fixed inset-0 -z-10 bg-stone-950/85" />
        <div className="relative mx-auto w-full max-w-md px-4 py-14">
          <Link
            href="/"
            className="text-[11px] font-bold uppercase tracking-[0.25em] text-amber-100/50 transition hover:text-amber-100"
          >
            {t("comune.tornaHomeFreccia")}
          </Link>
          <h1 className="mt-3 font-scritta text-4xl text-amber-100">
            {t("impost.titolo")}
          </h1>
          <p className="mb-4 mt-2 text-sm text-stone-300">
            {t("impost.noAccountTesto")}
          </p>
          <AccessoForm />
        </div>
      </main>
    );
  }

  // Account connesso: profilo e dati NON sono qui, rimandiamo al profilo.
  return (
    <main className="relative min-h-dvh">
      <div
        aria-hidden
        className="fixed inset-0 -z-20 bg-cover bg-center"
        style={{ backgroundImage: "url(/images/brain.webp)" }}
      />
      <div
        aria-hidden
        className="fixed inset-0 -z-10 bg-gradient-to-b from-stone-950/75 via-stone-900/45 to-stone-950/85"
      />

      <div className="relative mx-auto w-full max-w-md px-4 pb-24 pt-10">
        <Link
          href="/"
          className="text-[11px] font-bold uppercase tracking-[0.25em] text-amber-100/50 transition hover:text-amber-100"
        >
          {t("comune.tornaHomeFreccia")}
        </Link>
        <h1 className="mt-3 font-scritta text-4xl text-amber-100">
          {t("impost.titolo")}
        </h1>

        {/* Il profilo si gestisce da un'altra pagina. */}
        <section className="mt-6 rounded-lg border border-amber-100/20 bg-stone-900/60 p-6 shadow-xl backdrop-blur-sm">
          <h2 className="font-scritta text-xl text-amber-100">
            {t("impost.profilo")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-stone-300">
            {t("impost.profiloAltrove")}
          </p>
          <Link
            href={`/profilo/${utente.id}`}
            className="mt-4 block rounded-full bg-amber-300 px-4 py-2.5 text-center text-sm font-bold text-stone-900 shadow-lg transition hover:scale-[1.02] active:scale-95"
          >
            {t("impost.vediProfilo")}
          </Link>
        </section>

        {/* Tema (colori). Sperimentale: visibile solo all'amministratore. */}
        {sonoAdmin && <SelettoreTema />}

        {/* Uscita dall'account. */}
        <button
          type="button"
          onClick={esci}
          className="mt-6 w-full rounded-full border border-amber-100/30 px-4 py-2.5 text-sm font-semibold text-amber-100/90 transition hover:border-amber-100/60 hover:bg-stone-900"
        >
          {t("nav.esci")}
        </button>
      </div>
    </main>
  );
}
