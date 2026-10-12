import Link from "next/link";
import { notFound } from "next/navigation";
import {
  caricaCollettivo,
  elencaMuriCollettivo,
  muroInCorso,
  muroPrincipale,
  type MuroCollettivo,
} from "@/lib/collettivi";
import { contaFollower } from "@/lib/follow";
import { formattaData } from "@/lib/formato";
import ProfiloCollettivo from "@/components/ProfiloCollettivo";
import GestioneCollettivo from "@/components/GestioneCollettivo";
import Testo from "@/components/Testo";

export const dynamic = "force-dynamic";

/** Pagina pubblica di un collettivo/creator (es. /collettivo/ruina). */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const collettivo = await caricaCollettivo(slug);
  return {
    title: collettivo ? collettivo.nome : "Muri Parlanti",
    description: collettivo?.descrizione ?? undefined,
  };
}

export default async function PaginaCollettivo({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const collettivo = await caricaCollettivo(slug);
  if (!collettivo) notFound();

  const [inCorso, principale, muri, follower] = await Promise.all([
    muroInCorso(collettivo.id),
    muroPrincipale(collettivo.id),
    elencaMuriCollettivo(collettivo.id),
    contaFollower(collettivo.id),
  ]);

  return (
    <main className="relative min-h-dvh pb-16">
      <div
        aria-hidden
        className="fixed inset-0 -z-20 bg-cover bg-center"
        style={{ backgroundImage: "url(/images/brain.webp)" }}
      />
      <div
        aria-hidden
        className="fixed inset-0 -z-10 bg-gradient-to-b from-stone-950/85 via-stone-900/60 to-stone-950/90"
      />

      <div className="pt-24">
        <ProfiloCollettivo
          collettivo={collettivo}
          muroInCorso={inCorso}
          muroPrincipale={principale}
          followerIniziali={follower}
        />
      </div>

      {/* Sezione di gestione: visibile SOLO all'account del collettivo. */}
      <GestioneCollettivo collettivo={collettivo} />

      <section className="mx-auto mt-12 w-full max-w-3xl px-4">
        <h2 className="font-scritta text-3xl text-amber-100">
          <Testo chiave="collettivo.bacheca" />
        </h2>

        {muri.length === 0 ? (
          <p className="mt-4 text-sm text-stone-400">
            <Testo chiave="collettivo.bachecaVuota" />
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {muri.map((m) => (
              <li key={m.slug}>
                <RigaMuro muro={m} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mx-auto mt-10 w-full max-w-3xl px-4 text-center">
        <Link
          href="/"
          className="text-sm text-stone-400 transition hover:text-amber-100"
        >
          <Testo chiave="comune.tornaHomeFreccia" />
        </Link>
      </div>
    </main>
  );
}

/** Una riga della bacheca: nome del muro, tipo, stato e (se evento) la data. */
function RigaMuro({ muro }: { muro: MuroCollettivo }) {
  const aperto = muro.stato !== "chiuso";
  return (
    <Link
      href={`/muro/${muro.slug}`}
      className="flex items-center justify-between gap-3 rounded-xl border border-amber-100/15 bg-stone-900/55 p-4 shadow-lg backdrop-blur-sm transition hover:bg-stone-900/90"
    >
      <span className="min-w-0">
        <span className="block truncate font-scritta text-2xl text-amber-100">
          {muro.nome}
        </span>
        <span className="mt-0.5 block text-xs text-stone-400">
          {muro.tipo === "principale" ? (
            <Testo chiave="collettivo.tipoPrincipale" />
          ) : (
            <Testo chiave="collettivo.tipoEvento" />
          )}
          {muro.data_inizio
            ? ` · ${formattaData(muro.data_inizio)}`
            : muro.data_evento
              ? ` · ${formattaData(muro.data_evento)}`
              : ""}
          {muro.data_fine ? ` → ${formattaData(muro.data_fine)}` : ""}
        </span>
      </span>
      <span
        className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
          aperto
            ? "bg-emerald-400/20 text-emerald-200"
            : "bg-stone-700/40 text-stone-300"
        }`}
      >
        {aperto ? (
          <Testo chiave="collettivo.statoAperto" />
        ) : (
          <Testo chiave="collettivo.statoChiuso" />
        )}
      </span>
    </Link>
  );
}
