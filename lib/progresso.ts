import { getClienteAuth } from "@/lib/clienteAuth";

/**
 * Progressi dell'utente sui muri — SENZA sistema di punti/livelli.
 *
 * Il vecchio sistema (XP, livelli, bonus, stili a sblocco progressivo) è stato
 * eliminato: qui restano solo i conteggi di base, cioè quali muri l'utente ha
 * visitato e quanti pensieri ha lasciato. Servono a "I tuoi muri" (elenco dei
 * muri dell'account) e alle statistiche del profilo.
 *
 * La tabella `progresso_muri` conserva la colonna `xp` (inutilizzata, tenuta a 0)
 * per non rompere i client già in produzione durante il passaggio.
 */

export type RigaProgresso = {
  id: string;
  utente_id: string;
  luogo: string;
  pensieri: number;
  prima_visita: string;
};

export type ResocontoProgresso = {
  righe: RigaProgresso[];
};

/**
 * Carica i muri visitati dall'utente (una riga per muro) con il numero di
 * pensieri lasciati.
 */
export async function caricaProgresso(
  utenteId: string
): Promise<ResocontoProgresso> {
  const supabase = getClienteAuth();
  const { data, error } = await supabase
    .from("progresso_muri")
    .select("id, utente_id, luogo, pensieri, prima_visita")
    .eq("utente_id", utenteId);

  if (error) throw new Error("Impossibile caricare i muri dell'account.");
  return { righe: (data ?? []) as RigaProgresso[] };
}

/**
 * Registra la visita a un muro (una sola volta per muro). Non assegna punti.
 * Ritorna true se la riga è stata creata ora, false se il muro era già noto
 * o se l'utente non è loggato.
 */
export async function registraVisita(luogo: string): Promise<boolean> {
  const utente = await utenteCorrente();
  if (!utente) return false;

  const supabase = getClienteAuth();
  const esistente = await supabase
    .from("progresso_muri")
    .select("id")
    .eq("utente_id", utente.id)
    .eq("luogo", luogo)
    .maybeSingle();

  if (esistente.data) return false;

  const { error } = await supabase.from("progresso_muri").insert({
    utente_id: utente.id,
    luogo,
    xp: 0,
    pensieri: 0,
    prima_visita: new Date().toISOString(),
  });
  if (error) throw new Error("Impossibile registrare la visita.");
  return true;
}

/**
 * Registra un pensiero lasciato su un muro: incrementa il conteggio, creando la
 * riga se serve. Non assegna punti. Silenzioso se l'utente non è loggato.
 */
export async function registraPensiero(luogo: string): Promise<void> {
  const utente = await utenteCorrente();
  if (!utente) return;

  const supabase = getClienteAuth();
  const riga = await supabase
    .from("progresso_muri")
    .select("id, pensieri")
    .eq("utente_id", utente.id)
    .eq("luogo", luogo)
    .maybeSingle();

  if (riga.data) {
    await supabase
      .from("progresso_muri")
      .update({ pensieri: riga.data.pensieri + 1 })
      .eq("id", riga.data.id);
  } else {
    await supabase.from("progresso_muri").insert({
      utente_id: utente.id,
      luogo,
      xp: 0,
      pensieri: 1,
      prima_visita: new Date().toISOString(),
    });
  }
}

/** Utente attualmente loggato (se loggato), altrimenti null. */
export async function utenteCorrente() {
  const { data } = await getClienteAuth().auth.getUser();
  return data.user ?? null;
}
