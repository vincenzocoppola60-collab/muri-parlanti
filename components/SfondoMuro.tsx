"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { EVENTO_MURO, urlMuroFirmato } from "@/lib/muriUtente";

/**
 * Sfondo a tutto schermo delle pagine dell'app.
 *
 * Comportamento:
 *   - disegna SEMPRE lo sfondo predefinito (brain.webp) al primo render, cosi'
 *     il server e il primo render del client coincidono e non ci sono
 *     divergenze di idratazione;
 *   - dopo il mount, se chi guarda e' REGISTRATO, prova a caricare il muro
 *     personale e lo sostituisce. L'URL e' firmato e dura 1 ora.
 *
 * `id` = profilo di cui mostrare il muro (visita a /profilo/[id]). Se assente
 * si usa il muro dell'utente connesso. Un OSPITE non autenticato non ottiene
 * mai l'URL firmato: continua a vedere il muro predefinito.
 */
export default function SfondoMuro({ id }: { id?: string }) {
  const { utente, caricamento } = useAuth();
  const [versione, setVersione] = useState(0);

  // Bersaglio effettivo: nessuno finche' non sappiamo chi sta guardando (o se
  // chi guarda non ha un account). Senza bersaglio si usa lo sfondo predefinito.
  const bersaglio =
    caricamento || !utente ? null : (id ?? utente.id ?? null);

  // L'URL firmato e' tenuto INSIEME alla chiave per cui e' stato chiesto: se il
  // bersaglio cambia, il vecchio URL non viene mai mostrato al posto del nuovo.
  const [caricato, setCaricato] = useState<{
    chiave: string;
    url: string | null;
  } | null>(null);

  // Si ricarica quando cambia il bersaglio e quando un editor salva.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const alCambio = () => setVersione((v) => v + 1);
    window.addEventListener(EVENTO_MURO, alCambio);
    return () => window.removeEventListener(EVENTO_MURO, alCambio);
  }, []);

  useEffect(() => {
    if (!bersaglio) return;
    let attivo = true;
    urlMuroFirmato(bersaglio).then((u) => {
      if (attivo) setCaricato({ chiave: bersaglio, url: u });
    });
    return () => {
      attivo = false;
    };
  }, [bersaglio, versione]);

  const url = bersaglio && caricato?.chiave === bersaglio ? caricato.url : null;

  // Classe sul <html>: serve al tema "disegnato" (che nasconde lo sfondo) e ad
  // alleggerire il velo scuro quando c'e' un disegno personale da vedere.
  const personale = !!url;
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("muro-personale", personale);
    return () => {
      document.documentElement.classList.remove("muro-personale");
    };
  }, [personale]);

  return (
    <div
      aria-hidden
      className="sfondo-muro fixed inset-0 -z-20 bg-cover bg-center"
      style={{
        backgroundImage: url ? `url(${url})` : "url(/images/brain.webp)",
      }}
    />
  );
}
