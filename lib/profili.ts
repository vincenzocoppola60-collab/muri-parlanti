import { getSupabase } from "@/lib/supabase";
import { getClienteAuth } from "@/lib/clienteAuth";
import {
  conNomeProfilo,
  type PostIt,
  type RigaConProfilo,
} from "@/lib/postit";

export type Profilo = {
  id: string;
  nickname: string;
  bio: string | null;
  foto_url: string | null;
  mostra_postit: boolean;
  creato_il: string;
  aggiornato_il: string;
};

export const MAX_BIO = 200;
export const MAX_NICK_PROFILO = 30;

/**
 * Errore tipico quando la tabella/bucket non esiste ancora:
 * significa che la migrazione 0005_profili.sql non e' stata eseguita.
 */
const SEGNALE_MIGRAZIONE = /PGRST205|schema cache|does not exist|relation .* does not exist/i;

export const MESSAGGIO_MIGRAZIONE =
  "Il database non e' ancora aggiornato per i profili. Esegui supabase/migrations/0005_profili.sql nell'SQL Editor di Supabase.";

/** URL dell'avatar con versione per aggirare la cache dopo un cambio foto. */
export function urlAvatar(
  profilo: Pick<Profilo, "foto_url" | "aggiornato_il"> | null
): string | null {
  if (!profilo?.foto_url) return null;
  const versione = Date.parse(profilo.aggiornato_il);
  return Number.isFinite(versione)
    ? `${profilo.foto_url}?v=${versione}`
    : profilo.foto_url;
}

/** Carica un profilo pubblico (lato server o client). Null se assente/errore. */
export async function caricaProfilo(id: string): Promise<Profilo | null> {
  try {
    const { data, error } = await getSupabase()
      .from("profili")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) return null;
    return (data as Profilo) ?? null;
  } catch {
    return null;
  }
}

/** Profilo dell'utente con sessione attiva (solo client). */
export async function caricaMioProfilo(): Promise<{
  profilo: Profilo | null;
  mancaMigrazione: boolean;
}> {
  try {
    const supabase = getClienteAuth();
    const { data } = await supabase.auth.getUser();
    const utente = data.user;
    if (!utente) return { profilo: null, mancaMigrazione: false };
    const { data: riga, error } = await supabase
      .from("profili")
      .select("*")
      .eq("id", utente.id)
      .maybeSingle();
    if (error) {
      return {
        profilo: null,
        mancaMigrazione: SEGNALE_MIGRAZIONE.test(error.message),
      };
    }
    return { profilo: (riga as Profilo) ?? null, mancaMigrazione: false };
  } catch {
    return { profilo: null, mancaMigrazione: false };
  }
}

export type EsitoSalva =
  | { ok: true; profilo: Profilo }
  | { ok: false; errore: string };

/**
 * Salva (o crea) il profilo dell'utente connesso.
 * foto_url opzionale: se omessa resta quella gia' salvata (update)
 * o diventa null (insert da profilo mai creato).
 */
export async function salvaMioProfilo(patch: {
  nickname: string;
  bio: string;
  mostra_postit: boolean;
  foto_url?: string | null;
}): Promise<EsitoSalva> {
  try {
    const supabase = getClienteAuth();
    const { data } = await supabase.auth.getUser();
    const utente = data.user;
    if (!utente) return { ok: false, errore: "Accedi per modificare il profilo." };

    const riga: Record<string, unknown> = {
      id: utente.id,
      nickname: patch.nickname.trim().slice(0, MAX_NICK_PROFILO) || "Anonimo",
      bio: patch.bio.trim().slice(0, MAX_BIO) || null,
      mostra_postit: patch.mostra_postit,
      aggiornato_il: new Date().toISOString(),
    };
    if (patch.foto_url !== undefined) riga.foto_url = patch.foto_url;

    const { data: nuovo, error } = await supabase
      .from("profili")
      .upsert(riga)
      .select("*")
      .single();

    if (error) {
      return {
        ok: false,
        errore: SEGNALE_MIGRAZIONE.test(error.message)
          ? MESSAGGIO_MIGRAZIONE
          : "Salvataggio non riuscito. Riprova.",
      };
    }

    // Allinea il nickname ai metadati (usato dall'editor dei post-it).
    const nickPrecedente = (utente.user_metadata?.nickname as string | undefined) ?? "";
    if (riga.nickname !== nickPrecedente) {
      await supabase.auth.updateUser({ data: { nickname: riga.nickname } });
    }

    return { ok: true, profilo: nuovo as Profilo };
  } catch {
    return { ok: false, errore: "Errore di rete. Riprova." };
  }
}

export type EsitoAvatar = { ok: true; url: string } | { ok: false; errore: string };

