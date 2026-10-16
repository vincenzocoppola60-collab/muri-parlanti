"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as PointerEventDiReact,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useLingua } from "@/lib/i18n";
import { EVENTO_MURO, urlMuroFirmato } from "@/lib/muriUtente";
import PostItView from "@/components/PostIt";
import type { PostIt } from "@/lib/postit";

/**
 * MURO ESPLORABILE — la parete del profilo come superficie spaziale continua.
 *
 * La parete virtuale e' un telo 720x1280 (le stesse dimensioni della tela
 * dell'EditorMuro, cosi' i disegni salvati restano coerenti) che si sposta e
 * si ingrandisce tutta intera: una "camera" {x, y, s} pilota un'unica
 * trasformazione CSS su .muro-superficie, quindi niente salti ne'
 * riposizionamenti improvvisi durante la navigazione.
 *
 * Comportamento:
 *   - all'apertura la camera e' sulla VISTA PANORAMICA: il muro intero in
 *     vista, con avatar, nome e biografia scritti direttamente sulla parete;
 *   - trascinando si gira per la parete; con due dita (o la rotella) si
 *     ingrandisce e si riduce, restando "aggrappati" al punto toccato;
 *   - le due zone («I miei post-it» e «Post-it salvati») sono zone distinte
 *     della parete: un tocco anima la camera verso la zona con uno zoom
 *     progressivo, dove i fogli diventano leggibili e cliccabili;
 *   - toccando un foglio la camera si centra su di lui; il tasto «←» torna
 *     alla vista di prima, «⛶» alla panoramica (anche il tasto Escape);
 *   - i controlli (+, −, ⛶, ←) e i comandi del proprietario restano FISSI
 *     fuori dalla parete: non si muovono insieme al muro.
 *
 * Da lontano i fogli sono piccoli ma riconoscibili; sotto la soglia di
 * leggibilita' non ricevono clic (un tocco va alla zona), sopra diventano
 * interattivi come ovunque nell'app.
 */

const LARG = 720;
const ALT = 1280;
const ZOOM_MAX = 2.2;
/** Sotto questa scala a schermo il testo non e' leggibile: i fogli restano
    «miniature» non cliccabili e un tocco va alla zona che li contiene. */
const SOGLIA_LEGGIBILE = 0.85;
/** Larghezza di un foglio appeso alla parete (coordinate mondo). */
const LARGFOGLIO = 132;

type Camera = { x: number; y: number; s: number };

export type ZonaMuro = {
  chiave: "miei" | "salvati";
  titolo: string;
  postit: PostIt[];
  totale: number;
  href: string;
  vuoto: string;
  salvati?: boolean;
};

type Rett = { x: number; y: number; w: number; h: number };
type Slot = { x: number; y: number; rot: number; cx: number; cy: number };

/** Le due zone SULLA PARETE, in coordinate mondo 720x1280: una in alto a
    sinistra, l'altra in basso a destra — spazio in mezzo e margini naturali,
    niente griglie rigide ne' sequenze verticali. */
const RETT_ZONA: Record<ZonaMuro["chiave"], Rett> = {
  miei: { x: 34, y: 372, w: 392, h: 440 },
  salvati: { x: 294, y: 846, w: 392, h: 400 },
};

/** Hash deterministico dell'id: lo stesso «casuale» a ogni render e per tutti. */
function hashId(id: string): number {
  let h = 5381;
  for (let i = 0; i < id.length; i++) {
    h = Math.imul(h ^ id.charCodeAt(i), 2654435761);
  }
  return h >>> 0;
}

/** Posizione di un foglio nella zona: due colonne irregolari con scarti
    pseudocasuali (sempre gli stessi per lo stesso post-it) e rotazioni
    leggere, come fogli appesi a mano uno alla volta. */
