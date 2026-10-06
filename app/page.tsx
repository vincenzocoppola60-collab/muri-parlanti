"use client";

import MieiMuri from "@/components/MieiMuri";
import ProfiloCard from "@/components/ProfiloCard";
import InstallaApp from "@/components/InstallaApp";
import { Crediti } from "@/components/Crediti";
import { useLingua } from "@/lib/i18n";

/**
 * La home NON mostra un elenco fisso di muri: ogni persona vede solo i
 * muri che ha incontrato (scansione QR). Ospite: salvati sul dispositivo.
 * Loggato: salvati sul dispositivo + quelli dell'account (progresso_muri).
 */
export default function Home() {
  const { t } = useLingua();

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
        <p className="mx-auto mt-4 max-w-md text-stone-300">{t("home.desc")}</p>
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
