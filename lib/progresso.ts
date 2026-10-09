import { getClienteAuth } from "@/lib/clienteAuth";
import { PUNTI_MURO, PUNTI_PENSIERO, LIVELLI, statoLivello, type StatoLivello } from "@/lib/livelli";

export type RigaProgresso = {
  id: string;
  utente_id: string;
  luogo: string;
  xp: number;
  pensieri: number;
  prima_visita: string;
};

export type ResocontoProgresso = {
  righe: RigaProgresso[];
  totaleXp: number;
  /** Bonus di livello assegnati durante QUESTO caricamento. */
  bonusRiscattati: number;
  /** Livelli il cui bonus è stato assegnato (inclusi i precedenti). */
  bonusLivelli: number[];
};

/**
 * Carica i progressi dell'utente e RISCATTA automaticamente i bonus dei
 * livelli raggiunti (uno solo per livello, a cascata: il bonus può far
 * superare la soglia del livello successivo). Idempotente: la tabella
 * bonus_livelli impedisce doppioni. Se la tabella non esiste ancora
 * (migrazione 0002 non eseguita) i bonus vengono semplicemente saltati.
 */
export async function caricaProgresso(
  utenteId: string
): Promise<ResocontoProgresso> {
  const supabase = getClienteAuth();

  const { data, error } = await supabase
    .from("progresso_muri")
    .select("id, utente_id, luogo, xp, pensieri, prima_visita")
    .eq("utente_id", utenteId);

  if (error) throw new Error("Impossibile caricare i progressi.");
  const righe = (data ?? []) as RigaProgresso[];

  let totaleXp = righe.reduce((somma, r) => somma + r.xp, 0);
  let bonusRiscattati = 0;
  let bonusLivelli: number[] = [];

  try {
    const { data: giaPresi } = await supabase
      .from("bonus_livelli")
      .select("livello")
      .eq("utente_id", utenteId);
    const presi = new Set<number>((giaPresi ?? []).map((b) => b.livello));
    bonusLivelli = [...presi];

    // I bonus gia' riscattati fanno parte del totale in modo STABILE: senza
    // questo, il totale calcolato scenderebbe a ogni ricarica (il ciclo sotto
    // aggiunge solo i bonus nuovi) e il livello potrebbe perfino calare.
    // Deve combaciare con public.livello_utente() lato database (0016).
    for (const num of presi) {
      const l = LIVELLI.find((x) => x.numero === num);
      if (l) totaleXp += l.bonus;
    }

    // Riscatto a cascata finché un bonus non sblocca il livello successivo.
    let cambiato = true;
    while (cambiato) {
      cambiato = false;
      for (const l of LIVELLI) {
        if (l.bonus <= 0 || presi.has(l.numero) || totaleXp < l.soglia) continue;
        const { error: erroreBonus } = await supabase
          .from("bonus_livelli")
          .insert({ utente_id: utenteId, livello: l.numero });
        if (erroreBonus) continue; // già preso nel frattempo o tabella assente
        presi.add(l.numero);
        bonusLivelli.push(l.numero);
        totaleXp += l.bonus;
        bonusRiscattati += l.bonus;
        cambiato = true;
      }
    }
  } catch {
    // Migrazione 0002 non ancora eseguita: nessun bonus, il resto funziona.
  }

  return { righe, totaleXp, bonusRiscattati, bonusLivelli };
}


/**
 * Registra la visita a un muro: assegna PUNTI_MURO la prima volta.
 * Se il muro è già stato visitato non assegna nulla.
 * Ritorna i punti aggiunti e il resoconto aggiornato, oppure null se non loggato.
 */
export async function registraVisita(
  luogo: string
): Promise<{ xpAggiunti: number; resoconto: ResocontoProgresso; stato: StatoLivello } | null> {
  const utente = await utenteCorrente();
  if (!utente) return null;

  const supabase = getClienteAuth();

  const esistente = await supabase
    .from("progresso_muri")
    .select("id, xp, pensieri")
    .eq("utente_id", utente.id)
    .eq("luogo", luogo)
    .maybeSingle();

  let xpAggiunti = 0;

  if (!esistente.data) {
    const { error } = await supabase.from("progresso_muri").insert({
      utente_id: utente.id,
      luogo,
      xp: PUNTI_MURO,
      pensieri: 0,
      prima_visita: new Date().toISOString(),
    });
    if (error) throw new Error("Impossibile registrare la visita.");
    xpAggiunti = PUNTI_MURO;
  }

  const resoconto = await caricaProgresso(utente.id);
  return { xpAggiunti, resoconto, stato: statoLivello(resoconto.totaleXp) };
}

/**
 * Registra un pensiero lasciato su un muro: il primo dà PUNTI_PENSIERO.
 * Ritorna i punti aggiunti e il resoconto, oppure null se non loggato.
 */
export async function registraPensiero(
  luogo: string
): Promise<{ xpAggiunti: number; resoconto: ResocontoProgresso; stato: StatoLivello } | null> {
  const utente = await utenteCorrente();
  if (!utente) return null;

  const supabase = getClienteAuth();

  const riga = await supabase
    .from("progresso_muri")
    .select("id, xp, pensieri")
    .eq("utente_id", utente.id)
    .eq("luogo", luogo)
    .maybeSingle();

  let xpAggiunti = 0;

  if (riga.data) {
    if (riga.data.pensieri === 0) {
      // Primo pensiero su questo muro: bonus XP.
      const { error } = await supabase
        .from("progresso_muri")
        .update({ xp: riga.data.xp + PUNTI_PENSIERO, pensieri: 1 })
        .eq("id", riga.data.id);
      if (error) throw new Error("Impossibile aggiornare i progressi.");
      xpAggiunti = PUNTI_PENSIERO;
    } else {
      // Pensiero successivo: aumenta il conteggio, nessun XP.
      const { error } = await supabase
        .from("progresso_muri")
        .update({ pensieri: riga.data.pensieri + 1 })
        .eq("id", riga.data.id);
      if (error) throw new Error("Impossibile aggiornare i progressi.");
    }
  } else {
    // Nessuna riga: creala includendo muro + primo pensiero.
    const { error } = await supabase.from("progresso_muri").insert({
      utente_id: utente.id,
      luogo,
      xp: PUNTI_MURO + PUNTI_PENSIERO,
      pensieri: 1,
      prima_visita: new Date().toISOString(),
    });
    if (error) throw new Error("Impossibile registrare il pensiero.");
    xpAggiunti = PUNTI_MURO + PUNTI_PENSIERO;
  }

  const resoconto = await caricaProgresso(utente.id);
  return { xpAggiunti, resoconto, stato: statoLivello(resoconto.totaleXp) };
}

/** Utente attualmente loggato (se loggato), altrimenti null. */
export async function utenteCorrente() {
  const { data } = await getClienteAuth().auth.getUser();
  return data.user ?? null;
}
