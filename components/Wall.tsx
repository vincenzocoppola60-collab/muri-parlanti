"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { PostIt } from "@/lib/postit";
import PostItView from "@/components/PostIt";
import PostItEditor from "@/components/PostItEditor";
import SalvaMuroButton from "@/components/SalvaMuroButton";
import ProgressoMuro, {
  type ProgressoMuroHandle,
} from "@/components/ProgressoMuro";
import { useAuth } from "@/lib/auth";
import { alternaPreferito, idPreferiti } from "@/lib/preferiti";

export default function Wall({
  luogo,
  nome,
  postit,
  totale,
  fotoUrl,
}: {
  luogo: string;
  nome: string;
  postit: PostIt[];
  totale: number;
  fotoUrl?: string | null;
}) {
  const [lista, setLista] = useState<PostIt[]>(postit);
  const [conteggio, setConteggio] = useState(totale);
  const [editorAperto, setEditorAperto] = useState(false);
  const [preferitiIds, setPreferitiIds] = useState<Set<string>>(new Set());
  const [toastPreferito, setToastPreferito] = useState<string | null>(null);
  const [invitoChiuso, setInvitoChiuso] = useState(false);
  const progressoRef = useRef<ProgressoMuroHandle>(null);
  const { utente, caricamento } = useAuth();

  // Carica i preferiti dell'utente (solo da client, dopo il login).
  useEffect(() => {
    if (!utente) {
      setPreferitiIds(new Set());
      return;
    }
    let attivo = true;
    idPreferiti(utente.id)
      .then((ids) => {
        if (attivo) setPreferitiIds(ids);
      })
      .catch(() => {
        // Preferiti non caricabili: i cuori restano spenti.
      });
    return () => {
      attivo = false;
    };
  }, [utente]);

  function attacca(nuovo: PostIt) {
    setLista((attuali) => [nuovo, ...attuali]);
    setConteggio((c) => c + 1);
    setEditorAperto(false);
    progressoRef.current?.pensieroAggiunto();
  }

  async function gestisciPreferito(p: PostIt) {
    if (!utente) {
      setToastPreferito("Accedi per salvare i preferiti");
      setTimeout(() => setToastPreferito(null), 2400);
      return;
    }
    try {
      const esito = await alternaPreferito(utente.id, p);
      setPreferitiIds((precedenti) => {
        const nuovi = new Set(precedenti);
        if (esito.preferito) nuovi.add(p.id);
        else nuovi.delete(p.id);
        return nuovi;
      });
      setToastPreferito(esito.preferito ? "❤️ Salvato nei preferiti" : "Rimosso dai preferiti");
      setTimeout(() => setToastPreferito(null), 2400);
    } catch {
      setToastPreferito("Operazione non riuscita, riprova.");
      setTimeout(() => setToastPreferito(null), 2400);
    }
  }

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
        <h1 className="font-scritta text-5xl leading-tight text-amber-100 drop-shadow-md sm:text-6xl">
          {nome}
        </h1>
        <p className="mt-2 text-sm text-stone-300">
          {conteggio === 1
            ? "1 pensiero lasciato"
            : `${conteggio} pensieri lasciati`}
        </p>
        <div className="flex justify-center">
          <SalvaMuroButton luogo={luogo} nome={nome} />
        </div>
        <ProgressoMuro ref={progressoRef} luogo={luogo} />
      </header>

      {!utente && !caricamento && !invitoChiuso && (
        <div className="px-4">
          <div className="relative mx-auto mt-6 w-full max-w-md rounded-lg border border-amber-100/25 bg-stone-900/70 p-5 text-center shadow-xl backdrop-blur-sm">
            <button
              type="button"
              onClick={() => setInvitoChiuso(true)}
              aria-label="Chiudi invito"
              className="absolute right-2 top-2 rounded-full px-2 text-stone-500 transition hover:text-amber-100"
            >
              ✕
            </button>
            <p className="font-scritta text-xl text-amber-100">
              Questo muro è vivo
            </p>
            <p className="mt-2 text-sm leading-relaxed text-stone-300">
              Crea un account gratuito per salvare i muri che visiti, tenere i
              tuoi post-it preferiti e salire di livello. Puoi comunque
              lasciare il tuo pensiero anche senza account.
            </p>
            <Link
              href="/"
              className="mt-4 inline-block rounded-full bg-amber-300 px-6 py-2.5 text-sm font-bold text-stone-900 shadow-lg transition hover:scale-105"
            >
              Crea account gratuito
            </Link>
          </div>
        </div>
      )}

      {fotoUrl && (
        <div className="mx-auto mt-6 w-full max-w-3xl px-4">
          <img
            src={fotoUrl}
            alt={`Foto del muro di ${nome}`}
            className="max-h-[420px] w-full rounded-xl border border-amber-100/20 object-cover shadow-xl"
          />
        </div>
      )}

      {lista.length === 0 ? (
        <p className="mx-auto mt-16 max-w-sm px-6 text-center text-lg text-stone-200">
          Nessun pensiero ancora. Sii il primo.
        </p>
      ) : (
        <section className="mx-auto mt-10 max-w-6xl columns-1 gap-6 px-4 pb-36 sm:columns-2 md:columns-3 lg:columns-4">
          {lista.map((p, i) => (
            <PostItView
              key={p.id}
              postit={p}
              animate={i === 0}
              preferito={preferitiIds.has(p.id)}
              onPreferito={() => gestisciPreferito(p)}
            />
          ))}
        </section>
      )}

      {toastPreferito && (
        <div className="fixed bottom-5 left-4 z-40">
          <span className="rounded-full bg-amber-300 px-4 py-2 text-sm font-bold text-stone-900 shadow-xl">
            {toastPreferito}
          </span>
        </div>
      )}

      <button
        type="button"
        onClick={() => setEditorAperto(true)}
        className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 whitespace-nowrap rounded-full bg-amber-300 px-6 py-3 text-base font-bold text-stone-900 shadow-xl transition hover:scale-105 active:scale-95"
      >
        ✍️ Lascia un pensiero
      </button>

      {editorAperto && (
        <PostItEditor
          luogo={luogo}
          onAttacca={attacca}
          onAnnulla={() => setEditorAperto(false)}
        />
      )}
    </main>
  );
}
