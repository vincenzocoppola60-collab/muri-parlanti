/**
 * Sistema di livelli: visitare ed esplorare i muri fa guadagnare punti,
 * i punti sbloccano livelli. Ogni livello (dal 2°) assegna un BONUS di
 * punti una sola volta, che si somma al totale.
 */

/** Punti per ogni muro visitato (una sola volta per muro). */
export const PUNTI_MURO = 10;
/** Punti bonus per il primo pensiero lasciato su un muro. */
export const PUNTI_PENSIERO = 5;

export type Livello = {
  numero: number;
  nome: string;
  soglia: number; // XP minimo per raggiungerlo
  bonus: number; // punti bonus assegnati una sola volta al raggiungimento
};

/** Soglie cumulative, ordinate per soglia crescente. */
export const LIVELLI: Livello[] = [
  { numero: 1, nome: "Neofita", soglia: 0, bonus: 0 },
  { numero: 2, nome: "Esploratore", soglia: 20, bonus: 10 },
  { numero: 3, nome: "Vagabondo", soglia: 45, bonus: 15 },
  { numero: 4, nome: "Viaggiatore", soglia: 80, bonus: 20 },
  { numero: 5, nome: "Cronista", soglia: 130, bonus: 30 },
  { numero: 6, nome: "Narratore", soglia: 200, bonus: 40 },
  { numero: 7, nome: "Leggenda dei muri", soglia: 320, bonus: 60 },
];

export type StatoLivello = {
  livello: Livello;
  prossimo: Livello | null;
  puntiNelLivello: number;
  puntiAlProssimo: number | null; // XP mancanti al prossimo livello (null = massimo)
  percentuale: number; // 0..100 nel livello corrente
  posizione: number; // 0-based: LIVELLI.indexOf(livello)
};

/** Ricava lo stato (livello corrente, prossimo, avanzamento) da un totale di XP. */
export function statoLivello(xp: number): StatoLivello {
  let posizione = 0;
  for (let i = 0; i < LIVELLI.length; i++) {
    if (xp >= LIVELLI[i].soglia) posizione = i;
  }

  const livello = LIVELLI[posizione];
  const prossimo = LIVELLI[posizione + 1] ?? null;

  if (!prossimo) {
    return {
      livello,
      prossimo,
      puntiNelLivello: 0,
      puntiAlProssimo: null,
      percentuale: 100,
      posizione,
    };
  }

  const ampiezza = prossimo.soglia - livello.soglia;
  const puntiNelLivello = xp - livello.soglia;
  const percentuale = Math.min(
    100,
    Math.round((puntiNelLivello / ampiezza) * 100)
  );

  return {
    livello,
    prossimo,
    puntiNelLivello,
    puntiAlProssimo: prossimo.soglia - xp,
    percentuale,
    posizione,
  };
}

/** Nome del livello raggiunto con un dato totale di XP. */
export function nomeLivello(xp: number): string {
  return statoLivello(xp).livello.nome;
}
