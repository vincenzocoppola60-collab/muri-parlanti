import { getSupabase } from "@/lib/supabase";
import { getClienteAuth } from "@/lib/clienteAuth";
import { verificaContenuto } from "@/lib/moderazione";
import { eCodiceFont } from "@/lib/fonti";

export type PostIt = {
  id: string;
  testo: string;
  nickname: string;
  luogo: string;
  creato_il: string;
  /** Id del profilo autore, se il pensiero e' firmato da un account. */
  user_id?: string | null;
  /** URL pubblico della foto allegata al pensiero, se presente. */
  foto_url?: string | null;
  /** Link al brano (Spotify/YouTube/...) allegato al pensiero, se presente. */
  canzone_url?: string | null;
  /**
   * Variante grafica del post-it (1..16), scelta dall'amministratore.
   * null / assente = design classico (sfondo + nastro). Vedi StilePostit.tsx.
   */
  stile?: number | null;
  /**
   * Codice del font del testo (es. "caveat", "rock-salt"). null / assente =
   * font predefinito. Vedi lib/fonti.ts.
   */
  font?: string | null;
};

export type EsitoPostIt =
  | { ok: true; postit: PostIt }
  | { ok: false; errore: string };

export const MAX_TESTO = 500;
export const MAX_NICKNAME = 30;
const LIMITE_MURO = 150;

/** Bucket di storage che contiene le foto allegate ai pensieri. */
export const BUCKET_FOTO_POSTIT = "foto-postit";

export type RigaConProfilo = PostIt & { profili?: unknown };

/**
 * Estrae il nickname dall'embed profili. A seconda dei tipi generati dal
 * client Supabase l'embed arriva come oggetto o come array: accettiamo
 * entrambe le forme, altrimenti manteniamo il nickname salvato sul post-it.
 */
function nomeDaProfilo(profili: unknown): string | null {
  if (Array.isArray(profili)) {
    const primo = profili[0] as { nickname?: string } | undefined;
    return primo?.nickname ?? null;
  }
  if (profili && typeof profili === "object") {
    const oggetto = profili as { nickname?: string };
    return oggetto.nickname ?? null;
  }
  return null;
}

/** Se l'autore ha un profilo, mostra il nickname aggiornato del profilo. */
export function conNomeProfilo(riga: RigaConProfilo): PostIt {
  return { ...riga, nickname: nomeDaProfilo(riga.profili) ?? riga.nickname };
}

/**
 * Carica i pensieri di un muro, dal piu' recente.
 * Usa `select("*")` cosi' funziona sia con la colonna foto_url (migrazione
 * 0008) sia senza. Prova a unire il profilo dell'autore (nickname sempre
 * aggiornato); se la migrazione 0005 non e' ancora stata eseguita ricade sul
 * select semplice.
 */
export async function caricaPostit(luogo: string): Promise<PostIt[]> {
  try {
    const { data, error } = await getSupabase()
      .from("postit")
      .select("*, profili:user_id(nickname)")
      .eq("luogo", luogo)
      .order("creato_il", { ascending: false })
      .limit(LIMITE_MURO);
    if (error) throw error;
    return (data ?? []).map(conNomeProfilo);
  } catch {
    const { data } = await getSupabase()
      .from("postit")
      .select("*")
      .eq("luogo", luogo)
      .order("creato_il", { ascending: false })
      .limit(LIMITE_MURO);
    return (data ?? []) as PostIt[];
  }
}

/** Conteggio reale dei pensieri di un muro (tutti, non solo i primi 150). */
export async function contaPostit(luogo: string): Promise<number> {
  const { count, error } = await getSupabase()
    .from("postit")
    .select("id", { count: "exact", head: true })
    .eq("luogo", luogo);

  if (error) throw new Error("Impossibile contare i pensieri.");
  return count ?? 0;
}

/** Conteggio per ogni muro (per la home). */
export async function contaPerLuogo(): Promise<Record<string, number>> {
  const { data, error } = await getSupabase().from("postit").select("luogo");

  if (error) throw new Error("Impossibile contare i pensieri.");

  const conteggi: Record<string, number> = {};
  for (const riga of data ?? []) {
    conteggi[riga.luogo] = (conteggi[riga.luogo] ?? 0) + 1;
  }
  return conteggi;
}

/**
 * Client per la pubblicazione: nel browser usa quello con la sessione
 * persistente, cosi' la firma user_id = auth.uid() supera la RLS.
 * (Il client getSupabase() non ha sessione: un insert firmato veniva
 * rifiutato dalla policy e ripubblicato in anonimo senza avviso.)
 */
function clientePubblicazione() {
  if (typeof window !== "undefined") return getClienteAuth();
  return getSupabase();
}

/** Estensione file dedotta dal tipo MIME (o dal nome), ripiegando su jpg. */
function estensioneFoto(file: File | Blob): string {
  const tipo = (file as File).type ?? "";
  if (tipo.includes("png")) return "png";
  if (tipo.includes("webp")) return "webp";
  if (tipo.includes("jpeg") || tipo.includes("jpg")) return "jpg";
  const nome = (file as File).name;
  if (nome && nome.includes(".")) return nome.split(".").pop()!.toLowerCase();
  return "jpg";
}

