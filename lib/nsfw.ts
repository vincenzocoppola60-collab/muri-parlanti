"use client";

/**
 * Rilevamento di contenuti sessuali nelle immagini caricate (lato client).
 *
 * Usiamo NSFWJS (rete neurale MobileNetV2) direttamente nel browser: la foto
 * non esce dal dispositivo per essere classificata. Il modello pesa qualche
 * MB, quindi viene importato solo alla prima foto scelta (dynamic import) e
 * caricato una volta sola per tutta la sessione.
 *
 * La classificazione e' una barriera in piu': se il modello non e'
 * disponibile (offline, browser senza canvas, ecc.) NON blocchiamo l'utente,
 * perche' il compito di questo filtro e' scoraggiare gli abusi, non rendere
 * impossibile pubblicare una foto legittima. La barriera autorevole resta
 * lato server (vedi la migrazione 0013 e le policy Supabase).
 */

/** Previsione del classificatore: etichetta e probabilita' (0-1). */
type Previsione = { className: string; probability: number };

/** Forma minima del modello che ci serve (evita di importare i tipi a monte). */
type Modello = {
  classify: (img: unknown, ...rest: unknown[]) => Promise<Previsione[]>;
};

/** Etichette "adulte" prodotte da NSFWJS (le altre sono Neutral/Drawing). */
const CLASSI_NSFW = new Set(["Porn", "Hentai", "Sexy"]);

/**
 * Soglia (0-1) oltre la quale l'immagine viene ritenuta NSFW.
 * Volutamente alta per non bloccare foto innocue (spiagge, neonati, ecc.).
 */
const SOGLIA = 0.75;

/** Istanza del modello, caricata una volta sola e condivisa (lazy). */
let modelloPromise: Promise<Modello> | null = null;

async function caricaModello(): Promise<Modello> {
  if (!modelloPromise) {
    modelloPromise = (async () => {
      const nsfwjs = await import("nsfwjs");
      return (await nsfwjs.load()) as unknown as Modello;
    })();
  }
  return modelloPromise;
}

/** Prepara il blob come sorgente classificabile dal modello. */
async function sorgente(blob: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(blob);
  }
  // Ripiego per i browser senza createImageBitmap.
  const url = URL.createObjectURL(blob);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("immagine non leggibile"));
      img.src = url;
    });
  } finally {
    // L'immagine e' gia' decodificata: possiamo liberare l'URL.
    URL.revokeObjectURL(url);
  }
}

/**
 * Ritorna true se l'immagine sembra di natura sessuale.
 *
 * In caso di errore (modello non caricabile, ambiente senza canvas, ecc.)
 * ritorna false: non bloccare mai un utente legittimo per un problema nostro.
 */
export async function immagineNsfw(blob: Blob): Promise<boolean> {
  try {
    const modello = await caricaModello();
    const img = await sorgente(blob);
    let previsioni: Previsione[];
    try {
      previsioni = await modello.classify(img);
    } finally {
      if (typeof ImageBitmap !== "undefined" && img instanceof ImageBitmap) {
        img.close();
      }
    }
    return previsioni.some(
      (p) => CLASSI_NSFW.has(p.className) && p.probability >= SOGLIA
    );
  } catch {
    return false;
  }
}
