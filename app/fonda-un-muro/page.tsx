"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useAuth } from "@/lib/auth";
import { useLingua } from "@/lib/i18n";
import { contaParole, inviaIdea, PAROLE_MINIME, type Punto } from "@/lib/idee";
import CascataCuori from "@/components/CascataCuori";

// Mappa e festa si caricano solo nel browser.
const MappaPunto = dynamic(() => import("@/components/MappaPunto"), {
  ssr: false,
});

/** Flag locale: la festa (cuori + trombette) parte solo al PRIMO invio. */
const FESTEGGIATO_KEY = "muri-parlanti:fonda-muro-festeggiato";

type Stato = "inattivo" | "invio" | "fatto" | "errore";

export default function FondaUnMuro() {
  const { t } = useLingua();
  const { utente, caricamento } = useAuth();

  const [punto, setPunto] = useState<Punto | null>(null);
  const [centro, setCentro] = useState<Punto | null>(null);
  const [motivo, setMotivo] = useState("");
  const [via, setVia] = useState<string | null>(null);
  const [cercoVia, setCercoVia] = useState(false);

  const [stato, setStato] = useState<Stato>("inattivo");
  const [messaggio, setMessaggio] = useState("");

  const [festa, setFesta] = useState(false);

  const timerVia = useRef<number | null>(null);

  const parole = contaParole(motivo);
  const paroleOk = parole >= PAROLE_MINIME;

  /** Ricava la via dal punto (geocodifica inversa, con un piccolo ritardo). */
  function aggiornaPunto(p: Punto) {
    setPunto(p);
    setVia(null);
    if (timerVia.current) window.clearTimeout(timerVia.current);
    setCercoVia(true);
    timerVia.current = window.setTimeout(async () => {
      try {
        const r = await fetch("/api/geocodifica", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat: p[0], lng: p[1] }),
        });
        const dati = (await r.json().catch(() => null)) as {
          via?: string | null;
        } | null;
        setVia(dati?.via ?? null);
      } catch {
        setVia(null);
      } finally {
        setCercoVia(false);
      }
    }, 450);
  }

  /** Centra la mappa sulla posizione dell'utente (riempie anche il punto). */
  function vaiAllaMiaPosizione() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setMessaggio(t("fonda.noGeo"));
      return;
    }
    setMessaggio("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p: Punto = [
          Number(pos.coords.latitude.toFixed(6)),
          Number(pos.coords.longitude.toFixed(6)),
        ];
        setCentro(p);
        aggiornaPunto(p);
      },
      () => setMessaggio(t("fonda.posNonRilevata")),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function invia(ev: React.FormEvent) {
    ev.preventDefault();
    if (!punto) {
      setStato("errore");
      setMessaggio(t("fonda.errPunto"));
      return;
    }
    if (!paroleOk) {
      setStato("errore");
      setMessaggio(t("fonda.errMotivo", { n: PAROLE_MINIME }));
      return;
    }

    setStato("invio");
    setMessaggio("");
    try {
      const esito = await inviaIdea({
        lat: punto[0],
        lng: punto[1],
        via,
        motivo,
      });
      if (!esito.ok) throw new Error(esito.errore);

      setStato("fatto");

      // Festa SOLO la prima volta che si invia una proposta: leggiamo il
      // flag dal browser qui, senza un effetto che imposta stato.
      let prima = true;
      try {
        prima = !window.localStorage.getItem(FESTEGGIATO_KEY);
      } catch {
        prima = true;
      }
      if (prima) {
        setFesta(true);
        try {
          window.localStorage.setItem(FESTEGGIATO_KEY, "1");
        } catch {
          // Nessun problema: la festa si ripetera'.
        }
      }
    } catch (e) {
      setStato("errore");
      setMessaggio(e instanceof Error ? e.message : t("fonda.errInvio"));
    }
  }

  function nuovaProposta() {
    setPunto(null);
    setVia(null);
    setMotivo("");
    setStato("inattivo");
    setMessaggio("");
  }

  return (
    <main className="relative min-h-dvh">
      <div
        aria-hidden
        className="fixed inset-0 -z-20 bg-cover bg-center"
        style={{ backgroundImage: "url(/images/brain.webp)" }}
      />
      <div
        aria-hidden
        className="fixed inset-0 -z-10 bg-gradient-to-b from-stone-950/80 via-stone-900/55 to-stone-950/90"
      />

      <CascataCuori attiva={festa} onFine={() => setFesta(false)} />

      <div className="mx-auto w-full max-w-2xl px-4 pb-20 pt-16">
        <h1 className="font-scritta text-4xl text-amber-100">
          {t("fonda.titolo")}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-stone-300">
          {t("fonda.spiegazione")}
        </p>

        {stato === "fatto" ? (
          <section className="mt-8 rounded-lg border border-amber-100/25 bg-stone-900/60 p-6 text-center shadow-xl backdrop-blur-sm">
            <p className="text-4xl">🎉</p>
            <h2 className="mt-3 font-scritta text-3xl text-amber-100">
              {t("fonda.grazieTitolo")}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-stone-300">
              {t("fonda.grazieTesto")}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={nuovaProposta}
                className="rounded-full border border-amber-100/30 px-5 py-2.5 text-sm font-semibold text-amber-100 transition hover:bg-stone-950/50"
              >
                {t("fonda.altra")}
              </button>
              <Link
                href="/"
                className="rounded-full bg-amber-300 px-5 py-2.5 text-sm font-bold text-stone-900 shadow-lg transition hover:scale-105"
              >
                {t("comune.tornaHome")}
              </Link>
            </div>
          </section>
        ) : (
          <form
            onSubmit={invia}
            className="mt-6 rounded-lg border border-amber-100/20 bg-stone-900/60 p-6 shadow-xl backdrop-blur-sm"
          >
            {/* Mappa: segna UN solo punto */}
            <h2 className="font-scritta text-2xl text-amber-100">
              {t("fonda.doveTitolo")}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-stone-400">
              {t("fonda.doveAiuto")}
            </p>

            <div className="mt-3">
              <MappaPunto punto={punto} onChange={aggiornaPunto} centro={centro} />
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={vaiAllaMiaPosizione}
                className="rounded-full border border-amber-100/30 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:bg-stone-950/50"
              >
                {t("fonda.usaPos")}
              </button>
              {punto && (
                <button
                  type="button"
                  onClick={() => {
                    setPunto(null);
                    setVia(null);
                  }}
                  className="rounded-full border border-amber-100/30 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:bg-stone-950/50"
                >
                  {t("fonda.togliPunto")}
                </button>
              )}
              <span className="text-xs text-stone-400">
                {punto
                  ? t("fonda.puntoScelto", {
                      lat: punto[0].toFixed(5),
                      lng: punto[1].toFixed(5),
                    })
                  : t("fonda.nessunPunto")}
              </span>
            </div>

            {/* Via ricavata dal punto */}
            {punto && (
              <p className="mt-3 text-sm text-stone-300">
                <span className="text-stone-400">{t("fonda.viaEtichetta")} </span>
                {cercoVia ? (
                  <span className="text-stone-400">{t("fonda.cercoVia")}</span>
                ) : via ? (
                  <span className="font-semibold text-amber-100">{via}</span>
                ) : (
                  <span className="text-stone-400">{t("fonda.viaNonTrovata")}</span>
                )}
              </p>
            )}

            {/* Perche' */}
            <label
              htmlFor="motivo"
              className="mt-6 block font-scritta text-2xl text-amber-100"
            >
              {t("fonda.percheTitolo")}
            </label>
            <textarea
              id="motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={5}
              placeholder={t("fonda.perchePlaceholder")}
              className="mt-2 w-full resize-y rounded-lg border border-stone-600 bg-stone-950/60 px-4 py-3 text-base text-amber-50 outline-none placeholder:text-stone-500 focus:border-amber-300"
            />
            <p
              className={`mt-1 text-xs ${
                paroleOk ? "text-emerald-300" : "text-stone-400"
              }`}
            >
              {t("fonda.contaParole", { n: parole, min: PAROLE_MINIME })}
            </p>

            {messaggio && (
              <p
                className={`mt-3 text-sm ${
                  stato === "errore" ? "text-red-300" : "text-stone-300"
                }`}
              >
                {messaggio}
              </p>
            )}

            <button
              type="submit"
              disabled={stato === "invio" || !punto || !paroleOk}
              className="mt-5 w-full rounded-full bg-amber-300 px-6 py-3 text-base font-bold text-stone-900 shadow-xl transition hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {stato === "invio" ? t("fonda.invioInCorso") : t("fonda.condividi")}
            </button>

            <p className="mt-3 text-center text-xs leading-relaxed text-stone-400">
              {utente
                ? t("fonda.notaFirmata")
                : t("fonda.notaAnonima")}
            </p>
          </form>
        )}

        <Link
          href="/"
          className="mt-8 inline-block text-sm text-stone-400 transition hover:text-amber-100"
        >
          {t("comune.tornaHomeFreccia")}
        </Link>

        {!caricamento && !utente && (
          <p className="mt-2 text-xs text-stone-500">
            {t("fonda.invitoAccount")}{" "}
            <Link href="/impostazioni" className="underline hover:text-amber-100">
              {t("nav.creaAccount")}
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}
