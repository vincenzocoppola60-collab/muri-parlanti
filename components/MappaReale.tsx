"use client";

import { useEffect, useMemo, useRef } from "react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useLingua } from "@/lib/i18n";

/** Muro da mostrare sulla mappa reale. */
export type PinMappa = {
  slug: string;
  nome: string;
  lat: number;
  lng: number;
};

/**
 * Tile geografici reali (strade, indirizzi, luoghi) di OpenStreetMap:
 * gratuiti e senza chiave API (CARTO ora li blocca servendo un segnaposto
 * "API key required"). Una tinta sepia via CSS mantiene l'aspetto caldo dell'app.
 */
const URL_TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUZIONE =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> i contributori';

/** Vista di riserva (Napoli) quando non ci sono ancora posizioni. */
const CENTRO_FALLBACK: L.LatLngTuple = [40.8518, 14.2681];
const ZOOM_FALLBACK = 12;
/** Zoom minimo a cui volare quando si seleziona un muro. */
const ZOOM_SELEZIONE = 15;

/** SVG del segnalibre rosso, identico a quello della mappa stilizzata. */
function svgSegnalibre(attivo: boolean): string {
  const s = attivo ? 1.35 : 1;
  const anello = attivo
    ? '<circle cx="0" cy="-19" r="16" fill="none" stroke="#dc2626" stroke-opacity="0.55" stroke-width="2" stroke-dasharray="5 4"/><circle cx="0" cy="-19" r="10" fill="#ef4444" fill-opacity="0.16"/>'
    : "";
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="' +
    Math.round(36 * s) +
    '" height="' +
    Math.round(38 * s) +
    '" viewBox="-18 -37 36 38"><g transform="scale(' +
    s +
    ')">' +
    anello +
    '<path d="M0 0 C -7.2 -8.6 -11 -13.2 -11 -19 a11 11 0 1 1 22 0 C 11 -13.2 7.2 -8.6 0 0 Z" fill="' +
    (attivo ? "#b91c1c" : "#dc2626") +
    '" stroke="#991b1b" stroke-width="1" stroke-linejoin="round"/>' +
    '<circle cy="-19" r="3.2" fill="#fff1f1"/></g></svg>'
  );
}

/** Finestra con l'aggancio di verifica per i test automatici. */
type FinestraConMappa = Window & { __mappaReale?: L.Map };

/** Icona Leaflet con il segnalibre disegnato inline (nessuna immagine esterna). */
function creaIcona(attivo: boolean): L.DivIcon {
  const s = attivo ? 1.35 : 1;
  return L.divIcon({
    className: attivo ? "mappa-pin mappa-pin-attivo" : "mappa-pin",
    html: svgSegnalibre(attivo),
    iconSize: [Math.round(36 * s), Math.round(38 * s)],
    iconAnchor: [Math.round(18 * s), Math.round(37 * s)],
    tooltipAnchor: [0, Math.round(-54 * s)],
  });
}

/**
 * Mappa geografica reale (Leaflet + OpenStreetMap): ogni muro visitato diventa
 * un segnalibre rosso nella sua posizione esatta. Zoom e pan nativi, grafica
 * pergamena. Un tap su un segnalibre lo seleziona (il genitore gestisce il
 * doppio tap che apre il muro).
 */
