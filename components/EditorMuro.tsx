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
 * Un foglio (canvas 720x1280) su cui si disegna con pennelli di vari colori e
 * spessori, una gomma, annulla/ripristina e "pulisci". Il disegno e' salvato
 * come elenco di tratti (vettoriale): l'annulla non e' un'immagine di scarto ma
 * toglie l'ultimo tratto e ridisegna, quindi la cronologia resta leggerissima.
 *
 * Il foglio di lavoro e' TRASPARENTE, cosi' la gomma buca davvero il disegno;
 * il colore di fondo e un'eventuale immagine precedente stanno su un canvas
 * separato (sotto). Al salvataggio i due livelli vengono uniti in un JPEG
 * opaco, caricato nel bucket privato "muri-utente".
 */

const LARG = 720;
const ALT = 1280;

/** Colori del pennello: inchiostro + tinte accese su foglio chiaro. */
const COLORI = [
  "#1c1917",
  "#ffffff",
  "#dc2626",
  "#2563eb",
  "#16a34a",
  "#f59e0b",
  "#7c3aed",
  "#ec4899",
];

const SPESSORI = [6, 14, 26, 46];

/** Colori del foglio. */
const FOGLI = ["#f7f3ea", "#ffffff", "#fef3c7"];

type Punto = { x: number; y: number };
type Tratto = {
  colore: string;
  spessore: number;
  gomma: boolean;
  punti: Punto[];
};

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
  const immagineRef = useRef<HTMLImageElement | null>(null);
  const correnteRef = useRef<Tratto | null>(null);
  const disegnandoRef = useRef(false);

  const [colore, setColore] = useState(COLORI[0]);
  const [spessore, setSpessore] = useState(SPESSORI[1]);
  const [gomma, setGomma] = useState(false);
  const [foglio, setFoglio] = useState(FOGLI[0]);

  // Cronologia: ogni voce e' l'elenco completo dei tratti in quel momento.
  const [cronologia, setCronologia] = useState<Tratto[][]>([[]]);
  const [pos, setPos] = useState(0);
  // Elenco dei tratti "adesso": memorizzato, cosi' l'effetto che ridisegna
  // dipende da un valore stabile e non da un array nuovo a ogni render.
  const tratti = useMemo(() => cronologia[pos] ?? [], [cronologia, pos]);

  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [avviso, setAvviso] = useState<string | null>(null);

  const puoiAnnullare = pos > 0;
  const puoiRipristinare = pos < cronologia.length - 1;

  // ── disegno dei livelli ───────────────────────────────────────────────
  const disegnaBase = useCallback(() => {
    const cv = baseRef.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    ctx.clearRect(0, 0, LARG, ALT);
    ctx.fillStyle = foglio;
    ctx.fillRect(0, 0, LARG, ALT);
    const img = immagineRef.current;
    if (img) {
      const scala = Math.max(LARG / img.width, ALT / img.height);
      const w = img.width * scala;
      const h = img.height * scala;
      ctx.drawImage(img, (LARG - w) / 2, (ALT - h) / 2, w, h);
    }
  }, [foglio]);

  const disegnaTratti = useCallback((elenco: Tratto[]) => {
    const cv = pinRef.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    ctx.clearRect(0, 0, LARG, ALT);
    for (const tr of elenco) {
      ctx.save();
      ctx.globalCompositeOperation = tr.gomma ? "destination-out" : "source-over";
      ctx.strokeStyle = tr.colore;
      ctx.fillStyle = tr.colore;
      ctx.lineWidth = tr.spessore;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      if (tr.punti.length === 1) {
        ctx.beginPath();
        ctx.arc(tr.punti[0].x, tr.punti[0].y, tr.spessore / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(tr.punti[0].x, tr.punti[0].y);
        for (let i = 1; i < tr.punti.length; i++) {
          ctx.lineTo(tr.punti[i].x, tr.punti[i].y);
        }
        ctx.stroke();
      }
      ctx.restore();
    }
  }, []);

  // Ridisegna il livello dei tratti quando cambia la cronologia/posizione.
  useEffect(() => {
    disegnaTratti(tratti);
  }, [tratti, disegnaTratti]);

  useEffect(() => {
    disegnaBase();
  }, [disegnaBase]);

  // Prepara i canvas e carica un eventuale muro gia' esistente.
  useEffect(() => {
    const base = baseRef.current;
    const pin = pinRef.current;
    if (base) {
      base.width = LARG;
      base.height = ALT;
    }
    if (pin) {
      pin.width = LARG;
      pin.height = ALT;
    }
    disegnaBase();
    disegnaTratti(tratti);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!utente) return;
    let attivo = true;
    urlMuroFirmato(utente.id).then((u) => {
      if (!attivo || !u) return;
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        if (!attivo) return;
        immagineRef.current = img;
        disegnaBase();
      };
      img.onerror = () => {
        if (!attivo) return;
        setAvviso(t("muro.caricamentoFallito"));
      };
      img.src = u;
    });
    return () => {
      attivo = false;
    };
  }, [utente, disegnaBase, t]);

  // ── input ─────────────────────────────────────────────────────────────
  function coordinate(evento: React.PointerEvent<HTMLCanvasElement>): Punto | null {
    const cv = pinRef.current;
    if (!cv) return null;
    const r = cv.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    return {
      x: (evento.clientX - r.left) * (LARG / r.width),
      y: (evento.clientY - r.top) * (ALT / r.height),
    };
  }

  function inizio(evento: React.PointerEvent<HTMLCanvasElement>) {
    if (!utente) return;
    evento.preventDefault();
    const punto = coordinate(evento);
    if (!punto) return;
    const cv = pinRef.current;
    cv?.setPointerCapture(evento.pointerId);
    disegnandoRef.current = true;
    const nuovo: Tratto = {
      colore: gomma ? "#000000" : colore,
      spessore,
      gomma,
      punti: [punto],
    };
    correnteRef.current = nuovo;
    disegnaTratti([...tratti, nuovo]);
  }

  function muovi(evento: React.PointerEvent<HTMLCanvasElement>) {
    if (!disegnandoRef.current) return;
    const tr = correnteRef.current;
    const punto = coordinate(evento);
    if (!tr || !punto) return;
    evento.preventDefault();
    tr.punti.push(punto);
    disegnaTratti([...tratti, tr]);
  }

  function fine(evento: React.PointerEvent<HTMLCanvasElement>) {
    if (!disegnandoRef.current) return;
    disegnandoRef.current = false;
    const tr = correnteRef.current;
    correnteRef.current = null;
    try {
      pinRef.current?.releasePointerCapture(evento.pointerId);
    } catch {
      // il puntatore poteva essere gia' rilasciato
    }
    if (!tr) return;
    const nuove = [...cronologia.slice(0, pos + 1), [...tratti, tr]];
    setCronologia(nuove);
    setPos(nuove.length - 1);
    setMsg(null);
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

  function scegliFoglio(c: string) {
    setFoglio(c);
    // Scegliere un foglio nuovo azzera il disegno precedente come immagine:
    // altrimenti coprirebbe il colore appena scelto.
    immagineRef.current = null;
    setAvviso(null);
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
    if (salvando) return;
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
    if (salvando) return;
    setSalvando(true);
    setErr(null);
    setMsg(null);
    const esito = await rimuoviMuro();
    setSalvando(false);
    if (esito.ok) {
      immagineRef.current = null;
      setCronologia([[]]);
      setPos(0);
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
      {/* Barra in alto */}
      <div className="flex items-center justify-between gap-3 border-b border-amber-100/15 px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate font-scritta text-xl text-amber-100">
            {t("muro.titolo")}
          </h2>
          <p className="truncate text-xs text-stone-400">{t("muro.sottotitolo")}</p>
        </div>
        <button
          type="button"
          onClick={onChiudi}
          aria-label={t("muro.chiudi")}
          className="shrink-0 rounded-full border border-amber-100/25 px-3 py-1.5 text-sm font-semibold text-amber-100 transition hover:bg-stone-900/60"
        >
          {t("muro.chiudi")}
        </button>
      </div>

      {/* Tela */}
      <div className="flex min-h-0 flex-1 items-center justify-center p-3">
        <div
          className="relative max-h-full w-auto overflow-hidden rounded-lg shadow-2xl ring-1 ring-stone-700"
          style={{ aspectRatio: `${LARG} / ${ALT}`, maxWidth: "100%" }}
        >
          <canvas
            ref={baseRef}
            className="absolute inset-0 h-full w-full"
            aria-hidden
          />
          <canvas
            ref={pinRef}
            onPointerDown={inizio}
            onPointerMove={muovi}
            onPointerUp={fine}
            onPointerCancel={fine}
            onPointerLeave={fine}
            className="absolute inset-0 h-full w-full touch-none"
            style={{ cursor: gomma ? "cell" : "crosshair" }}
            aria-label={t("muro.tela")}
          />
        </div>
      </div>

      {(msg || err || avviso) && (
        <p
          className={
            "px-4 py-1.5 text-center text-sm font-semibold " +
            (err ? "text-red-300" : avviso ? "text-amber-200" : "text-green-300")
          }
        >
          {err ?? avviso ?? msg}
        </p>
      )}

      {/* Strumenti */}
      <div className="border-t border-amber-100/15 bg-stone-900/70 px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {/* Colori */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5">
          {COLORI.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                setColore(c);
                setGomma(false);
              }}
              aria-label={t("muro.colore") + " " + c}
              aria-pressed={!gomma && colore === c}
              className={
                "h-8 w-8 shrink-0 rounded-full border-2 transition " +
                (!gomma && colore === c
                  ? "border-amber-300 scale-110"
                  : "border-stone-600")
              }
              style={{ backgroundColor: c }}
            />
          ))}
          <button
            type="button"
            onClick={() => setGomma((g) => !g)}
            aria-pressed={gomma}
            className={
              "ml-1 shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition " +
              (gomma
                ? "border-amber-300 bg-amber-300 text-stone-900"
                : "border-stone-600 text-stone-200")
            }
          >
            {t("muro.gomma")}
          </button>
        </div>

        {/* Spessori + cronologia */}
        <div className="flex items-center gap-2 pt-1.5">
          {SPESSORI.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSpessore(s)}
              aria-label={t("muro.spessore") + " " + s}
              aria-pressed={spessore === s}
              className={
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition " +
                (spessore === s ? "border-amber-300" : "border-stone-600")
              }
            >
              <span
                className="rounded-full bg-amber-100"
                style={{
                  width: Math.max(4, s / 1.6),
                  height: Math.max(4, s / 1.6),
                }}
              />
            </button>
          ))}
          <span className="mx-1 h-6 w-px bg-stone-700" />
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
            className="shrink-0 rounded-full border border-stone-600 px-3 py-1.5 text-xs font-semibold text-stone-100 transition"
          >
            {t("muro.pulisci")}
          </button>
        </div>

        {/* Fogli + salva */}
        <div className="flex items-center gap-2 pt-2">
          <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-stone-400">
            {t("muro.sfondo")}
          </span>
          {FOGLI.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => scegliFoglio(c)}
              aria-label={t("muro.sfondo") + " " + c}
              aria-pressed={foglio === c}
              className={
                "h-7 w-7 shrink-0 rounded-md border-2 transition " +
                (foglio === c ? "border-amber-300 scale-110" : "border-stone-600")
              }
              style={{ backgroundColor: c }}
            />
          ))}
          <button
            type="button"
            onClick={rimuovi}
            disabled={salvando}
            className="ml-auto shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold text-stone-300 transition hover:text-red-300 disabled:opacity-40"
          >
            {t("muro.rimuovi")}
          </button>
          <button
            type="button"
            onClick={salva}
            disabled={salvando}
            className="shrink-0 rounded-full bg-amber-300 px-4 py-2 text-sm font-bold text-stone-900 shadow-lg transition hover:scale-[1.03] active:scale-95 disabled:opacity-50"
          >
            {salvando ? t("muro.salvando") : t("muro.salva")}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(contenuto, document.body);
}
