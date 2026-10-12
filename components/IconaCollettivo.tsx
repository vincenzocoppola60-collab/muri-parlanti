"use client";

import Link from "next/link";

/**
 * Piccolo "marchio" del collettivo (emoji + nome) che punta alla sua pagina
 * pubblica /collettivo/<slug>. Si usa accanto al nome di un muro per far
 * capire che quel muro appartiene a un creator (es. RUINA).
 */
export default function IconaCollettivo({
  slug,
  nome,
  emoji,
  compatta = false,
}: {
  slug: string;
  nome: string;
  emoji?: string | null;
  compatta?: boolean;
}) {
  return (
    <Link
      href={`/collettivo/${slug}`}
      title={nome}
      className={`inline-flex items-center gap-1.5 rounded-full border border-amber-100/25 bg-stone-900/60 font-semibold text-amber-100 transition hover:bg-stone-900/90 ${
        compatta ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm"
      }`}
    >
      <span aria-hidden>{emoji ?? "🎪"}</span>
      <span className="truncate">{nome}</span>
    </Link>
  );
}
