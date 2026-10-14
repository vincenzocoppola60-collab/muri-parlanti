"use client";

import { useMemo } from "react";
import { useLingua } from "@/lib/i18n";

/** Muro da mostrare sulla mappa stilizzata. */
export type PinMappa = {
  slug: string;
  nome: string;
  lat: number;
  lng: number;
};

type PinProiettato = PinMappa & { x: number; y: number };

/** Dimensioni del riquadro mappa (rapporto 4:3). */
const W = 400;
const H = 300;
/** Margine ai bordi per lasciare spazio a pin ed etichette. */
const MARGINE = 36;
/** Larghezza minima della tendina col nome del muro selezionato. */
const ETICHETTA_MIN = 64;

/** Spezza un messaggio in 2-3 righe circa bilanciate (per il testo in SVG). */
function spezza(testo: string): string[] {
  const parole = testo.split(" ");
  const meta = Math.ceil(testo.length / 2);
  const righe: string[] = [];
  let accumulo = "";
  for (const parola of parole) {
    if (accumulo && (accumulo + " " + parola).length > meta) {
      righe.push(accumulo);
      accumulo = parola;
    } else {
      accumulo = accumulo ? accumulo + " " + parola : parola;
    }
  }
  if (accumulo) righe.push(accumulo);
  return righe.slice(0, 3);
}

/**
 * Mappa stilizzata (non geografica): pergamena con strade decorative fisse.
 * I muri visitati diventano segnalibri rossi nella loro posizione relativa.
 * Nessun servizio esterno: le coordinate sono proiettate sul riquadro.
 */
