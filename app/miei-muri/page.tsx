import SfondoMuro from "@/components/SfondoMuro";
import type { Metadata } from "next";
import Link from "next/link";
import MieiMuri from "@/components/MieiMuri";
import Testo from "@/components/Testo";

export const metadata: Metadata = {
  title: "I tuoi muri",
  description: "I muri che hai incontrato e salvato.",
};

export default function PaginaMieiMuri() {
  return (
    <main className="relative min-h-dvh">
      <SfondoMuro />
      <div
        aria-hidden
        className="fixed inset-0 -z-10 bg-gradient-to-b from-stone-950/80 via-stone-900/55 to-stone-950/90"
      />

      <header className="px-4 pb-2 pt-10 text-center sm:pt-14">
        <Link
          href="/"
          className="scritta-sistema mb-3 inline-block text-[11px] uppercase tracking-[0.25em] hover:underline"
        >
          🧱 Muri Parlanti
        </Link>
        <h1 className="font-scritta text-5xl leading-tight text-amber-100 drop-shadow-md sm:text-6xl">
          <Testo chiave="muri.titolo" />
        </h1>
        <p className="scritta-sistema mx-auto mt-2 max-w-md text-sm">
          <Testo chiave="mieiMuriPag.testo" />
        </p>
      </header>

      <section className="mx-auto mt-8 w-full max-w-5xl px-4 pb-24">
        <MieiMuri />
      </section>
    </main>
  );
}
