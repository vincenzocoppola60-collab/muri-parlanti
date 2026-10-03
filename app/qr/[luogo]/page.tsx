import QRCode from "qrcode";
import { notFound } from "next/navigation";
import { normalizzaLuogo, nomeLuogo } from "@/lib/luoghi";
import PulsanteStampa from "./PulsanteStampa";

export const dynamic = "force-dynamic";

// Il QR deve puntare sempre al sito pubblico (i QR stampati in citta
// non funzionerebbero se generati verso localhost).
const SITO_PUBBLICO =
  process.env.NEXT_PUBLIC_SITO_URL ?? "https://muri-parlanti.vercel.app";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ luogo: string }>;
}) {
  const { luogo } = await params;
  const slug = normalizzaLuogo(luogo);
  return {
    title: slug ? `QR Code - Muro di ${nomeLuogo(slug)}` : "QR Code",
  };
}

export default async function PaginaQr({
  params,
}: {
  params: Promise<{ luogo: string }>;
}) {
  const { luogo } = await params;
  const slug = normalizzaLuogo(luogo);
  if (!slug) notFound();

  const url = `${SITO_PUBBLICO}/muro/${slug}`;
  const qr = await QRCode.toDataURL(url, {
    width: 900,
    margin: 2,
    errorCorrectionLevel: "H",
    color: { dark: "#1c1917", light: "#ffffff" },
  });

  return (
    <main className="relative flex min-h-dvh flex-col items-center px-6 py-10">
      <div
        aria-hidden
        className="fixed inset-0 -z-20 bg-cover bg-center"
        style={{ backgroundImage: "url(/images/brain.webp)" }}
      />
      <div aria-hidden className="fixed inset-0 -z-10 bg-stone-950/85" />

      <div className="qr-no-print mb-6 flex w-full max-w-lg items-center justify-between">
        <a
          href="/"
          className="rounded-full border border-amber-100/30 px-4 py-2 text-sm text-amber-100 transition hover:bg-amber-100/10"
        >
          ← Home
        </a>
        <PulsanteStampa />
      </div>

      <section className="qr-card w-full max-w-lg rounded-xl border border-stone-700/50 bg-white p-8 text-center shadow-2xl">
        <h1 className="font-scritta text-5xl leading-snug text-stone-900">
          Muro di {nomeLuogo(slug)}
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          Inquadra il codice per lasciare un pensiero su questo muro.
        </p>
        <img
          src={qr}
          alt={`QR Code del muro di ${nomeLuogo(slug)}`}
          className="mx-auto mt-6 h-auto w-full max-w-[320px]"
        />
        <p className="mt-6 break-all text-xs text-stone-400">{url}</p>
      </section>

      <p className="qr-no-print mt-6 max-w-lg text-center text-xs text-stone-500">
        Stampare: usa il pulsante qui sopra o Cmd/Ctrl+P. Il QR punta al muro
        pubblico, quindi funziona anche dopo aggiornamenti del sito.
      </p>

      <style>{`
        @media print {
          body { background: #fff !important; }
          .qr-no-print { display: none !important; }
          .qr-card { box-shadow: none !important; border: none !important; }
        }
      `}</style>
    </main>
  );
}