/** Ridimensiona l'immagine a quadrato 512px e la comprime in JPEG. */
async function preparaAvatar(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const lato = 512;
  const scala = Math.min(1, lato / Math.max(bitmap.width, bitmap.height));
  const latoFinale = Math.max(1, Math.round(Math.min(bitmap.width, bitmap.height) * scala));
  const sx = (bitmap.width - latoFinale) / 2;
  const sy = (bitmap.height - latoFinale) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = lato;
  canvas.height = lato;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, lato, lato);
  ctx.drawImage(bitmap, sx, sy, latoFinale, latoFinale, 0, 0, lato, lato);

  return new Promise<Blob>((risolvi, rifiuta) => {
    canvas.toBlob(
      (blob) => (blob ? risolvi(blob) : rifiuta(new Error("blob"))),
      "image/jpeg",
      0.85
    );
  });
}

/** Carica nel bucket "avatar" un blob già pronto (JPEG quadrato dal ritaglio). */
export async function caricaAvatarBlob(blob: Blob): Promise<EsitoAvatar> {
  try {
    const supabase = getClienteAuth();
    const { data } = await supabase.auth.getUser();
    const utente = data.user;
    if (!utente) return { ok: false, errore: "Accedi prima di caricare la foto." };

    const percorso = `${utente.id}/avatar`;
    const { error } = await supabase.storage
      .from("avatar")
      .upload(percorso, blob, { contentType: "image/jpeg", upsert: true });

    if (error) {
      return {
        ok: false,
        errore: SEGNALE_MIGRAZIONE.test(error.message)
          ? MESSAGGIO_MIGRAZIONE
          : "Caricamento non riuscito. Riprova.",
      };
    }

    const { data: pubblico } = supabase.storage.from("avatar").getPublicUrl(percorso);
    return { ok: true, url: pubblico.publicUrl };
  } catch {
    return { ok: false, errore: "Errore di rete. Riprova." };
  }
}

/** Fallback senza ritaglio interattivo: centra l'immagine e ritaglia in quadrato. */
export async function caricaAvatar(file: File): Promise<EsitoAvatar> {
  if (!/^image\/(png|jpeg|jpg|webp)$/i.test(file.type)) {
    return { ok: false, errore: "Formato non supportato: usa JPG, PNG o WebP." };
  }
  if (file.size > 8 * 1024 * 1024) {
    return { ok: false, errore: "Immagine troppo grande (max 8MB)." };
  }
  try {
    const blob = await preparaAvatar(file);
    return await caricaAvatarBlob(blob);
  } catch {
    return { ok: false, errore: "Immagine non leggibile. Riprova." };
  }
}

/** Rimuove l'avatar dallo storage (la foto_url va svuotata con salvaMioProfilo). */
export async function rimuoviAvatarFile(): Promise<{ ok: boolean; errore?: string }> {
  try {
    const supabase = getClienteAuth();
    const { data } = await supabase.auth.getUser();
    const utente = data.user;
    if (!utente) return { ok: false, errore: "Accedi prima di procedere." };
    const { error } = await supabase.storage
      .from("avatar")
      .remove([`${utente.id}/avatar`]);
    if (error && !SEGNALE_MIGRAZIONE.test(error.message)) {
      return { ok: false, errore: "Rimozione non riuscita. Riprova." };
    }
    return { ok: true };
  } catch {
    return { ok: false, errore: "Errore di rete. Riprova." };
  }
}

/** Post-it lasciati da un utente (pagina profilo pubblico, lato server). */
export async function caricaPostitDiUtente(userId: string, limite = 60): Promise<PostIt[]> {
  try {
    const { data, error } = await getSupabase()
      .from("postit")
      .select("id, testo, nickname, luogo, creato_il, profili:user_id(nickname)")
      .eq("user_id", userId)
      .order("creato_il", { ascending: false })
      .limit(limite);
    if (error) return [];
    return (data ?? []).map((r) => conNomeProfilo(r as RigaConProfilo));
  } catch {
    return [];
  }
}

/** Numero totale di post-it lasciati da un utente. */
export async function contaPostitDiUtente(userId: string): Promise<number> {
  try {
    const { count, error } = await getSupabase()
      .from("postit")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

/** I post-it dell'utente connesso (pagina impostazioni, lato client). */
export async function caricaMieiPostit(limite = 100): Promise<PostIt[]> {
  try {
    const supabase = getClienteAuth();
    const { data } = await supabase.auth.getUser();
    const utente = data.user;
    if (!utente) return [];
    const { data: righe, error } = await supabase
      .from("postit")
      .select("id, testo, nickname, luogo, creato_il, user_id, profili:user_id(nickname)")
      .eq("user_id", utente.id)
      .order("creato_il", { ascending: false })
      .limit(limite);
    if (error) return [];
    return (righe ?? []).map((r) => conNomeProfilo(r as RigaConProfilo));
  } catch {
    return [];
  }
}
