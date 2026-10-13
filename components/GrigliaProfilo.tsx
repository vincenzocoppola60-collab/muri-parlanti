"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useLingua } from "@/lib/i18n";
import PostItView from "@/components/PostIt";
import type { PostIt } from "@/lib/postit";
import { altriPostit } from "@/app/profilo/[id]/azioni";

/**
 * Griglia dei post-it del profilo (3×3, resta 3 colonne anche su telefono).
 *
 * Due accorgimenti per il proprietario dell'account:
 *   - i suoi post-it non compaiono due volte: la griglia pubblica resta
 *     chiusa dietro un pulsante "Anteprima profilo pubblico";
 *   - il conteggio in testa mostra il totale reale, quindi la griglia offre
 *     "mostra altri" finche' non li ha visti tutti.
 *
 * Il visitatore generico vede la griglia aperta come prima.
 */
export default function GrigliaProfilo({
  utenteId,
  postit,
  totale,
}: {
  utenteId: string;
  postit: PostIt[];
  totale: number;
}) {
  const { utente } = useAuth();
  const { t } = useLingua();

  const [lista, setLista] = useState<PostIt[]>(postit);
  const [caricandoAltri, setCaricandoAltri] = useState(false);
  const [aperta, setAperta] = useState(false);

  // Prima del mount l'utente non e' ancora noto: il primo render coincide con
  // quello del server (griglia aperta), poi il proprietario la richiude.
  const proprietario = !!utente && utente.id === utenteId;

  async function mostraAltri() {
    if (caricandoAltri) return;
    setCaricandoAltri(true);
    try {
      const altri = await altriPostit(utenteId, lista.length);
      setLista((attuali) => {
        const visti = new Set(attuali.map((p) => p.id));
        return [...attuali, ...altri.filter((p) => !visti.has(p.id))];
      });
    } catch {
      // Nessuna pagina nuova: la griglia resta com'era.
    }
    setCaricandoAltri(false);
  }

  // Il proprietario ha gia' il pannello di gestione: qui basta il pulsante.
  if (proprietario && !aperta) {
    return (
      <div className="mx-auto mt-10 max-w-md px-4 pb-24">
        <button
          type="button"
          onClick={() => setAperta(true)}
          className="w-full rounded-full border border-amber-100/30 px-4 py-2.5 text-sm font-semibold text-amber-100 transition hover:bg-stone-950/60"
        >
          {t("profilo.anteprimaApri")}
        </button>
      </div>
    );
  }

  return (
    <div className="pb-24">
      {proprietario && (
        <div className="mx-auto mt-10 max-w-md px-4">
          <button
            type="button"
            onClick={() => setAperta(false)}
            className="w-full rounded-full border border-amber-100/25 px-4 py-2 text-xs font-semibold text-stone-300 transition hover:bg-stone-950/60"
          >
            {t("profilo.anteprimaChiudi")}
          </button>
        </div>
      )}

      <section className="mx-auto mt-10 grid max-w-2xl grid-cols-3 items-start gap-2.5 px-4 sm:gap-3">
        {lista.map((p) => (
          <PostItView key={p.id} postit={p} />
        ))}
      </section>

      {lista.length < totale && (
        <div className="mx-auto mt-6 max-w-md px-4 text-center">
          <button
            type="button"
            onClick={mostraAltri}
            disabled={caricandoAltri}
            className="w-full rounded-full border border-amber-100/30 px-4 py-2.5 text-sm font-semibold text-amber-100 transition hover:bg-stone-950/60 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {caricandoAltri ? t("comune.carico") : t("profilo.caricaAltri")}
          </button>
          <p className="mt-2 text-xs text-stone-400">
            {t("profilo.mostrati", { visti: lista.length, totale })}
          </p>
        </div>
      )}
    </div>
  );
}
