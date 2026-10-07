"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap, LayerGroup } from "leaflet";
import type { Punto } from "@/lib/admin";

/**
 * Mappa per disegnare la ZONA di un muro.
 *
 * Si tocca la mappa per aggiungere i vertici del confine: con 3 o piu' punti
 * il poligono si chiude. La mappa e' Leaflet + OpenStreetMap: gratuita, senza
 * chiavi API. Leaflet viene caricato solo nel browser (import dinamico), cosi'
 * non pesa sul resto del sito.
 */
type Props = {
  punti: Punto[];
  onChange: (punti: Punto[]) => void;
  /** Coordinate su cui centrare la mappa (es. la tua posizione). */
  centro?: Punto | null;
  altezza?: number;
};

export default function DisegnaZona({
  punti,
  onChange,
  centro,
  altezza = 320,
}: Props) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  const LRef = useRef<typeof import("leaflet") | null>(null);

  // Colori sempre aggiornati per i gestori di eventi (niente closure stantie).
  const puntiRef = useRef<Punto[]>(punti);
  const onChangeRef = useRef(onChange);
  puntiRef.current = punti;
  onChangeRef.current = onChange;

  // Crea la mappa una sola volta, al montaggio.
  useEffect(() => {
    let annullato = false;
    (async () => {
      const L = await import("leaflet");
      if (annullato || !divRef.current || mapRef.current) return;
      LRef.current = L;

      const partenza = centro ?? ([40.8518, 14.2681] as Punto);
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

      // Tocco sulla mappa = nuovo vertice della zona.
      map.on("click", (e) => {
        const punto: Punto = [
          Number(e.latlng.lat.toFixed(6)),
          Number(e.latlng.lng.toFixed(6)),
        ];
        onChangeRef.current([...puntiRef.current, punto]);
      });

      disegna(L, layer, puntiRef.current);
      // Leaflet ha bisogno di un attimo per misurare il contenitore.
      window.setTimeout(() => map.invalidateSize(), 120);
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

  // Ridisegna i vertici quando cambiano.
  useEffect(() => {
    const L = LRef.current;
    const layer = layerRef.current;
    if (!L || !layer) return;
    disegna(L, layer, punti);
  }, [punti]);

  // Ricentra quando arriva un nuovo centro (es. "vai alla mia posizione").
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

/** Disegna vertici (numerati), segmenti e poligono chiuso. */
function disegna(
  L: typeof import("leaflet"),
  layer: LayerGroup,
  punti: Punto[]
) {
  layer.clearLayers();

  punti.forEach(([lat, lng], i) => {
    L.circleMarker([lat, lng], {
      radius: 7,
      color: "#fcd34d",
      weight: 2,
      fillColor: "#0c0a09",
      fillOpacity: 1,
    })
      .bindTooltip(String(i + 1), { permanent: true, direction: "right" })
      .addTo(layer);
  });

  if (punti.length >= 3) {
    L.polygon(punti, {
      color: "#fcd34d",
      weight: 2,
      fillColor: "#fcd34d",
      fillOpacity: 0.2,
    }).addTo(layer);
  } else if (punti.length === 2) {
    L.polyline(punti, { color: "#fcd34d", weight: 2 }).addTo(layer);
  }
}
