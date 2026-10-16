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
 * gratuiti e senza chiave API. CARTO Voyager di nuovo richiede la chiave e
 * serve il segnaposto "API key required" (mappa bianca): resta OSM e la
 * tinta calda via CSS mantiene l'aspetto dell'app.
 */
const URL_TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUZIONE =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> i contributori';

/** Vista di riserva (Napoli) quando non ci sono ancora posizioni. */
const CENTRO_FALLBACK: L.LatLngTuple = [40.8518, 14.2681];
const ZOOM_FALLBACK = 12;
/** Zoom minimo a cui volare quando si seleziona un muro. */
const ZOOM_SELEZIONE = 15;

/**
 * La mappa vive solo dentro Napoli e province (l'intera Campania): con
 * maxBounds e maxBoundsViscosity 1.0 non è possibile scivolare fuori né con
 * il pan né con lo zoom; il minZoom è calcolato così che il riquadro stia
 * sempre dentro la regione, impedendo di vedere ciò che sta oltre.
 */
const LIMITI_CAMPANIA = L.latLngBounds([40.03, 13.72], [41.75, 15.9]);

/** Un luogo tipico della Campania, con lo zoom a cui il suo dettaglio compare. */
type LuogoTipico = {
  nome: string;
  tipo: "piazza" | "chiesa" | "castello" | "lago" | "monumento";
  lat: number;
  lng: number;
  /** Zoom minimo per far comparire il dettaglio (da lontano non se ne vede uno). */
  zoomMin: number;
};

/**
 * Luoghi tipici di Napoli e province (coordinate OpenStreetMap): piazze,
 * chiese, castelli, laghi e monumenti. Zoomando in una zona precisa compaiono
 * i dettagli di quella zona; con la mappa tutta in vista non compare nulla.
 */
const LUOGHI_TIPICI: LuogoTipico[] = [
  // Napoli: piazze storiche
  { nome: "Piazza del Plebiscito", tipo: "piazza", lat: 40.8359, lng: 14.2486, zoomMin: 15 },
  { nome: "Piazza Dante", tipo: "piazza", lat: 40.8492, lng: 14.2503, zoomMin: 15 },
  { nome: "Piazza del Gesù Nuovo", tipo: "piazza", lat: 40.847, lng: 14.2518, zoomMin: 15 },
  { nome: "Piazza Municipio", tipo: "piazza", lat: 40.8396, lng: 14.2528, zoomMin: 15 },
  { nome: "Piazza Garibaldi", tipo: "piazza", lat: 40.852, lng: 14.2688, zoomMin: 15 },
  // Napoli: castelli
  { nome: "Maschio Angioino", tipo: "castello", lat: 40.8383, lng: 14.2537, zoomMin: 15 },
  { nome: "Castel dell'Ovo", tipo: "castello", lat: 40.8277, lng: 14.248, zoomMin: 15 },
  { nome: "Castel Sant'Elmo", tipo: "castello", lat: 40.8437, lng: 14.2393, zoomMin: 15 },
  // Napoli: chiese
  { nome: "Duomo di Napoli", tipo: "chiesa", lat: 40.8527, lng: 14.2599, zoomMin: 15 },
  { nome: "Santa Chiara", tipo: "chiesa", lat: 40.8468, lng: 14.2529, zoomMin: 15 },
  { nome: "Gesù Nuovo", tipo: "chiesa", lat: 40.8476, lng: 14.2519, zoomMin: 15 },
  { nome: "Cappella Sansevero", tipo: "chiesa", lat: 40.8493, lng: 14.2549, zoomMin: 15 },
  { nome: "San Lorenzo Maggiore", tipo: "chiesa", lat: 40.8509, lng: 14.258, zoomMin: 15 },
  { nome: "Certosa di San Martino", tipo: "chiesa", lat: 40.8432, lng: 14.2411, zoomMin: 15 },
  // Laghi (Campania costiera, flegrea e campana)
  { nome: "Lago d'Averno", tipo: "lago", lat: 40.8388, lng: 14.0764, zoomMin: 13 },
  { nome: "Lago Lucrino", tipo: "lago", lat: 40.8292, lng: 14.0805, zoomMin: 13 },
  { nome: "Lago Fusaro", tipo: "lago", lat: 40.8231, lng: 14.0557, zoomMin: 13 },
  { nome: "Lago di Patria", tipo: "lago", lat: 40.9303, lng: 14.0326, zoomMin: 13 },
  // Province: monumenti e duomi
  { nome: "Reggia di Caserta", tipo: "monumento", lat: 41.0732, lng: 14.3271, zoomMin: 14 },
  { nome: "Castello di Arechi", tipo: "castello", lat: 40.6845, lng: 14.7547, zoomMin: 14 },
  { nome: "Duomo di Salerno", tipo: "chiesa", lat: 40.6801, lng: 14.7604, zoomMin: 14 },
  { nome: "Duomo di Benevento", tipo: "chiesa", lat: 41.1316, lng: 14.7744, zoomMin: 14 },
  { nome: "Duomo di Avellino", tipo: "chiesa", lat: 40.9268, lng: 15.1766, zoomMin: 14 },
];

