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
    if (profilo) return { title: `Post-it di ${profilo.nickname}` };
  }
  return { title: "Post-it" };
}

/**
 * Schermata dedicata "I post-it di <nome>".
 *
 * La cornice nella pagina profilo mostra solo gli ultimi 5 e rimanda qui:
 * l'elenco completo e' impaginato (10 per pagina, frecce avanti/indietro) per
 * non trasformarsi in uno scorrimento infinito. I dati veri li carica
 * <ElencoPaginato />: lato client autenticato per il proprietario (che vede
 * sempre i propri), dalle server action per un visitatore (che rispettano
 * l'interruttore mostra_postit).
 */
export default async function PaginaPostitProfilo({
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

      <ElencoPaginato
        utenteId={id}
        tipo="postit"
        nickname={profilo.nickname}
      />
    </main>
  );
}
