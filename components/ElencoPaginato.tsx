"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useLingua } from "@/lib/i18n";
import PostItView from "@/components/PostIt";
import { caricaMieiPostit } from "@/lib/profili";
import { caricaPreferiti, type Preferito } from "@/lib/preferiti";
import {
  elencoPostitProfilo,
  elencoSalvatiProfilo,
} from "@/app/profilo/[id]/azioni";
import type { PostIt } from "@/lib/postit";

/** Quanti post-it per pagina nelle schermate dedicate. */
export const PER_PAGINA = 10;

/** Massimo numero di post-it caricati in una volta nella schermata dedicata. */
const LIMITE_ELENCO = 500;

/** I preferiti sono uno snapshot del post-it: bastano i campi per disegnarlo. */
function preferitoInPostit(p: Preferito): PostIt {
  return {
    id: p.id,
    testo: p.testo,
    nickname: p.nickname,
    luogo: p.luogo,
    creato_il: p.creato_il,
  };
}

/**
 * Schermata dedicata e PAGINATA (10 per pagina) con frecce avanti/indietro,
 * per non trasformare gli elenchi lunghi in uno scorrimento infinito.
 *
 * Comportamento per tipo di elenco:
 *   - "postit": i pensieri lasciati dall'utente;
 *   - "salvati": i post-it che l'utente ha salvato (preferiti).
 *
 * Per il PROPRIETARIO l'elenco arriva dal client autenticato (vede sempre i
 * propri, anche se ha spento la bacheca pubblica). Per un visitatore passiamo
 * dalle server action, che rispettano gli interruttori di privacy.
 */
export default function ElencoPaginato({
  utenteId,
  tipo,
  nickname,
}: {
  utenteId: string;
  tipo: "postit" | "salvati";
  nickname: string;
}) {
  const { t } = useLingua();
  const { utente } = useAuth();

  const [elementi, setElementi] = useState<PostIt[]>([]);
  const [caricando, setCaricando] = useState(true);
  const [pagina, setPagina] = useState(0);

  const proprietario = !!utente && utente.id === utenteId;

  useEffect(() => {
    let attivo = true;
    setCaricando(true);
    setPagina(0);

    async function carica() {
      try {
        let lista: PostIt[];
        if (tipo === "postit") {
          lista = proprietario
            ? await caricaMieiPostit(LIMITE_ELENCO)
            : await elencoPostitProfilo(utenteId);
        } else {
          lista = proprietario
            ? (await caricaPreferiti(utenteId)).map(preferitoInPostit)
            : (await elencoSalvatiProfilo(utenteId)).map(preferitoInPostit);
        }
        if (attivo) setElementi(lista);
      } catch {
        if (attivo) setElementi([]);
      } finally {
        if (attivo) setCaricando(false);
      }
    }

    carica();
    return () => {
      attivo = false;
    };
  }, [utenteId, tipo, proprietario]);

  const totalePagine = Math.max(1, Math.ceil(elementi.length / PER_PAGINA));
  const paginaCorrente = Math.min(pagina, totalePagine - 1);
  const inizio = paginaCorrente * PER_PAGINA;
  const visibili = elementi.slice(inizio, inizio + PER_PAGINA);

  const titolo =
    tipo === "postit"
      ? proprietario
        ? t("impost.mieiPostit")
        : t("profilo.elencoMiei", { nome: nickname })
      : proprietario
        ? t("profilo.salvatiTitolo")
        : t("profilo.elencoSalvati", { nome: nickname });

  return (
    <section className="mx-auto w-full max-w-2xl px-4 pb-24 pt-24">
      <Link
        href={`/profilo/${utenteId}`}
        className="scritta-sistema-cornice px-3 py-1 text-xs"
      >
        {t("profilo.tornaAlProfilo")}
      </Link>

      <h1 className="scritta-sistema mt-4 font-scritta text-3xl leading-tight">
        {titolo}
      </h1>

      {caricando ? (
        <p className="scritta-sistema mt-10 text-center">{t("comune.carico")}</p>
      ) : elementi.length === 0 ? (
        <p className="scritta-sistema mt-10 text-center">
          {t("profilo.nienteDaMostrare")}
        </p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-3 items-start gap-2.5 sm:gap-3">
            {visibili.map((p) => (
              <PostItView key={p.id} postit={p} />
            ))}
          </div>

          {totalePagine > 1 && (
            <nav className="mt-8 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setPagina((n) => Math.max(0, n - 1))}
                disabled={paginaCorrente === 0}
                className="scritta-sistema-cornice px-4 py-2 text-sm transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
              >
                ← {t("profilo.prec")}
              </button>
              <span className="scritta-sistema text-xs">
                {t("profilo.pagina", {
                  n: paginaCorrente + 1,
                  t: totalePagine,
                })}
              </span>
              <button
                type="button"
                onClick={() =>
                  setPagina((n) => Math.min(totalePagine - 1, n + 1))
                }
                disabled={paginaCorrente >= totalePagine - 1}
                className="scritta-sistema-cornice px-4 py-2 text-sm transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
              >
                {t("profilo.succ")} →
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
