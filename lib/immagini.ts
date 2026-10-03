"use client";

/**
 * Ridimensiona e comprime un'immagine nel browser, prima del caricamento.
 *
 * Perche': le foto scattate dal telefono pesano spesso 3-8 MB e supererebbero
 * il limite di 5 MB del bucket. Qui riduciamo il lato piu' lungo a `maxLato`
 * px e riesportiamo in JPEG, cosi' il caricamento e' veloce anche su rete
 * mobile. Se qualcosa non e' disponibile (canvas/immagine) o il risultato non
 * conviene, ritorniamo il file originale senza bloccare nulla.
 */
export async function comprimiImmagine(
  file: File,
  maxLato = 1600,
  qualita = 0.85
): Promise<File> {
  if (typeof document === "undefined") return file;
  if (!file.type.startsWith("image/")) return file;

  try {
    const sorgente = await caricaSorgente(file);
    const { width, height } = dimensioni(sorgente, maxLato);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(sorgente as CanvasImageSource, 0, 0, width, height);

    const blob = await esporta(canvas, qualita);
    if (!blob) return file;
    // Non peggiorare mai: se la "compressione" pesa piu' dell'originale, tieni l'originale.
    if (blob.size >= file.size) return file;

    const nome = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], nome, { type: blob.type || "image/jpeg" });
  } catch {
    return file;
  }
}

async function caricaSorgente(
  file: File
): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file);
  }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((risolvi, rifiuta) => {
      const img = new Image();
      img.onload = () => risolvi(img);
      img.onerror = () => rifiuta(new Error("Immagine non leggibile"));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function dimensioni(
  sorgente: ImageBitmap | HTMLImageElement,
  maxLato: number
): { width: number; height: number } {
  const w = sorgente.width || 0;
  const h = sorgente.height || 0;
  const scala = w > 0 && h > 0 ? Math.min(1, maxLato / Math.max(w, h)) : 1;
  return {
    width: Math.max(1, Math.round(w * scala)),
    height: Math.max(1, Math.round(h * scala)),
  };
}

function esporta(canvas: HTMLCanvasElement, qualita: number): Promise<Blob | null> {
  return new Promise((risolvi) => {
    canvas.toBlob((blob) => risolvi(blob), "image/jpeg", qualita);
  });
}
