import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  caricaProfilo,
  caricaPostitDiUtente,
  contaPostitDiUtente,
  urlAvatar,
} from "@/lib/profili";
import PostItView from "@/components/PostIt";

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
    if (profilo) return { title: `Profilo di ${profilo.nickname}` };
  }
  return { title: "Profilo" };
}

export default async function PaginaProfilo({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!ID_VALIDO.test(id)) notFound();

  const profilo = await caricaProfilo(id);
  if (!profilo) notFound();

  // Privacy: l'autore puo' nascondere i propri post-it dal profilo pubblico.
  const visibili = profilo.mostra_postit;
  const [postit, totale] = await Promise.all([
    visibili ? caricaPostitDiUtente(id) : Promise.resolve([]),
    visibili ? contaPostitDiUtente(id) : Promise.resolve(0),
  ]);

  const avatar = urlAvatar(profilo);
  const iniziale = profilo.nickname.trim().charAt(0).toUpperCase() || "?";

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

      <header className="px-4 pb-2 pt-10 text-center sm:pt-14">
        <Link
          href="/"
          className="mb-3 inline-block text-[11px] font-bold uppercase tracking-[0.25em] text-amber-100/50 transition hover:text-amber-100"
        >
          🧱 Muri Parlanti
        </Link>

        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatar}
            alt={`Foto profilo di ${profilo.nickname}`}
            className="mx-auto mt-4 h-24 w-24 rounded-full object-cover shadow-xl ring-2 ring-amber-300/60"
          />
        ) : (
          <span className="mx-auto mt-4 flex h-24 w-24 items-center justify-center rounded-full bg-amber-300 font-scritta text-4xl font-bold text-stone-900 shadow-xl">
            {iniziale}
          </span>
        )}

        <h1 className="mt-4 font-scritta text-4xl leading-tight text-amber-100 drop-shadow-md sm:text-5xl">
          {profilo.nickname}
        </h1>
        {profilo.bio && (
          <div className="mx-auto mt-4 max-w-md rounded-xl border border-amber-100/25 bg-stone-900/60 px-5 py-4 text-left shadow-lg backdrop-blur-sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-amber-200/70">
              Bio
            </p>
            <p className="mt-2 whitespace-pre-wrap font-scritta text-2xl leading-snug text-amber-100">
              {profilo.bio}
            </p>
          </div>
        )}
        {visibili && (
          <p className="mt-2 text-sm text-stone-300">
            {totale === 1
              ? "1 pensiero lasciato"
              : `${totale} pensieri lasciati`}
          </p>
        )}
      </header>

      {!visibili ? (
        <p className="mx-auto mt-16 max-w-sm px-6 text-center text-lg text-stone-200">
          Questo profilo ha scelto di non mostrare i suoi post-it.
        </p>
      ) : postit.length === 0 ? (
        <p className="mx-auto mt-16 max-w-sm px-6 text-center text-lg text-stone-200">
          Nessun pensiero ancora lasciato da questo autore.
        </p>
      ) : (
        <section className="mx-auto mt-10 max-w-4xl columns-1 gap-6 px-4 pb-24 sm:columns-2 md:columns-3">
          {postit.map((p) => (
            <PostItView key={p.id} postit={p} />
          ))}
        </section>
      )}
    </main>
  );
}
