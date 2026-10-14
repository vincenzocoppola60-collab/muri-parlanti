import { redirect } from "next/navigation";
import Link from "next/link";
import { caricaCollettivo, muroDestinazione } from "@/lib/collettivi";
import Testo from "@/components/Testo";

export const dynamic = "force-dynamic";

/**
 * QR del collettivo (AC1).
 *
 * L'indirizzo /c/<slug> e' inciso sul QR del collettivo (es. /c/ruina).
 * Non ha geolocalizzazione: apre direttamente il muro-evento IN CORSO del
 * collettivo; se non c'e' nessun evento aperto, ricade sul muro principale
 * (la bacheca). Se il collettivo non ha ancora nessun muro, mostra un avviso
 * con il collegamento alla pagina pubblica.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const collettivo = await caricaCollettivo(slug);
  return {
    title: collettivo ? `Muro di ${collettivo.nome}` : "Muri Parlanti",
  };
}

export default async function PaginaQRCollettivo({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const collettivo = await caricaCollettivo(slug);

  if (!collettivo) {
    return (
      <Schermata
        titolo={<Testo chiave="collettivo.nonTrovato" />}
        testo={<Testo chiave="collettivo.nonTrovatoTesto" />}
      />
    );
  }

  const destinazione = await muroDestinazione(collettivo.id);
  if (!destinazione) {
    return (
      <Schermata
        titolo={collettivo.nome}
        testo={<Testo chiave="qrCollettivo.nessunMuro" />}
        azione={{
          href: `/collettivo/${collettivo.slug}`,
          etichetta: <Testo chiave="qrCollettivo.vaiProfilo" />,
        }}
      />
    );
  }

  // Muro-evento in corso, oppure muro principale: si apre direttamente.
  redirect(`/muro/${destinazione.slug}`);
}

function Schermata({
  titolo,
  testo,
  azione,
}: {
  titolo: React.ReactNode;
  testo: React.ReactNode;
  azione?: { href: string; etichetta: React.ReactNode };
}) {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <div
        aria-hidden
        className="fixed inset-0 -z-20 bg-cover bg-center"
        style={{ backgroundImage: "url(/images/brain.webp)" }}
      />
      <div aria-hidden className="fixed inset-0 -z-10 bg-stone-950/85" />
      <div
        aria-hidden
        className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-amber-100/30 bg-stone-900/70 text-5xl shadow-xl"
      >
        🎪
      </div>
      <h1 className="font-scritta text-4xl text-amber-100">{titolo}</h1>
      <p className="scritta-sistema max-w-md">{testo}</p>
      {azione ? (
        <Link
          href={azione.href}
          className="rounded-full bg-amber-300 px-6 py-3 font-bold text-stone-900 shadow-xl transition hover:scale-105"
        >
          {azione.etichetta}
        </Link>
      ) : (
        <Link
          href="/"
          className="rounded-full bg-amber-300 px-6 py-3 font-bold text-stone-900 shadow-xl transition hover:scale-105"
        >
          <Testo chiave="comune.tornaHome" />
        </Link>
      )}
    </main>
  );
}
