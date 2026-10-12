"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useLingua } from "@/lib/i18n";

const USCITA = 512; // lato in pixel dell'immagine finale caricata su Supabase
const ZOOM_MIN = 1;
const ZOOM_MAX = 3;

/**
 * Finestra di ritaglio dell'avatar: l'utente trascina l'immagine e regola
 * lo zoom per scegliere quale parte finisce nel cerchio del profilo.
 * Alla conferma produce un JPEG quadrato 512px pronto per il bucket "avatar".
 */
export default function RitagliaAvatar({
  file,
  onAnnulla,
  onConferma,
  maschera = "cerchio",
}: {
  file: File;
  onAnnulla: () => void;
  onConferma: (blob: Blob) => void;
  /** Forma della foto finale: 'cerchio' per le persone, 'quadrato' per i collettivi. */
  maschera?: "cerchio" | "quadrato";
}) {
  const quadrata = maschera === "quadrato";
  const { t } = useLingua();
  const [url, setUrl] = useState<string | null>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [lato, setLato] = useState(320); // lato reale dell'area di ritaglio a schermo
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [errore, setErrore] = useState<string | null>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const trascinoRef = useRef<{
    px: number;
    py: number;
    ox: number;
    oy: number;
  } | null>(null);

  // Percorso locale temporaneo dell'immagine scelta (revocato alla chiusura).
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  // Misura l'area di ritaglio: su schermi piccoli è più stretta di 320px.
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const aggiorna = () => setLato(el.clientWidth || 320);
    aggiorna();
    const osserva = new ResizeObserver(aggiorna);
    osserva.observe(el);
    return () => osserva.disconnect();
  }, []);

  const scalaBase = img
    ? Math.max(lato / img.naturalWidth, lato / img.naturalHeight)
    : 1;
  const scala = scalaBase * zoom;

  // A ogni cambio zoom/size riporta l'immagine dentro i bordi (mai angoli vuoti).
  useEffect(() => {
    if (!img) return;
    const mezzoX = (img.naturalWidth * scalaBase * zoom - lato) / 2;
    const mezzoY = (img.naturalHeight * scalaBase * zoom - lato) / 2;
    setOffset((o) => ({
      x: Math.min(mezzoX, Math.max(-mezzoX, o.x)),
      y: Math.min(mezzoY, Math.max(-mezzoY, o.y)),
    }));
  }, [img, zoom, lato, scalaBase]);

  function iniziaTrascinamento(e: ReactPointerEvent<HTMLDivElement>) {
    if (!img) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    trascinoRef.current = {
      px: e.clientX,
      py: e.clientY,
      ox: offset.x,
      oy: offset.y,
    };
  }

  function trascina(e: ReactPointerEvent<HTMLDivElement>) {
    const tr = trascinoRef.current;
    if (!tr || !img) return;
    const mezzoX = (img.naturalWidth * scalaBase * zoom - lato) / 2;
    const mezzoY = (img.naturalHeight * scalaBase * zoom - lato) / 2;
    setOffset({
      x: Math.min(mezzoX, Math.max(-mezzoX, tr.ox + (e.clientX - tr.px))),
      y: Math.min(mezzoY, Math.max(-mezzoY, tr.oy + (e.clientY - tr.py))),
    });
  }

  function terminaTrascinamento() {
    trascinoRef.current = null;
  }

  function conferma() {
    if (!img) return;
    // Il quadrato visibile nell'area corrisponde, sull'immagine originale, a:
    const dw = img.naturalWidth * scala;
    const dh = img.naturalHeight * scala;
    const tlx = (lato - dw) / 2 + offset.x; // bordo sinistro dell'immagine a schermo
    const tly = (lato - dh) / 2 + offset.y; // bordo superiore
    const canvas = document.createElement("canvas");
    canvas.width = USCITA;
    canvas.height = USCITA;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setErrore(t("ritaglia.noSupporto"));
      return;
    }
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, USCITA, USCITA);
    ctx.drawImage(
      img,
      -tlx / scala,
      -tly / scala,
      lato / scala,
      lato / scala,
      0,
      0,
      USCITA,
      USCITA
    );
    canvas.toBlob(
      (blob) => {
        if (blob) onConferma(blob);
        else setErrore(t("ritaglia.fallito"));
      },
      "image/jpeg",
      0.85
    );
  }

  function cambiaZoom(delta: number) {
    setZoom((z) =>
      Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, +(z + delta).toFixed(2)))
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-amber-100/20 bg-stone-900 p-4 shadow-2xl">
        <h3 className="font-scritta text-2xl text-amber-100">
          {t("ritaglia.titolo")}
        </h3>
        <p className="mt-1 text-xs text-stone-400">{t("ritaglia.testo")}</p>

        <div
          ref={areaRef}
          onPointerDown={iniziaTrascinamento}
          onPointerMove={trascina}
          onPointerUp={terminaTrascinamento}
          onPointerCancel={terminaTrascinamento}
          className="relative mx-auto mt-4 aspect-square w-full max-w-[320px] cursor-move touch-none select-none overflow-hidden rounded-2xl bg-stone-800"
        >
          {url && (
            <img
              src={url}
              alt={t("ritaglia.alt")}
              draggable={false}
              onLoad={(e) => setImg(e.currentTarget)}
              className="pointer-events-none absolute left-1/2 top-1/2 max-w-none -translate-x-1/2 -translate-y-1/2"
              style={{ width: img ? img.naturalWidth * scala : 0 }}
            />
          )}
          {!img && (
            <p className="absolute inset-0 flex items-center justify-center text-sm text-stone-400">
              {t("ritaglia.carico")}
            </p>
          )}
          {/* Maschera di anteprima: scurisce tutto ciò che resta fuori */}
          <div
            aria-hidden
            className={`pointer-events-none absolute inset-0 ${
              quadrata ? "rounded-lg" : "rounded-full"
            }`}
            style={{ boxShadow: "0 0 0 9999px rgba(12, 10, 9, 0.62)" }}
          />
          <div
            aria-hidden
            className={`pointer-events-none absolute inset-0 ring-2 ring-amber-300/70 ${
              quadrata ? "rounded-lg" : "rounded-full"
            }`}
          />
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => cambiaZoom(-0.1)}
            aria-label={t("ritaglia.riduciZoom")}
            className="h-9 w-9 shrink-0 rounded-full bg-stone-800 text-lg font-bold text-amber-100 transition hover:bg-stone-700"
          >
            −
          </button>
          <input
            type="range"
            min={ZOOM_MIN}
            max={ZOOM_MAX}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            aria-label={t("ritaglia.zoomImmagine")}
            className="w-full accent-amber-300"
          />
          <button
            type="button"
            onClick={() => cambiaZoom(0.1)}
            aria-label={t("ritaglia.aumentaZoom")}
            className="h-9 w-9 shrink-0 rounded-full bg-stone-800 text-lg font-bold text-amber-100 transition hover:bg-stone-700"
          >
            +
          </button>
        </div>

        {errore && (
          <p className="mt-3 text-center text-sm font-semibold text-red-300">
            {errore}
          </p>
        )}

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onAnnulla}
            className="rounded-full px-4 py-2 text-sm font-bold text-stone-300 transition hover:bg-stone-950/60"
          >
            {t("ritaglia.annulla")}
          </button>
          <button
            type="button"
            onClick={conferma}
            disabled={!img}
            className="rounded-full bg-amber-300 px-5 py-2 text-sm font-bold text-stone-900 shadow-xl transition hover:scale-[1.03] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t("ritaglia.usa")}
          </button>
        </div>
      </div>
    </div>
  );
}
