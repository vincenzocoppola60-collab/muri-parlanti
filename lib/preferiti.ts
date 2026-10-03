import { getClienteAuth } from "@/lib/clienteAuth";

export type Preferito = {
  id: string;
  postit_id: string;
  luogo: string;
  testo: string;
  nickname: string;
  creato_il: string;
};

/** Carica tutti i post-it preferiti dell'utente, dal più recente. */
export async function caricaPreferiti(utenteId: string): Promise<Preferito[]> {
  const { data, error } = await getClienteAuth()
    .from("preferiti")
    .select("id, postit_id, luogo, testo, nickname, creato_il")
    .eq("utente_id", utenteId)
    .order("creato_il", { ascending: false });

  if (error) throw new Error("Impossibile caricare i preferiti.");
  return (data ?? []) as Preferito[];
}

/** Insieme degli id dei post-it preferiti (per evidenziare i cuori sui muri). */
export async function idPreferiti(utenteId: string): Promise<Set<string>> {
  const { data, error } = await getClienteAuth()
    .from("preferiti")
    .select("postit_id")
    .eq("utente_id", utenteId);

  if (error) throw new Error("Impossibile caricare i preferiti.");
  return new Set((data ?? []).map((r: { postit_id: string }) => r.postit_id));
}

export type EsitoPreferito = {
  preferito: boolean;
  /** Lista aggiornata (solo dopo un'aggiunta). */
  lista?: Preferito[];
};

/**
 * Salva o rimuove un post-it dai preferiti.
 * Ritorna lo stato aggiornato; lancia un errore descrittivo se l'operazione fallisce.
 */
export async function alternaPreferito(
  utenteId: string,
  postit: { id: string; testo: string; nickname: string; luogo: string }
): Promise<EsitoPreferito> {
  const supabase = getClienteAuth();

  const esistente = await supabase
    .from("preferiti")
    .select("id")
    .eq("utente_id", utenteId)
    .eq("postit_id", postit.id)
    .maybeSingle();

  if (esistente.data) {
    const { error } = await supabase
      .from("preferiti")
      .delete()
      .eq("id", esistente.data.id);
    if (error) throw new Error("Impossibile rimuovere il preferito.");
    return { preferito: false };
  }

  const { data, error } = await supabase
    .from("preferiti")
    .insert({
      utente_id: utenteId,
      postit_id: postit.id,
      luogo: postit.luogo,
      testo: postit.testo,
      nickname: postit.nickname,
    })
    .select("id, postit_id, luogo, testo, nickname, creato_il")
    .single();

  if (error) throw new Error("Impossibile salvare il preferito.");
  return { preferito: true, lista: [data as Preferito] };
}

/** Rimuove un preferito dalla sua riga (usato dal profilo). */
export async function rimuoviPreferito(utenteId: string, id: string): Promise<void> {
  const { error } = await getClienteAuth()
    .from("preferiti")
    .delete()
    .eq("utente_id", utenteId)
    .eq("id", id);
  if (error) throw new Error("Impossibile rimuovere il preferito.");
}