export default function MappaMieiMuri({
  pin,
  selezionato,
  onSelect,
}: {
  pin: PinMappa[];
  selezionato: string | null;
  onSelect?: (slug: string) => void;
}) {
  const { t } = useLingua();

  const punti = useMemo<PinProiettato[]>(() => {
    if (pin.length === 0) return [];
    const lats = pin.map((p) => p.lat);
    const lngs = pin.map((p) => p.lng);
    let minLat = Math.min(...lats);
    let maxLat = Math.max(...lats);
    let minLng = Math.min(...lngs);
    let maxLng = Math.max(...lngs);
    // Span minimo: con un solo muro (o muri sovrapposti) restano al centro.
    const spread = 0.004;
    if (maxLat - minLat < spread) {
      const c = (minLat + maxLat) / 2;
      minLat = c - spread / 2;
      maxLat = c + spread / 2;
    }
    if (maxLng - minLng < spread) {
      const c = (minLng + maxLng) / 2;
      minLng = c - spread / 2;
      maxLng = c + spread / 2;
    }
    const scala = Math.min(
      (W - MARGINE * 2) / (maxLng - minLng),
      (H - MARGINE * 2) / (maxLat - minLat)
    );
    const offX = (W - (maxLng - minLng) * scala) / 2;
    const offY = (H - (maxLat - minLat) * scala) / 2;
    return pin.map((p) => ({
      ...p,
      x: offX + (p.lng - minLng) * scala,
      y: offY + (maxLat - p.lat) * scala,
    }));
  }, [pin]);

  const righeVuoto = useMemo(() => spezza(t("muri.mappaVuota")), [t]);

  return (
    <div className="overflow-hidden rounded-xl border border-amber-100/25 shadow-inner">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full"
        role="img"
        aria-label={t("muri.titolo")}
      >
        {/* Pergamena con cornicetta */}
        <rect width={W} height={H} fill="#f2e7cc" />
        <rect
          x="5"
          y="5"
          width={W - 10}
          height={H - 10}
          rx="12"
          fill="none"
          stroke="#ddca9d"
          strokeWidth="2"
        />

        {/* Strade decorative (sempre le stesse, fisse) */}
        <g fill="none" strokeLinecap="round">
          <path
            d="M-10 92 C 80 70, 150 118, 230 100 S 350 78, 410 108"
            stroke="#d8c290"
            strokeWidth="10"
          />
          <path
            d="M-10 92 C 80 70, 150 118, 230 100 S 350 78, 410 108"
            stroke="#efe3c2"
            strokeWidth="5.5"
          />
          <path
            d="M74 -10 C 62 70, 92 150, 70 230 S 86 290, 78 310"
            stroke="#d8c290"
            strokeWidth="9"
          />
          <path
            d="M74 -10 C 62 70, 92 150, 70 230 S 86 290, 78 310"
            stroke="#efe3c2"
            strokeWidth="5"
          />
          <path
            d="M110 310 C 170 250, 270 236, 410 258"
            stroke="#d8c290"
            strokeWidth="8"
          />
          <path
            d="M110 310 C 170 250, 270 236, 410 258"
            stroke="#efe3c2"
            strokeWidth="4"
          />
          <path
            d="M-10 92 C 80 70, 150 118, 230 100 S 350 78, 410 108"
            stroke="#c9ae7f"
            strokeWidth="1.5"
            strokeDasharray="7 8"
            opacity="0.7"
          />
        </g>

        {/* Isolati e alberi decorativi */}
        <g>
          <rect x="128" y="128" width="46" height="30" rx="5" transform="rotate(-7 151 143)" fill="#e9d9b2" stroke="#d3bd8d" />
          <rect x="236" y="60" width="40" height="26" rx="5" transform="rotate(5 256 73)" fill="#e9d9b2" stroke="#d3bd8d" />
          <rect x="300" y="170" width="44" height="30" rx="5" transform="rotate(-4 322 185)" fill="#e9d9b2" stroke="#d3bd8d" />
          <circle cx="34" cy="200" r="6" fill="#cfdcb2" stroke="#b4c697" />
          <circle cx="50" cy="212" r="4" fill="#cfdcb2" stroke="#b4c697" />
          <circle cx="368" cy="40" r="6" fill="#cfdcb2" stroke="#b4c697" />
          <circle cx="354" cy="52" r="4" fill="#cfdcb2" stroke="#b4c697" />
          <circle cx="190" cy="52" r="5" fill="#cfdcb2" stroke="#b4c697" />
        </g>

        {punti.length === 0 ? (
          <g>
            {righeVuoto.map((riga, i) => (
              <text
                key={i}
                x={W / 2}
                y={H / 2 - (righeVuoto.length - 1) * 9 + i * 18}
                textAnchor="middle"
                fontSize="13"
                fill="#6d5a35"
                className="font-scritta"
              >
                {riga}
              </text>
            ))}
          </g>
        ) : (
          <g>
            {punti.map((p) => {
              const attivo = selezionato === p.slug;
              const larghezza = Math.max(ETICHETTA_MIN, p.nome.length * 6.6 + 16);
              const lx = Math.max(
                4 - p.x,
                Math.min(W - p.x - larghezza - 4, -larghezza / 2)
              );
              return (
                <g
                  key={p.slug}
                  transform={`translate(${p.x}, ${p.y})`}
                  className={onSelect ? "cursor-pointer" : undefined}
                  onClick={onSelect ? () => onSelect(p.slug) : undefined}
                >
                  {attivo && (
                    <>
                      <circle
                        r="16"
                        fill="none"
                        stroke="#dc2626"
                        strokeOpacity="0.55"
                        strokeWidth="2"
                        strokeDasharray="5 4"
                      />
                      <circle r="10" fill="#ef4444" fillOpacity="0.16" />
                    </>
                  )}
                  <g transform={`scale(${attivo ? 1.35 : 1})`}>
                    <path
                      d="M0 0 C -7.2 -8.6 -11 -13.2 -11 -19 a11 11 0 1 1 22 0 C 11 -13.2 7.2 -8.6 0 0 Z"
                      fill="#dc2626"
                      stroke="#991b1b"
                      strokeWidth="1"
                      strokeLinejoin="round"
                    />
                    <circle cy="-19" r="3.2" fill="#fff1f1" />
                  </g>
                  {attivo && (
                    <g>
                      <rect
                        x={lx}
                        y="-44"
                        width={larghezza}
                        height="19"
                        rx="6"
                        fill="#fffdf4"
                        stroke="#c9ae7f"
                      />
                      <text
                        x={lx + larghezza / 2}
                        y="-30"
                        textAnchor="middle"
                        fontSize="11"
                        fill="#4a3b23"
                        className="font-scritta"
                      >
                        {p.nome}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        )}
      </svg>
    </div>
  );
}
