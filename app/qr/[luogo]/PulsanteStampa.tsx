"use client";

export default function PulsanteStampa() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-full bg-amber-300 px-5 py-2 text-sm font-bold text-stone-900 shadow-xl transition hover:scale-105"
    >
      🖨️ Stampa
    </button>
  );
}
