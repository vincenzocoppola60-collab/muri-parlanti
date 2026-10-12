import { getSupabase } from "@/lib/supabase";
import { getClienteAuth } from "@/lib/clienteAuth";

/**
 * Follow di un collettivo (tabella public.follow, 0027).
 *
 * FOLLOWER = utente registrato che segue Ruina (riceve le notifiche dei nuovi
 * pensieri sul muro principale). NON e' un membro del collettivo: i membri
 * sono chi condivide le credenziali dell'account del collettivo.
 *
 * Il follow e' "hard": richiede un account. Tutte le funzioni degradano senza
 * errori se la migrazione non e' ancora stata applicata.
 */

/** True se l'utente collegato segue il collettivo indicato. */
export async function eSeguito(collettivoId: string): Promise<boolean> {
  try {
    const supabase = getClienteAuth();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    const { data, error } = await supabase
      .from("follow")
      .select("collettivo_id")
      .eq("utente_id", user.id)
      .eq("collettivo_id", collettivoId)
      .maybeSingle();
    if (error) throw error;
    return Boolean(data);
  } catch {
    return false;
  }
}

/** Segue il collettivo (account collegato). */
export async function segui(
  collettivoId: string
): Promise<{ ok: true } | { ok: false; errore: string }> {
  try {
    const supabase = getClienteAuth();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, errore: "Accedi per seguire un creator." };
    const { error } = await supabase
      .from("follow")
      .upsert(
        { utente_id: user.id, collettivo_id: collettivoId },
        { onConflict: "utente_id,collettivo_id", ignoreDuplicates: true }
      );
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      errore: e instanceof Error ? e.message : "Operazione non riuscita.",
    };
  }
}

/** Smetti di seguire il collettivo. */
export async function smetti(
  collettivoId: string
): Promise<{ ok: true } | { ok: false; errore: string }> {
  try {
    const supabase = getClienteAuth();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, errore: "Accedi per gestire i follow." };
    const { error } = await supabase
      .from("follow")
      .delete()
      .eq("utente_id", user.id)
      .eq("collettivo_id", collettivoId);
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      errore: e instanceof Error ? e.message : "Operazione non riuscita.",
    };
  }
}

/** Numero di follower di un collettivo (funzione pubblica 0027). */
export async function contaFollower(collettivoId: string): Promise<number> {
  try {
    const { data, error } = await getSupabase().rpc("conta_follower", {
      p_collettivo: collettivoId,
    });
    if (error) throw error;
    return typeof data === "number" ? data : 0;
  } catch {
    return 0;
  }
}

/** Gli id dei collettivi seguiti dall'utente collegato (per "Creator seguiti"). */
export async function collettiviSeguiti(): Promise<string[]> {
  try {
    const supabase = getClienteAuth();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from("follow")
      .select("collettivo_id")
      .eq("utente_id", user.id);
    if (error) throw error;
    return (data ?? []).map((r) => (r as { collettivo_id: string }).collettivo_id);
  } catch {
    return [];
  }
}
