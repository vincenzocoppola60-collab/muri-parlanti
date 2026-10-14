"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { elencaMuri, muroPerPosizione } from "@/lib/admin";
import { useLingua } from "@/lib/i18n";

type Stato =
  | "cerco-posizione"
  | "cerco-zona"
  | "trovato"
  | "fuori-zona"
  | "posizione-negata"
  | "errore";

/**
 * Pagina del QR UNICO.
 *
 * In giro c'e' un solo codice che punta sempre qui. L'app chiede la posizione
 * e apre il muro SOLO se ti trovi dentro la zona disegnata dall'amministratore.
 * Se sei fuori zona non mostra nessun elenco: invita ad avvicinarsi e
 * riscansionare. Nessuna "ricerca dei muri vicini".
 */
export default function Apri() {
  const { t } = useLingua();
  const router = useRouter();
  const [stato, setStato] = useState<Stato>("cerco-posizione");
  const [trovato, setTrovato] = useState<string | null>(null);
  const [messaggio, setMessaggio] = useState("");

  useEffect(() => {
    let vivo = true;

    async function avvia() {
      // 1. Carica i muri (lettura pubblica).
      const lista = await elencaMuri();
      if (!vivo) return;

      // 2. Chiedi la posizione.
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        setStato("posizione-negata");
        setMessaggio(t("apri.noGeo"));
        return;
      }

      setStato("cerco-zona");
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!vivo) return;
          const { latitude, longitude } = pos.coords;

          const muro = muroPerPosizione(latitude, longitude, lista);
          if (muro) {
            setTrovato(muro.slug);
            setStato("trovato");
            router.replace(`/muro/${muro.slug}`);
          } else {
            setStato("fuori-zona");
            setMessaggio(t("apri.fuoriZona"));
          }
        },
        () => {
          if (!vivo) return;
          setStato("posizione-negata");
          setMessaggio(t("apri.posNegata"));
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
      );
    }

    avvia().catch(() => vivo && setStato("errore"));
    return () => {
      vivo = false;
    };
  }, [router, t]);

  return (
    <main className="relative flex min-h-dvh flex-col items-center px-6 py-16 text-center">
      <div
        aria-hidden
        className="fixed inset-0 -z-20 bg-cover bg-center"
        style={{ backgroundImage: "url(/images/brain.webp)" }}
      />
      <div aria-hidden className="fixed inset-0 -z-10 bg-stone-950/85" />

      <h1 className="font-scritta text-4xl text-amber-100">
        {t("apri.titolo")}
      </h1>

      {stato === "cerco-posizione" && (
        <p className="scritta-sistema mt-4 max-w-md">
          {t("apri.cercoPos")}
        </p>
      )}

      {stato === "cerco-zona" && (
        <p className="scritta-sistema mt-4 max-w-md">
          {t("apri.cercoMuro")}
        </p>
      )}

      {stato === "trovato" && trovato && (
        <p className="scritta-sistema mt-4 max-w-md">
          {t("apri.trovato", { slug: trovato })}
        </p>
      )}

      {stato === "errore" && (
        <p className="mt-4 max-w-md text-red-300">
          {t("apri.errore")}
        </p>
      )}

      {(stato === "fuori-zona" || stato === "posizione-negata") && (
        <p className="scritta-sistema mt-4 max-w-md">{messaggio}</p>
      )}

      <Link
        href="/"
        className="mt-8 rounded-full border border-amber-100/30 px-5 py-2 text-sm text-amber-100 transition hover:bg-amber-100/10"
      >
        {t("apri.home")}
      </Link>
    </main>
  );
}