function slotDi(id: string, indice: number, r: Rett): Slot {
  const h = hashId(id);
  const jx = (h % 52) - 26;
  const jy = ((h >>> 7) % 44) - 22;
  const rot = ((h >>> 14) % 7) - 3;
  const x = r.x + 14 + (indice % 2) * 150 + jx;
  const y = r.y + 62 + Math.floor(indice / 2) * 158 + jy;
  return { x, y, rot, cx: x + LARGFOGLIO / 2, cy: y + 84 };
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
  /** Solo proprietario: tasto «Modifica profilo» (e «Aggiungi bio») scritti
      sulla parete sotto l'avatar. */
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

  /* ── Schermo e camera ──────────────────────────────────────────────── */
  const [schermo, setSchermo] = useState<{ w: number; h: number } | null>(
    null
  );
  const [cam, setCamStato] = useState<Camera | null>(null);
  const camRef = useRef<Camera | null>(null);
  const [precedente, setPrecedente] = useState<Camera | null>(null);
  const precedenteRef = useRef<Camera | null>(null);
  const [interagendo, setInteragendo] = useState(false);
  const vistaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const misura = () =>
      setSchermo({ w: window.innerWidth, h: window.innerHeight });
    misura();
    window.addEventListener("resize", misura);
    return () => window.removeEventListener("resize", misura);
  }, []);

  /** Zoom minimo: la vista iniziale che fa vedere il muro intero. */
  function zoomMinimo(): number {
    if (!schermo) return 0.4;
    return Math.min(schermo.w / LARG, schermo.h / ALT) * 0.95;
  }

  /** Vista panoramica: muro intero centrato nello schermo. */
  function vistaIniziale(): Camera {
    const z = zoomMinimo();
    if (!schermo) return { x: 0, y: 0, s: z };
    return {
      s: z,
      x: (schermo.w - LARG * z) / 2,
      y: (schermo.h - ALT * z) / 2,
    };
  }

  /** Limiti di manovra: lo zoom sta tra la panoramica e il massimo e la
      parete non scappa mai fuori dallo schermo (al piu' un margine di bordo). */
  function blocca(c: Camera): Camera {
    if (!schermo) return c;
    const z = Math.min(ZOOM_MAX, Math.max(zoomMinimo(), c.s));
    const margine = 90;
    const xLo = Math.min(margine, schermo.w - LARG * z - margine);
    const xHi = Math.max(margine, schermo.w - LARG * z - margine);
    const yLo = Math.min(margine, schermo.h - ALT * z - margine);
    const yHi = Math.max(margine, schermo.h - ALT * z - margine);
    return {
      s: z,
      x: Math.min(xHi, Math.max(xLo, c.x)),
      y: Math.min(yHi, Math.max(yLo, c.y)),
    };
  }

  /** Unico punto di passaggio di ogni movimento di camera: cosi' il rifless
      in camRef e' sempre allineato e le gesture non leggono valori vecchi. */
  function applica(c: Camera) {
    const b = blocca(c);
    camRef.current = b;
    setCamStato(b);
  }

  /** Zoom su un punto dello schermo (rotella o pizzico): il punto di mondo
      sotto il dito/cursore resta fermo mentre la scala cambia. */
  function zoomA(fattore: number, px: number, py: number) {
    const c = camRef.current;
    if (!c) return;
    const z = Math.min(ZOOM_MAX, Math.max(zoomMinimo(), c.s * fattore));
    const wx = (px - c.x) / c.s;
    const wy = (py - c.y) / c.s;
    applica({ s: z, x: px - wx * z, y: py - wy * z });
  }

  /* ── Gesture: trascinare, pizzicare, rotella ──────────────────────────
     Il pointerdown arriva dal contenitore (bubbling, quindi funzionano
     anche i tocchi sui fogli); move/up restano sulla finestra per continuare
     a trascinare anche fuori. Niente setPointerCapture: non devia i click
     ai bottoni dentro i post-it. */
  const puntatori = useRef(new Map<number, { x: number; y: number }>());
  const gesto = useRef({
    pinz: 0,
    pinzCx: 0,
    pinzCy: 0,
    mossa: 0,
    ultimo: { x: 0, y: 0 },
  });

  function alGiu(e: PointerEventDiReact<HTMLDivElement>) {
    puntatori.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (puntatori.current.size === 1) {
      gesto.current.mossa = 0;
      gesto.current.ultimo = { x: e.clientX, y: e.clientY };
      gesto.current.pinz = 0;
      setInteragendo(true);
    } else if (puntatori.current.size === 2) {
      const [a, b] = [...puntatori.current.values()];
      gesto.current.pinz = Math.hypot(a.x - b.x, a.y - b.y);
      gesto.current.pinzCx = (a.x + b.x) / 2;
      gesto.current.pinzCy = (a.y + b.y) / 2;
    }
  }

  useEffect(() => {
    if (!schermo) return;

    const alMuovi = (e: PointerEvent) => {
      const p = puntatori.current.get(e.pointerId);
      if (!p) return;
      const nx = e.clientX;
      const ny = e.clientY;
      gesto.current.mossa += Math.hypot(nx - p.x, ny - p.y);
      puntatori.current.set(e.pointerId, { x: nx, y: ny });

      const c = camRef.current;
      if (!c) return;

      if (puntatori.current.size === 1) {
        // Trascinamento: la parete segue il dito, pixel per pixel.
        const dx = nx - gesto.current.ultimo.x;
        const dy = ny - gesto.current.ultimo.y;
        gesto.current.ultimo = { x: nx, y: ny };
        applica({ ...c, x: c.x + dx, y: c.y + dy });
      } else if (puntatori.current.size >= 2) {
        // Pizzico: scala attorno al punto medio, che segue anche le dita.
        const [a, b] = [...puntatori.current.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const cx = (a.x + b.x) / 2;
        const cy = (a.y + b.y) / 2;
        const prima = gesto.current.pinz || dist;
        const pcx = gesto.current.pinzCx || cx;
        const pcy = gesto.current.pinzCy || cy;
        gesto.current.pinz = dist;
        gesto.current.pinzCx = cx;
        gesto.current.pinzCy = cy;
        if (dist > 0 && prima > 0) {
          const z = Math.min(
            ZOOM_MAX,
            Math.max(zoomMinimo(), c.s * (dist / prima))
          );
          const wx = (pcx - c.x) / c.s;
          const wy = (pcy - c.y) / c.s;
          applica({
            s: z,
            x: cx - wx * z + (cx - pcx),
            y: cy - wy * z + (cy - pcy),
          });
        }
      }
    };

    const alSu = (e: PointerEvent) => {
      puntatori.current.delete(e.pointerId);
      if (puntatori.current.size === 1) {
        // Da pizzico a trascinamento: si riparte dal dito restante.
        const [r] = [...puntatori.current.values()];
        gesto.current.ultimo = { x: r.x, y: r.y };
        gesto.current.pinz = 0;
      } else if (puntatori.current.size === 0) {
        setInteragendo(false);
      }
    };

    const alRotella = (e: WheelEvent) => {
      e.preventDefault();
      zoomA(Math.exp(-e.deltaY * 0.0016), e.clientX, e.clientY);
    };

    const el = vistaRef.current;
    el?.addEventListener("wheel", alRotella, { passive: false });
    window.addEventListener("pointermove", alMuovi);
    window.addEventListener("pointerup", alSu);
    window.addEventListener("pointercancel", alSu);
    return () => {
      el?.removeEventListener("wheel", alRotella);
      window.removeEventListener("pointermove", alMuovi);
      window.removeEventListener("pointerup", alSu);
      window.removeEventListener("pointercancel", alSu);
    };
    // zoomA/applica sono ricalcolate a ogni render: qui basta schermo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schermo]);

  /* ── Navigazione animata: zona, foglio, indietro, panoramica ───────── */
  function salvaPrecedente() {
    const c = camRef.current;
    if (c && !precedenteRef.current) {
      precedenteRef.current = c;
      setPrecedente(c);
    }
  }

  /** Tocco su una zona: zoom progressivo finche' i fogli sono leggibili. */
  function zoomZona(chiave: ZonaMuro["chiave"]) {
    if (!schermo) return;
    const r = RETT_ZONA[chiave];
    const zGrezzo = Math.min(
      (schermo.w * 0.88) / r.w,
      (schermo.h * 0.78) / r.h
    );
    const z = Math.min(ZOOM_MAX, Math.max(1, zGrezzo));
    salvaPrecedente();
    applica({
      s: z,
      x: schermo.w / 2 - (r.x + r.w / 2) * z,
      y: schermo.h / 2 - (r.y + r.h / 2) * z,
    });
  }

  /** Tocco su un foglio (a zoom leggibile): la camera si centra su di lui. */
  function zoomFoglio(slot: Slot) {
    if (!schermo) return;
    salvaPrecedente();
    applica({
      s: 1.5,
      x: schermo.w / 2 - slot.cx * 1.5,
      y: schermo.h / 2 - slot.cy * 1.5,
    });
  }

  function tornaIndietro() {
    const p = precedenteRef.current;
    if (!p) return;
    precedenteRef.current = null;
    setPrecedente(null);
    applica(p);
  }

  function tornaAllaPanoramica() {
    precedenteRef.current = null;
    setPrecedente(null);
    applica(vistaIniziale());
  }

  /* Camera iniziale: appena conosciamo lo schermo, vista panoramica
     (prima del mount la parete resta invisibile: server e client coincidono). */
  useEffect(() => {
    if (!schermo) return;
    applica(camRef.current ?? vistaIniziale());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schermo]);

  /* Escape: torna alla vista intera, come le altre finestre dell'app. */
  const azioni = useRef({ panoramica: () => {} });
  useEffect(() => {
    azioni.current.panoramica = tornaAllaPanoramica;
  });
  useEffect(() => {
    const alTasto = (e: KeyboardEvent) => {
      if (e.key === "Escape") azioni.current.panoramica();
    };
    window.addEventListener("keydown", alTasto);
    return () => window.removeEventListener("keydown", alTasto);
  }, []);

  const leggibile = !!cam && cam.s >= SOGLIA_LEGGIBILE;
  const clsTasto =
    "flex h-11 w-11 items-center justify-center rounded-full border border-amber-100/25 bg-stone-900/70 text-lg text-amber-100 shadow-lg backdrop-blur transition hover:bg-stone-900 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40";

  /** Una zona della parete: insegna con il titolo, fogli sparsi, contatore
      e il collegamento «leggi tutti». Toccando la zona si avvicina la camera. */
  function vistaZona(z: ZonaMuro) {
    const r = RETT_ZONA[z.chiave];
    const fogli = z.postit.slice(0, 6);
    return (
      <div
        key={z.chiave}
        role="button"
        tabIndex={0}
        aria-label={z.titolo}
        onClick={() => {
          if (gesto.current.mossa > 8) return;
          zoomZona(z.chiave);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            zoomZona(z.chiave);
          }
        }}
        className={"muro-zona" + (z.salvati ? " muro-zona-salvati" : "")}
        style={{ left: r.x, top: r.y, width: r.w, height: r.h }}
      >
        <div className="muro-insegna">
          <span className="font-scritta text-lg leading-tight">
            {z.titolo}
            {z.salvati && <span aria-hidden> ❤️</span>}
          </span>
          {z.totale > 0 && (
            <span className="rounded-full bg-stone-900/10 px-2 py-0.5 text-[11px] font-bold">
              {z.totale}
            </span>
          )}
          {z.totale > 0 && (
            <Link
              href={z.href}
              onClick={(e) => e.stopPropagation()}
              className="whitespace-nowrap text-[11px] font-bold underline decoration-amber-700/50 underline-offset-2"
            >
              {t("profilo.leggiTutti")}
            </Link>
          )}
        </div>

        {fogli.length === 0 ? (
          <p className="scritta-sistema absolute left-3 top-16 max-w-[88%] text-sm leading-snug">
            {z.vuoto}
          </p>
        ) : (
          fogli.map((p, i) => {
            const slot = slotDi(p.id, i, r);
            return (
              <div
                key={p.id}
                className="muro-slotto"
                style={
                  {
                    left: slot.x - r.x,
                    top: slot.y - r.y,
                    width: LARGFOGLIO,
                    transform: `rotate(${slot.rot}deg)`,
                    zIndex: i + 2,
                    pointerEvents: leggibile ? "auto" : "none",
                  } as CSSProperties
                }
                onClick={(e) => {
                  if (gesto.current.mossa > 8) return;
                  e.stopPropagation();
                  // Un tocco su un bottone del foglio (cuore, foto, link)
                  // non deve anche spostare la camera.
                  if ((e.target as HTMLElement).closest("button, a")) return;
                  zoomFoglio(slot);
                }}
              >
                <PostItView postit={p} />
              </div>
            );
          })
        )}
      </div>
    );
  }

  const avatarEl = avatar ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={avatar}
      alt={altFoto}
      className="h-24 w-24 rounded-full object-cover shadow-xl ring-2 ring-amber-300/60"
      draggable={false}
    />
  ) : (
    <span className="flex h-24 w-24 items-center justify-center rounded-full bg-amber-300 font-scritta text-4xl font-bold text-stone-900 shadow-xl">
      {iniziale}
    </span>
  );

  return (
    <div
      ref={vistaRef}
      onPointerDown={alGiu}
      className={"muro-vista" + (cam ? "" : " muro-attesa")}
    >
      {/* La parete: un unico telo che la camera sposta e ingrandisce. */}
      <div
        className="muro-superficie"
        style={
          {
            width: LARG,
            height: ALT,
            backgroundImage: `url(${sfondo})`,
            transform: cam
              ? `translate3d(${cam.x}px, ${cam.y}px, 0) scale(${cam.s})`
              : undefined,
            transition: interagendo
              ? "none"
              : "transform 620ms cubic-bezier(0.22, 0.61, 0.36, 1)",
          } as CSSProperties
        }
      >
        {/* Intestazione scritta direttamente sulla parete. */}
        <div className="absolute inset-x-0 top-12 flex flex-col items-center gap-3 px-12 text-center">
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
          <h1 className="scritta-sistema break-words font-scritta text-5xl leading-tight">
            {nickname}
          </h1>
          {bio && (
            <p className="scritta-sistema max-w-[30rem] whitespace-pre-wrap font-scritta text-xl leading-snug">
              {bio}
            </p>
          )}
        </div>

        {zone.map(vistaZona)}

        <p className="muro-suggerimento scritta-sistema text-[13px]">
          {t("muro.suggerimento")}
        </p>
      </div>

      {/* Comandi del proprietario (interruttori privacy): fissi, fuori dal muro. */}
      {comandiFissi && (
        <div className="fixed bottom-[calc(max(1rem,env(safe-area-inset-bottom))+0.25rem)] left-[max(1rem,env(safe-area-inset-left))] z-30 w-60 rounded-2xl border border-amber-100/25 bg-stone-900/75 p-3 shadow-xl backdrop-blur">
          {comandiFissi}
        </div>
      )}

      {/* Controlli di navigazione: fissi, non si muovono con la parete. */}
      <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-30 flex flex-col items-center gap-2">
        {precedente && (
          <button
            type="button"
            onClick={tornaIndietro}
            title={t("muro.tornaIndietro")}
            aria-label={t("muro.tornaIndietro")}
            className={clsTasto}
          >
            ←
          </button>
        )}
        <button
          type="button"
          onClick={tornaAllaPanoramica}
          disabled={!cam}
          title={t("muro.vistaIntera")}
          aria-label={t("muro.vistaIntera")}
          className={clsTasto}
        >
          ⛶
        </button>
        <button
          type="button"
          onClick={() => schermo && zoomA(1.3, schermo.w / 2, schermo.h / 2)}
          disabled={!cam}
          title={t("muro.zoomAvvicina")}
          aria-label={t("muro.zoomAvvicina")}
          className={clsTasto}
        >
          +
        </button>
        <button
          type="button"
          onClick={() =>
            schermo && zoomA(1 / 1.3, schermo.w / 2, schermo.h / 2)
          }
          disabled={!cam}
          title={t("muro.zoomAllontana")}
          aria-label={t("muro.zoomAllontana")}
          className={clsTasto}
        >
          −
        </button>
      </div>
    </div>
  );
}