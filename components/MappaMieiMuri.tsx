"use client";

import dynamic from "next/dynamic";
import type { PinMappa } from "./MappaReale";

export type { PinMappa };

/** Leaflet tocca il DOM e i tile: solo lato client, mai durante il SSR. */
const MappaReale = dynamic(() => import("./MappaReale"), {
  ssr: false,
  loading: () => (
    <div className="aspect-[16/9] w-full animate-pulse rounded-xl border border-amber-100/25 bg-stone-900/60 sm:aspect-[4/3]" />
  ),
});

/**
 * Mappa dei muri visitati: versione geografica reale (Leaflet + OpenStreetMap)
 * con segnalibri rossi sulle posizioni esatte, stessa interfaccia di prima.
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
  return <MappaReale pin={pin} selezionato={selezionato} onSelect={onSelect} />;
}