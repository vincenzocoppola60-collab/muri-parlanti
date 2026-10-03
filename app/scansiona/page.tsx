import Link from "next/link";
import ScannerQR from "@/components/ScannerQR";

export default function ScansionaPage() {
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
      <header className="px-4 pb-2 pt-16 text-center sm:pt-20">
        <h1 className="font-scritta text-5xl leading-tight text-amber-100 drop-shadow-md sm:text-6xl">
          Scansiona un muro
        </h1>
      </header>
      <ScannerQR />
      <footer className="pb-10 text-center">
        <Link
          href="/"
          className="text-sm text-amber-100/80 underline-offset-4 hover:underline"
        >
          ← Torna alla home
        </Link>
      </footer>
    </main>
  );
}
