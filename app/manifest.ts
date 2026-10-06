import type { MetadataRoute } from "next";

/**
 * Manifest dell'app: e' quello che permette di "salvare sulla Home" e di
 * aprire Muri Parlanti a schermo intero, senza installazioni tradizionali.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Muri Parlanti",
    short_name: "Muri Parlanti",
    description:
      "I muri della città raccontano storie: scansiona il QR, leggi i pensieri e lascia il tuo.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0c0a09",
    theme_color: "#0c0a09",
    lang: "it",
    dir: "ltr",
    categories: ["social", "lifestyle"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
