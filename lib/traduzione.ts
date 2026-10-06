"use client";

import type { CodiceLingua } from "@/lib/i18n";

/**
 * Traduzione dei post pubblici (quelli degli altri utenti).
 *
 * La traduzione vera avviene sul server (`/api/traduce`): qui teniamo solo
 * una piccola cache in memoria, così lo stesso pensiero non viene tradotto
 * due volte mentre si scorre il muro o si cambia lingua.
 */

const cache = new Map<string, string>();

function chiave(testo: string, a: CodiceLingua): string {
  return `${a}::${testo}`;
}

export type EsitoTraduzione =
  | { ok: true; testo: string; tradotto: boolean }
  | { ok: false; errore: string };

/**
 * Traduce `testo` nella lingua `a`.
 * Se la lingua di destinazione è l'italiano (lingua dei testi) non fa nulla.
 */
export async function traduciTesto(
  testo: string,
  a: CodiceLingua
): Promise<EsitoTraduzione> {
  const pulito = testo.trim();
  if (!pulito) return { ok: true, testo, tradotto: false };
  if (a === "it") return { ok: true, testo, tradotto: false };

  const k = chiave(pulito, a);
  const inCache = cache.get(k);
  if (inCache !== undefined) return { ok: true, testo: inCache, tradotto: true };

  try {
    const r = await fetch("/api/traduce", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ testo: pulito, a }),
    });
    const dati = (await r.json().catch(() => null)) as
      | { ok?: boolean; testo?: string; errore?: string }
      | null;

    if (!r.ok || !dati?.ok || typeof dati.testo !== "string") {
      return {
        ok: false,
        errore: dati?.errore ?? "Traduzione non disponibile.",
      };
    }

    // Se il servizio ha restituito lo stesso testo, consideriamola non tradotta.
    const tradotto = dati.testo.trim() !== pulito;
    if (tradotto) cache.set(k, dati.testo);
    return { ok: true, testo: dati.testo, tradotto };
  } catch {
    return { ok: false, errore: "Errore di rete durante la traduzione." };
  }
}
