import { notFound } from "next/navigation";
import { caricaPostit, contaPostit } from "@/lib/postit";
import { normalizzaLuogo, nomeLuogo } from "@/lib/luoghi";
import { caricaMuro } from "@/lib/muri";
import Wall from "@/components/Wall";

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
    return (
      <Wall
        luogo={slug}
        nome={nomeLuogo(slug)}
        postit={postit}
        totale={totale}
        fotoUrl={muro?.foto_url ?? null}
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
      <h1 className="font-scritta text-4xl text-amber-100">Muri Parlanti</h1>
      <p className="max-w-md text-stone-300">
        Non sono riuscito a raggiungere il muro in questo momento. Il database
        potrebbe non essere configurato: riprova tra poco.
      </p>
      <a
        href="/"
        className="rounded-full bg-amber-300 px-6 py-3 font-bold text-stone-900 shadow-xl transition hover:scale-105"
      >
        Torna alla home
      </a>
    </main>
  );
}
