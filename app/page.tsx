"use client";

import { useEffect, useSyncExternalStore } from "react";
import MieiMuri from "@/components/MieiMuri";
import ProfiloCard from "@/components/ProfiloCard";
import InstallaApp from "@/components/InstallaApp";
import { Crediti } from "@/components/Crediti";
import { useLingua } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";

/** Flag locale: il testo introduttivo si mostra una sola volta, al primo accesso. */
const BENVENUTO_KEY = "muri-parlanti:benvenuto";

/** Nessuna sottoscrizione: i valori non cambiano durante la sessione. */
const niente = () => () => {};

// Cache: leggiamo localStorage UNA volta per sessione, cosi' il valore resta
// stabile anche dopo aver scritto il flag (altrimenti il testo sparirebbe
// subito al primo accesso).
let primoAccessoCache: boolean | null = null;

function leggiPrimoAccesso(): boolean {
  if (primoAccessoCache !== null) return primoAccessoCache;
  try {
    primoAccessoCache = !window.localStorage.getItem(BENVENUTO_KEY);
  } catch {
    // localStorage non disponibile (privacy mode): lo mostriamo comunque.
    primoAccessoCache = true;
  }
  return primoAccessoCache;
}

/**
 * La home NON mostra un elenco fisso di muri: ogni persona vede solo i
 * muri che ha incontrato (scansione QR). Ospite: salvati sul dispositivo.
 * Loggato: salvati sul dispositivo + quelli dell'account (progresso_muri).
 *
 * Il testo introduttivo (home.desc) resta SOLO per chi naviga da anonimo
 * oppure al primissimo accesso; per chi ha già visto il sito da loggato
 * viene rimosso dalla home.
 */
export default function Home() {
  const { t } = useLingua();
  const { utente, caricamento } = useAuth();

  // Rileva in modo sicuro l'idratazione sul client (evita mismatch SSR).
  const montato = useSyncExternalStore(
    niente,
    () => true,
    () => false
  );
  // Primo accesso: valore stabile per tutta la sessione.
  const primoAccesso = useSyncExternalStore(niente, leggiPrimoAccesso, () => false);

  useEffect(() => {
    // Segna il primo accesso una volta entrati nel sito.
    try {
      window.localStorage.setItem(BENVENUTO_KEY, "1");
    } catch {
      // Nessun problema: senza localStorage lo mostriamo a ogni accesso.
    }
  }, []);

  // Testo introduttivo: solo ad anonimi o al primo accesso (dopo il mount,
  // per non divergere dall'HTML del server).
  const mostraDesc = montato && !caricamento && (utente === null || primoAccesso);

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

      <header className="px-4 pb-4 pt-20 text-center sm:pt-28">
        <h1 className="font-scritta text-6xl text-amber-100 drop-shadow-md sm:text-7xl">
          Muri Parlanti
        </h1>
        {mostraDesc && (
          <p className="mx-auto mt-4 max-w-md text-stone-300">{t("home.desc")}</p>
        )}
      </header>

      <section className="mx-auto mt-10 w-full max-w-5xl px-4">
        <ProfiloCard />
      </section>

      <section className="mx-auto mt-10 w-full max-w-5xl px-4">
        <MieiMuri />
      </section>

      {/* Spiegazione "sul telefono, come un'app": salvataggio sulla Home. */}
      <section className="mx-auto mt-10 w-full max-w-5xl px-4">
        <InstallaApp />
      </section>

      <footer className="pb-12 pt-12 text-center text-xs text-stone-500">
        {t("home.footer")}
        <Crediti />
      </footer>
    </main>
  );
}
