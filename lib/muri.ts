import { getSupabase } from "@/lib/supabase";

export type Muro = {
  slug: string;
  nome: string;
  foto_url: string | null;
  /** 'evento' | 'principale' — presente dopo la migrazione 0023. */
  tipo?: "evento" | "principale" | null;
  /** 'aperto' | 'chiuso' — presente dopo la migrazione 0023. */
  stato?: "aperto" | "chiuso" | null;
  /** Il collettivo a cui appartiene il muro (null = muro classico). */
  collettivo_id?: string | null;
  /** Inizio/fine dell'evento (data + ora) — presenti dopo la migrazione 0029. */
  data_inizio?: string | null;
  data_fine?: string | null;
};

const COLONNE_COMPLETE =
  "slug, nome, foto_url, tipo, stato, collettivo_id, data_inizio, data_fine";
const COLONNE_ESTESE = "slug, nome, foto_url, tipo, stato, collettivo_id";
const COLONNE_BASE = "slug, nome, foto_url";

/**
 * Carica la scheda di un muro (nome + foto + modello collettivo) dal database.
 * Prova le colonne piu' ricche e scende a quelle essenziali quando una
 * migrazione non e' ancora stata applicata (colonne inizio/fine, 0029; modello
 * collettivo, 0023). Se la tabella muri non esiste ritorna null senza errori.
 */
export async function caricaMuro(slug: string): Promise<Muro | null> {
  for (const colonne of [COLONNE_COMPLETE, COLONNE_ESTESE, COLONNE_BASE]) {
    try {
      const { data, error } = await getSupabase()
        .from("muri")
        .select(colonne)
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return (data as Muro | null) ?? null;
    } catch {
      // Prova la variante successiva.
    }
  }
  return null;
}
