import { NextResponse } from "next/server";

/**
 * Geocodifica inversa: dal punto (lat/lng) alla via leggibile.
 *
 * Serve alla sezione "Fonda un muro": quando l'utente segna un punto sulla
 * mappa, l'app chiede qui la via precisa, che poi mostriamo all'utente e
 * salviamo con la proposta per l'amministratore.
 *
 * Usa il servizio pubblico di OpenStreetMap (Nominatim): gratuito e senza
 * chiavi. La chiamata parte dal SERVER, cosi' il browser non contatta terze
 * parti e possiamo mandare uno User-Agent adeguato (richiesto dalla policy
 * di Nominatim). Se il servizio non risponde, la via resta vuota: la
 * proposta si invia comunque con le sole coordinate.
 */

const HEADERS: HeadersInit = {
  Accept: "application/json",
  "Accept-Language": "it-IT,it;q=0.9,en;q=0.7",
  // Identificazione richiesta dalla policy d'uso di Nominatim.
  "User-Agent": "MuriParlanti/1.0 (https://muri-parlanti.vercel.app)",
};

type Corpo = { lat?: unknown; lng?: unknown };

export async function POST(request: Request) {
  let corpo: Corpo;
  try {
    corpo = (await request.json()) as Corpo;
  } catch {
    return NextResponse.json(
      { ok: false, errore: "Richiesta non valida." },
      { status: 400 }
    );
  }

  const lat = Number(corpo.lat);
  const lng = Number(corpo.lng);
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return NextResponse.json(
      { ok: false, errore: "Coordinate non valide." },
      { status: 400 }
    );
  }

  try {
    const url =
      "https://nominatim.openstreetmap.org/reverse?format=jsonv2" +
      `&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;

    const r = await fetch(url, { headers: HEADERS, cache: "no-store" });
    if (!r.ok) throw new Error("servizio non disponibile");

    const dati = (await r.json().catch(() => null)) as {
      display_name?: string;
      address?: Record<string, string>;
    } | null;

    const indirizzo = dati?.display_name?.trim() || null;
    const via = viaDaIndirizzo(dati?.address ?? null) ?? indirizzo;

    return NextResponse.json({ ok: true, via, indirizzo });
  } catch {
    // Ripiego silenzioso: nessuna via, ma la proposta resta inviabile.
    return NextResponse.json({ ok: true, via: null, indirizzo: null });
  }
}

/**
 * Compone "Via, numero" dai campi di Nominatim, con ripieghi per i luoghi
 * senza via (piazze, parchi, ecc.).
 */
function viaDaIndirizzo(a: Record<string, string> | null): string | null {
  if (!a) return null;
  const strada =
    a.road ??
    a.pedestrian ??
    a.footway ??
    a.square ??
    a.cycleway ??
    a.path ??
    a.neighbourhood ??
    a.suburb ??
    a.village ??
    a.town ??
    null;
  const numero = a.house_number ? ` ${a.house_number}` : "";
  if (strada) return `${strada}${numero}`.trim();
  return a.town ?? a.city ?? a.county ?? null;
}
