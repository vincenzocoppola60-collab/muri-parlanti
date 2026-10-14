"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLingua } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import {
  annunciaMuroAggiornato,
  rimuoviMuro,
  salvaMuro,
  urlMuroFirmato,
} from "@/lib/muriUtente";

/**
 * Editor del muro personale.
 *
 * La TELA e' il muro vero dell'app: lo stesso sfondo che l'utente vede dietro
 * le pagine (components/SfondoMuro.tsx + il tema attivo in app/globals.css).
 * Non c'e' nessun "foglio bianco": si disegna direttamente sopra al muro, e la
 * gomma buca il disegno lasciando riaffiorare il muro sotto.
 *
 *   - tema "disegnato"      -> muro-disegno.png (e' lo sfondo di <html>);
 *   - tema predefinito      -> il muro personale gia' salvato, se c'e',
 *                             altrimenti brain.webp.
 *
 * Il disegno e' TENUTO come elenco di tratti (vettoriale): annulla/ripristina
 * tolgono o rimettono l'ultimo tratto e ridisegnano, quindi la cronologia resta
 * leggerissima. Al salvataggio il muro e i tratti vengono uniti in un JPEG
 * opaco, caricato nel bucket privato "muri-utente".
 *
 * Gli strumenti sono distinti: penna (tratto pieno), matita (tratto sottile con
 * grana di grafite), marker/evidenziatore (tratto largo e trasparente),
 * pennello (spessore variabile con la pressione e la velocita'), spray (macchie
 * pseudo-casuali ma riproducibili), gomma e testo (si tocca il muro, si scrive
 * la frase e resta impressa nel disegno).
 *
 * I colori non sono piu' una fila di pallini nella barra: stanno tutti dietro
 * un unico pulsante "Colore", che apre una piccola tavolozza.
 */

/** Dimensioni del piano di lavoro (verticale, come lo schermo di un telefono). */
const LARG = 720;
const ALT = 1280;

/** Gli sfondi veri dell'app. */
const MURO_DISEGNATO = "/images/muro-disegno.png";
const MURO_PREDEFINITO = "/images/brain.webp";

/** Colore di ripiego mentre l'immagine del muro sta caricando. */
const CARTA = "#f7f3ea";

/**
 * Tema attivo letto dal DOM. L'editor viene montato solo nel browser (portale),
 * quindi il valore e' sempre quello dipinto da app/layout.tsx.
 */
function temaDisegnato(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.getAttribute("data-tema") === "disegnato";
}

/** Colori della tavolozza: inchiostro + tinte accese, leggibili sul muro. */
const COLORI = [
  "#1c1917",
  "#ffffff",
  "#dc2626",
  "#ea580c",
  "#f59e0b",
  "#16a34a",
  "#0891b2",
  "#2563eb",
  "#7c3aed",
  "#ec4899",
];

/** Spessori (in pixel del piano di lavoro). */
const SPESSORI = [5, 12, 26, 48];

export type Strumento =
  | "penna"
  | "matita"
  | "pennello"
  | "marker"
  | "spray"
  | "gomma"
  | "testo";

/** Strumenti mostrati nella barra, nell'ordine di apparizione. */
const STRUMENTI: { codice: Strumento; icona: string; chiave: string }[] = [
  { codice: "penna", icona: "🖊️", chiave: "muro.penna" },
  { codice: "matita", icona: "✏️", chiave: "muro.matita" },
  { codice: "pennello", icona: "🖌️", chiave: "muro.pennello" },
  { codice: "marker", icona: "🖍️", chiave: "muro.marker" },
  { codice: "spray", icona: "💨", chiave: "muro.spray" },
  { codice: "gomma", icona: "🧽", chiave: "muro.gomma" },
  { codice: "testo", icona: "🔤", chiave: "muro.testo" },
];

/** Un punto del tratto: posizione + pressione normalizzata (0..1). */
type Punto = { x: number; y: number; p: number };

type Tratto = {
  strumento: Strumento;
  colore: string;
  spessore: number;
  punti: Punto[];
  /** Seme dello spray: serve a ridisegnare sempre le stesse macchie. */
  seme: number;
  /** Solo per lo strumento "testo": la frase scritta sul muro. */
  testo?: string;
  /** Solo per "testo": la grafia usata, memorizzata per un ridisegno esatto. */
  famiglia?: string;
};

/**
 * Generatore pseudo-casuale deterministico (32 bit, esatto).
 * Lo spray viene ridisegnato dalla cronologia: senza un seme fisso le macchie
 * cambierebbero aspetto a ogni ridisegno.
 */
function caso(seme: number, i: number): number {
  let x = (seme ^ Math.imul(i + 1, 2654435761)) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d) >>> 0;
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b) >>> 0;
  x = (x ^ (x >>> 16)) >>> 0;
  return x / 4294967296;
}

