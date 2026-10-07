"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import jsQR from "jsqr";
import { nomeLuogo, slugDaTesto } from "@/lib/luoghi";
import { salvaMuro } from "@/lib/mieiMuri";
import { useLingua } from "@/lib/i18n";

type T = (chiave: string, valori?: Record<string, string | number>) => string;

type Stato = "inattivo" | "avvio" | "attivo" | "trovato" | "errore";

/** Browser integrati (WhatsApp, Instagram, Telegram…) che spesso bloccano la fotocamera. */
function browserIntegrato(): string | null {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent;
  const marche: Array<[string, RegExp]> = [
    ["WhatsApp", /WhatsApp/i],
    ["Instagram", /Instagram/i],
    ["Facebook", /FBAN|FBAV|FBIOS/i],
    ["Messenger", /Messenger/i],
    ["Telegram", /Telegram/i],
    ["TikTok", /TikTok/i],
    ["X (Twitter)", /Twitter/i],
  ];
  for (const [nome, re] of marche) if (re.test(ua)) return nome;
  return null;
}

/** Traduce gli errori della fotocamera in frasi capite da tutti. */
function messaggioErrore(e: unknown, t: T): string {
  const nome = e instanceof DOMException ? e.name : "";
  switch (nome) {
    case "NotAllowedError":
    case "PermissionDeniedError":
      return t("scan.errPermesso");
    case "NotFoundError":
    case "DevicesNotFoundError":
      return t("scan.errNessunaCam");
    case "NotReadableError":
    case "TrackStartError":
      return t("scan.errInUso");
    case "OverconstrainedError":
      return t("scan.errNoModalita");
    case "SecurityError":
      return t("scan.errSicura");
    default:
      return e instanceof Error && e.message ? e.message : t("scan.errAvvio");
  }
}