export default function MappaReale({
  pin,
  selezionato,
  onSelect,
}: {
  pin: PinMappa[];
  selezionato: string | null;
  onSelect?: (slug: string) => void;
}) {
  const { t } = useLingua();
  const contenitoreRef = useRef<HTMLDivElement | null>(null);
  const mappaRef = useRef<L.Map | null>(null);
  const livelloRef = useRef<L.LayerGroup | null>(null);
  /** true dopo il primo inquadramento automatico di tutti i pin. */
  const adattatoRef = useRef(false);
  const onSelectRef = useRef(onSelect);
  const pinRef = useRef(pin);

  // Riferimenti aggiornati dopo il render (mai durante), così gli effetti
  // che non si risincronizzano leggono sempre l'ultimo valore.
  useEffect(() => {
    onSelectRef.current = onSelect;
    pinRef.current = pin;
  });

  /** Identità stabile dell'elenco pin: slug, nome e posizione. */
  const chiave = useMemo(
    () => pin.map((p) => p.slug + ":" + p.nome + ":" + p.lat + "," + p.lng).join("|"),
    [pin]
  );

  // Creazione della mappa, una sola volta per montaggio.
  useEffect(() => {
    const nodo = contenitoreRef.current;
    if (!nodo || mappaRef.current) return;
    const mappa = L.map(nodo, {
      center: CENTRO_FALLBACK,
      zoom: ZOOM_FALLBACK,
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: true,
      worldCopyJump: true,
    });
    L.tileLayer(URL_TILES, { attribution: ATTRIBUZIONE, maxZoom: 19 }).addTo(
      mappa
    );
    livelloRef.current = L.layerGroup().addTo(mappa);
    mappaRef.current = mappa;
    // Aggancio per le verifiche automatiche (CDP): l'istanza Leaflet esatta
    // permette di confrontare proiezione e DOM senza deduzioni fragili.
    (window as FinestraConMappa).__mappaReale = mappa;

    // La mappa deve ricalcolare le misure quando il riquadro cambia dimensione.
    const osserva = new ResizeObserver(() => mappa.invalidateSize());
    osserva.observe(nodo);
    return () => {
      osserva.disconnect();
      (window as FinestraConMappa).__mappaReale = undefined;
      mappa.remove();
      mappaRef.current = null;
      livelloRef.current = null;
      adattatoRef.current = false;
    };
  }, []);

  // Segnalibri sincronizzati con l'elenco dei muri visitati.
  useEffect(() => {
    const mappa = mappaRef.current;
    const livello = livelloRef.current;
    if (!mappa || !livello) return;
    livello.clearLayers();
    for (const p of pinRef.current) {
      const attivo = selezionato === p.slug;
      const marker = L.marker([p.lat, p.lng], {
        icon: creaIcona(attivo),
        keyboard: false,
        alt: p.nome,
        riseOnHover: true,
        zIndexOffset: attivo ? 1000 : 0,
      });
      marker.on("click", () => onSelectRef.current?.(p.slug));
      if (attivo) {
        marker.bindTooltip(p.nome, {
          direction: "top",
          permanent: true,
          className: "mappa-etichetta font-scritta",
        });
      }
      marker.addTo(livello);
    }
    // Alla prima comparsa dei pin: inquadra tutti i muri visitati.
    if (pinRef.current.length > 0 && !adattatoRef.current) {
      adattatoRef.current = true;
      mappa.fitBounds(
        L.latLngBounds(
          pinRef.current.map((p) => [p.lat, p.lng] as L.LatLngTuple)
        ),
        { padding: [30, 30], maxZoom: ZOOM_SELEZIONE }
      );
    }
  }, [chiave, selezionato]);

  // Quando cambia il muro selezionato, vola sulla sua posizione esatta.
  useEffect(() => {
    const mappa = mappaRef.current;
    if (!mappa || !selezionato) return;
    const p = pinRef.current.find((x) => x.slug === selezionato);
    if (!p) return;
    mappa.flyTo([p.lat, p.lng], Math.max(mappa.getZoom(), ZOOM_SELEZIONE), {
      duration: 0.8,
    });
  }, [selezionato, chiave]);

  return (
    <div className="mappa-reale relative overflow-hidden rounded-xl border border-amber-100/25 shadow-inner">
      <div
        ref={contenitoreRef}
        className="aspect-[4/3] w-full"
        role="img"
        aria-label={t("muri.titolo")}
      />
      {pin.length === 0 && (
        <div className="absolute inset-0 z-[20] flex items-center justify-center bg-[#f2e7cc] p-4 text-center">
          <p className="font-scritta text-sm text-[#6d5a35]">
            {t("muri.mappaVuota")}
          </p>
        </div>
      )}
    </div>
  );
}