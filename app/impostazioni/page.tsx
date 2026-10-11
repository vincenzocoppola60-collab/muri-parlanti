"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import AccessoForm from "@/components/AccessoForm";
import RitagliaAvatar from "@/components/RitagliaAvatar";
import {
  caricaAvatarBlob,
  caricaMieiPostit,
  caricaMioProfilo,
  MAX_BIO,
  MAX_NICK_PROFILO,
  MESSAGGIO_MIGRAZIONE,
  rimuoviAvatarFile,
  salvaMioProfilo,
  urlAvatar,
  type Profilo,
} from "@/lib/profili";
import type { PostIt } from "@/lib/postit";
import { nomeLuogo } from "@/lib/luoghi";
import { formattaData } from "@/lib/formato";
import { useLingua } from "@/lib/i18n";
import { eAmministratore } from "@/lib/admin";
import SelettoreTema from "@/components/SelettoreTema";

const campo =
  "w-full rounded-full border border-stone-600 bg-stone-950/60 px-4 py-2 text-base text-amber-50 outline-none placeholder:text-stone-500 focus:border-amber-300";
const area =
  "w-full resize-none rounded-2xl border border-stone-600 bg-stone-950/60 px-4 py-2 text-base text-amber-50 outline-none placeholder:text-stone-500 focus:border-amber-300";

