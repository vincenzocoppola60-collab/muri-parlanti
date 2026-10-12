"use client";

import Link from "next/link";
import type { Collettivo, MuroCollettivo } from "@/lib/collettivi";
import { useLingua } from "@/lib/i18n";
import PulsanteSegui from "@/components/PulsanteSegui";

/**
 * Testata della pagina pubblica di un collettivo (/collettivo/<slug>):
 * avatar/nome, descrizione, pulsante Segui e scorciatoie ai muri.
 */
export default function ProfiloCollettivo({
  collettivo,
  muroInCorso,
  muroPrincipale,
  followerIniziali,
}: {
  collettivo: Collettivo;
  muroInCorso: MuroCollettivo | null;
  muroPrincipale: MuroCollettivo | null;
  followerIniziali?: number;
}) {
  const { t } = useLingua();

  return (
    <header className="mx-auto w-full max-w-3xl px-4 text-center">
      {/* Il collettivo ha la foto QUADRATA (le persone restano col cerchio). */}
      <div className="mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border-2 border-amber-100/30 bg-stone-900/70 text-5xl shadow-xl">
        {collettivo.foto_url ? (
          <img
            src={collettivo.foto_url}
            alt={collettivo.nome}
            className="h-full w-full object-cover"
          />
        ) : (
          <span aria-hidden>{collettivo.emoji ?? "🎪"}</span>
        )}
      </div>

      <h1 className="mt-4 font-scritta text-5xl leading-tight text-amber-100 drop-shadow-md">
        {collettivo.nome}
      </h1>
      {collettivo.descrizione && (
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-stone-300">
          {collettivo.descrizione}
        </p>
      )}

      <div className="mt-5 flex justify-center">
        <PulsanteSegui
          collettivoId={collettivo.id}
          followerIniziali={followerIniziali}
        />
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm">
        {muroInCorso && (
          <Link
            href={`/muro/${muroInCorso.slug}`}
            className="rounded-full bg-amber-300 px-5 py-2.5 font-bold text-stone-900 shadow-lg transition hover:scale-105"
          >
            🔴 {t("collettivo.muroInCorso")}
          </Link>
        )}
        {muroPrincipale && (
          <Link
            href={`/muro/${muroPrincipale.slug}`}
            className="rounded-full border border-amber-100/30 px-5 py-2.5 font-semibold text-amber-100 transition hover:bg-stone-950/50"
          >
            🧱 {t("collettivo.muroPrincipale")}
          </Link>
        )}
      </div>
    </header>
  );
}
