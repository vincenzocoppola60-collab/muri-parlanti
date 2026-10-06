"use client";

import { useEffect, useState } from "react";
import { useLingua } from "@/lib/i18n";

/** Evento non standard di Chrome/Android per proporre l'aggiunta alla Home. */
type EventoInstallazione = Event & {
  prompt: () => Promise<void>;
  userChoice?: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type NavigatorStandalone = Navigator & { standalone?: boolean };

/**
 * Spiega che Muri Parlanti si usa direttamente dal telefono, salvandola
 * sulla Home: si apre a schermo intero, con accesso rapido, senza store.
 * Il pulsante compare solo dove il browser lo permette (Android/Chrome);
 * su iPhone/iPad mostriamo invece le due dita da fare.
 */
export default function InstallaApp() {
  const { t } = useLingua();
  const [evento, setEvento] = useState<EventoInstallazione | null>(null);
  const [installata, setInstallata] = useState(false);
  const [suIos, setSuIos] = useState(false);
  const [fatto, setFatto] = useState(false);

  useEffect(() => {
    // Il server non sa nulla di display-mode ne' di iPhone: leggiamo il browser
    // appena e' pronto, un attimo dopo il primo render (nessun render a catena).
    const id = window.setTimeout(() => {
      // Gia' aperta come app (dalla Home)?
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as NavigatorStandalone).standalone === true;
      setInstallata(standalone);

      const ua = window.navigator.userAgent;
      setSuIos(/iPad|iPhone|iPod/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua));
    }, 0);

    const suProposta = (e: Event) => {
      e.preventDefault(); // rimandiamo la scelta al nostro pulsante
      setEvento(e as EventoInstallazione);
    };
    const suAggiunta = () => {
      setInstallata(true);
      setEvento(null);
      setFatto(true);
    };

    window.addEventListener("beforeinstallprompt", suProposta);
    window.addEventListener("appinstalled", suAggiunta);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("beforeinstallprompt", suProposta);
      window.removeEventListener("appinstalled", suAggiunta);
    };
  }, []);

  async function salvaSullaHome() {
    if (!evento) return;
    try {
      await evento.prompt();
      await evento.userChoice;
    } catch {
      // L'utente ha annullato o il browser non ha risposto: non insistiamo.
    }
    setEvento(null);
  }

  return (
    <section className="rounded-2xl border border-amber-100/20 bg-stone-900/60 p-5 backdrop-blur-sm">
      <h2 className="flex items-center gap-2 font-scritta text-2xl text-amber-100">
        <span aria-hidden>📲</span> {t("pwa.titolo")}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-stone-300">
        {t("pwa.testo")}
      </p>

      {installata || fatto ? (
        <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber-100/25 px-4 py-2 text-xs font-semibold text-amber-100/80">
          <span aria-hidden>✓</span>
          {fatto ? t("pwa.installaFatto") : t("pwa.giaInstallata")}
        </p>
      ) : evento ? (
        <button
          type="button"
          onClick={salvaSullaHome}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-300 px-5 py-2.5 text-sm font-bold text-stone-900 shadow-lg transition hover:scale-105 active:scale-95"
        >
          <span aria-hidden>＋</span>
          {t("pwa.installa")}
        </button>
      ) : suIos ? (
        <p className="mt-4 rounded-xl border border-amber-100/15 bg-stone-950/50 px-4 py-3 text-xs leading-relaxed text-stone-300">
          {t("pwa.ios")}
        </p>
      ) : (
        <p className="mt-4 rounded-xl border border-amber-100/15 bg-stone-950/50 px-4 py-3 text-xs leading-relaxed text-stone-300">
          {t("pwa.altro")}
        </p>
      )}
    </section>
  );
}
