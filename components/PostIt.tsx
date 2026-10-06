"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import type { PostIt } from "@/lib/postit";
import { formattaData } from "@/lib/formato";
import { useAuth } from "@/lib/auth";
import { useLingua } from "@/lib/i18n";
import { traduciTesto } from "@/lib/traduzione";

const SFONDI = ["/images/1.webp", "/images/3.webp"];

/** Hash deterministico dell'id: stessa rotazione a ogni render e per tutti. */
function hashId(id: string): number {
  let h = 5381;
  for (let i = 0; i < id.length; i++) {
    h = Math.imul(h ^ id.charCodeAt(i), 2654435761);
  }
  return h >>> 0;
}

export default function PostItView({
  postit,
  animate = false,
  preferito = false,
  onPreferito,
}: {
  postit: PostIt;
  animate?: boolean;
  preferito?: boolean;
  onPreferito?: () => void;
}) {
  const h = hashId(postit.id);
  const rot = (h % 9) - 4; // da -4deg a +4deg
  const sfondo = SFONDI[h % SFONDI.length];
  const data = formattaData(postit.creato_il);

  // "Tu" al posto del nickname SOLO per l'autore connesso. Calcolato nel
  // browser dopo il mount: cosi' l'HTML del server (nickname) coincide con
  // il primo render del client e non ci sono divergenze di idratazione.
  const { utente } = useAuth();
  const { t, lingua, traduciPubblici } = useLingua();
  const [montato, setMontato] = useState(false);
  // Teniamo anche la chiave della richiesta: se cambia la lingua (o il testo),
  // una traduzione vecchia viene semplicemente ignorata invece che azzerata.
  const [trad, setTrad] = useState<{ chiave: string; testo: string } | null>(
    null
  );
  const [mostraOriginale, setMostraOriginale] = useState(false);
  useEffect(() => {
    setMontato(true);
  }, []);
  const mio =
    montato && !!utente && postit.user_id != null && postit.user_id === utente.id;

  // Traduzione dei post PUBBLICI (degli altri), solo se l'utente l'ha attivata
  // accanto alla bandiera e la lingua scelta non e' l'italiano. Parte DOPO il
  // mount: il primo render resta identico al server e non ci sono divergenze.
  const chiaveTrad = `${lingua}|${postit.testo}`;
  useEffect(() => {
    if (!montato || !traduciPubblici || lingua === "it" || mio || !postit.testo.trim()) {
      return;
    }
    let attivo = true;
    traduciTesto(postit.testo, lingua).then((esito) => {
      if (!attivo) return;
      setTrad(
        esito.ok && esito.tradotto
          ? { chiave: chiaveTrad, testo: esito.testo }
          : null
      );
    });
    return () => {
      attivo = false;
    };
  }, [montato, traduciPubblici, lingua, mio, postit.testo, chiaveTrad]);

  const tradotto =
    trad && trad.chiave === chiaveTrad ? trad.testo : null;
  const testoMostrato = tradotto && !mostraOriginale ? tradotto : postit.testo;

  return (
    <article
      className={
        "postit relative mb-6 break-inside-avoid rounded-[3px] px-4 pb-3 pt-7 shadow-[0_8px_18px_rgba(0,0,0,0.4)] " +
        (animate ? "animate-attacca" : "animate-comparsa")
      }
      style={
        {
          "--rot": `${rot}deg`,
          backgroundImage: `url(${sfondo})`,
          backgroundSize: "cover",
        } as CSSProperties
      }
    >
      <span
        aria-hidden
        className="nastro absolute -top-3 left-1/2 h-6 w-16 -translate-x-1/2 bg-amber-100/70 shadow-sm backdrop-blur-[1px]"
      />
      {onPreferito && (
        <button
          type="button"
          onClick={onPreferito}
          aria-label={
            preferito ? t("postit.preferitoRimuovi") : t("postit.preferitoAggiungi")
          }
          className="absolute right-2 top-1.5 z-10 rounded-full px-2 py-1 text-lg leading-none transition hover:scale-125 active:scale-90"
        >
          <span aria-hidden>{preferito ? "❤️" : "🤍"}</span>
        </button>
      )}
      <p className="whitespace-pre-wrap break-words text-lg leading-snug text-stone-900">
        {testoMostrato}
      </p>
      {tradotto && (
        <button
          type="button"
          onClick={() => setMostraOriginale((v) => !v)}
          className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-stone-900/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-stone-700 transition hover:bg-stone-900/20"
          title={
            mostraOriginale
              ? t("postit.mostraTraduzione")
              : t("postit.mostraOriginale")
          }
        >
          <span aria-hidden>🌍</span>
          {t("postit.tradotto")}
          <span aria-hidden>·</span>
          {mostraOriginale
            ? t("postit.mostraTraduzione")
            : t("postit.mostraOriginale")}
        </button>
      )}
      {postit.foto_url && (
        <div
          className="mt-2 select-none"
          onContextMenu={(e) => e.preventDefault()}
          style={{ WebkitTouchCallout: "none" }}
        >
          {/* Foto allegata al pensiero: SOLO mostrata. Niente link (non si apre
              in un'altra pagina), niente trascinamento, niente menu "salva
              immagine" (tasto destro / pressione prolungata). */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={postit.foto_url}
            alt={t("postit.fotoAllegata")}
            loading="lazy"
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
            className="pointer-events-none w-full select-none rounded-[3px] border border-stone-900/15 object-cover"
          />
        </div>
      )}
      <footer className="mt-3 flex items-center justify-between gap-2 text-stone-700">
        {mio ? (
          <Link
            href={`/profilo/${postit.user_id}`}
            title={t("postit.tuoPensiero", { nome: postit.nickname })}
            className="flex items-center gap-1.5 font-bold text-stone-900 underline decoration-stone-500 decoration-1 underline-offset-2 transition hover:decoration-stone-900"
          >
            ~ {t("postit.tu")}
            <span className="rounded-full bg-stone-900/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-stone-800">
              {t("postit.tuo")}
            </span>
          </Link>
        ) : postit.user_id ? (
          <Link
            href={`/profilo/${postit.user_id}`}
            title={t("postit.vediProfilo")}
            className="font-semibold underline decoration-stone-400 decoration-1 underline-offset-2 transition hover:decoration-stone-900"
          >
            ~ {postit.nickname}
          </Link>
        ) : (
          <span className="font-semibold">~ {postit.nickname}</span>
        )}
        {data && <time className="text-xs opacity-70">{data}</time>}
      </footer>
    </article>
  );
}
