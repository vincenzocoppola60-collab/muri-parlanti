import { N_STILI } from "@/components/StilePostit";
import { LIVELLI } from "@/lib/livelli";

/**
 * Sblocco degli stili in base al livello.
 *
 * Più sali di livello, più varianti grafiche di post-it sblocchi. Lo stile
 * classico (varianti 1-3) è disponibile subito; le altre si aprono man mano
 * fino alla variante 16, riservata alla "Leggenda dei muri" (livello 7).
 *
 * Questa è l'unica fonte di verità lato app; la stessa regola è replicata nel
 * database (migrazione 0016) perché lo stile può essere inviato direttamente
 * alla REST di Supabase senza passare dall'app.
 *
 * L'amministratore ignora questi limiti (vede e usa tutte le 16 varianti).
 */

/**
 * Livello minimo richiesto per ogni stile (indice 0 = stile 1).
 * Distribuzione sulle 7 soglie di `lib/livelli.ts`.
 */
export const LIVELLO_MINIMO_STILE: readonly number[] = [
  1, 1, 1, // stili 1-3   → Neofita
  2, 2, //      stili 4-5   → Esploratore
  3, 3, //      stili 6-7   → Vagabondo
  4, 4, 4, //   stili 8-10  → Viaggiatore
  5, 5, //      stili 11-12 → Cronista
  6, 6, //      stili 13-14 → Narratore
  7, 7, //      stili 15-16 → Leggenda dei muri
];

/** Livello minimo per usare uno stile (1 se lo stile non è valido). */
export function livelloMinimoStile(stile: number): number {
  const n = Math.round(Number(stile));
  if (!Number.isFinite(n) || n < 1 || n > N_STILI) return 1;
  return LIVELLO_MINIMO_STILE[n - 1] ?? 1;
}

/** True se l'utente a questo livello può usare lo stile indicato. */
export function stileSbloccato(stile: number, livelloUtente: number): boolean {
  return livelloUtente >= livelloMinimoStile(stile);
}

/** Elenco (1..16) degli stili disponibili a un dato livello. */
export function stiliSbloccati(livelloUtente: number): number[] {
  return Array.from({ length: N_STILI }, (_, i) => i + 1).filter((n) =>
    stileSbloccato(n, livelloUtente)
  );
}

/** Quanti stili sono sbloccati a un dato livello. */
export function contaStiliSbloccati(livelloUtente: number): number {
  return stiliSbloccati(livelloUtente).length;
}

/**
 * Prossimo stile ancora bloccato (il primo) e il livello che lo sblocca,
 * per invitare l'utente a salire. null se ha già tutto.
 */
export function prossimoSblocco(
  livelloUtente: number
): { stile: number; livello: number } | null {
  for (let n = 1; n <= N_STILI; n++) {
    const lv = livelloMinimoStile(n);
    if (livelloUtente < lv) return { stile: n, livello: lv };
  }
  return null;
}

/** Nome tradotto del livello (usa le chiavi `livello.N` della i18n). */
export function chiaveNomeLivello(livello: number): string {
  const l = LIVELLI.find((x) => x.numero === livello);
  return `livello.${l?.numero ?? 1}`;
}
