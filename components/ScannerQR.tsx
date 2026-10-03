"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import jsQR from "jsqr";
import { nomeLuogo, slugDaTesto } from "@/lib/luoghi";
import { salvaMuro } from "@/lib/mieiMuri";

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
function messaggioErrore(e: unknown): string {
  const nome = e instanceof DOMException ? e.name : "";
  switch (nome) {
    case "NotAllowedError":
    case "PermissionDeniedError":
      return "Permesso fotocamera negato. Apri il sito in Chrome, tocca l'icona del lucchetto accanto all'indirizzo e consenti la fotocamera, poi riprova. In alternativa usa \"Scatta una foto del QR\".";
    case "NotFoundError":
    case "DevicesNotFoundError":
      return "Nessuna fotocamera trovata su questo dispositivo. Usa \"Scatta una foto del QR\".";
    case "NotReadableError":
    case "TrackStartError":
      return "La fotocamera è già in uso da un'altra app. Chiudila e riprova.";
    case "OverconstrainedError":
      return "La fotocamera di questo dispositivo non supporta la modalità richiesta.";
    case "SecurityError":
      return "La fotocamera richiede una connessione sicura (https).";
    default:
      return e instanceof Error && e.message
        ? e.message
        : "Non sono riuscito ad avviare la fotocamera.";
  }
}

export default function ScannerQR() {
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
            ? "Questo dispositivo non espone la fotocamera al browser."
            : "La fotocamera richiede una connessione sicura (https)."
        );
      }
      // Il video è sempre montato in pagina: il riferimento esiste subito.
      const video = videoRef.current;
      if (!video) throw new Error("Elemento video non trovato.");
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
      setErrore(messaggioErrore(e));
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
        img.onerror = () => rifiuta(new Error("Foto non leggibile."));
        img.src = url;
      });
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("Foto non leggibile.");
      ctx.drawImage(img, 0, 0);
      const dati = ctx.getImageData(0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const codice = jsQR(dati.data, dati.width, dati.height, {
        inversionAttempts: "attemptBoth",
      });
      const s = codice?.data ? slugDaTesto(codice.data) : "";
      if (!s) {
        setErrore(
          "Nessun QR riconosciuto nella foto. Riprova facendo una foto più vicina e dritta al QR code."
        );
        return;
      }
      salvaMuro(s, nomeLuogo(s));
      setSlugTrovato(s);
      setStato("trovato");
    } catch (e) {
      setErrore(e instanceof Error ? e.message : "Errore sconosciuto.");
    }
  }

  function inviaManuale(ev: React.FormEvent) {
    ev.preventDefault();
    const s = slugDaTesto(testo.trim());
    if (!s) {
      setErrore(
        "Non riconosco questo testo. Incolla un link /muro/… oppure uno slug tipo piazza-del-mercato."
      );
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
            Inquadra il QR code affisso sul muro per salvarlo tra i tuoi muri.
          </p>
          <button
            type="button"
            onClick={avvia}
            className="mt-5 rounded-full bg-amber-300 px-6 py-3 text-base font-bold text-stone-900 shadow-xl transition hover:scale-105 active:scale-95"
          >
            📷 Avvia la fotocamera
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
            Avvio della fotocamera… (consenti l'accesso se richiesto)
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
            Inquadra il QR code del muro.
          </p>
          <button
            type="button"
            onClick={() => {
              ferma();
              setStato("inattivo");
            }}
            className="mt-3 w-full rounded-full border border-amber-100/30 px-6 py-2 text-sm font-semibold text-amber-100 transition hover:bg-stone-950/50"
          >
            Ferma la fotocamera
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
              Riprova
            </button>
          )}
        </div>
      )}

      {browserApp && (stato === "inattivo" || stato === "errore") && (
        <div className="mt-4 rounded-lg border border-amber-100/30 bg-amber-950/30 p-4 text-sm text-amber-100">
          Stai usando il browser integrato di {browserApp}: a volte blocca la
          fotocamera. Apri il link in <strong>Chrome</strong> oppure usa{" "}
          <strong>Scatta una foto del QR</strong> qui sotto.
        </div>
      )}

      {(stato === "inattivo" || stato === "errore") && (
        <div className="mt-3 flex flex-col gap-2">
          <label className="flex cursor-pointer items-center justify-center gap-1 rounded-full border border-amber-100/30 px-6 py-2.5 text-sm font-semibold text-amber-100 transition hover:bg-stone-950/50">
            📸 Scatta una foto del QR
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={decodificaFoto}
            />
          </label>
          <label className="flex cursor-pointer items-center justify-center gap-1 text-center text-sm text-stone-300 underline underline-offset-4 transition hover:text-amber-100">
            🖼️ Oppure scegli una foto del QR code
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
            Muro salvato tra i tuoi muri.
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <Link
              href={`/muro/${slugTrovato}`}
              className="rounded-full bg-amber-300 px-6 py-3 text-base font-bold text-stone-900 shadow-xl transition hover:scale-105"
            >
              Vai al muro
            </Link>
            <button
              type="button"
              onClick={() => {
                setStato("inattivo");
                setSlugTrovato("");
              }}
              className="rounded-full border border-amber-100/30 px-6 py-2.5 text-sm font-semibold text-amber-100 transition hover:bg-stone-950/50"
            >
              Scansiona un altro muro
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
            Niente fotocamera? Incolla lo slug o il link del muro:
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="testo"
              type="text"
              value={testo}
              onChange={(e) => setTesto(e.target.value)}
              placeholder="es. piazza-del-mercato"
              className="min-w-0 flex-1 rounded-full border border-stone-600 bg-stone-950/60 px-4 py-2 text-sm text-amber-50 outline-none placeholder:text-stone-500 focus:border-amber-300"
            />
            <button
              type="submit"
              className="shrink-0 rounded-full bg-amber-300 px-5 py-2 text-sm font-bold text-stone-900 transition hover:scale-105"
            >
              Salva
            </button>
          </div>
        </form>
      )}
    </div>
  );
}