/** Inchiostro seppia condiviso dalle icone disegnate dei luoghi. */
const INCHIOSTRO = "#6d5a35";

/** Piccola icona disegnata a mano (inchiostro + colori caldi) per ogni tipo. */
function svgLuogo(tipo: LuogoTipico["tipo"]): string {
  const apri =
    '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24">';
  const chiudi = "</svg>";
  switch (tipo) {
    case "chiesa":
      return (
        apri +
        '<path d="M12 2.6v3.4M10.3 4.3h3.4" fill="none" stroke="' + INCHIOSTRO + '" stroke-width="1.6" stroke-linecap="round"/>' +
        '<path d="M6.6 20.6v-8L12 7.8l5.4 4.8v8z" fill="#fcd34d" stroke="' + INCHIOSTRO + '" stroke-width="1.5" stroke-linejoin="round"/>' +
        '<path d="M10.3 20.6v-4.4a1.7 1.7 0 0 1 3.4 0v4.4" fill="#d97706" stroke="' + INCHIOSTRO + '" stroke-width="1.1" stroke-linejoin="round"/>' +
        chiudi
      );
    case "castello":
      return (
        apri +
        '<path d="M5.6 20.6V9.2h2.9V7.3h2.3v1.9h2.4V7.3h2.3v1.9h2.9v11.4z" fill="#e7d8b6" stroke="' + INCHIOSTRO + '" stroke-width="1.5" stroke-linejoin="round"/>' +
        '<path d="M10.4 20.6v-4.9h3.2v4.9" fill="#a16207" stroke="' + INCHIOSTRO + '" stroke-width="1.1" stroke-linejoin="round"/>' +
        chiudi
      );
    case "piazza":
      return (
        apri +
        '<path d="M12 3l1.8 11.2h-3.6z" fill="#fbbf24" stroke="' + INCHIOSTRO + '" stroke-width="1.4" stroke-linejoin="round"/>' +
        '<rect x="8.6" y="14.2" width="6.8" height="2.2" rx="0.6" fill="#d97706" stroke="' + INCHIOSTRO + '" stroke-width="1.2"/>' +
        '<rect x="7.2" y="16.4" width="9.6" height="4.1" rx="0.8" fill="#fde68a" stroke="' + INCHIOSTRO + '" stroke-width="1.4" stroke-linejoin="round"/>' +
        chiudi
      );
    case "lago":
      return (
        apri +
        '<path d="M4.5 13.6c0-3.5 3.4-6.3 7.5-6.3s7.5 2.8 7.5 6.3-3.4 6.3-7.5 6.3-7.5-2.8-7.5-6.3z" fill="#7cb8f0" stroke="' + INCHIOSTRO + '" stroke-width="1.5"/>' +
        '<path d="M8 13.6c1.3-1 2.6-1 4 0s2.7 1 4 0" fill="none" stroke="' + INCHIOSTRO + '" stroke-width="1.2" stroke-linecap="round"/>' +
        chiudi
      );
    case "monumento":
      return (
        apri +
        '<path d="M3.5 20.6V12l8.5-6 8.5 6v8.6z" fill="#fde68a" stroke="' + INCHIOSTRO + '" stroke-width="1.5" stroke-linejoin="round"/>' +
        '<path d="M10 20.6v-4.2a2 2 0 0 1 4 0v4.2" fill="#d97706" stroke="' + INCHIOSTRO + '" stroke-width="1.1" stroke-linejoin="round"/>' +
        '<path d="M3.5 20.6h17" fill="none" stroke="' + INCHIOSTRO + '" stroke-width="1.6" stroke-linecap="round"/>' +
        chiudi
      );
  }
}

