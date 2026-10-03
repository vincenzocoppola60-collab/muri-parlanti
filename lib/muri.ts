import { getSupabase } from "@/lib/supabase";

export type Muro = {
  slug: string;
  nome: string;
  foto_url: string | null;
};

/**
 * Carica la scheda di un muro (nome + foto) dal database.
 * Se la tabella muri non esiste ancora (migrazione 0004 non eseguita)
 * ritorna null senza errori: il muro funziona comunque, solo senza foto.
 */
export async function caricaMuro(slug: string): Promise<Muro | null> {
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from("muri")
      .select("slug, nome, foto_url")
      .eq("slug", slug)
      .maybeSingle();
    return (data as Muro | null) ?? null;
  } catch {
    return null;
  }
}
