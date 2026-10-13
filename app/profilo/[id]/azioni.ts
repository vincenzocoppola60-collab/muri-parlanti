"use server";

import {
  caricaPostitDiUtente,
  caricaProfilo,
  LIMITE_GRIGLIA,
} from "@/lib/profili";
import {
  caricaPreferitiDiUtente,
  LIMITE_SALVATI,
} from "@/lib/profiliServer";
import type { PostIt } from "@/lib/postit";
import type { Preferito } from "@/lib/preferiti";

/**
 * Pagina successiva dei post-it di un profilo ("mostra altri").
 *
 * Gira sul server cosi' la griglia del profilo non deve usare direttamente
 * il client Supabase pubblico. Espone gli stessi dati gia' visibili nella
 * pagina pubblica: nessun privilegio in piu'.
 */
const ID_VALIDO =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const OFFSET_MASSIMO = 5000;

export async function altriPostit(
  utenteId: string,
  offset: number
): Promise<PostIt[]> {
  if (!ID_VALIDO.test(utenteId)) return [];
  const da = Number.isFinite(offset) && offset > 0 ? Math.floor(offset) : 0;
  if (da > OFFSET_MASSIMO) return [];
  return caricaPostitDiUtente(utenteId, LIMITE_GRIGLIA, da);
}

/**
 * Post-it lasciati da un utente, per la schermata dedicata "I suoi post-it".
 *
 * Rispetta la privacy: se l'autore ha spento la bacheca pubblica
 * (profili.mostra_postit = false) non si espone nulla. Il proprietario, che
 * deve poter vedere i propri, usa un percorso lato client autenticato.
 */
export async function elencoPostitProfilo(utenteId: string): Promise<PostIt[]> {
  if (!ID_VALIDO.test(utenteId)) return [];
  const profilo = await caricaProfilo(utenteId);
  if (!profilo || !profilo.mostra_postit) return [];
  return caricaPostitDiUtente(utenteId, LIMITE_SALVATI, 0);
}

/**
 * Post-it salvati da un utente, per la schermata dedicata "I suoi salvati".
 *
 * I preferiti sono protetti da RLS (solo il proprietario li legge): qui li
 * leggiamo con la service role key, ma SOLO se l'autore ha scelto di mostrarli
 * (profili.mostra_salvati). Il proprietario usa invece il percorso client.
 */
export async function elencoSalvatiProfilo(
  utenteId: string
): Promise<Preferito[]> {
  if (!ID_VALIDO.test(utenteId)) return [];
  const profilo = await caricaProfilo(utenteId);
  if (!profilo || profilo.mostra_salvati === false) return [];
  return caricaPreferitiDiUtente(utenteId, LIMITE_SALVATI, 0);
}
