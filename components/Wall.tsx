"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { PostIt } from "@/lib/postit";
import PostItView from "@/components/PostIt";
import PostItEditor from "@/components/PostItEditor";
import PopupPrimoPensiero from "@/components/PopupPrimoPensiero";
import SalvaMuroButton from "@/components/SalvaMuroButton";
import ProgressoMuro, {
  type ProgressoMuroHandle,
} from "@/components/ProgressoMuro";
import { useAuth } from "@/lib/auth";
import { useLingua } from "@/lib/i18n";
import { alternaPreferito, idPreferiti } from "@/lib/preferiti";
import { suonaClick } from "@/lib/suoni";

/** Segna che l'invito del primo pensiero e' gia' stato mostrato su questo telefono. */
const PRIMO_PENSIERO_KEY = "muri-parlanti:primo-pensiero-mostrato";

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
  const [popupPrimo, setPopupPrimo] = useState(false);
  const progressoRef = useRef<ProgressoMuroHandle>(null);
  const { utente, caricamento } = useAuth();
  const { t } = useLingua();

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

    // Invito UNA SOLA VOLTA, dopo il primo post-it pubblicato (ospite o
    // registrato). Se il browser non ha memoria, semplicemente non compare.
    try {
      if (!window.localStorage.getItem(PRIMO_PENSIERO_KEY)) {
        window.localStorage.setItem(PRIMO_PENSIERO_KEY, "1");
        setPopupPrimo(true);
      }
    } catch {
      // Nessun problema: e' solo un invito.
    }
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
            ? t("muro.pensieroUno")
            : t("muro.pensieri", { n: conteggio })}
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
              aria-label={t("muro.chiudiInvito")}
              className="absolute right-2 top-2 rounded-full px-2 text-stone-500 transition hover:text-amber-100"
            >
              ✕
            </button>
            <p className="font-scritta text-xl text-amber-100">
              {t("muro.invitoTitolo")}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-stone-300">
              {t("muro.invitoTesto")}
            </p>
            <Link
              href="/"
              className="mt-4 inline-block rounded-full bg-amber-300 px-6 py-2.5 text-sm font-bold text-stone-900 shadow-lg transition hover:scale-105"
            >
              {t("muro.invitoCta")}
            </Link>
          </div>
        </div>
      )}

      {fotoUrl && (
        <div className="mx-auto mt-6 w-full max-w-3xl px-4">
          <img
            src={fotoUrl}
            alt={t("muro.fotoMuro", { nome })}
            className="max-h-[420px] w-full rounded-xl border border-amber-100/20 object-cover shadow-xl"
          />
        </div>
      )}

      {lista.length === 0 ? (
        <p className="mx-auto mt-16 max-w-sm px-6 text-center text-lg text-stone-200">
          {t("muro.vuoto")}
        </p>
      ) : (
        /* 2 colonne su telefono, 3 da 'sm' in su: a 3 colonne su un iPhone
           (circa 119px l'una) le schede canzone e le date risultano strette e
           il testo si spezza a meta' parola. Riempimento per RIGHE: il postito
           piu' nuovo (primo della lista) resta in ALTO A SINISTRA. */
        <section className="mx-auto mt-8 grid max-w-3xl grid-cols-2 items-start gap-3 px-4 pb-36 sm:grid-cols-3">
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
        onClick={() => {
          // Suono di "click" quando si tocca "Lascia un pensiero".
          suonaClick();
          setEditorAperto(true);
        }}
        className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 whitespace-nowrap rounded-full bg-amber-300 px-6 py-3 text-base font-bold text-stone-900 shadow-xl transition hover:scale-105 active:scale-95"
      >
        ✍️ {t("muro.lascia")}
      </button>

      {popupPrimo && <PopupPrimoPensiero onChiudi={() => setPopupPrimo(false)} />}

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
