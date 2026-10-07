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
import { descrizioneCanzone, normalizzaCanzone } from "@/lib/canzone";
import ScegliCanzone from "@/components/ScegliCanzone";
import { useAuth } from "@/lib/auth";
import { useLingua } from "@/lib/i18n";

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
  const { t } = useLingua();
  const [testo, setTesto] = useState("");
  const [nickname, setNickname] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [anteprima, setAnteprima] = useState<string | null>(null);
  const [canzone, setCanzone] = useState("");
  const [pickerCanzone, setPickerCanzone] = useState(false);
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
      setErrore(t("editor.fileNonImmagine"));
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

    // La canzone (se c'e') deve essere una scelta della ricerca oppure un
    // link riconosciuto: cosi' il player si carica subito dopo la pubblicazione.
    const sceltaCanzone = canzone.trim();
    const canzoneOk = sceltaCanzone ? normalizzaCanzone(sceltaCanzone) : null;
    if (sceltaCanzone && !canzoneOk) {
      setErrore(t("editor.canzoneNonSupportata"));
      return; // il testo e la foto restano nell'editor
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
          t("editor.erroreFoto", {
            msg: err instanceof Error ? err.message : "errore",
          })
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
      canzoneUrl: canzoneOk ?? null,
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
          {t("editor.titolo")}
        </label>
        <textarea
          id="testo-postit"
          ref={textareaRef}
          value={testo}
          onChange={(e) => setTesto(e.target.value)}
          maxLength={MAX_TESTO}
          rows={5}
          placeholder={t("editor.placeholder")}
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
              aria-label={t("editor.firma")}
              className="w-full cursor-default rounded-sm border border-stone-900/10 bg-white/40 px-3 py-2 text-base font-semibold text-stone-900 focus:outline-none"
            />
            <p className="mt-1 text-xs text-stone-700/80">
              {t("editor.firmaAccount")}{" "}
              <a href="/impostazioni" className="underline underline-offset-2">
                {t("nav.impostazioni")}
              </a>
            </p>
          </div>
        ) : (
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={MAX_NICKNAME}
            placeholder={t("editor.nome")}
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
                alt={t("editor.anteprimaFoto")}
                className="h-16 w-16 rounded-sm object-cover"
              />
              <p className="flex-1 text-xs text-stone-800">
                {t("editor.fotoPronta")}
              </p>
              <button
                type="button"
                onClick={rimuoviFoto}
                aria-label={t("editor.rimuoviFoto")}
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
              📷 {t("editor.fotoAggiungi")}
              <span className="text-xs font-normal text-stone-600/80">
                {t("editor.fotoFacoltativa")}
              </span>
            </button>
          )}
        </div>

        {/* Canzone facoltativa: si sceglie con la ricerca in-app (stile
            "music sticker") oppure incollando un link di un servizio. */}
        <div className="mt-3">
          <p className="mb-1 text-xs font-semibold text-stone-700">
            🎵 {t("editor.canzoneAggiungi")}{" "}
            <span className="font-normal text-stone-600/80">
              {t("editor.canzoneFacoltativa")}
            </span>
          </p>
          {canzone.trim() ? (
            <div className="flex items-center gap-2 rounded-sm border border-stone-900/15 bg-white/50 p-2">
              <span aria-hidden>🎵</span>
              <p className="min-w-0 flex-1 truncate text-sm font-semibold text-stone-800">
                ✓ {descrizioneCanzone(canzone.trim()) ?? t("editor.canzonePronta")}
              </p>
              <button
                type="button"
                onClick={() => setPickerCanzone(true)}
                className="shrink-0 rounded-full border border-stone-900/20 bg-white/60 px-3 py-1 text-xs font-semibold text-stone-800 transition hover:bg-white"
              >
                {t("editor.canzoneCambia")}
              </button>
              <button
                type="button"
                onClick={() => setCanzone("")}
                aria-label={t("editor.canzoneRimuovi")}
                className="shrink-0 rounded-full px-2 py-1 text-sm font-bold text-stone-800 transition hover:bg-stone-900/10"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setPickerCanzone(true)}
              className="inline-flex items-center gap-2 rounded-full border border-stone-900/25 bg-white/40 px-4 py-2 text-sm font-semibold text-stone-800 transition hover:bg-white/70"
            >
              🔍 {t("editor.canzoneAggiungi")}
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
            {inviando
              ? foto
                ? t("editor.caricoFoto")
                : t("editor.attaccando")
              : `📌 ${t("editor.attacca")}`}
          </button>
          <button
            type="button"
            onClick={onAnnulla}
            className="rounded-full px-4 py-2 text-sm font-bold text-stone-800 transition hover:bg-stone-900/10"
          >
            ✕ {t("editor.annulla")}
          </button>
        </div>
      </form>

      {pickerCanzone && (
        <ScegliCanzone
          onScegli={(valore) => {
            setCanzone(valore);
            setPickerCanzone(false);
            setErrore(null);
          }}
          onChiudi={() => setPickerCanzone(false)}
        />
      )}
    </div>
  );
}
