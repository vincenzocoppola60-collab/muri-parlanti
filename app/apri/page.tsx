"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  distanzaMetri,
  elencaMuri,
  muroPiuVicino,
  type MuroAdmin,
} from "@/lib/admin";

type Stato =
  | "cerco-posizione"
  | "cerco-muro"
  | "trovato"
  | "nessun-muro"
  | "posizione-negata"
  | "errore";

/**
 * Pagina del QR UNICO.
 *
 * Invece di un QR diverso per ogni muro, in giro c'e' un solo codice che punta
 * sempre qui. L'app chiede la posizione, trova il muro piu' vicino entro il
 * suo raggio di riconoscimento e apre quello. Se non ne trova nessuno (o la
 * posizione e' negata) mostra l'elenco dei muri con la distanza, per scegliere
 * a mano.
 */
export default function Apri() {
  const router = useRouter();
  const [stato, setStato] = useState<Stato>("cerco-posizione");
  const [muri, setMuri] = useState<MuroAdmin[]>([]);
  const [conDistanze, setConDistanze] = useState<
    { muro: MuroAdmin; distanza: number }[]
  >([]);
  const [trovato, setTrovato] = useState<string | null>(null);
  const [messaggio, setMessaggio] = useState("");

  useEffect(() => {
    let vivo = true;

    async function avvia() {
      // 1. Carica i muri (lettura pubblica).
      const lista = await elencaMuri();
      if (!vivo) return;
      setMuri(lista);

      // 2. Chiedi la posizione.
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        setStato("posizione-negata");
        setMessaggio("Questo dispositivo non supporta la geolocalizzazione.");
        return;
      }

      setStato("cerco-muro");
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!vivo) return;
          const { latitude, longitude } = pos.coords;

          const ordinati = lista
            .filter((m) => m.lat !== null && m.lng !== null)
            .map((m) => ({
              muro: m,
              distanza: distanzaMetri(
                latitude,
                longitude,
                m.lat as number,
                m.lng as number
              ),
            }))
            .sort((a, b) => a.distanza - b.distanza);
          setConDistanze(ordinati);

          const vicino = muroPiuVicino(latitude, longitude, lista);
          if (vicino) {
            setTrovato(vicino.muro.slug);
            setStato("trovato");
            router.replace(`/muro/${vicino.muro.slug}`);
          } else {
            setStato("nessun-muro");
            if (lista.length === 0) {
              setMessaggio("Non ci sono ancora muri: chiedi all'autore di crearne uno.");
            } else if (ordinati.length === 0) {
              setMessaggio(
                "Nessun muro ha ancora le coordinate impostate."
              );
            } else {
              setMessaggio(
                "Nessun muro abbastanza vicino. Ecco quelli più vicini a te:"
              );
            }
          }
        },
        () => {
          if (!vivo) return;
          setStato("posizione-negata");
          setMessaggio(
            "Posizione non disponibile. Scegli il muro dall'elenco:"
          );
          const ordinati = lista
            .filter((m) => m.lat !== null && m.lng !== null)
            .map((m) => ({ muro: m, distanza: Number.POSITIVE_INFINITY }));
          setConDistanze(ordinati);
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
      );
    }

    avvia().catch(() => vivo && setStato("errore"));
    return () => {
      vivo = false;
    };
  }, [router]);

  const daMostrare = conDistanze.length
    ? conDistanze
    : muri.map((m) => ({ muro: m, distanza: Number.POSITIVE_INFINITY }));

  return (
    <main className="relative flex min-h-dvh flex-col items-center px-6 py-16 text-center">
      <div
        aria-hidden
        className="fixed inset-0 -z-20 bg-cover bg-center"
        style={{ backgroundImage: "url(/images/brain.webp)" }}
      />
      <div aria-hidden className="fixed inset-0 -z-10 bg-stone-950/85" />

      <h1 className="font-scritta text-4xl text-amber-100">Apri un muro</h1>

      {stato === "cerco-posizione" && (
        <p className="mt-4 max-w-md text-stone-300">
          Un attimo: cerco la tua posizione per capire su quale muro sei…
        </p>
      )}

      {stato === "cerco-muro" && (
        <p className="mt-4 max-w-md text-stone-300">
          Posizione trovata. Cerco il muro più vicino…
        </p>
      )}

      {stato === "trovato" && trovato && (
        <p className="mt-4 max-w-md text-stone-300">
          Muro trovato: apro{" "}
          <span className="text-amber-100">{trovato}</span>…
        </p>
      )}

      {stato === "errore" && (
        <p className="mt-4 max-w-md text-red-300">
          Qualcosa è andato storto. Riprova o scegli il muro dall&apos;elenco.
        </p>
      )}

      {(stato === "nessun-muro" || stato === "posizione-negata") && (
        <>
          <p className="mt-4 max-w-md text-stone-300">{messaggio}</p>
          {daMostrare.length > 0 && (
            <ul className="mt-6 flex w-full max-w-md flex-col gap-3">
              {daMostrare.map(({ muro, distanza }) => (
                <li key={muro.slug}>
                  <Link
                    href={`/muro/${muro.slug}`}
                    className="flex items-center justify-between rounded-lg border border-amber-100/20 bg-stone-900/60 px-5 py-3 text-left shadow-lg backdrop-blur-sm transition hover:border-amber-300"
                  >
                    <span className="font-scritta text-2xl text-amber-100">
                      {muro.nome}
                    </span>
                    {Number.isFinite(distanza) && (
                      <span className="text-xs text-stone-400">
                        {distanza < 1000
                          ? `${Math.round(distanza)} m`
                          : `${(distanza / 1000).toFixed(1)} km`}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <Link
        href="/"
        className="mt-8 rounded-full border border-amber-100/30 px-5 py-2 text-sm text-amber-100 transition hover:bg-amber-100/10"
      >
        ← Home
      </Link>
    </main>
  );
}
