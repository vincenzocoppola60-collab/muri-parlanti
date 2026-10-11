"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap, LayerGroup } from "leaflet";
import type { Punto } from "@/lib/idee";

/**
 * Mappa per indicare UN SOLO punto (la sezione "Fonda un muro" e la vista
 * delle proposte nel pannello admin).
 *
 * Si tocca la mappa per spostare il segnaposto: ne resta sempre uno, dove
 * hai toccato l'ultima volta. Leaflet + OpenStreetMap: gratuita, senza
 * chiavi API, e caricata solo nel browser (import dinamico).
 */
type Props = {
  punto: Punto | null;
  /** Se assente la mappa e' in sola lettura (es. sola consultazione admin). */
  onChange?: (punto: Punto) => void;
  /** Coordinate su cui centrare la mappa (es. la tua posizione). */
  centro?: Punto | null;
  altezza?: number;
};

export default function MappaPunto({
  punto,
  onChange,
  centro,
  altezza = 320,
}: Props) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  const LRef = useRef<typeof import("leaflet") | null>(null);

  // Valori sempre aggiornati per i gestori di eventi (niente closure stantie).
  const puntoRef = useRef<Punto | null>(punto);
  const onChangeRef = useRef(onChange);

  // Aggiorna i ref DOPO il render (non durante): prima dell'effetto che crea
  // la mappa, cosi' i gestori leggono sempre il valore piu' recente.
  useEffect(() => {
    puntoRef.current = punto;
    onChangeRef.current = onChange;
  });

  // Crea la mappa una sola volta, al montaggio.
  useEffect(() => {
    let annullato = false;
    (async () => {
      const L = await import("leaflet");
      if (annullato || !divRef.current || mapRef.current) return;
      LRef.current = L;

      const partenza = centro ?? puntoRef.current ?? ([40.8518, 14.2681] as Punto);
      const map = L.map(divRef.current, {
        zoomControl: true,
        attributionControl: true,
      }).setView(partenza, 17);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap",
      }).addTo(map);

      const layer = L.layerGroup().addTo(map);
      mapRef.current = map;
      layerRef.current = layer;

      // Tocco sulla mappa = nuovo punto (sposta il segnaposto).
      if (onChangeRef.current) {
        map.on("click", (e) => {
          const p: Punto = [
            Number(e.latlng.lat.toFixed(6)),
            Number(e.latlng.lng.toFixed(6)),
          ];
          onChangeRef.current?.(p);
        });
      }

      disegna(L, layer, puntoRef.current);
      // Leaflet ha bisogno di un attimo per misurare il contenitore.
      window.setTimeout(() => {
        map.invalidateSize();
        if (puntoRef.current) map.setView(puntoRef.current, map.getZoom());
      }, 120);
    })();

    return () => {
      annullato = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
      LRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ridisegna il segnaposto quando cambia.
  useEffect(() => {
    const L = LRef.current;
    const layer = layerRef.current;
    if (!L || !layer) return;
    disegna(L, layer, punto);
  }, [punto]);

  // Ricentra quando arriva un nuovo centro (es. "usa la mia posizione").
  useEffect(() => {
    if (!centro || !mapRef.current) return;
    mapRef.current.setView(centro, Math.max(mapRef.current.getZoom(), 17));
  }, [centro]);

  return (
    <div
      ref={divRef}
      style={{ height: altezza }}
      className="relative z-0 isolate w-full overflow-hidden rounded-lg border border-amber-100/20 bg-stone-950/40"
    />
  );
}

/** Disegna (o cancella) il segnaposto del punto scelto. */
function disegna(
  L: typeof import("leaflet"),
  layer: LayerGroup,
  punto: Punto | null
) {
  layer.clearLayers();
  if (!punto) return;

  L.circleMarker(punto, {
    radius: 10,
    color: "#fcd34d",
    weight: 3,
    fillColor: "#0c0a09",
    fillOpacity: 1,
  }).addTo(layer);

  // Un piccolo alone per rendere il punto ben visibile.
  L.circleMarker(punto, {
    radius: 20,
    color: "#fcd34d",
    weight: 1.5,
    fillColor: "#fcd34d",
    fillOpacity: 0.15,
  }).addTo(layer);
}
