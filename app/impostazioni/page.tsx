"use client";

import SfondoMuro from "@/components/SfondoMuro";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import AccessoForm from "@/components/AccessoForm";
import { useLingua } from "@/lib/i18n";
import { eAmministratore } from "@/lib/admin";
import { caricaMioProfilo, impostaMostraPostit } from "@/lib/profili";
import SelettoreTema from "@/components/SelettoreTema";

/**
 * Pagina Impostazioni — VERSIONE SNELLA · Prototipo layout "Interruttori".
 *
 * Idea 2: poche opzioni on/off, grandi e toccabili, con una spiegazione di
 * una frase per riga. Non cambia NESSUNA regola:
 *   - l'accesso resta per chi non ha ancora un account;
 *   - la privacy dei post-it tocca lo stesso campo vero (mostra_postit);
 *   - il tema resta visibile al solo amministratore.
 * Cambia solo il modo di mostrarle: interruttori al posto di pulsanti.
 */

/** Interruttore grande e toccabile, riutilizzato da ogni riga. */
function Interruttore({
  attivo,
  onToggle,
  disabilitato,
  etichetta,
}: {
  attivo: boolean;
  onToggle: () => void;
  disabilitato?: boolean;
  etichetta: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={attivo}
      aria-label={etichetta}
      onClick={onToggle}
      disabled={disabilitato}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition ${
        attivo
          ? "border-amber-300 bg-amber-300"
          : "border-stone-600 bg-stone-800"
      } ${disabilitato ? "cursor-not-allowed opacity-50" : ""}`}
    >
      <span
        aria-hidden
        className={`inline-block h-5 w-5 transform rounded-full bg-stone-950 shadow transition ${
          attivo ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

/** Riga-impostazione: titolo, spiegazione di una frase, interruttore. */
function RigaInterruttore({
  titolo,
  nota,
  attivo,
  onToggle,
  disabilitato,
}: {
  titolo: string;
  nota: string;
  attivo: boolean;
  onToggle: () => void;
  disabilitato?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-amber-100/15 bg-stone-900/50 p-4">
      <div className="min-w-0">
        <p className="font-semibold text-amber-100">{titolo}</p>
        <p className="mt-1 text-xs leading-relaxed text-stone-400">{nota}</p>
      </div>
      <Interruttore
        attivo={attivo}
        onToggle={onToggle}
        disabilitato={disabilitato}
        etichetta={titolo}
      />
    </div>
  );
}

export default function PaginaImpostazioni() {
  const { t } = useLingua();
  const { utente, caricamento, esci } = useAuth();

  // La sezione "Tema" e' sperimentale: per ora la vede solo l'amministratore.
  const [sonoAdmin, setSonoAdmin] = useState(false);

  // Interruttore "mostra i miei post-it" (campo vero: profili.mostra_postit).
  const [mostraPostit, setMostraPostit] = useState(true);
  const [salvoPrivacy, setSalvoPrivacy] = useState(false);

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

  // Carica il valore vero della privacy post-it dal profilo.
  useEffect(() => {
    if (!utente) return;
    let attivo = true;
    caricaMioProfilo()
      .then((esito) => {
        if (attivo && esito.profilo) {
          setMostraPostit(esito.profilo.mostra_postit);
        }
      })
      .catch(() => {
        // Senza profilo restiamo sul valore predefinito: nessun errore.
      });
    return () => {
      attivo = false;
    };
  }, [utente]);

  /**
   * Accende/spegne la privacy dei post-it toccando SOLO quel campo.
   *
   * Prima passava da salvaMioProfilo() con bio vuota: un semplice interruttore
   * cancellava la biografia dell'utente. Ora usa impostaMostraPostit(), che fa
   * un update puntuale di profili.mostra_postit e non tocca nient'altro.
   */
  async function cambiaMostraPostit() {
    if (salvoPrivacy) return;
    const nuovo = !mostraPostit;
    setMostraPostit(nuovo); // ottimistico: l'interruttore risponde subito
    setSalvoPrivacy(true);
    const esito = await impostaMostraPostit(nuovo).catch(() => null);
    if (!esito || !esito.ok) {
      setMostraPostit(!nuovo); // ripristina se il salvataggio non riesce
    }
    setSalvoPrivacy(false);
  }

  if (caricamento) {
    return (
      <main className="relative flex min-h-dvh items-center justify-center">
        <SfondoMuro />
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
        <SfondoMuro />
        <div aria-hidden className="fixed inset-0 -z-10 bg-stone-950/85" />
        <div className="relative mx-auto w-full max-w-md px-4 py-14">
          <Link
            href="/"
            className="scritta-sistema text-[11px] uppercase tracking-[0.25em] hover:underline"
          >
            {t("comune.tornaHomeFreccia")}
          </Link>
          <h1 className="mt-3 font-scritta text-4xl text-amber-100">
            {t("impost.titolo")}
          </h1>
          <p className="scritta-sistema mb-4 mt-2 text-sm">
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
      <SfondoMuro />
      <div
        aria-hidden
        className="fixed inset-0 -z-10 bg-gradient-to-b from-stone-950/75 via-stone-900/45 to-stone-950/85"
      />

      <div className="relative mx-auto w-full max-w-md px-4 pb-24 pt-10">
        <Link
          href="/"
          className="scritta-sistema text-[11px] uppercase tracking-[0.25em] hover:underline"
        >
          {t("comune.tornaHomeFreccia")}
        </Link>
        <h1 className="mt-3 font-scritta text-4xl text-amber-100">
          {t("impost.titolo")}
        </h1>

        {/* Interruttori: poche opzioni on/off, grandi e toccabili. */}
        <section className="mt-6">
          <h2 className="mb-3 font-scritta text-xl text-amber-100">
            {t("impost.interruttori")}
          </h2>
          <div className="flex flex-col gap-3">
            <RigaInterruttore
              titolo={t("impost.mostraPostit")}
              nota={t("impost.mostraPostitNota")}
              attivo={mostraPostit}
              onToggle={cambiaMostraPostit}
              disabilitato={salvoPrivacy}
            />

          </div>
        </section>

        {/* Tema. Sperimentale: visibile solo all'amministratore. */}
        {sonoAdmin && <SelettoreTema />}

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
