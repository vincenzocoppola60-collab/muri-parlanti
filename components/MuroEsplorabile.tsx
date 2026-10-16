"use client";

import {
  useEffect,
  useState,
  type CSSProperties,
  type MouseEvent as MouseEventDiReact,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useLingua } from "@/lib/i18n";
import { EVENTO_MURO, urlMuroFirmato } from "@/lib/muriUtente";
import PostItView from "@/components/PostIt";
import { caricaMieiPostit } from "@/lib/profili";
import { caricaPreferiti, type Preferito } from "@/lib/preferiti";
import {
  elencoPostitProfilo,
  elencoSalvatiProfilo,
} from "@/app/profilo/[id]/azioni";
import type { PostIt } from "@/lib/postit";

/**
 * MURO ESPLORABILE — la parete del profilo come ambiente da esplorare.
 *
 * Un unico muro disegnato (lo stesso sfondo dell'editor), SEMPRE contenuto
 * nello schermo: non si trascina e non si zooma a mano. Sopra la parete, nella
 * VISTA PANORAMICA, vivono il profilo (avatar, nome, bio) e due GRUPPI
 * riconoscibili — «I miei post-it» e «Post-it salvati» — come zone fisiche del
 * muro, non come schede di una pagina.
 *
 * Toccando un gruppo la CAMERA si avvicina a quel punto della parete: la stessa
 * parete si ingrandisce fino a mostrare la zona da vicino, e i post-it
 * compaiono come fogli appesi al muro, sfogliabili a PAGINE (2 colonne x 2
 * righe per pagina). Il tasto «←» riporta alla parete completa.
 *
 * Toccando un foglio si apre la lettura del SINGOLO post-it (comportamento
 * esistente: il foglio a grandezza naturale). Chiudendola si torna alla pagina
 * di fogli da cui si era partiti.
 *
 * Il numero di fogli e' quello REALE: la lista completa viene letta quando si
 * entra nel gruppo (lato client per il proprietario, dalle server action per un
 * visitatore che rispetta gli interruttori di privacy), non limitata alle
 * anteprime mostrate nella panoramica.
 */

/** Quante miniature mostrare nella panoramica dentro ogni gruppo. */
const MINI = 4;

/** Quanti fogli per pagina dentro un gruppo (2 colonne x 2 righe). */
const PER_PAGINA = 4;

/** Ingrandimento della parete quando la camera entra in un gruppo. */
const ZOOM_GRUPPO = 2.6;

/** Massimo numero di fogli caricati in una volta (nessun limite artificiale
    sulle pagine: si pagina tutto cio' che l'utente ha davvero). */
const LIMITE_ELENCO = 500;

export type ZonaMuro = {
  chiave: "miei" | "salvati";
  titolo: string;
  postit: PostIt[];
  totale: number;
  href: string;
  vuoto: string;
  salvati?: boolean;
};

/**
 * Dove vive ciascun gruppo sulla parete, in frazioni dello schermo: sono le
 * stesse coordinate verso cui la camera si avvicina, quindi il gruppo e' un
 * punto FISICO della parete e non un elemento di un layout a sezioni.
 *
 * Le coordinate esistono in due varianti, scelte dallo stesso punto di rottura
 * usato dal CSS (.muro-gruppo-miei / .muro-gruppo-salvati, 640px):
 *  - parete LARGA  -> i due gruppi stanno uno a destra e uno a sinistra;
 *  - parete STRETTA -> stanno uno SOPRA l'altro, perche' affiancati su un
 *    telefono le due aree tracciate si sovrapporrebbero (misurato: su 390px
 *    l'area «salvati» invadeva quella «miei» di 82px e usciva dallo schermo).
 */
const PUNTO_GRUPPO: Record<ZonaMuro["chiave"], { fx: number; fy: number }> = {
  miei: { fx: 0.32, fy: 0.64 },
  salvati: { fx: 0.68, fy: 0.64 },
};

