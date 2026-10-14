import SfondoMuro from "@/components/SfondoMuro";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { caricaProfilo } from "@/lib/profili";
import ElencoPaginato from "@/components/ElencoPaginato";

export const dynamic = "force-dynamic";

/** Solo id di account validi arrivano al database: tutto il resto e' 404. */
const ID_VALIDO =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  if (ID_VALIDO.test(id)) {
    const profilo = await caricaProfilo(id);
    if (profilo) return { title: `Post-it salvati di ${profilo.nickname}` };
  }
  return { title: "Post-it salvati" };
}

/**
 * Schermata dedicata "I post-it salvati di <nome>".
 *
 * Stessa impaginazione (10 per pagina, frecce avanti/indietro) della schermata
 * dei post-it lasciati. I dati veri li carica <ElencoPaginato />: lato client
 * autenticato per il proprietario, dalle server action per un visitatore (che
 * rispettano l'interruttore mostra_salvati).
 */
export default async function PaginaSalvatiProfilo({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!ID_VALIDO.test(id)) notFound();

  const profilo = await caricaProfilo(id);
  if (!profilo) notFound();

  return (
    <main className="relative min-h-dvh">
      <SfondoMuro id={id} />
      <div
        aria-hidden
        className="fixed inset-0 -z-10 bg-gradient-to-b from-stone-950/75 via-stone-900/45 to-stone-950/85"
      />

      <ElencoPaginato
        utenteId={id}
        tipo="salvati"
        nickname={profilo.nickname}
      />
    </main>
  );
}