export default function PaginaImpostazioni() {
  const { t } = useLingua();
  const { utente, caricamento, nickname: nicknameAccount, impostaUsername } =
    useAuth();

  const [profilo, setProfilo] = useState<Profilo | null>(null);
  const [mancaMigrazione, setMancaMigrazione] = useState(false);
  const [caricamentoProfilo, setCaricamentoProfilo] = useState(true);

  const [nickname, setNickname] = useState("");
  const [bio, setBio] = useState("");
  const [mostraPostit, setMostraPostit] = useState(true);

  const [username, setUsername] = useState("");
  const [salvandoUsername, setSalvandoUsername] = useState(false);
  const [msgUsername, setMsgUsername] = useState<string | null>(null);
  const [errUsername, setErrUsername] = useState<string | null>(null);

  const [salvando, setSalvando] = useState(false);
  const [messaggio, setMessaggio] = useState<string | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  const [caricandoAvatar, setCaricandoAvatar] = useState(false);
  const [fileDaRitagliare, setFileDaRitagliare] = useState<File | null>(null);
  const inputFoto = useRef<HTMLInputElement>(null);

  const [mieiPostit, setMieiPostit] = useState<PostIt[]>([]);
  const [caricandoPostit, setCaricandoPostit] = useState(true);

  // La sezione "Tema" e' sperimentale: per ora la vede solo l'amministratore.
  const [sonoAdmin, setSonoAdmin] = useState(false);

  const idUtente = utente?.id ?? null;

  // Carica profilo e post-it dell'account connesso (una volta per login).
  useEffect(() => {
    if (!idUtente) {
      setProfilo(null);
      setMieiPostit([]);
      setCaricamentoProfilo(false);
      setCaricandoPostit(false);
      return;
    }
    let attivo = true;
    setCaricamentoProfilo(true);
    setCaricandoPostit(true);

    caricaMioProfilo()
      .then((esito) => {
        if (!attivo) return;
        setMancaMigrazione(esito.mancaMigrazione);
        setProfilo(esito.profilo);
        setNickname(esito.profilo?.nickname ?? nicknameAccount);
        setBio(esito.profilo?.bio ?? "");
        setMostraPostit(esito.profilo?.mostra_postit ?? true);
        setUsername(esito.profilo?.username ?? "");
        setCaricamentoProfilo(false);
      })
      .catch(() => {
        if (attivo) setCaricamentoProfilo(false);
      });

    caricaMieiPostit().then((lista) => {
      if (attivo) setMieiPostit(lista);
      setCaricandoPostit(false);
    });

    return () => {
      attivo = false;
    };
  }, [idUtente]);

  // Riconosce l'amministratore (tabella `amministratori`): solo a lui
  // mostriamo la scelta del tema. Senza sessione la risposta e' false.
  useEffect(() => {
    let attivo = true;
    const id = window.setTimeout(async () => {
      const si = await eAmministratore().catch(() => false);
      if (attivo) setSonoAdmin(si);
    }, 0);
    return () => {
      attivo = false;
      window.clearTimeout(id);
    };
  }, [utente]);

  async function salva() {
    if (salvando) return;
    setErrore(null);
    setMessaggio(null);
    setSalvando(true);
    const esito = await salvaMioProfilo({
      nickname,
      bio,
      mostra_postit: mostraPostit,
    });
    setSalvando(false);
    if (esito.ok) {
      setProfilo(esito.profilo);
      setMessaggio(t("impost.profiloSalvato"));
    } else {
      setErrore(esito.errore);
      if (esito.errore === MESSAGGIO_MIGRAZIONE) setMancaMigrazione(true);
    }
  }

  async function salvaUsername() {
    if (salvandoUsername) return;
    setErrUsername(null);
    setMsgUsername(null);
    setSalvandoUsername(true);
    const esito = await impostaUsername(username);
    setSalvandoUsername(false);
    if (esito.ok) {
      setUsername(username.trim().toLowerCase());
      setMsgUsername(t("impost.usernameSalvato"));
    } else {
      setErrUsername(esito.errore);
    }
  }

  async function cambiaFoto(evento: ChangeEvent<HTMLInputElement>) {
    const file = evento.target.files?.[0];
    evento.target.value = ""; // permette di riselezionare lo stesso file
    if (!file) return;
    setErrore(null);
    setMessaggio(null);
    // Niente caricamento immediato: prima l'utente inquadra la foto nel cerchio.
    setFileDaRitagliare(file);
  }

  async function usaRitaglio(blob: Blob) {
    setFileDaRitagliare(null);
    setCaricandoAvatar(true);
    const foto = await caricaAvatarBlob(blob);
    if (!foto.ok) {
      setCaricandoAvatar(false);
      setErrore(foto.errore);
      return;
    }
    const esito = await salvaMioProfilo({
      nickname,
      bio,
      mostra_postit: mostraPostit,
      foto_url: foto.url,
    });
    setCaricandoAvatar(false);
    if (esito.ok) {
      setProfilo(esito.profilo);
      setMessaggio(t("impost.fotoAggiornata"));
    } else {
      setErrore(esito.errore);
    }
  }

  async function togliFoto() {
    if (caricandoAvatar) return;
    setErrore(null);
    setMessaggio(null);
    setCaricandoAvatar(true);
    const rimosso = await rimuoviAvatarFile();
    if (!rimosso.ok) {
      setCaricandoAvatar(false);
      setErrore(rimosso.errore ?? t("comune.rimozioneFallita"));
      return;
    }
    const esito = await salvaMioProfilo({
      nickname,
      bio,
      mostra_postit: mostraPostit,
      foto_url: null,
    });
    setCaricandoAvatar(false);
    if (esito.ok) {
      setProfilo(esito.profilo);
      setMessaggio(t("impost.fotoRimossa"));
    } else {
      setErrore(esito.errore);
    }
  }

  if (caricamento || (utente && caricamentoProfilo && !mancaMigrazione)) {
    return (
      <main className="relative flex min-h-dvh items-center justify-center">
        <div
          aria-hidden
          className="fixed inset-0 -z-20 bg-cover bg-center"
          style={{ backgroundImage: "url(/images/brain.webp)" }}
        />
        <div aria-hidden className="fixed inset-0 -z-10 bg-stone-950/85" />
        <p className="font-scritta text-2xl text-amber-100">
          {t("impost.apro")}
        </p>
      </main>
    );
  }

  if (!utente) {
    return (
      <main className="relative min-h-dvh">
        <div
          aria-hidden
          className="fixed inset-0 -z-20 bg-cover bg-center"
          style={{ backgroundImage: "url(/images/brain.webp)" }}
        />
        <div aria-hidden className="fixed inset-0 -z-10 bg-stone-950/85" />
        <div className="relative mx-auto w-full max-w-md px-4 py-14">
          <Link
            href="/"
            className="text-[11px] font-bold uppercase tracking-[0.25em] text-amber-100/50 transition hover:text-amber-100"
          >
            {t("comune.tornaHomeFreccia")}
          </Link>
          <h1 className="mt-3 font-scritta text-4xl text-amber-100">
            Impostazioni
          </h1>
          <p className="mb-4 mt-2 text-sm text-stone-300">
            {t("impost.noAccountTesto")}
          </p>
          <AccessoForm />
        </div>
      </main>
    );
  }

  if (mancaMigrazione) {
    return (
      <main className="relative min-h-dvh">
        <div
          aria-hidden
          className="fixed inset-0 -z-20 bg-cover bg-center"
          style={{ backgroundImage: "url(/images/brain.webp)" }}
        />
        <div aria-hidden className="fixed inset-0 -z-10 bg-stone-950/85" />
        <div className="relative mx-auto w-full max-w-md px-4 py-14">
          <Link
            href="/"
            className="text-[11px] font-bold uppercase tracking-[0.25em] text-amber-100/50 transition hover:text-amber-100"
          >
            {t("comune.tornaHomeFreccia")}
          </Link>
          <div className="mt-4 rounded-lg border border-red-300/30 bg-red-950/40 p-5 text-sm leading-relaxed text-red-200">
            {MESSAGGIO_MIGRAZIONE}
          </div>
        </div>
      </main>
    );
  }

  const avatar = urlAvatar(profilo);
  const iniziale =
    (profilo?.nickname || nickname || "?").trim().charAt(0).toUpperCase() ||
    "?";

  return (
    <main className="relative min-h-dvh">
      <div
        aria-hidden
        className="fixed inset-0 -z-20 bg-cover bg-center"
        style={{ backgroundImage: "url(/images/brain.webp)" }}
      />
      <div
        aria-hidden
        className="fixed inset-0 -z-10 bg-gradient-to-b from-stone-950/75 via-stone-900/45 to-stone-950/85"
      />

      <div className="relative mx-auto w-full max-w-md px-4 pb-24 pt-10">
        <Link
          href="/"
          className="text-[11px] font-bold uppercase tracking-[0.25em] text-amber-100/50 transition hover:text-amber-100"
        >
          ← Torna alla home
        </Link>
        <h1 className="mt-3 font-scritta text-4xl text-amber-100">
          {t("impost.titolo")}
        </h1>

        {/* Foto profilo */}
        <section className="mt-6 rounded-lg border border-amber-100/20 bg-stone-900/60 p-6 shadow-xl backdrop-blur-sm">
          <h2 className="font-scritta text-xl text-amber-100">
            {t("impost.fotoProfilo")}
          </h2>
          <div className="mt-4 flex items-center gap-4">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatar}
                alt={t("impost.fotoProfilo")}
                className="h-20 w-20 shrink-0 rounded-full object-cover ring-2 ring-amber-300/60"
              />
            ) : (
              <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-amber-300 font-scritta text-3xl font-bold text-stone-900">
                {iniziale}
              </span>
            )}
            <div className="flex min-w-0 flex-col gap-2">
              <button
                type="button"
                onClick={() => inputFoto.current?.click()}
                disabled={caricandoAvatar}
                className="rounded-full border border-amber-100/30 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:bg-stone-950/60 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {caricandoAvatar
                  ? t("comune.attendi")
                  : avatar
                    ? t("impost.cambiaFoto")
                    : t("impost.aggiungiFoto")}
              </button>
              {avatar && (
                <button
                  type="button"
                  onClick={togliFoto}
                  disabled={caricandoAvatar}
                  className="rounded-full px-4 py-1 text-xs font-semibold text-stone-400 transition hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {t("impost.rimuoviFoto")}
                </button>
              )}
            </div>
          </div>
          <input
            ref={inputFoto}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={cambiaFoto}
            className="hidden"
          />
          <p className="mt-3 text-xs text-stone-500">{t("impost.fotoNota")}</p>
        </section>

        {/* Accesso: username */}
        <section className="mt-4 rounded-lg border border-amber-100/20 bg-stone-900/60 p-6 shadow-xl backdrop-blur-sm">
          <h2 className="font-scritta text-xl text-amber-100">
            {t("impost.accesso")}
          </h2>
          <p className="mt-2 text-xs text-stone-400">{t("impost.accessoNota")}</p>
          <label
            htmlFor="uname"
            className="mt-4 block text-xs font-semibold uppercase tracking-wide text-stone-400"
          >
            {t("impost.username")}
          </label>
          <input
            id="uname"
            type="text"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setMsgUsername(null);
              setErrUsername(null);
            }}
            maxLength={20}
            placeholder={t("impost.usernamePh")}
            autoCapitalize="none"
            spellCheck={false}
            className={campo + " mt-1"}
          />
          {!username && (
            <p className="mt-1 text-xs text-amber-300/80">
              {t("impost.usernameManca")}
            </p>
          )}
          <button
            type="button"
            onClick={salvaUsername}
            disabled={salvandoUsername || !username.trim()}
            className="mt-3 w-full rounded-full border border-amber-100/30 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:bg-stone-950/60 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {salvandoUsername ? t("comune.salvo") : t("impost.salvaUsername")}
          </button>
          {(msgUsername || errUsername) && (
            <p
              className={
                "mt-3 text-center text-sm font-semibold " +
                (errUsername ? "text-red-300" : "text-amber-300")
              }
            >
              {errUsername ?? msgUsername}
            </p>
          )}
        </section>

        {/* Dati del profilo */}
        <section className="mt-4 rounded-lg border border-amber-100/20 bg-stone-900/60 p-6 shadow-xl backdrop-blur-sm">
          <h2 className="font-scritta text-xl text-amber-100">
            {t("impost.profilo")}
          </h2>

          <label
            htmlFor="nick"
            className="mt-4 block text-xs font-semibold uppercase tracking-wide text-stone-400"
          >
            {t("impost.nomePost")}
          </label>
          <input
            id="nick"
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={MAX_NICK_PROFILO}
            className={campo + " mt-1"}
          />
          <p className="mt-1 text-right text-xs text-stone-500">
            {nickname.length}/{MAX_NICK_PROFILO}
          </p>

          <label
            htmlFor="bio"
            className="mt-3 block text-xs font-semibold uppercase tracking-wide text-stone-400"
          >
            {t("impost.bio")}
          </label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={MAX_BIO}
            rows={3}
            placeholder={t("impost.bioPh")}
            className={area + " mt-1"}
          />
          <p className="mt-1 text-right text-xs text-stone-500">
            {bio.length}/{MAX_BIO}
          </p>

          <label className="mt-4 flex cursor-pointer items-center justify-between gap-4 rounded-lg bg-stone-950/40 px-4 py-3">
            <span className="text-sm text-stone-200">
              {t("impost.mostraPostit")}
            </span>
            <input
              type="checkbox"
              checked={mostraPostit}
              onChange={(e) => setMostraPostit(e.target.checked)}
              className="h-5 w-5 shrink-0 accent-amber-300"
            />
          </label>
          <p className="mt-2 text-xs text-stone-500">
            {t("impost.mostraPostitNota")}
          </p>

          <button
            type="button"
            onClick={salva}
            disabled={salvando}
            className="mt-5 w-full rounded-full bg-amber-300 px-6 py-3 text-base font-bold text-stone-900 shadow-xl transition hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {salvando ? t("comune.salvo") : t("impost.salvaModifiche")}
          </button>

          {(messaggio || errore) && (
            <p
              className={
                "mt-3 text-center text-sm font-semibold " +
                (errore ? "text-red-300" : "text-amber-300")
              }
            >
              {errore ?? messaggio}
            </p>
          )}
        </section>

        <Link
          href={`/profilo/${utente.id}`}
          className="mt-4 block rounded-full border border-amber-100/30 px-4 py-2 text-center text-sm font-semibold text-amber-100 transition hover:bg-stone-950/60"
        >
          {t("impost.vediProfilo")}
        </Link>

        {/* Tema (colori). Sperimentale: visibile solo all'amministratore. */}
        {sonoAdmin && <SelettoreTema />}

        {/* I miei post-it */}
        <section className="mt-6">
          <h2 className="font-scritta text-xl text-amber-100">
            {t("impost.mieiPostit")}
          </h2>
          {caricandoPostit ? (
            <p className="mt-2 text-sm text-stone-500">{t("comune.carico")}</p>
          ) : mieiPostit.length === 0 ? (
            <p className="mt-2 text-xs text-stone-500">
              {t("impost.nessunPostit")}
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {mieiPostit.map((p) => (
                <li
                  key={p.id}
                  className="rounded-lg bg-stone-950/40 px-3 py-2 text-sm text-stone-200"
                >
                  <Link
                    href={`/muro/${p.luogo}`}
                    className="block min-w-0 transition hover:text-amber-100"
                  >
                    <span className="line-clamp-2 block">{p.testo}</span>
                    <span className="mt-0.5 block text-xs text-stone-500">
                      {nomeLuogo(p.luogo)} · {formattaData(p.creato_il)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {fileDaRitagliare && (
        <RitagliaAvatar
          file={fileDaRitagliare}
          onAnnulla={() => setFileDaRitagliare(null)}
          onConferma={usaRitaglio}
        />
      )}
    </main>
  );
}
