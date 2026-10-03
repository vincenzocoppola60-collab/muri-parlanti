"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  attaccaPostit,
  caricaFotoPostit,
  MAX_NICKNAME,
  MAX_TESTO,
  type PostIt,
} from "@/lib/postit";
import { comprimiImmagine } from "@/lib/immagini";
import { useAuth } from "@/lib/auth";

const NICKNAME_KEY = "muri-parlanti:nickname";

export default function PostItEditor({
  luogo,
  onAttacca,
  onAnnulla,
}: {
  luogo: string;
  onAttacca: (postit: PostIt) => void;
  onAnnulla: () => void;
}) {
  const { utente, nickname: nicknameAccount } = useAuth();
  const [testo, setTesto] = useState("");
  const [nickname, setNickname] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [anteprima, setAnteprima] = useState<string | null>(null);
  const [inviando, setInviando] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (utente) {
      // Con l'account la firma e' il nickname del profilo (cliccabile).
      setNickname(nicknameAccount || "");
    } else {
      const salvato = window.localStorage.getItem(NICKNAME_KEY);
      if (salvato) setNickname(salvato);
    }
    textareaRef.current?.focus();
  }, [utente, nicknameAccount]);

  // Libera l'URL di anteprima quando cambia o alla chiusura dell'editor.
  useEffect(() => {
    return () => {
      if (anteprima) URL.revokeObjectURL(anteprima);
    };
  }, [anteprima]);

  function scegliFoto(file: File | null) {
    setErrore(null);
    if (!file) {
      setFoto(null);
      setAnteprima(null);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    if (!file.type.startsWith("image/")) {
      setErrore("Il file scelto non e' un'immagine.");
      return;
    }
    setFoto(file);
    setAnteprima(URL.createObjectURL(file));
  }

  function rimuoviFoto() {
    setFoto(null);
    setAnteprima(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function invia(e: FormEvent) {
    e.preventDefault();
    setErrore(null);

    const nick = nickname.trim().slice(0, MAX_NICKNAME);
    if (!utente) {
      try {
        window.localStorage.setItem(NICKNAME_KEY, nick || "Anonimo");
      } catch {
        // localStorage potrebbe essere indisponibile (privacy mode): non bloccare.
      }
    }

    setInviando(true);

    // La foto (se c'e') viene compressa e caricata PRIMA del post-it: cosi'
    // il pensiero nasce gia' con l'URL della foto, o non nasce affatto.
    let fotoUrl: string | null = null;
    if (foto) {
      try {
        const daCaricare = await comprimiImmagine(foto);
        fotoUrl = await caricaFotoPostit(daCaricare, luogo);
      } catch (err) {
        setInviando(false);
        setErrore(
          err instanceof Error
            ? `Non sono riuscito a caricare la foto (${err.message}). Riprova o rimuovila.`
            : "Non sono riuscito a caricare la foto. Riprova o rimuovila."
        );
        return; // il testo scritto resta nell'editor
      }
    }

    const esito = await attaccaPostit({
      testo,
      nickname: nick,
      luogo,
      userId: utente?.id ?? null,
      fotoUrl,
    });
    setInviando(false);

    if (!esito.ok) {
      setErrore(esito.errore);
      return; // il testo scritto resta nell'editor
    }

    setTesto("");
    onAttacca(esito.postit);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/60 p-4 backdrop-blur-sm sm:items-center">
      <form
        onSubmit={invia}
        className="postit w-full max-w-md rounded-md px-6 pb-6 pt-9 shadow-2xl"
        style={{
          backgroundImage: "url(/images/1.webp)",
          backgroundSize: "cover",
        }}
      >
        <label htmlFor="testo-postit" className="sr-only">
          Il tuo pensiero
        </label>
        <textarea
          id="testo-postit"
          ref={textareaRef}
          value={testo}
          onChange={(e) => setTesto(e.target.value)}
          maxLength={MAX_TESTO}
          rows={5}
          placeholder="Scrivi il tuo pensiero per questo muro..."
          className="w-full resize-none bg-transparent text-xl leading-snug text-stone-900 placeholder:text-stone-600/60 focus:outline-none"
        />
        <p className="mt-1 text-right text-xs text-stone-700/70">
          {testo.length}/{MAX_TESTO}
        </p>
        {utente ? (
          <div className="mt-2">
            <input
              value={nickname}
              readOnly
              maxLength={MAX_NICKNAME}
              aria-label="Nome con cui firmi il pensiero"
              className="w-full cursor-default rounded-sm border border-stone-900/10 bg-white/40 px-3 py-2 text-base font-semibold text-stone-900 focus:outline-none"
            />
            <p className="mt-1 text-xs text-stone-700/80">
              Firmi con il tuo account: chi scansiona il muro potra' aprire il
              tuo profilo toccando il nome. Puoi cambiarlo nelle{" "}
              <a href="/impostazioni" className="underline underline-offset-2">
                Impostazioni
              </a>
              .
            </p>
          </div>
        ) : (
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={MAX_NICKNAME}
            placeholder="Il tuo nome (facoltativo)"
            className="mt-2 w-full rounded-sm border border-stone-900/20 bg-white/60 px-3 py-2 text-base text-stone-900 placeholder:text-stone-600/70 focus:outline-none"
          />
        )}

        {/* Foto facoltativa allegata al pensiero. */}
        <div className="mt-3">
          <input
            ref={fileRef}
            id="foto-postit"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            onChange={(e) => scegliFoto(e.target.files?.[0] ?? null)}
            className="sr-only"
          />
          {anteprima ? (
            <div className="flex items-center gap-3 rounded-sm border border-stone-900/15 bg-white/50 p-2">
              {/* Anteprima locale (blob), non ancora caricata. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={anteprima}
                alt="Anteprima della foto"
                className="h-16 w-16 rounded-sm object-cover"
              />
              <p className="flex-1 text-xs text-stone-800">
                Foto pronta: verra' caricata quando attacchi il pensiero.
              </p>
              <button
                type="button"
                onClick={rimuoviFoto}
                aria-label="Rimuovi la foto"
                className="rounded-full px-2 py-1 text-sm font-bold text-stone-800 transition hover:bg-stone-900/10"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-full border border-stone-900/25 bg-white/40 px-4 py-2 text-sm font-semibold text-stone-800 transition hover:bg-white/70"
            >
              📷 Aggiungi una foto
              <span className="text-xs font-normal text-stone-600/80">
                (facoltativa)
              </span>
            </button>
          )}
        </div>

        {errore && (
          <p className="mt-3 text-sm font-bold text-red-900">{errore}</p>
        )}
        <div className="mt-4 flex items-center justify-between">
          <button
            type="submit"
            disabled={inviando || !testo.trim()}
            className="rounded-full bg-stone-900 px-5 py-2 text-sm font-bold text-amber-100 transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {inviando ? (foto ? "Carico foto..." : "Attacco...") : "📌 Attacca"}
          </button>
          <button
            type="button"
            onClick={onAnnulla}
            className="rounded-full px-4 py-2 text-sm font-bold text-stone-800 transition hover:bg-stone-900/10"
          >
            ✕ Annulla
          </button>
        </div>
      </form>
    </div>
  );
}
