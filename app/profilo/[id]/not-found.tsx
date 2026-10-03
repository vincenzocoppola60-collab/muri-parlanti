import Link from "next/link";

export default function ProfiloNonTrovato() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <div
        aria-hidden
        className="fixed inset-0 -z-20 bg-cover bg-center"
        style={{ backgroundImage: "url(/images/brain.webp)" }}
      />
      <div aria-hidden className="fixed inset-0 -z-10 bg-stone-950/85" />
      <h1 className="font-scritta text-4xl text-amber-100">Profilo non trovato</h1>
      <p className="max-w-md text-stone-300">
        Questo profilo non esiste (o non esiste ancora): magari l&apos;autore
        aveva scritto il pensiero senza un account.
      </p>
      <Link
        href="/"
        className="rounded-full bg-amber-300 px-6 py-3 font-bold text-stone-900 shadow-xl transition hover:scale-105"
      >
        Torna alla home
      </Link>
    </main>
  );
}