/** Traccia il percorso del tratto (curve morbide tra i punti). */
function percorso(ctx: CanvasRenderingContext2D, punti: Punto[]) {
  ctx.beginPath();
  if (punti.length === 1) {
    const p = punti[0];
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + 0.01, p.y);
    return;
  }
  ctx.moveTo(punti[0].x, punti[0].y);
  for (let i = 1; i < punti.length - 1; i++) {
    const mx = (punti[i].x + punti[i + 1].x) / 2;
    const my = (punti[i].y + punti[i + 1].y) / 2;
    ctx.quadraticCurveTo(punti[i].x, punti[i].y, mx, my);
  }
  const ultimo = punti[punti.length - 1];
  ctx.lineTo(ultimo.x, ultimo.y);
}

/** Penna e gomma: tratto pieno a spessore costante. */
function trattoPieno(
  ctx: CanvasRenderingContext2D,
  tr: Tratto,
  gomma: boolean
) {
  ctx.globalCompositeOperation = gomma ? "destination-out" : "source-over";
  ctx.globalAlpha = 1;
  ctx.strokeStyle = tr.colore;
  ctx.fillStyle = tr.colore;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = tr.spessore;
  percorso(ctx, tr.punti);
  ctx.stroke();
}

/** Marker / evidenziatore: tratto largo e traslucido. */
function trattoMarker(ctx: CanvasRenderingContext2D, tr: Tratto) {
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 0.3;
  ctx.strokeStyle = tr.colore;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(8, tr.spessore * 2.1);
  percorso(ctx, tr.punti);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/** Pennello: spessore variabile punto per punto (pressione + velocita'). */
function trattoPennello(ctx: CanvasRenderingContext2D, tr: Tratto) {
  const punti = tr.punti;
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  ctx.fillStyle = tr.colore;

  const larghezza = (p: number) =>
    Math.max(0.7, tr.spessore * (0.12 + 0.88 * p));

  if (punti.length === 1) {
    const p = punti[0];
    ctx.beginPath();
    ctx.arc(p.x, p.y, larghezza(p.p) / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  for (let i = 1; i < punti.length; i++) {
    const a = punti[i - 1];
    const b = punti[i];
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    const passi = Math.max(1, Math.min(8, Math.round(dist / 4)));
    for (let s = 0; s < passi; s++) {
      const t0 = s / passi;
      const t1 = (s + 1) / passi;
      const x0 = a.x + (b.x - a.x) * t0;
      const y0 = a.y + (b.y - a.y) * t0;
      const x1 = a.x + (b.x - a.x) * t1;
      const y1 = a.y + (b.y - a.y) * t1;
      const w0 = larghezza(a.p + (b.p - a.p) * t0) / 2;
      const w1 = larghezza(a.p + (b.p - a.p) * t1) / 2;
      const dx = x1 - x0;
      const dy = y1 - y0;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      ctx.beginPath();
      ctx.moveTo(x0 + nx * w0, y0 + ny * w0);
      ctx.lineTo(x1 + nx * w1, y1 + ny * w1);
      ctx.lineTo(x1 - nx * w1, y1 - ny * w1);
      ctx.lineTo(x0 - nx * w0, y0 - ny * w0);
      ctx.closePath();
      ctx.fill();
    }
  }
}

/** Spray: nuvola di puntini intorno al percorso, riproducibile dal seme. */
function trattoSpray(ctx: CanvasRenderingContext2D, tr: Tratto) {
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = tr.colore;
  const raggio = Math.max(8, tr.spessore * 1.15);
  let ultimo: Punto | null = null;
  let indice = 0;

  for (const p of tr.punti) {
    if (ultimo) {
      const dist = Math.hypot(p.x - ultimo.x, p.y - ultimo.y);
      if (dist < 3) continue;
    }
    ultimo = p;
    const quanti = 9 + Math.round(caso(tr.seme, indice) * 6);
    for (let k = 0; k < quanti; k++) {
      const base = indice * 37 + k * 3;
      const angolo = caso(tr.seme, base) * Math.PI * 2;
      const distanza = Math.sqrt(caso(tr.seme, base + 1)) * raggio;
      ctx.globalAlpha = 0.1 + caso(tr.seme, base + 2) * 0.22;
      ctx.beginPath();
      ctx.arc(
        p.x + Math.cos(angolo) * distanza,
        p.y + Math.sin(angolo) * distanza,
        0.7 + caso(tr.seme, base + 2) * 1.7,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
    indice++;
  }
  ctx.globalAlpha = 1;
}

/**
 * Matita: tratto sottile e duro, con la grana della grafite.
 * Il segno e' piu' leggero della penna e lascia dei puntini di polvere lungo il
 * tracciato; il tutto viene ricalcolato dai punti memorizzati, quindi il
 * ridisegno dalla cronologia produce sempre lo stesso identico segno.
 */
function trattoMatita(ctx: CanvasRenderingContext2D, tr: Tratto) {
  const punti = tr.punti;
  if (!punti.length) return;

  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 0.72;
  ctx.strokeStyle = tr.colore;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(1, tr.spessore * 0.4);
  percorso(ctx, punti);
  ctx.stroke();

  // Grana: puntini sparsi intorno al tracciato, come la polvere di grafite.
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = tr.colore;
  const raggio = Math.max(0.6, tr.spessore * 0.14);
  let indice = 0;
  for (let i = 1; i < punti.length; i++) {
    const a = punti[i - 1];
    const b = punti[i];
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    const passi = Math.max(1, Math.min(5, Math.round(dist / 5)));
    for (let s = 0; s < passi; s++) {
      const t = s / passi;
      const x = a.x + (b.x - a.x) * t;
      const y = a.y + (b.y - a.y) * t;
      for (let k = 0; k < 2; k++) {
        indice++;
        const dx = (caso(tr.seme, indice) - 0.5) * tr.spessore * 0.9;
        const dy = (caso(tr.seme, indice + 9973) - 0.5) * tr.spessore * 0.9;
        ctx.beginPath();
        ctx.arc(
          x + dx,
          y + dy,
          raggio * (0.45 + 0.9 * caso(tr.seme, indice + 19937)),
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    }
  }
  ctx.globalAlpha = 1;
}

/**
 * Testo: la frase scritta sul muro con la grafia dell'app.
 * La posizione del tocco e' l'angolo in alto a sinistra della frase; le righe
 * si scrivono una sotto l'altra e lo spessore scelto diventa la dimensione.
 */
function trattoTesto(ctx: CanvasRenderingContext2D, tr: Tratto) {
  const frase = (tr.testo ?? "").replace(/\s+$/, "");
  const punto = tr.punti[0];
  if (!frase.trim() || !punto) return;

  const dimensione = Math.round(18 + tr.spessore * 1.35);
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  ctx.fillStyle = tr.colore;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = `${dimensione}px ${tr.famiglia || "cursive"}`;

  const passo = dimensione * 1.18;
  frase.split("\n").forEach((riga, i) => {
    ctx.fillText(riga, punto.x, punto.y + i * passo);
  });
}

/** Disegna un singolo tratto sul contesto dato. */
function disegnaTratto(ctx: CanvasRenderingContext2D, tr: Tratto) {
  ctx.save();
  try {
    switch (tr.strumento) {
      case "matita":
        trattoMatita(ctx, tr);
        break;
      case "marker":
        trattoMarker(ctx, tr);
        break;
      case "pennello":
        trattoPennello(ctx, tr);
        break;
      case "spray":
        trattoSpray(ctx, tr);
        break;
      case "gomma":
        trattoPieno(ctx, tr, true);
        break;
      case "testo":
        trattoTesto(ctx, tr);
        break;
      default:
        trattoPieno(ctx, tr, false);
    }
  } finally {
    ctx.restore();
  }
}

export default function EditorMuro({
  onChiudi,
  onSalvato,
}: {
  onChiudi: () => void;
  onSalvato?: () => void;
}) {
  const { t } = useLingua();
  const { utente } = useAuth();

  const baseRef = useRef<HTMLCanvasElement | null>(null);
  const pinRef = useRef<HTMLCanvasElement | null>(null);
  const muroRef = useRef<HTMLImageElement | null>(null);
  const correnteRef = useRef<Tratto | null>(null);
  const disegnandoRef = useRef(false);
  const frameRef = useRef<number | null>(null);
  const semeRef = useRef(7919);
  const areaRef = useRef<HTMLDivElement | null>(null);
  const corniceRef = useRef<HTMLDivElement | null>(null);
  /** Nodo nascosto con la grafia "scritta": serve a leggere il font del canvas. */
  const fontRef = useRef<HTMLSpanElement | null>(null);
  const testoInputRef = useRef<HTMLInputElement | null>(null);

  const [strumento, setStrumento] = useState<Strumento>("penna");
  const [colore, setColore] = useState(COLORI[0]);
  const [spessore, setSpessore] = useState(SPESSORI[1]);
  // Tavolozza: tutti i colori dietro un unico pulsante.
  const [tavolozza, setTavolozza] = useState(false);
  // Strumento "testo": punto toccato sul muro + frase in scrittura.
  const [testoPos, setTestoPos] = useState<{ x: number; y: number } | null>(null);
  const [bozzaTesto, setBozzaTesto] = useState("");
  // Cronologia: ogni voce e' l'elenco completo dei tratti in quel momento.
  const [cronologia, setCronologia] = useState<Tratto[][]>([[]]);
  const [pos, setPos] = useState(0);
  const tratti = useMemo(() => cronologia[pos] ?? [], [cronologia, pos]);

  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [avviso, setAvviso] = useState<string | null>(null);

  const puoiAnnullare = pos > 0;
  const puoiRipristinare = pos < cronologia.length - 1;
  const gomma = strumento === "gomma";

  // ── disegno dei livelli ───────────────────────────────────────────────
  /** Livello di fondo: il muro vero, disegnato in "cover" come fa l'app. */
  const disegnaBase = useCallback(() => {
    const ctx = baseRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, LARG, ALT);
    const img = muroRef.current;
    if (img && img.width && img.height) {
      const scala = Math.max(LARG / img.width, ALT / img.height);
      const w = img.width * scala;
      const h = img.height * scala;
      ctx.drawImage(img, (LARG - w) / 2, (ALT - h) / 2, w, h);
      return;
    }
    ctx.fillStyle = CARTA;
    ctx.fillRect(0, 0, LARG, ALT);
  }, []);

  /** Livello dei tratti: trasparente, cosi' la gomma buca davvero. */
  const disegnaTratti = useCallback((elenco: Tratto[]) => {
    const ctx = pinRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, LARG, ALT);
    for (const tr of elenco) disegnaTratto(ctx, tr);
  }, []);

  // Dimensioni dei canvas + primo disegno.
  useEffect(() => {
    for (const cv of [baseRef.current, pinRef.current]) {
      if (cv) {
        cv.width = LARG;
        cv.height = ALT;
      }
    }
    disegnaBase();
    return () => {
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // La tela deve occupare tutto lo spazio libero mantenendo SEMPRE il rapporto
  // 720x1280. Con la sola larghezza/altezza automatica la cornice collassa a
  // 0x0 (i due canvas sono in posizione assoluta e non danno altezza), quindi la
  // misura viene calcolata sull'area disponibile e applicata alla cornice.
  useEffect(() => {
    const area = areaRef.current;
    const cornice = corniceRef.current;
    if (!area || !cornice) return;

    const calcola = () => {
      const stile = getComputedStyle(area);
      const larghezzaArea =
        area.clientWidth -
        parseFloat(stile.paddingLeft) -
        parseFloat(stile.paddingRight);
      const altezzaArea =
        area.clientHeight -
        parseFloat(stile.paddingTop) -
        parseFloat(stile.paddingBottom);
      if (!(larghezzaArea > 0) || !(altezzaArea > 0)) return;
      const larghezza = Math.max(
        1,
        Math.floor(Math.min(larghezzaArea, (altezzaArea * LARG) / ALT))
      );
      const altezza = Math.max(1, Math.floor((larghezza * ALT) / LARG));
      if (
        cornice.style.width === `${larghezza}px` &&
        cornice.style.height === `${altezza}px`
      ) {
        return;
      }
      cornice.style.width = `${larghezza}px`;
      cornice.style.height = `${altezza}px`;
    };

    calcola();
    const osservatore = new ResizeObserver(calcola);
    osservatore.observe(area);
    window.addEventListener("orientationchange", calcola);
    return () => {
      osservatore.disconnect();
      window.removeEventListener("orientationchange", calcola);
    };
  }, []);

  // Ridisegna i tratti quando cambia la cronologia (annulla/ripristina/pulisci).
  // I font "scritta" possono arrivare dopo il primo disegno: appena sono pronti
  // i testi gia' impressi sul muro vengono ridisegnati con la grafia giusta.
  useEffect(() => {
    disegnaTratti(tratti);
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    if (!fonts?.ready) return;
    let attivo = true;
    fonts.ready.then(() => {
      if (attivo) disegnaTratti(tratti);
    });
    return () => {
      attivo = false;
    };
  }, [tratti, disegnaTratti]);

  // Carica il muro da usare come tela:
  //  - tema "disegnato" -> il muro disegnato (lo sfondo di <html>);
  //  - altrimenti       -> il muro personale gia' salvato (se c'e'), poi brain.
  useEffect(() => {
    let attivo = true;

    const carica = (src: string, remoto: boolean) =>
      new Promise<HTMLImageElement>((risolvi, rifiuta) => {
        const img = new Image();
        if (remoto) img.crossOrigin = "anonymous";
        img.onload = () => risolvi(img);
        img.onerror = () => rifiuta(new Error("muro non caricato"));
        img.src = src;
      });

    async function prepara() {
      if (temaDisegnato()) {
        const img = await carica(MURO_DISEGNATO, false);
        if (!attivo) return;
        muroRef.current = img;
        disegnaBase();
        return;
      }

      let url: string | null = null;
      if (utente) {
        url = await urlMuroFirmato(utente.id).catch(() => null);
        if (!attivo) return;
        if (url) {
          const img = await carica(url, true).catch(() => null);
          if (!attivo) return;
          if (img) {
            muroRef.current = img;
            disegnaBase();
            return;
          }
          setAvviso(t("muro.caricamentoFallito"));
        }
      }

      const img = await carica(MURO_PREDEFINITO, false).catch(() => null);
      if (!attivo || !img) return;
      muroRef.current = img;
      disegnaBase();
    }

    prepara().catch(() => {
      if (attivo) setAvviso(t("muro.caricamentoFallito"));
    });

    return () => {
      attivo = false;
    };
  }, [utente, disegnaBase, t]);

  // ── pagina bloccata mentre l'editor e' aperto ─────────────────────────
  // Il lock sta su <html> (classe .editor-aperto in app/globals.css) e lascia
  // comunque scorrere in orizzontale le barre degli strumenti. Si toglie SEMPRE
  // alla chiusura, cosi' la navigazione normale non resta mai bloccata.
  useEffect(() => {
    const radice = document.documentElement;
    radice.classList.add("editor-aperto");
    return () => radice.classList.remove("editor-aperto");
  }, []);

  // La casella di scrittura dello strumento "testo" prende il fuoco appena
  // compare sul muro, cosi' si puo' scrivere subito con la tastiera.
  useEffect(() => {
    if (testoPos) testoInputRef.current?.focus();
  }, [testoPos]);

  // Chiusura con Esc, come ogni finestra modale. Prima pera' si chiudono le
  // finestrelle aperte (casella di scrittura, tavolozza dei colori): l'editor
  // si chiude solo quando non c'e' piu' niente da annullare.
  useEffect(() => {
    const suTasto = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (testoPos) {
        setTestoPos(null);
        setBozzaTesto("");
        return;
      }
      if (tavolozza) {
        setTavolozza(false);
        return;
      }
      onChiudi();
    };
    window.addEventListener("keydown", suTasto);
    return () => window.removeEventListener("keydown", suTasto);
  }, [onChiudi, testoPos, tavolozza]);

  // ── input (touch, mouse e stilo) ──────────────────────────────────────
  /** Da coordinate schermo a coordinate del piano di lavoro. */
  function coordinate(clientX: number, clientY: number): Punto | null {
    const cv = pinRef.current;
    if (!cv) return null;
    const r = cv.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    const x = (clientX - r.left) * (LARG / r.width);
    const y = (clientY - r.top) * (ALT / r.height);
    return { x, y, p: 0.6 };
  }

  /**
   * Pressione del tocco/stilo, corretta dalla velocita': piu' si va veloce,
   * piu' il pennello si assottiglia. Su mouse e dispositivi senza pressione si
   * usa un valore neutro. Il risultato viene MEMORIZZATO nel tratto, cosi' il
   * ridisegno dalla cronologia produce sempre lo stesso segno.
   */
  function pressione(
    nat: PointerEvent,
    precedente: Punto | undefined
  ): number {
    let p: number;
    if (nat.pointerType === "mouse") {
      p = 0.55;
    } else {
      p = nat.pressure > 0 && nat.pressure < 1 ? nat.pressure : 0.6;
    }
    if (precedente) {
      const cv = pinRef.current;
      const r = cv?.getBoundingClientRect();
      const scala = r && r.width ? LARG / r.width : 1;
      const dist =
        Math.hypot(nat.clientX - r!.left - (precedente.x / scala), nat.clientY - r!.top - (precedente.y / scala)) *
        scala;
      const vel = dist / Math.max(6, spessore);
      p *= Math.max(0.35, Math.min(1.15, 1.15 - vel * 0.3));
    }
    return Math.max(0.1, Math.min(1, p));
  }

  /** Aggiunge un punto al tratto in corso (da un evento del puntatore). */
  function aggiungiPunto(nat: PointerEvent) {
    const tr = correnteRef.current;
    if (!tr) return;
    const pos2 = coordinate(nat.clientX, nat.clientY);
    if (!pos2) return;
    const precedente = tr.punti[tr.punti.length - 1];
    tr.punti.push({ x: pos2.x, y: pos2.y, p: pressione(nat, precedente) });
  }

  /**
   * Anteprima del tratto in corso, al massimo una volta per fotogramma.
   * I tratti gia' confermati vengono presi dalla chiusura dell'handler: dentro
   * un singolo tratto la cronologia non cambia, quindi il valore resta esatto.
   */
  function disegnaAnteprima() {
    if (frameRef.current != null) return;
    const confermati = tratti;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      const tr = correnteRef.current;
      if (tr) disegnaTratti([...confermati, tr]);
    });
  }

  /**
   * Grafia del canvas: legge dal DOM la famiglia "scritta" dell'app (la stessa
   * dei titoli), cosi' il testo scritto sul muro usa il font giusto per il tema
   * attivo. Il valore viene memorizzato nel tratto, quindi il ridisegno dalla
   * cronologia resta identico.
   */
  function famigliaScritta(): string {
    const nodo = fontRef.current;
    if (!nodo) return "cursive";
    const f = getComputedStyle(nodo).fontFamily;
    return f && f.trim() ? f : "cursive";
  }

  function inizio(evento: React.PointerEvent<HTMLCanvasElement>) {
    if (!utente) return;
    if (evento.pointerType === "mouse" && evento.button !== 0) return;
    // Blocca subito il gesto: il dito disegna, non scorre e non trascina.
    evento.preventDefault();

    // Strumento "testo": il tocco apre la casella di scrittura in quel punto
    // del muro e non traccia nessun segno finche' la frase non e' confermata.
    if (strumento === "testo") {
      const dove = coordinate(evento.clientX, evento.clientY);
      if (!dove) return;
      setBozzaTesto("");
      setTestoPos({ x: dove.x, y: dove.y });
      return;
    }

    const cv = pinRef.current;
    try {
      cv?.setPointerCapture(evento.pointerId);
    } catch {
      // alcuni browser possono rifiutare la cattura: il disegno funziona lo stesso
    }
    disegnandoRef.current = true;
    semeRef.current = (semeRef.current * 7919 + 13) % 2147483647;
    const nuovo: Tratto = {
      strumento,
      colore: gomma ? "#000000" : colore,
      spessore,
      punti: [],
      seme: semeRef.current,
    };
    correnteRef.current = nuovo;
    aggiungiPunto(evento.nativeEvent);
    disegnaAnteprima();
  }

  function muovi(evento: React.PointerEvent<HTMLCanvasElement>) {
    if (!disegnandoRef.current) return;
    evento.preventDefault();
    const nat = evento.nativeEvent;
    // Eventi raggruppati: il tratto resta fluido anche su schermi lenti.
    const grezzi =
      typeof nat.getCoalescedEvents === "function"
        ? nat.getCoalescedEvents()
        : [];
    if (grezzi.length) {
      for (const g of grezzi) aggiungiPunto(g);
    } else {
      aggiungiPunto(nat);
    }
    disegnaAnteprima();
  }

  function fine(evento: React.PointerEvent<HTMLCanvasElement>) {
    if (!disegnandoRef.current) return;
    disegnandoRef.current = false;
    if (frameRef.current != null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    const tr = correnteRef.current;
    correnteRef.current = null;
    try {
      pinRef.current?.releasePointerCapture(evento.pointerId);
    } catch {
      // il puntatore poteva essere gia' rilasciato
    }
    if (!tr || !tr.punti.length) return;
    const nuove = [...cronologia.slice(0, pos + 1), [...tratti, tr]];
    setCronologia(nuove);
    setPos(nuove.length - 1);
    setMsg(null);
    setAvviso(null);
  }

  /** Conferma la frase in scrittura e la imprime sul muro. */
  function confermaTesto() {
    const dove = testoPos;
    const frase = bozzaTesto.replace(/\s+$/, "");
    setTestoPos(null);
    setBozzaTesto("");
    if (!dove || !frase.trim()) return;
    semeRef.current = (semeRef.current * 7919 + 13) % 2147483647;
    const nuovo: Tratto = {
      strumento: "testo",
      colore,
      spessore,
      punti: [{ x: dove.x, y: dove.y, p: 1 }],
      seme: semeRef.current,
      testo: frase,
      famiglia: famigliaScritta(),
    };
    const nuove = [...cronologia.slice(0, pos + 1), [...tratti, nuovo]];
    setCronologia(nuove);
    setPos(nuove.length - 1);
    setMsg(null);
    setAvviso(null);
  }

  // ── strumenti ─────────────────────────────────────────────────────────
  function annulla() {
    if (puoiAnnullare) setPos((p) => p - 1);
  }
  function ripristina() {
    if (puoiRipristinare) setPos((p) => p + 1);
  }
  function pulisci() {
    if (!tratti.length) return;
    const nuove = [...cronologia.slice(0, pos + 1), []];
    setCronologia(nuove);
    setPos(nuove.length - 1);
  }

  async function esporta(): Promise<Blob | null> {
    const base = baseRef.current;
    const pin = pinRef.current;
    if (!base || !pin) return null;
    const off = document.createElement("canvas");
    off.width = LARG;
    off.height = ALT;
    const ctx = off.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(base, 0, 0);
    ctx.drawImage(pin, 0, 0);
    return new Promise<Blob | null>((risolvi) =>
      off.toBlob((b) => risolvi(b), "image/jpeg", 0.85)
    );
  }

  async function salva() {
    if (salvando || !utente) return;
    setSalvando(true);
    setErr(null);
    setMsg(null);
    const blob = await esporta();
    if (!blob) {
      setSalvando(false);
      setErr(t("muro.errore"));
      return;
    }
    const esito = await salvaMuro(blob);
    setSalvando(false);
    if (esito.ok) {
      setMsg(t("muro.salvato"));
      annunciaMuroAggiornato();
      onSalvato?.();
    } else {
      setErr(esito.errore);
    }
  }

  async function rimuovi() {
    if (salvando || !utente) return;
    setSalvando(true);
    setErr(null);
    setMsg(null);
    const esito = await rimuoviMuro();
    setSalvando(false);
    if (esito.ok) {
      muroRef.current = null;
      setCronologia([[]]);
      setPos(0);
      // Torna il muro predefinito come tela.
      const img = new Image();
      img.onload = () => {
        muroRef.current = img;
        disegnaBase();
      };
      img.src = temaDisegnato() ? MURO_DISEGNATO : MURO_PREDEFINITO;
      disegnaBase();
      setMsg(t("muro.rimosso"));
      annunciaMuroAggiornato();
      onSalvato?.();
    } else {
      setErr(esito.errore);
    }
  }

  const contenuto = (
    <div
      className="fixed inset-0 z-[9998] flex flex-col bg-stone-950/95 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={t("muro.titolo")}
    >
      {/* Barra in alto: i comandi di salvataggio restano SEMPRE visibili. */}
      <div className="flex items-center justify-between gap-2 border-b border-amber-100/15 px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="min-w-0">
          <h2 className="truncate font-scritta text-lg text-amber-100 sm:text-xl">
            {t("muro.titolo")}
          </h2>
          <p className="hidden truncate text-xs text-stone-400 sm:block">
            {t("muro.sottotitolo")}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={salva}
            disabled={salvando || !utente}
            className="rounded-full bg-amber-300 px-3 py-2 text-sm font-bold text-stone-900 shadow-lg transition hover:scale-[1.03] active:scale-95 disabled:opacity-50 sm:px-4"
          >
            {salvando ? t("muro.salvando") : t("muro.salva")}
          </button>
          <button
            type="button"
            onClick={onChiudi}
            aria-label={t("muro.chiudi")}
            className="rounded-full border border-amber-100/25 px-3 py-1.5 text-sm font-semibold text-amber-100 transition hover:bg-stone-900/60"
          >
            {t("muro.chiudi")}
          </button>
        </div>
      </div>

      {(msg || err || avviso) && (
        <p
          className={
            "shrink-0 px-4 py-1.5 text-center text-sm font-semibold " +
            (err ? "text-red-300" : avviso ? "text-amber-200" : "text-green-300")
          }
        >
          {err ?? avviso ?? msg}
        </p>
      )}

      {/* Tela: il muro vero dell'app. Il contenitore NON scorre mai. */}
      <div
        ref={areaRef}
        className="flex min-h-0 flex-1 items-center justify-center p-2 sm:p-3"
      >
        <div
          ref={corniceRef}
          className="relative h-full w-auto max-w-full overflow-hidden rounded-lg shadow-2xl ring-1 ring-stone-700"
          style={{ aspectRatio: `${LARG} / ${ALT}`, maxWidth: "100%" }}
        >
          <canvas ref={baseRef} className="absolute inset-0 h-full w-full" aria-hidden />
          <canvas
            ref={pinRef}
            onPointerDown={inizio}
            onPointerMove={muovi}
            onPointerUp={fine}
            onPointerCancel={fine}
            onLostPointerCapture={fine}
            className="tela-disegno absolute inset-0 h-full w-full"
            style={{
              cursor:
                strumento === "testo" ? "text" : gomma ? "cell" : "crosshair",
            }}
            aria-label={t("muro.tela")}
          />

          {/* Strumento "testo": la casella compare dove si e' toccato il muro.
              La frase non viene impressa finche' non si conferma con ↵ o ✓. */}
          {testoPos && (
            <div
              className="absolute z-10 flex max-w-[calc(100%-0.5rem)] items-center gap-1 rounded-md border border-amber-200/70 bg-stone-900/95 p-1 shadow-2xl"
              style={{
                left: `min(calc(100% - 1px), ${(testoPos.x / LARG) * 100}%)`,
                top: `min(calc(100% - 2.5rem), ${(testoPos.y / ALT) * 100}%)`,
              }}
            >
              <input
                ref={testoInputRef}
                value={bozzaTesto}
                onChange={(e) => setBozzaTesto(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    confermaTesto();
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    e.stopPropagation();
                    setTestoPos(null);
                    setBozzaTesto("");
                  }
                }}
                placeholder={t("muro.scrivi")}
                aria-label={t("muro.testo")}
                className="w-36 min-w-0 bg-transparent px-1 text-sm text-amber-50 placeholder:text-stone-500 focus:outline-none sm:w-56"
              />
              <button
                type="button"
                onClick={confermaTesto}
                aria-label={t("muro.conferma")}
                title={t("muro.conferma")}
                className="shrink-0 rounded px-2 py-0.5 text-sm font-bold text-amber-300 transition hover:bg-stone-800"
              >
                ✓
              </button>
              <button
                type="button"
                onClick={() => {
                  setTestoPos(null);
                  setBozzaTesto("");
                }}
                aria-label={t("muro.chiudi")}
                title={t("muro.chiudi")}
                className="shrink-0 rounded px-2 py-0.5 text-sm text-stone-400 transition hover:bg-stone-800"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Nodo nascosto con la grafia "scritta" dell'app: il canvas legge da
            qui il font con cui imprime le frasi sul muro. */}
        <span ref={fontRef} className="font-scritta hidden" aria-hidden />
      </div>

      {/* Strumenti: barra ancorata in basso, mai sotto il bordo dello schermo. */}
      <div className="shrink-0 border-t border-amber-100/15 bg-stone-900/80 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-3">
        {/* Strumenti di disegno: le righe vanno a capo, cosi' nessun pulsante
            resta fuori dallo schermo nemmeno sui telefoni piu' stretti. */}
        <div className="flex flex-wrap items-center gap-1.5">
          {STRUMENTI.map((s) => {
            const attivo = strumento === s.codice;
            return (
              <button
                key={s.codice}
                type="button"
                onClick={() => {
                  setStrumento(s.codice);
                  // Cambiando strumento la casella di scrittura si chiude.
                  if (s.codice !== "testo") setTestoPos(null);
                }}
                disabled={!utente}
                aria-pressed={attivo}
                aria-label={t(s.chiave)}
                className={
                  "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-40 " +
                  (attivo
                    ? "border-amber-300 bg-amber-300 text-stone-900"
                    : "border-stone-600 text-stone-100 hover:border-amber-100/40")
                }
              >
                <span aria-hidden>{s.icona}</span>
                {/* Su schermo stretto resta la sola icona: cosi' tutti e sette
                    gli strumenti stanno in una riga, senza scorrimenti. */}
                <span className="hidden sm:inline">{t(s.chiave)}</span>
              </button>
            );
          })}
        </div>

        {/* Spessori + colore + cronologia + rimuovi */}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          {/* Tutti i colori dietro un unico pulsante: apre una piccola tavolozza. */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setTavolozza((v) => !v)}
              disabled={!utente}
              aria-haspopup="true"
              aria-expanded={tavolozza}
              aria-label={t("muro.colore")}
              className="flex h-9 items-center gap-2 rounded-full border border-stone-600 px-3 text-xs font-semibold text-stone-100 transition disabled:opacity-40"
            >
              <span
                aria-hidden
                className={
                  "h-4 w-4 shrink-0 rounded-full border border-stone-400 " +
                  (gomma ? "opacity-60" : "")
                }
                style={{ backgroundColor: colore }}
              />
              {t("muro.colore")}
            </button>

            {tavolozza && (
              <>
                {/* Tocco fuori dalla tavolozza: si chiude senza scegliere. */}
                <button
                  type="button"
                  tabIndex={-1}
                  aria-hidden
                  onClick={() => setTavolozza(false)}
                  className="fixed inset-0 z-0 cursor-default"
                />
                <div
                  role="group"
                  aria-label={t("muro.colore")}
                  className="absolute bottom-full left-0 z-10 mb-2 grid w-44 grid-cols-5 gap-1.5 rounded-xl border border-amber-100/20 bg-stone-900/95 p-2 shadow-2xl"
                >
                  {COLORI.map((c) => {
                    const attivo = colore === c;
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          setColore(c);
                          if (gomma) setStrumento("penna");
                          setTavolozza(false);
                        }}
                        aria-label={t("muro.colore") + " " + c}
                        aria-pressed={attivo}
                        className={
                          "h-7 w-7 rounded-full border-2 transition " +
                          (attivo
                            ? "border-amber-300 scale-110"
                            : "border-stone-600")
                        }
                        style={{ backgroundColor: c }}
                      />
                    );
                  })}
                </div>
              </>
            )}
          </div>
          {SPESSORI.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSpessore(s)}
              disabled={!utente}
              aria-label={t("muro.spessore") + " " + s}
              aria-pressed={spessore === s}
              className={
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition disabled:opacity-40 " +
                (spessore === s ? "border-amber-300" : "border-stone-600")
              }
            >
              <span
                className="rounded-full bg-amber-100"
                style={{
                  width: Math.max(4, Math.min(20, s / 2.2)),
                  height: Math.max(4, Math.min(20, s / 2.2)),
                }}
              />
            </button>
          ))}
          <span className="mx-1 h-6 w-px shrink-0 bg-stone-700" />
          <button
            type="button"
            onClick={annulla}
            disabled={!puoiAnnullare}
            className="shrink-0 rounded-full border border-stone-600 px-3 py-1.5 text-xs font-semibold text-stone-100 transition disabled:opacity-40"
          >
            ↶ {t("muro.annulla")}
          </button>
          <button
            type="button"
            onClick={ripristina}
            disabled={!puoiRipristinare}
            className="shrink-0 rounded-full border border-stone-600 px-3 py-1.5 text-xs font-semibold text-stone-100 transition disabled:opacity-40"
          >
            ↷ {t("muro.ripristina")}
          </button>
          <button
            type="button"
            onClick={pulisci}
            disabled={!tratti.length}
            className="shrink-0 rounded-full border border-stone-600 px-3 py-1.5 text-xs font-semibold text-stone-100 transition disabled:opacity-40"
          >
            {t("muro.pulisci")}
          </button>
          <button
            type="button"
            onClick={rimuovi}
            disabled={salvando || !utente}
            className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold text-stone-300 transition hover:text-red-300 disabled:opacity-40"
          >
            {t("muro.rimuovi")}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(contenuto, document.body);
}
