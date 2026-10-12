import { getSupabase } from "@/lib/supabase";

/**
 * Categorie dei creator/collettivi (tabella public.categorie_creator, 0021).
 * La lista e' gestita dall'admin; l'app la legge per mostrare nome + emoji.
 * Se la migrazione non e' ancora stata eseguita, la funzione ritorna una
 * lista vuota senza rompere nulla.
 */
export type CategoriaCreator = {
  id: string;
  nome: string;
  emoji: string;
  ordine: number;
  attivo: boolean;
};

const COLONNE = "id, nome, emoji, ordine, attivo";

export async function elencaCategorieCreator(): Promise<CategoriaCreator[]> {
  try {
    const { data, error } = await getSupabase()
      .from("categorie_creator")
      .select(COLONNE)
      .eq("attivo", true)
      .order("ordine", { ascending: true });
    if (error) throw error;
    return (data ?? []) as CategoriaCreator[];
  } catch {
    return [];
  }
}

/** Tutte le categorie, anche quelle disattivate (pannello admin). */
export async function elencaCategorieCreatorAdmin(): Promise<CategoriaCreator[]> {
  try {
    const { data, error } = await getSupabase()
      .from("categorie_creator")
      .select(COLONNE)
      .order("ordine", { ascending: true });
    if (error) throw error;
    return (data ?? []) as CategoriaCreator[];
  } catch {
    return [];
  }
}