/** Nome di file univoco, senza caratteri strani. */
function nomeUnico(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Carica la foto di un pensiero e ritorna l'URL pubblico da salvare su
 * postit.foto_url. Deve essere chiamata dal browser (usa la sessione).
 */
export async function caricaFotoPostit(
  file: File | Blob,
  luogo: string
): Promise<string> {
  const supabase = clientePubblicazione();
  const percorso = `${luogo}/${nomeUnico()}.${estensioneFoto(file)}`;

  const { error } = await supabase.storage
    .from(BUCKET_FOTO_POSTIT)
    .upload(percorso, file, {
      upsert: false,
      contentType: file.type || "image/jpeg",
    });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage
    .from(BUCKET_FOTO_POSTIT)
    .getPublicUrl(percorso);
  return data.publicUrl;
}

async function inserisci(
  riga: Record<string, unknown>
): Promise<EsitoPostIt> {
  const { data, error } = await clientePubblicazione()
    .from("postit")
    .insert(riga)
    .select("*")
    .single();

  if (error || !data) {
    // Il trigger di moderazione (migrazione 0013) rifiuta il contenuto con un
    // messaggio marcato "muri_moderazione:<motivo>": qui lo trasformiamo in un
    // avviso pulito invece dell'errore generico. (Il controllo client di solito
    // intercetta prima, questa e' la rete di sicurezza lato server.)
    if (error?.message?.includes("muri_moderazione")) {
      return {
        ok: false,
        errore: "Il contenuto non rispetta le regole del muro e non e' stato pubblicato.",
      };
    }
    // Il trigger di sblocco stili (migrazione 0016) rifiuta uno stile non
    // ancora sbloccato per il livello dell'autore.
    if (error?.message?.includes("muri_stile")) {
      return {
        ok: false,
        errore: "Lo stile scelto non e' sbloccato per il tuo livello.",
      };
    }
    return {
      ok: false,
      errore: "Non sono riuscito ad attaccare il Post-it. Riprova.",
    };
  }
  return { ok: true, postit: data as PostIt };
}

/**
 * Attacca un pensiero al muro.
 * La data e' generata automaticamente dal database (default now()).
 * userId: se presente il pensiero resta firmato dall'account (nome
 * cliccabile verso il profilo); la riga viene verificata da RLS.
 * fotoUrl: se presente allega la foto al pensiero.
 * canzoneUrl: se presente allega il brano (link gia' riconosciuto).
 *
 * I tentativi vanno dal piu' completo al piu' compatibile: se una colonna
 * non esiste ancora (migrazione 0005, 0008, 0012 o 0014 non eseguita) si
 * riprova senza, per non bloccare mai la pubblicazione del testo.
 *
 * stile: variante grafica (1..16), riservata all'amministratore. Se la
 * colonna non esiste ancora (migrazione 0014 non eseguita) il post-it viene
 * pubblicato comunque con il design classico.
 *
 * font: codice del font del testo (vedi lib/fonti.ts). Se la colonna non
 * esiste ancora (migrazione 0017 non eseguita) il post-it viene pubblicato
 * comunque con il font predefinito.
 */
export async function attaccaPostit(input: {
  testo: string;
  nickname: string;
  luogo: string;
  userId?: string | null;
  fotoUrl?: string | null;
  canzoneUrl?: string | null;
  stile?: number | null;
  font?: string | null;
}): Promise<EsitoPostIt> {
  const testo = input.testo.trim();
  if (!testo) {
    return { ok: false, errore: "Scrivi un pensiero prima di attaccarlo." };
  }
  if (testo.length > MAX_TESTO) {
    return {
      ok: false,
      errore: `Il pensiero e' troppo lungo (max ${MAX_TESTO} caratteri).`,
    };
  }

  const nickname = input.nickname.trim().slice(0, MAX_NICKNAME) || "Anonimo";

  // Filtro contenuti (NSFW / linguaggio / link): barriera lato client.
  // La stessa regola e' replicata nel database (migrazione 0013), perche'
  // l'insert parte dal browser e questa non e' l'unica difesa.
  const moderazione = verificaContenuto({ testo, nickname });
  if (!moderazione.ok) {
    return { ok: false, errore: moderazione.errore };
  }

  const userId = input.userId ?? null;
  const fotoUrl = input.fotoUrl ?? null;
  const canzoneUrl = input.canzoneUrl ?? null;
  const stile =
    input.stile == null || !Number.isFinite(Math.round(Number(input.stile)))
      ? null
      : Math.round(Number(input.stile));
  // Si invia il font solo se e' un codice noto (vedi lib/fonti.ts).
  const fontOk = eCodiceFont(input.font);
  const base: Record<string, unknown> = {
    testo,
    nickname,
    luogo: input.luogo,
  };

  // Colonne facoltative presenti su questa riga (dipendono dalle migrazioni).
  const opzionali: Record<string, unknown>[] = [];
  if (userId) opzionali.push({ user_id: userId });
  if (fotoUrl) opzionali.push({ foto_url: fotoUrl });
  if (canzoneUrl) opzionali.push({ canzone_url: canzoneUrl });
  if (stile != null) opzionali.push({ stile });
  if (fontOk) opzionali.push({ font: input.font });

  // Tentativi dal piu' completo al piu' compatibile: un sottoinsieme per
  // ogni combinazione di colonne facoltative, cosi' se una colonna non esiste
  // ancora si riprova senza, senza mai perdere il testo scritto.
  const tentativi: Record<string, unknown>[] = [];
  for (let mask = (1 << opzionali.length) - 1; mask >= 0; mask--) {
    const riga: Record<string, unknown> = { ...base };
    for (let i = 0; i < opzionali.length; i++) {
      if (mask & (1 << i)) Object.assign(riga, opzionali[i]);
    }
    tentativi.push(riga);
  }

  let ultimo: EsitoPostIt = {
    ok: false,
    errore: "Non sono riuscito ad attaccare il Post-it. Riprova.",
  };
  for (const riga of tentativi) {
    const esito = await inserisci(riga);
    if (esito.ok) return esito;
    ultimo = esito;
  }
  return ultimo;
}
