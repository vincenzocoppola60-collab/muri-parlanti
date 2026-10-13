import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  caricaProfilo,
  caricaPostitDiUtente,
  contaPostitDiUtente,
} from "@/lib/profili";
import {
  caricaPreferitiDiUtente,
  contaPreferitiDiUtente,
} from "@/lib/profiliServer";
import VistaProfilo from "@/components/VistaProfilo";

export const dynamic = "force-dynamic";

/** Solo id di account validi arrivano al database: tutto il resto e' 404. */
const ID_VALIDO =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Quanti post-it mostrare nell'anteprima della cornice (poi si pagina). */
const ANTEPRIMA = 5;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  if (ID_VALIDO.test(id)) {
    const profilo = await caricaProfilo(id);
    if (profilo) return { title: `Profilo di ${profilo.nickname}` };
  }
  return { title: "Profilo" };
}

/**
 * Pagina /profilo/[id], condivisa tra PROPRIETARIO e VISITATORE.
 *
 * Il server prepara le anteprime (ultimi 5 post-it lasciati e salvati, con i
 * rispettivi totali) rispettando gli interruttori di privacy: quando una
 * bacheca e' spenta non si legge nemmeno il dato. <VistaProfilo /> disegna la
 * vista pubblica (visitatore) e, se l'account collegato e' il proprietario,
 * passa alla vista di gestione (foto, username, bio e i due interruttori).
 */
export default async function PaginaProfilo({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!ID_VALIDO.test(id)) notFound();

  const profilo = await caricaProfilo(id);
  if (!profilo) notFound();

  // Privacy: l'autore puo' nascondere dalla bacheca pubblica i propri post-it
  // e/o quelli salvati. Spento = niente lettura lato server.
  const mostraPostit = profilo.mostra_postit !== false;
  const mostraSalvati = profilo.mostra_salvati !== false;

  const [postitPreview, totalePostit, salvatiPreview, totaleSalvati] =
    await Promise.all([
      mostraPostit
        ? caricaPostitDiUtente(id, ANTEPRIMA)
        : Promise.resolve([]),
      mostraPostit ? contaPostitDiUtente(id) : Promise.resolve(0),
      mostraSalvati
        ? caricaPreferitiDiUtente(id, ANTEPRIMA)
        : Promise.resolve([]),
      mostraSalvati ? contaPreferitiDiUtente(id) : Promise.resolve(0),
    ]);

  return (
    <main className="relative min-h-dvh">
      <div
        aria-hidden
        className="fixed inset-0 -z-20 bg-cover bg-center"
        style={{ backgroundImage: "url(/images/brain.webp)" }}
      />
      <div
        aria-hidden
        className="fixed inset-0 -z-10 bg-gradient-to-b from-stone-950/75 via-stone-900/45 to-stone-950/85"
      />

      <VistaProfilo
        profilo={profilo}
        postitPreview={postitPreview}
        totalePostit={totalePostit}
        salvatiPreview={salvatiPreview}
        totaleSalvati={totaleSalvati}
      />
    </main>
  );
}