export default function ScannerQR() {
  const { t } = useLingua();
  const [stato, setStato] = useState<Stato>("inattivo");
  const [errore, setErrore] = useState("");
  const [slugTrovato, setSlugTrovato] = useState("");
  const [testo, setTesto] = useState("");
  const [browserApp, setBrowserApp] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    setBrowserApp(browserIntegrato());
  }, []);

  function ferma() {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  useEffect(() => {
    return () => ferma();
  }, []);

  async function avvia() {
    setStato("avvio");
    setErrore("");
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          window.isSecureContext
            ? t("scan.errNoEspone")
            : t("scan.errSicura")
        );
      }
      // Il video è sempre montato in pagina: il riferimento esiste subito.
      const video = videoRef.current;
      if (!video) throw new Error(t("scan.errNoVideo"));
      // getUserMedia chiamata subito nel click: preserva l'attivazione utente
      // (richiesta da iOS Safari e da alcuni browser Android).
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      video.srcObject = stream;
      await new Promise<void>((risolvi) => {
        if (video.readyState >= 2) risolvi();
        else video.onloadeddata = () => risolvi();
      });
      setStato("attivo");
      await video.play().catch(() => {});
      loop();
    } catch (e) {
      ferma();
      setErrore(messaggioErrore(e, t));
      setStato("errore");
    }
  }

  function loop() {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || !streamRef.current) {
      rafRef.current = requestAnimationFrame(loop);
      return;
    }
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (w > 0 && h > 0) {
      if (!canvasRef.current) canvasRef.current = document.createElement("canvas");
      const canvas = canvasRef.current;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(video, 0, 0, w, h);
        try {
          const dati = ctx.getImageData(0, 0, w, h);
          const codice = jsQR(dati.data, dati.width, dati.height, {
            inversionAttempts: "dontInvert",
          });
          if (codice?.data) {
            const s = slugDaTesto(codice.data);
            if (s) {
              salvaMuro(s, nomeLuogo(s));
              setSlugTrovato(s);
              setStato("trovato");
              ferma();
              return;
            }
          }
        } catch {
          // Frame illeggibile: continua al prossimo.
        }
      }
    }
    rafRef.current = requestAnimationFrame(loop);
  }

  /** Piano B: decodifica il QR da una foto scattata o scelta dalla galleria. */
  async function decodificaFoto(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    ev.target.value = "";
    if (!file) return;
    setErrore("");
    try {
      const url = URL.createObjectURL(file);
      const img = new Image();
      await new Promise<void>((risolvi, rifiuta) => {
        img.onload = () => risolvi();
        img.onerror = () => rifiuta(new Error(t("scan.fotoNonLeggibile")));
        img.src = url;
      });
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error(t("scan.fotoNonLeggibile"));
      ctx.drawImage(img, 0, 0);
      const dati = ctx.getImageData(0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const codice = jsQR(dati.data, dati.width, dati.height, {
        inversionAttempts: "attemptBoth",
      });
      const s = codice?.data ? slugDaTesto(codice.data) : "";
      if (!s) {
        setErrore(t("scan.noQrFoto"));
        return;
      }
      salvaMuro(s, nomeLuogo(s));
      setSlugTrovato(s);
      setStato("trovato");
    } catch (e) {
      setErrore(e instanceof Error ? e.message : t("scan.erroreSconosciuto"));
    }
  }

  function inviaManuale(ev: React.FormEvent) {
    ev.preventDefault();
    const s = slugDaTesto(testo.trim());
    if (!s) {
      setErrore(t("scan.testoNonRiconosciuto"));
      return;
    }
    salvaMuro(s, nomeLuogo(s));
    setSlugTrovato(s);
    setStato("trovato");
  }

  return (
    <div className="mx-auto mt-8 w-full max-w-md px-4 pb-24">
      {stato === "inattivo" && (
        <div className="rounded-lg border border-amber-100/20 bg-stone-900/60 p-6 text-center shadow-xl backdrop-blur-sm">
          <p className="mx-auto max-w-xs text-sm text-stone-300">
            {t("scan.invito")}
          </p>
          <button
            type="button"
            onClick={avvia}
            className="mt-5 rounded-full bg-amber-300 px-6 py-3 text-base font-bold text-stone-900 shadow-xl transition hover:scale-105 active:scale-95"
          >
            {t("scan.avvia")}
          </button>
        </div>
      )}

      {/* Il video è SEMPRE montato: il ref esiste anche a fotocamera spenta,
          così getUserMedia parte subito nel click senza attese. */}
      <div
        className={
          "relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-lg border border-amber-100/20 bg-stone-950 shadow-xl " +
          (stato === "avvio" || stato === "attivo" ? "" : "hidden")
        }
      >
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="h-full w-full object-cover"
        />
        {stato === "avvio" && (
          <p className="absolute inset-x-0 bottom-3 text-center text-xs text-stone-300">
            {t("scan.avvio")}
          </p>
        )}
        {stato === "attivo" && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-40 w-40 rounded-2xl border-2 border-amber-300/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
          </div>
        )}
      </div>

      {stato === "attivo" && (
        <>
          <p className="mt-4 text-center text-sm text-stone-300">
            {t("scan.inquadra")}
          </p>
          <button
            type="button"
            onClick={() => {
              ferma();
              setStato("inattivo");
            }}
            className="mt-3 w-full rounded-full border border-amber-100/30 px-6 py-2 text-sm font-semibold text-amber-100 transition hover:bg-stone-950/50"
          >
            {t("scan.ferma")}
          </button>
        </>
      )}

      {errore && stato !== "trovato" && (
        <div className="mt-4 rounded-lg border border-red-400/30 bg-red-950/40 p-4 text-sm text-red-200">
          <p>{errore}</p>
          {stato === "errore" && (
            <button
              type="button"
              onClick={avvia}
              className="mt-3 rounded-full bg-red-300 px-5 py-2 text-sm font-bold text-red-950 transition hover:scale-105"
            >
              {t("scan.riprova")}
            </button>
          )}
        </div>
      )}

      {browserApp && (stato === "inattivo" || stato === "errore") && (
        <div className="mt-4 rounded-lg border border-amber-100/30 bg-amber-950/30 p-4 text-sm text-amber-100">
          {t("scan.browserIntegrato", { nome: browserApp })}
        </div>
      )}

      {(stato === "inattivo" || stato === "errore") && (
        <div className="mt-3 flex flex-col gap-2">
          <label className="flex cursor-pointer items-center justify-center gap-1 rounded-full border border-amber-100/30 px-6 py-2.5 text-sm font-semibold text-amber-100 transition hover:bg-stone-950/50">
            {t("scan.scatta")}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={decodificaFoto}
            />
          </label>
          <label className="flex cursor-pointer items-center justify-center gap-1 text-center text-sm text-stone-300 underline underline-offset-4 transition hover:text-amber-100">
            {t("scan.scegliFoto")}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={decodificaFoto}
            />
          </label>
        </div>
      )}

      {stato === "trovato" && (
        <div className="rounded-lg border border-amber-100/20 bg-stone-900/60 p-6 text-center shadow-xl backdrop-blur-sm">
          <p className="text-3xl">✅</p>
          <h2 className="font-scritta mt-2 text-3xl text-amber-100">
            {nomeLuogo(slugTrovato)}
          </h2>
          <p className="mt-2 text-sm text-stone-300">
            {t("scan.muroSalvato")}
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <Link
              href={`/muro/${slugTrovato}`}
              className="rounded-full bg-amber-300 px-6 py-3 text-base font-bold text-stone-900 shadow-xl transition hover:scale-105"
            >
              {t("scan.vaiMuro")}
            </Link>
            <button
              type="button"
              onClick={() => {
                setStato("inattivo");
                setSlugTrovato("");
              }}
              className="rounded-full border border-amber-100/30 px-6 py-2.5 text-sm font-semibold text-amber-100 transition hover:bg-stone-950/50"
            >
              {t("scan.scansionaAltro")}
            </button>
          </div>
        </div>
      )}

      {stato !== "trovato" && (
        <form
          onSubmit={inviaManuale}
          className="mt-6 rounded-lg border border-amber-100/20 bg-stone-900/60 p-4 shadow-xl backdrop-blur-sm"
        >
          <label
            htmlFor="testo"
            className="block text-sm font-medium text-stone-300"
          >
            {t("scan.manualeLabel")}
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="testo"
              type="text"
              value={testo}
              onChange={(e) => setTesto(e.target.value)}
              placeholder={t("scan.manualePh")}
              className="min-w-0 flex-1 rounded-full border border-stone-600 bg-stone-950/60 px-4 py-2 text-base text-amber-50 outline-none placeholder:text-stone-500 focus:border-amber-300"
            />
            <button
              type="submit"
              className="shrink-0 rounded-full bg-amber-300 px-5 py-2 text-sm font-bold text-stone-900 transition hover:scale-105"
            >
              {t("scan.salva")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}