/** Icona del luogo: targa pergamena col nome per intero sopra l'icona. */
function creaIconaLuogo(luogo: LuogoTipico): L.DivIcon {
  return L.divIcon({
    className: "mappa-luogo",
    html:
      '<div class="mappa-luogo-corpo">' +
      '<span class="mappa-luogo-targa font-scritta">' + luogo.nome + "</span>" +
      svgLuogo(luogo.tipo) +
      "</div>",
    iconSize: [26, 48],
    iconAnchor: [13, 47],
  });
}

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
 * Minimo zoom possibile: il più alto livello dal quale il riquadro corrente
 * sta interamente dentro la Campania (sotto, si vedrebbe fuori regione).
 */
function calcolaMinZoom(mappa: L.Map): number {
  const z = mappa.getBoundsZoom(LIMITI_CAMPANIA, true);
  return Number.isFinite(z) && z >= 1 ? Math.ceil(z) : 8;
}

/**
 * Mappa geografica reale (Leaflet + tile OpenStreetMap):
 * ogni muro visitato diventa un segnalibre rosso nella sua posizione esatta.
 * Limitata a Napoli e province (Campania): zoom e pan non portano mai fuori.
 * Zoomando in una zona compaiono i suoi luoghi tipici disegnati (chiese,
 * laghi, piazze...); a vista d'occhio della regione intera non compare nulla.
 * Un tap su un segnalibre lo seleziona (il genitore gestisce il doppio tap
 * che apre il muro).
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
  const livelloLuoghiRef = useRef<L.LayerGroup | null>(null);
  /** Luoghi tipici con la loro soglia di zoom, creati una sola volta. */
  const luoghiRef = useRef<Array<{ marker: L.Marker; zoomMin: number }>>([]);
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
      maxBounds: LIMITI_CAMPANIA,
      maxBoundsViscosity: 1.0,
    });
    L.tileLayer(URL_TILES, {
      attribution: ATTRIBUZIONE,
      maxZoom: 19,
    }).addTo(mappa);

    // Piano dedicato ai luoghi tipici: sopra i tile, sotto i segnalibri.
    mappa.createPane("luoghi");
    const pane = mappa.getPane("luoghi");
    if (pane) pane.style.zIndex = "450";

    // Marcatori dei luoghi tipici, mostrati solo superando la loro soglia.
    livelloLuoghiRef.current = L.layerGroup().addTo(mappa);
    luoghiRef.current = LUOGHI_TIPICI.map((luogo) => ({
      marker: L.marker([luogo.lat, luogo.lng], {
        icon: creaIconaLuogo(luogo),
        pane: "luoghi",
        interactive: false,
        keyboard: false,
      }),
      zoomMin: luogo.zoomMin,
    }));
    /** Mostra solo i luoghi della zona inquadrata (mai tutti da lontano). */
    const aggiornaLuoghi = () => {
      const gruppo = livelloLuoghiRef.current;
      if (!gruppo) return;
      const z = mappa.getZoom();
      for (const { marker, zoomMin } of luoghiRef.current) {
        const visibile = z >= zoomMin;
        if (visibile && !gruppo.hasLayer(marker)) marker.addTo(gruppo);
        if (!visibile && gruppo.hasLayer(marker)) gruppo.removeLayer(marker);
      }
    };
    aggiornaLuoghi();
    mappa.on("zoomend", aggiornaLuoghi);

    livelloRef.current = L.layerGroup().addTo(mappa);
    mappaRef.current = mappa;
    // Limite reale di zoom: sotto questa soglia si vedrebbe fuori Campania.
    mappa.setMinZoom(calcolaMinZoom(mappa));
    // Aggancio per le verifiche automatiche (CDP): l'istanza Leaflet esatta
    // permette di confrontare proiezione e DOM senza deduzioni fragili.
    (window as FinestraConMappa).__mappaReale = mappa;

    // La mappa deve ricalcolare le misure quando il riquadro cambia dimensione
    // (e il minimo zoom va ricalcolato perché la Campania continui a riempirlo).
    const osserva = new ResizeObserver(() => {
      mappa.invalidateSize();
      if (mappaRef.current === mappa) mappa.setMinZoom(calcolaMinZoom(mappa));
    });
    osserva.observe(nodo);
    return () => {
      osserva.disconnect();
      (window as FinestraConMappa).__mappaReale = undefined;
      mappa.remove();
      mappaRef.current = null;
      livelloRef.current = null;
      livelloLuoghiRef.current = null;
      luoghiRef.current = [];
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
        className="aspect-[16/9] w-full sm:aspect-[4/3]"
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
