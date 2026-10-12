import { getSupabase } from "@/lib/supabase";
import { getClienteAuth } from "@/lib/clienteAuth";

/**
 * Notifiche in-app (tabella public.notifiche, 0028).
 *
 * Nascono automaticamente dal database quando un creator pubblica un nuovo
 * pensiero sul MURO PRINCIPALE del proprio collettivo: ogni follower riceve
 * una notifica. L'app le legge, le segna come lette e le puo' cancellare.
 *
 * Tutte le funzioni degradano senza errori se la migrazione non e' applicata.
 */

export type Notifica = {
  id: string;
  utente_id: string;
  tipo: string;
  collettivo_id: string | null;
  muro_slug: string | null;
  postit_id: string | null;
  titolo: string;
  testo: string | null;
  letta: boolean;
  creato_il: string;
};

const COLONNE =
  "id, utente_id, tipo, collettivo_id, muro_slug, postit_id, titolo, testo, letta, creato_il";

/** Le notifiche dell'utente collegato, dalla piu' recente. */
export async function elencaNotifiche(limite = 80): Promise<Notifica[]> {
  try {
    const supabase = getClienteAuth();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from("notifiche")
      .select(COLONNE)
      .eq("utente_id", user.id)
      .order("creato_il", { ascending: false })
      .limit(limite);
    if (error) throw error;
    return (data ?? []) as Notifica[];
  } catch {
    return [];
  }
}

/** Quante notifiche non lette ha l'utente collegato (badge nel menu). */
export async function contaNonLette(): Promise<number> {
  try {
    const supabase = getClienteAuth();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return 0;
    const { count, error } = await supabase
      .from("notifiche")
      .select("id", { count: "exact", head: true })
      .eq("utente_id", user.id)
      .eq("letta", false);
    if (error) throw error;
    return count ?? 0;
  } catch {
    return 0;
  }
}

/** Segna una notifica come letta. */
export async function segnaLetta(id: string): Promise<boolean> {
  try {
    const { error } = await getClienteAuth()
      .from("notifiche")
      .update({ letta: true })
      .eq("id", id);
    return !error;
  } catch {
    return false;
  }
}

/** Segna come lette tutte le notifiche dell'utente collegato. */
export async function segnaTutteLette(): Promise<boolean> {
  try {
    const supabase = getClienteAuth();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    const { error } = await supabase
      .from("notifiche")
      .update({ letta: true })
      .eq("utente_id", user.id)
      .eq("letta", false);
    return !error;
  } catch {
    return false;
  }
}

/** Cancella una notifica. */
export async function cancellaNotifica(id: string): Promise<boolean> {
  try {
    const { error } = await getClienteAuth()
      .from("notifiche")
      .delete()
      .eq("id", id);
    return !error;
  } catch {
    return false;
  }
}