/** Variante per parete stretta: due gruppi impilati, nessuna sovrapposizione. */
const PUNTO_GRUPPO_STRETTO: Record<
  ZonaMuro["chiave"],
  { fx: number; fy: number }
> = {
  miei: { fx: 0.5, fy: 0.44 },
  salvati: { fx: 0.5, fy: 0.74 },
};

/** Punto di rottura parete stretta: identico al @media del CSS qui sotto. */
const PARETE_STRETTA = 640;

/** Hash deterministico dell'id: la stessa inclinazione a ogni render. */
function hashId(id: string): number {
  let h = 5381;
  for (let i = 0; i < id.length; i++) {
    h = Math.imul(h ^ id.charCodeAt(i), 2654435761);
  }
  return h >>> 0;
}

/** Inclinazione della miniatura: come un foglio appeso a mano (-4°..4°). */
function inclinazione(id: string): number {
  return (hashId(id) % 9) - 4;
}

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

export default function MuroEsplorabile({
  idMuro,
  nickname,
  bio,
  avatar,
  altFoto,
  onAvatar,
  sottoAvatar,
  zone,
  comandiFissi,
}: {
  idMuro: string;
  nickname: string;
  bio: string | null;
  avatar: string | null;
  altFoto: string;
  /** Solo proprietario: toccare l'avatar apre la scelta della foto. */
  onAvatar?: () => void;
  /** Solo proprietario: tasto «Modifica profilo» (e «Aggiungi bio»). */
  sottoAvatar?: ReactNode;
  zone: ZonaMuro[];
  /** Solo proprietario: interruttori di privacy, resi FISSI fuori dal muro. */
  comandiFissi?: ReactNode;
}) {
  const { t } = useLingua();
  const { utente, caricamento } = useAuth();
  const iniziale = nickname.trim().charAt(0).toUpperCase() || "?";

  /* ── Sfondo del muro: stessa logica di SfondoMuro ─────────────────────
     Al primo render (anche sul server) lo sfondo e' quello predefinito:
     server e client coincidono e non ci sono divergenze di idratazione.
     Dopo il mount si prova l'URL firmato del muro personale, che si
     ricarica da solo quando l'editor salva (EVENTO_MURO). */
  const [versione, setVersione] = useState(0);
  const [caricato, setCaricato] = useState<{
    chiave: string;
    url: string | null;
  } | null>(null);
  const bersaglio = caricamento || !utente ? null : idMuro;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const alCambio = () => setVersione((v) => v + 1);
    window.addEventListener(EVENTO_MURO, alCambio);
    return () => window.removeEventListener(EVENTO_MURO, alCambio);
  }, []);

  useEffect(() => {
    if (!bersaglio) return;
    let attivo = true;
    urlMuroFirmato(bersaglio).then((u) => {
      if (attivo) setCaricato({ chiave: bersaglio, url: u });
    });
    return () => {
      attivo = false;
    };
  }, [bersaglio, versione]);

  const urlMuro =
    bersaglio && caricato?.chiave === bersaglio ? caricato.url : null;
  const sfondo = urlMuro ?? "/images/brain.webp";

  /* ── Schermo, camera, stato della navigazione ──────────────────────── */
  const [schermo, setSchermo] = useState<{ w: number; h: number } | null>(
    null
  );
  const [gruppo, setGruppo] = useState<ZonaMuro | null>(null);
  const [lista, setLista] = useState<PostIt[]>([]);
  const [caricandoLista, setCaricandoLista] = useState(false);
  const [pagina, setPagina] = useState(0);
  const [foglio, setFoglio] = useState<PostIt | null>(null);

  useEffect(() => {
    const misura = () =>
      setSchermo({ w: window.innerWidth, h: window.innerHeight });
    misura();
    window.addEventListener("resize", misura);
    return () => window.removeEventListener("resize", misura);
  }, []);

  const proprietario = !!utente && utente.id === idMuro;

  /* La lista REALE dei fogli del gruppo: caricata solo all'ingresso, cosi'
     la panoramica resta leggera e la paginazione rispetta il totale vero. */
  useEffect(() => {
    if (!gruppo) return;
    let attivo = true;
    setCaricandoLista(true);
    setPagina(0);
    setFoglio(null);

    (async () => {
      try {
        let presi: PostIt[];
        if (gruppo.chiave === "miei") {
          presi = proprietario
            ? await caricaMieiPostit(LIMITE_ELENCO)
            : await elencoPostitProfilo(idMuro);
        } else {
          presi = proprietario
            ? (await caricaPreferiti(idMuro)).map(preferitoInPostit)
            : (await elencoSalvatiProfilo(idMuro)).map(preferitoInPostit);
        }
        // Se il percorso server non espone nulla ma la panoramica mostrava
        // comunque dei fogli, non si resta a mani vuote.
        if (presi.length === 0 && gruppo.postit.length > 0) {
          presi = gruppo.postit;
        }
        if (attivo) setLista(presi);
      } catch {
        if (attivo) setLista(gruppo.postit);
      } finally {
        if (attivo) setCaricandoLista(false);
      }
    })();

    return () => {
      attivo = false;
    };
  }, [gruppo, proprietario, idMuro]);

  function apri(z: ZonaMuro) {
    if (z.postit.length === 0 && z.totale === 0) return;
    setGruppo(z);
  }

  function chiudiGruppo() {
    setFoglio(null);
    setGruppo(null);
  }

  /* Escape: chiude prima la lettura del foglio, poi il gruppo. */
  useEffect(() => {
    if (!gruppo) return;
    const alTasto = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setFoglio((f) => {
        if (f) return null;
        setGruppo(null);
        return null;
      });
    };
    window.addEventListener("keydown", alTasto);
    return () => window.removeEventListener("keydown", alTasto);
  }, [gruppo]);

  /* Con la vista dentro un gruppo la pagina sotto non scorre. */
  useEffect(() => {
    if (!gruppo) return;
    const prima = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prima;
    };
  }, [gruppo]);

  /* ── Camera: la parete intera (scala 1) o avvicinata al gruppo ─────── */
  const punto = gruppo
    ? (schermo && schermo.w < PARETE_STRETTA
        ? PUNTO_GRUPPO_STRETTO
        : PUNTO_GRUPPO)[gruppo.chiave]
    : null;
  let cam = { z: 1, tx: 0, ty: 0 };
  if (punto && schermo) {
    const z = ZOOM_GRUPPO;
    const zx = punto.fx * schermo.w;
    const zy = punto.fy * schermo.h;
    cam = { z, tx: schermo.w / 2 - z * zx, ty: schermo.h / 2 - z * zy };
  }

  const clsTasto =
    "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-amber-100/25 bg-stone-900/70 text-lg text-amber-100 shadow-lg backdrop-blur transition hover:bg-stone-900 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40";
  // `whitespace-nowrap`: su un telefono i comandi di pagina stavano andando a
  // capo su due righe (misurato h=58px, «Pagina 1 di» / «10» spezzato).
  const clsFreccia =
    "scritta-sistema-cornice whitespace-nowrap px-3 py-1.5 text-xs transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 sm:px-4 sm:py-2 sm:text-sm";

  const avatarEl = avatar ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={avatar}
      alt={altFoto}
      className="h-20 w-20 rounded-full object-cover shadow-xl ring-2 ring-amber-300/60 sm:h-24 sm:w-24"
      draggable={false}
    />
  ) : (
    <span className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-300 font-scritta text-3xl font-bold text-stone-900 shadow-xl sm:h-24 sm:w-24 sm:text-4xl">
      {iniziale}
    </span>
  );

  /** Un GRUPPO sulla parete: contorno disegnato a mano, insegna col titolo,
      contatore e le miniature dei fogli appesi dentro. E' un PUNTO del muro. */
  function vistaGruppo(z: ZonaMuro) {
    const mini = z.postit.slice(0, MINI);
    const vuota = mini.length === 0 && z.totale === 0;
    // La posizione viene dal CSS (e non da uno stile in linea) cosi' il @media
    // per la parete stretta puo' impilarli senza essere sovrascritto.
    return (
      <button
        key={z.chiave}
        type="button"
        disabled={vuota}
        aria-label={z.titolo}
        onClick={() => apri(z)}
        className={
          "muro-gruppo " +
          (z.chiave === "miei" ? "muro-zona-miei" : "muro-zona-salvati") +
          (z.salvati ? " muro-gruppo-salvati" : "") +
          (vuota ? " muro-gruppo-vuoto" : "")
        }
      >
        <span className="muro-insegna">
          <span className="font-scritta text-base leading-tight sm:text-lg">
            {z.titolo}
            {z.salvati && <span aria-hidden> ❤️</span>}
          </span>
          {z.totale > 0 && (
            <span className="rounded-full bg-amber-100/15 px-2 py-0.5 text-[11px] font-bold">
              {z.totale}
            </span>
          )}
        </span>

        {vuota ? (
          <span className="scritta-sistema muro-gruppo-vuoto-testo text-sm leading-snug">
            {z.vuoto}
          </span>
        ) : (
          <span className="muro-mini" aria-hidden>
            {mini.map((p) => (
              <span
                key={p.id}
                className="muro-mini-foglio"
                style={
                  { "--rot": `${inclinazione(p.id)}deg` } as CSSProperties
                }
              >
                <PostItView postit={p} />
              </span>
            ))}
          </span>
        )}
      </button>
    );
  }

  const totale = lista.length;
  const totalePagine = Math.max(1, Math.ceil(totale / PER_PAGINA));
  const paginaCorrente = Math.min(pagina, totalePagine - 1);
  const visibili = lista.slice(
    paginaCorrente * PER_PAGINA,
    paginaCorrente * PER_PAGINA + PER_PAGINA
  );

  /** Tocco su un foglio: apre la lettura del singolo post-it. I comandi
      interni al foglio (traduzione, foto) restano cliccabili a parte. */
  function toccaFoglio(e: MouseEventDiReact<HTMLDivElement>, p: PostIt) {
    const t2 = e.target as HTMLElement | null;
    if (t2 && t2.closest("button, a, img")) return;
    setFoglio(p);
  }

  return (
    <div className={"muro-scena" + (gruppo ? " muro-in-esplorazione" : "")}>
      {/* ── Il MONDO: parete + panoramica, mossi insieme dalla camera ──── */}
      <div
        className="muro-livello"
        style={{
          transform: `translate3d(${cam.tx}px, ${cam.ty}px, 0) scale(${cam.z})`,
        }}
      >
        {/* La parete: il disegno originale, sempre contenuto nello schermo. */}
        <div
          className="muro-parete"
          aria-hidden
          style={{ backgroundImage: `url(${sfondo})` }}
        />

        <div
          className={
            "muro-panorama" + (gruppo ? " muro-panorama-indietro" : "")
          }
        >
          {/* Intestazione scritta direttamente sulla parete. */}
          <header className="muro-testa">
            {onAvatar ? (
              <button
                type="button"
                onClick={onAvatar}
                aria-label={altFoto}
                className="transition hover:opacity-80 active:scale-95"
              >
                {avatarEl}
              </button>
            ) : (
              avatarEl
            )}
            {sottoAvatar && (
              <div className="flex flex-col items-center gap-1.5">
                {sottoAvatar}
              </div>
            )}
            <h1 className="scritta-sistema break-words font-scritta text-3xl leading-tight sm:text-5xl">
              {nickname}
            </h1>
            {bio && (
              <p className="scritta-sistema max-w-[30rem] whitespace-pre-wrap font-scritta text-base leading-snug sm:text-xl">
                {bio}
              </p>
            )}
          </header>

          {zone.map(vistaGruppo)}

          <p className="muro-suggerimento scritta-sistema text-[13px]">
            {t("muro.suggerimento")}
          </p>
        </div>
      </div>

      {/* ── La vista del GRUPPO: i fogli appesi al muro, a pagine ──────── */}
      {gruppo && (
        <div
          className="muro-gruppo-vista"
          role="dialog"
          aria-modal="true"
          aria-label={gruppo.titolo}
        >
          <div className="muro-gruppo-testa">
            <button
              type="button"
              onClick={chiudiGruppo}
              title={t("muro.tornaIndietro")}
              aria-label={t("muro.tornaIndietro")}
              className={clsTasto}
            >
              ←
            </button>
            <span className="muro-gruppo-titolo font-scritta text-lg leading-tight">
              {gruppo.titolo}
              {gruppo.salvati && <span aria-hidden> ❤️</span>}
            </span>
            {totale > 0 && (
              <span className="rounded-full bg-amber-100/15 px-2 py-0.5 text-[11px] font-bold">
                {totale}
              </span>
            )}
            {totale > 0 && (
              <Link
                href={gruppo.href}
                onClick={chiudiGruppo}
                className="ml-auto whitespace-nowrap text-[12px] font-bold text-amber-100 underline decoration-amber-300/50 underline-offset-2"
              >
                {t("profilo.leggiTutti")}
              </Link>
            )}
          </div>

          <div className="muro-gruppo-corpo">
            {caricandoLista ? (
              <p className="scritta-sistema text-sm">{t("comune.carico")}</p>
            ) : totale === 0 ? (
              <p className="scritta-sistema max-w-sm text-center text-sm leading-snug">
                {gruppo.vuoto}
              </p>
            ) : (
              <div className="muro-griglia">
                {visibili.map((p) => (
                  <div
                    key={p.id}
                    className="muro-griglia-foglio"
                    role="button"
                    tabIndex={0}
                    aria-label={p.testo.slice(0, 60)}
                    onClick={(e) => toccaFoglio(e, p)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setFoglio(p);
                      }
                    }}
                    style={
                      { "--rot": `${inclinazione(p.id)}deg` } as CSSProperties
                    }
                  >
                    <PostItView postit={p} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {totale > PER_PAGINA && (
            <nav className="muro-gruppo-pagine">
              <button
                type="button"
                onClick={() => setPagina((n) => Math.max(0, n - 1))}
                disabled={paginaCorrente === 0}
                className={clsFreccia}
              >
                ← {t("profilo.prec")}
              </button>
              <span className="scritta-sistema whitespace-nowrap text-xs text-amber-100">
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
                className={clsFreccia}
              >
                {t("profilo.succ")} →
              </button>
            </nav>
          )}
        </div>
      )}

      {/* Comandi del proprietario (interruttori privacy): FISSI, fuori dal muro. */}
      {comandiFissi && (
        <div className="fixed bottom-[calc(max(1rem,env(safe-area-inset-bottom))+0.25rem)] left-[max(1rem,env(safe-area-inset-left))] z-30 w-60 rounded-2xl border border-amber-100/25 bg-stone-900/75 p-3 shadow-xl backdrop-blur">
          {comandiFissi}
        </div>
      )}

      {/* ── Lettura del SINGOLO post-it (comportamento esistente) ──────── */}
      {foglio && (
        <div
          className="muro-lettura"
          role="dialog"
          aria-modal="true"
          aria-label={t("muro.tornaIndietro")}
          onClick={(e) => {
            if (e.target === e.currentTarget) setFoglio(null);
          }}
        >
          <div className="muro-lettura-foglio">
            <PostItView key={foglio.id} postit={foglio} animate />
          </div>
          <button
            type="button"
            onClick={() => setFoglio(null)}
            className={clsFreccia}
          >
            ← {t("muro.tornaIndietro")}
          </button>
        </div>
      )}
    </div>
  );
}
