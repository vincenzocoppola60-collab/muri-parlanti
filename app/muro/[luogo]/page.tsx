import { notFound } from "next/navigation";
import { caricaPostit, contaPostit } from "@/lib/postit";
import { normalizzaLuogo, nomeLuogo } from "@/lib/luoghi";
import { caricaMuro } from "@/lib/muri";
import { collettivoDelMuro } from "@/lib/collettivi";
import Wall from "@/components/Wall";
import Testo from "@/components/Testo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ luogo: string }>;
}) {
  const { luogo } = await params;
  const slug = normalizzaLuogo(luogo);
  return {
    title: slug ? `Muro di ${nomeLuogo(slug)}` : "Muro",
  };
}

export default async function PaginaMuro({
  params,
}: {
  params: Promise<{ luogo: string }>;
}) {
  const { luogo } = await params;
  const slug = normalizzaLuogo(luogo);
  if (!slug) notFound();

  try {
    const [postit, totale, muro] = await Promise.all([
      caricaPostit(slug),
      contaPostit(slug),
      caricaMuro(slug),
    ]);
    // Muro di un collettivo: recupera il marchio (emoji + nome) da mostrare.
    const collettivo = muro?.collettivo_id
      ? await collettivoDelMuro(slug)
      : null;

    // Un evento e' "finito" quando la sua data di fine (data+ora) e' passata:
    // da quel momento il muro e' in sola lettura. Lo stesso controllo e' nel
    // database (trigger postit_prepara, 0029): il blocco e' reale, non solo UI.
    const fine = muro?.data_fine ? Date.parse(muro.data_fine) : NaN;
    const eventoFinito = Number.isFinite(fine) && Date.now() > fine;
    // Un muro CHIUSO (a mano o per fine evento) e' in sola lettura (AE1).
    const puoScrivere = muro?.stato !== "chiuso" && !eventoFinito;
    const finestraEvento =
      muro && (muro.data_inizio || muro.data_fine)
        ? {
            inizio: muro.data_inizio ?? null,
            fine: muro.data_fine ?? null,
            finito: eventoFinito,
          }
        : null;

    return (
      <Wall
        luogo={slug}
        nome={muro?.nome ?? nomeLuogo(slug)}
        postit={postit}
        totale={totale}
        fotoUrl={muro?.foto_url ?? null}
        puoScrivere={puoScrivere}
        evento={finestraEvento}
        collettivo={
          collettivo
            ? { slug: collettivo.slug, nome: collettivo.nome, emoji: collettivo.emoji }
            : null
        }
      />
    );
  } catch {
    return <ErroreCaricamento />;
  }
}

function ErroreCaricamento() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <div
        aria-hidden
        className="fixed inset-0 -z-20 bg-cover bg-center"
        style={{ backgroundImage: "url(/images/brain.webp)" }}
      />
      <div aria-hidden className="fixed inset-0 -z-10 bg-stone-950/85" />
      <h1 className="font-scritta text-4xl text-amber-100">
        <Testo chiave="errore.titolo" />
      </h1>
      <p className="scritta-sistema max-w-md">
        <Testo chiave="errore.muroTesto" />
      </p>
      <a
        href="/"
        className="rounded-full bg-amber-300 px-6 py-3 font-bold text-stone-900 shadow-xl transition hover:scale-105"
      >
        <Testo chiave="comune.tornaHome" />
      </a>
    </main>
  );
}
