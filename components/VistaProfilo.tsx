"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useLingua } from "@/lib/i18n";
import RitagliaAvatar from "@/components/RitagliaAvatar";
import EditorMuro from "@/components/EditorMuro";
import PostItView from "@/components/PostIt";
import {
  caricaAvatarBlob,
  caricaMieiPostit,
  contaPostitDiUtente,
  impostaMostraPostit,
  impostaMostraSalvati,
  MESSAGGIO_MIGRAZIONE,
  salvaMioProfilo,
  urlAvatar,
  MAX_BIO,
  MAX_NICK_PROFILO,
  type Profilo,
} from "@/lib/profili";
import { caricaPreferiti, type Preferito } from "@/lib/preferiti";
import type { PostIt } from "@/lib/postit";

const campo =
  "w-full rounded-full border border-stone-600 bg-stone-950/60 px-4 py-2 text-base text-amber-50 outline-none placeholder:text-stone-500 focus:border-amber-300";
const area =
  "w-full resize-none rounded-2xl border border-stone-600 bg-stone-950/60 px-4 py-2 text-base text-amber-50 outline-none placeholder:text-stone-500 focus:border-amber-300";
const bottone =
  "rounded-full bg-amber-300 px-4 py-2 text-sm font-bold text-stone-900 shadow-lg transition hover:scale-[1.03] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40";
const card =
  "mt-6 rounded-xl border border-amber-100/20 bg-stone-900/60 p-5 text-left shadow-xl backdrop-blur-sm";

/** Interruttore ON/OFF della bacheca pubblica. */
function Interruttore({
  attivo,
  onCambia,
  disabilitato,
  etichetta,
}: {
  attivo: boolean;
  onCambia: (valore: boolean) => void;
  disabilitato?: boolean;
  etichetta: string;
}) {
  return (
    <div className="mt-4 flex items-center justify-between gap-3">
      <span className="text-xs leading-snug text-stone-300">{etichetta}</span>
      <div className="flex shrink-0 items-center gap-2">
        <span
          className={
            "text-[11px] font-bold uppercase tracking-wide " +
            (attivo ? "text-amber-300" : "text-stone-500")
          }
        >
          {attivo ? "ON" : "OFF"}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={attivo}
          aria-label={etichetta}
          disabled={disabilitato}
          onClick={() => onCambia(!attivo)}
          className={
            "relative h-6 w-11 rounded-full transition disabled:cursor-not-allowed disabled:opacity-40 " +
            (attivo ? "bg-amber-300" : "bg-stone-600")
          }
        >
          <span
            className={
              "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all " +
              (attivo ? "left-[22px]" : "left-0.5")
            }
          />
        </button>
      </div>
    </div>
  );
}

/** Cornice di un elenco con anteprima e link alla schermata dedicata. */
function CorniceElenco({
  titolo,
  postit,
  totale,
  href,
  vuoto,
}: {
  titolo: string;
  postit: PostIt[];
  totale: number;
  href: string;
  vuoto: string;
}) {
  const { t } = useLingua();
  return (
    <div className={card}>
      <h2 className="font-scritta text-xl text-amber-100">{titolo}</h2>
      {postit.length === 0 ? (
        <p className="mt-2 text-sm text-stone-400">{vuoto}</p>
      ) : (
        <div className="mt-3 grid grid-cols-3 items-start gap-2.5">
          {postit.slice(0, 5).map((p) => (
            <PostItView key={p.id} postit={p} />
          ))}
        </div>
      )}
      {totale > 0 && (
        <Link
          href={href}
          className="mt-4 inline-block text-sm font-semibold text-amber-300 transition hover:text-amber-100"
        >
          {t("profilo.leggiTutti")}
        </Link>
      )}
    </div>
  );
}

/**
 * Vista del profilo /profilo/[id], condivisa tra PROPRIETARIO e VISITATORE.
 *
 * Prima del mount disegna la vista pubblica (identica a quella del server, per
 * non avere divergenze di idratazione); subito dopo, se l'account collegato e'
 * il proprietario, passa alla vista di gestione: foto cliccabile, username con
 * "Modifica", bio con "Aggiorna/Scrivi", le card "I miei post-it" e "Post-it
 * salvati" con i rispettivi interruttori ON/OFF della bacheca pubblica.
 *
 * Il VISITATORE vede solo cio' che gli interruttori lasciano visibile: quando
 * un elenco e' spento, la sua cornice NON compare affatto (nessun segnaposto
 * tipo "profilo privato").
 */
export default function VistaProfilo({
  profilo,
  postitPreview,
  totalePostit,
  salvatiPreview,
  totaleSalvati,
}: {
  profilo: Profilo;
  postitPreview: PostIt[];
  totalePostit: number;
  salvatiPreview: Preferito[];
  totaleSalvati: number;
}) {
  const { t } = useLingua();
  const router = useRouter();
  const { utente, caricamento } = useAuth();

  // Rileva l'idratazione: prima del mount teniamo la vista pubblica.
  const montato = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const proprietario = montato && !!utente && utente.id === profilo.id;

  // Dati del profilo "vivi" (aggiornati dopo ogni salvataggio del proprietario).
  const [p, setP] = useState<Profilo>(profilo);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [mancaMigrazione, setMancaMigrazione] = useState(false);

  // Anteprime del proprietario (caricate lato client, sempre visibili a lui).
  const [miei, setMiei] = useState<PostIt[]>([]);
  const [mioTotale, setMioTotale] = useState(0);
  const [salvati, setSalvati] = useState<Preferito[]>([]);

  // Editor inline.
  const [editNick, setEditNick] = useState(false);
  const [nickDraft, setNickDraft] = useState("");
  const [editBio, setEditBio] = useState(false);
  const [bioDraft, setBioDraft] = useState("");

  // Editor del muro personale (solo proprietario).
  const [editorMuro, setEditorMuro] = useState(false);

  // Avatar.
  const [fileDaRitagliare, setFileDaRitagliare] = useState<File | null>(null);
  const [caricandoAvatar, setCaricandoAvatar] = useState(false);
  const inputFoto = useRef<HTMLInputElement>(null);

  const mostraPostit = p.mostra_postit !== false;
  const mostraSalvati = p.mostra_salvati !== false;

  // Anteprime del proprietario: caricate solo quando l'account coincide.
  useEffect(() => {
    if (!proprietario) return;
    let attivo = true;
    caricaMieiPostit(5)
      .then((l) => attivo && setMiei(l))
      .catch(() => {});
    contaPostitDiUtente(profilo.id)
      .then((n) => attivo && setMioTotale(n))
      .catch(() => {});
    caricaPreferiti(profilo.id)
      .then((l) => attivo && setSalvati(l))
      .catch(() => {});
    return () => {
      attivo = false;
    };
  }, [proprietario, profilo.id]);

  const avatar = urlAvatar(p);
  const iniziale = p.nickname.trim().charAt(0).toUpperCase() || "?";

  /** Salva nickname/bio/foto mantenendo invariate le scelte di privacy. */
  async function salva(patch: {
    nickname?: string;
    bio?: string;
    foto_url?: string | null;
  }): Promise<boolean> {
    if (salvando) return false;
    setSalvando(true);
    setErr(null);
    setMsg(null);
    const esito = await salvaMioProfilo({
      nickname: patch.nickname ?? p.nickname,
      bio: patch.bio ?? p.bio ?? "",
      mostra_postit: p.mostra_postit,
      mostra_salvati: p.mostra_salvati,
      ...(patch.foto_url !== undefined ? { foto_url: patch.foto_url } : {}),
    });
    setSalvando(false);
    if (esito.ok) {
      setP(esito.profilo);
      setMsg(t("impost.profiloSalvato"));
      router.refresh();
      return true;
    }
    setErr(esito.errore);
    if (esito.errore === MESSAGGIO_MIGRAZIONE) setMancaMigrazione(true);
    return false;
  }

  async function salvaNick() {
    const ok = await salva({ nickname: nickDraft });
    if (ok) setEditNick(false);
  }

  async function salvaBio() {
    const ok = await salva({ bio: bioDraft });
    if (ok) setEditBio(false);
  }

  function cambiaFoto(evento: ChangeEvent<HTMLInputElement>) {
    const file = evento.target.files?.[0];
    evento.target.value = "";
    if (!file) return;
    setErr(null);
    setMsg(null);
    setFileDaRitagliare(file);
  }

  async function usaRitaglio(blob: Blob) {
    setFileDaRitagliare(null);
    setCaricandoAvatar(true);
    const foto = await caricaAvatarBlob(blob);
    if (!foto.ok) {
      setCaricandoAvatar(false);
      setErr(foto.errore);
      return;
    }
    const esito = await salvaMioProfilo({
      nickname: p.nickname,
      bio: p.bio ?? "",
      mostra_postit: p.mostra_postit,
      mostra_salvati: p.mostra_salvati,
      foto_url: foto.url,
    });
    setCaricandoAvatar(false);
    if (esito.ok) {
      setP(esito.profilo);
      setMsg(t("impost.fotoAggiornata"));
      router.refresh();
    } else {
      setErr(esito.errore);
    }
  }

  async function alternaPostit(attivo: boolean) {
    setErr(null);
    setMsg(null);
    const esito = await impostaMostraPostit(attivo);
    if (esito.ok) {
      setP((attuale) => ({ ...attuale, mostra_postit: attivo }));
      router.refresh();
    } else {
      setErr(esito.errore);
    }
  }

  async function alternaSalvati(attivo: boolean) {
    setErr(null);
    setMsg(null);
    const esito = await impostaMostraSalvati(attivo);
    if (esito.ok) {
      setP((attuale) => ({ ...attuale, mostra_salvati: attivo }));
      router.refresh();
    } else {
      setErr(esito.errore);
    }
  }

  const salvatiPostit: PostIt[] = salvati.map((s) => ({
    id: s.id,
    testo: s.testo,
    nickname: s.nickname,
    luogo: s.luogo,
    creato_il: s.creato_il,
  }));

  // In attesa di sapere chi sta guardando: vista pubblica.
  if (!proprietario) {
    return (
      <div className="px-4">
        <header className="pb-2 pt-10 text-center sm:pt-14">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatar}
              alt={t("profilo.fotoAlt", { nome: p.nickname })}
              className="mx-auto mt-4 h-24 w-24 rounded-full object-cover shadow-xl ring-2 ring-amber-300/60"
            />
          ) : (
            <span className="mx-auto mt-4 flex h-24 w-24 items-center justify-center rounded-full bg-amber-300 font-scritta text-4xl font-bold text-stone-900 shadow-xl">
              {iniziale}
            </span>
          )}
          <h1 className="mt-4 font-scritta text-4xl leading-tight text-amber-100 drop-shadow-md sm:text-5xl">
            {p.nickname}
          </h1>
          {/* Biografia: riquadro di carta con inchiostro nero e contorno ocra
              (stesso trattamento del testo di presentazione in home). */}
          {p.bio && (
            <div className="riquadro-leggibile mx-auto mt-4 max-w-md text-left">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-stone-600">
                {t("profilo.bioTitolo")}
              </p>
              <p className="testo-leggibile mt-2 whitespace-pre-wrap font-scritta text-2xl leading-snug">
                {p.bio}
              </p>
            </div>
          )}
        </header>

        <div className="mx-auto max-w-md pb-24">
          {/* Al visitatore non mostriamo cornici vuote: niente segnaposto. */}
          {mostraPostit && totalePostit > 0 && (
            <CorniceElenco
              titolo={t("profilo.elencoMiei", { nome: p.nickname })}
              postit={postitPreview}
              totale={totalePostit}
              href={`/profilo/${p.id}/postit`}
              vuoto={t("profiloPub.vuoto")}
            />
          )}
          {mostraSalvati && totaleSalvati > 0 && (
            <CorniceElenco
              titolo={t("profilo.elencoSalvati", { nome: p.nickname })}
              postit={salvatiPreview.map((s) => ({
                id: s.id,
                testo: s.testo,
                nickname: s.nickname,
                luogo: s.luogo,
                creato_il: s.creato_il,
              }))}
              totale={totaleSalvati}
              href={`/profilo/${p.id}/salvati`}
              vuoto={t("profilo.nienteDaMostrare")}
            />
          )}
        </div>
      </div>
    );
  }

  // Vista del proprio profilo (proprietario).
  return (
    <div className="px-4">
      <header className="pb-2 pt-10 text-center sm:pt-14">
        <button
          type="button"
          onClick={() => inputFoto.current?.click()}
          disabled={caricandoAvatar}
          aria-label={t("profilo.cliccaFoto")}
          className="mx-auto mt-4 block disabled:cursor-not-allowed disabled:opacity-50"
        >
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatar}
              alt={t("profilo.fotoAlt", { nome: p.nickname })}
              className="h-24 w-24 rounded-full object-cover shadow-xl ring-2 ring-amber-300/60 transition hover:opacity-80"
            />
          ) : (
            <span className="flex h-24 w-24 items-center justify-center rounded-full bg-amber-300 font-scritta text-4xl font-bold text-stone-900 shadow-xl transition hover:opacity-80">
              {iniziale}
            </span>
          )}
        </button>
        <p className="scritta-sistema-cornice mt-3 px-3 py-1 text-xs">
          {t("profilo.cliccaFoto")}
        </p>
        <input
          ref={inputFoto}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={cambiaFoto}
          className="hidden"
        />

        {/* Username/nome mostrato + tasto Modifica. */}
        <div className="mt-3 flex items-center justify-center gap-3">
          <h1 className="font-scritta text-4xl leading-tight text-amber-100 drop-shadow-md sm:text-5xl">
            {p.nickname}
          </h1>
          <button
            type="button"
            onClick={() => {
              setNickDraft(p.nickname);
              setEditNick(true);
              setMsg(null);
              setErr(null);
            }}
            className="shrink-0 rounded-full border border-amber-100/30 px-3 py-1 text-xs font-semibold text-amber-100 transition hover:bg-stone-950/60"
          >
            {t("profilo.modifica")}
          </button>
        </div>

        {editNick && (
          <div className="mx-auto mt-3 max-w-md rounded-xl border border-amber-100/25 bg-stone-900/70 p-4 text-left">
            <label
              htmlFor="nickEdit"
              className="block text-[10px] font-bold uppercase tracking-[0.3em] text-amber-200/70"
            >
              {t("impost.nomePost")}
            </label>
            <input
              id="nickEdit"
              type="text"
              value={nickDraft}
              onChange={(e) => setNickDraft(e.target.value)}
              maxLength={MAX_NICK_PROFILO}
              className={campo + " mt-2"}
            />
            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditNick(false)}
                className="rounded-full px-3 py-2 text-xs font-semibold text-stone-300 transition hover:bg-stone-950/60"
              >
                {t("comune.chiudi")}
              </button>
              <button
                type="button"
                onClick={salvaNick}
                disabled={salvando}
                className={bottone}
              >
                {t("profilo.aggiorna")}
              </button>
            </div>
          </div>
        )}

        {/* Cornice biografia. */}
        <div className="mx-auto mt-4 max-w-md rounded-xl border border-amber-100/25 bg-stone-900/60 px-5 py-4 text-left shadow-lg backdrop-blur-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-amber-200/70">
            {t("profilo.bioTitolo")}
          </p>
          {editBio ? (
            <>
              <textarea
                value={bioDraft}
                onChange={(e) => setBioDraft(e.target.value)}
                maxLength={MAX_BIO}
                rows={3}
                placeholder={t("impost.bioPh")}
                className={area + " mt-2"}
              />
              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditBio(false)}
                  className="rounded-full px-3 py-2 text-xs font-semibold text-stone-300 transition hover:bg-stone-950/60"
                >
                  {t("comune.chiudi")}
                </button>
                <button
                  type="button"
                  onClick={salvaBio}
                  disabled={salvando}
                  className={bottone}
                >
                  {t("profilo.aggiorna")}
                </button>
              </div>
            </>
          ) : (
            <>
              {p.bio ? (
                <p className="mt-2 whitespace-pre-wrap font-scritta text-2xl leading-snug text-amber-100">
                  {p.bio}
                </p>
              ) : (
                <p className="mt-2 text-sm text-stone-500">
                  {t("impost.bioPh")}
                </p>
              )}
              <button
                type="button"
                onClick={() => {
                  setBioDraft(p.bio ?? "");
                  setEditBio(true);
                  setMsg(null);
                  setErr(null);
                }}
                className="mt-3 rounded-full border border-amber-100/30 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:bg-stone-950/60"
              >
                {p.bio ? t("profilo.aggiornaBio") : t("profilo.scriviBio")}
              </button>
            </>
          )}
        </div>

        {(msg || err) && (
          <p
            className={
              "mt-3 text-center text-sm font-semibold " +
              (err ? "text-red-300" : "text-amber-300")
            }
          >
            {err ?? msg}
          </p>
        )}
      </header>

      <section className="mx-auto max-w-md pb-24">
        {/* Muro personale: solo il proprietario puo' disegnarlo. */}
        <div className={card}>
          <h2 className="font-scritta text-xl text-amber-100">
            {t("muro.titolo")}
          </h2>
          <p className="mt-2 text-sm text-stone-400">{t("muro.sottotitolo")}</p>
          <button
            type="button"
            onClick={() => {
              setErr(null);
              setMsg(null);
              setEditorMuro(true);
            }}
            className={bottone + " mt-4"}
          >
            {t("muro.personalizza")}
          </button>
          <p className="mt-3 text-xs leading-snug text-stone-500">
            {t("muro.notaSfondo")}
          </p>
        </div>

        {mancaMigrazione && (
          <div className="mt-4 rounded-lg border border-red-300/30 bg-red-950/40 p-4 text-sm text-red-200">
            {MESSAGGIO_MIGRAZIONE}
          </div>
        )}

        {/* I miei post-it. */}
        <div className={card}>
          <h2 className="font-scritta text-xl text-amber-100">
            {t("impost.mieiPostit")}
          </h2>
          {miei.length === 0 ? (
            <p className="mt-2 text-sm text-stone-400">{t("profiloPub.vuoto")}</p>
          ) : (
            <div className="mt-3 grid grid-cols-3 items-start gap-2.5">
              {miei.slice(0, 5).map((postit) => (
                <PostItView key={postit.id} postit={postit} />
              ))}
            </div>
          )}
          {mioTotale > 0 && (
            <Link
              href={`/profilo/${p.id}/postit`}
              className="mt-4 inline-block text-sm font-semibold text-amber-300 transition hover:text-amber-100"
            >
              {t("profilo.leggiTutti")}
            </Link>
          )}
          <Interruttore
            attivo={mostraPostit}
            onCambia={alternaPostit}
            etichetta={t("profilo.togglePostit")}
          />
        </div>

        {/* Post-it salvati. */}
        <div className={card}>
          <h2 className="font-scritta text-xl text-amber-100">
            {t("profilo.salvatiTitolo")}
          </h2>
          {salvatiPostit.length === 0 ? (
            <p className="mt-2 text-sm text-stone-400">
              {t("profilo.nienteDaMostrare")}
            </p>
          ) : (
            <div className="mt-3 grid grid-cols-3 items-start gap-2.5">
              {salvatiPostit.slice(0, 5).map((postit) => (
                <PostItView key={postit.id} postit={postit} />
              ))}
            </div>
          )}
          {salvatiPostit.length > 0 && (
            <Link
              href={`/profilo/${p.id}/salvati`}
              className="mt-4 inline-block text-sm font-semibold text-amber-300 transition hover:text-amber-100"
            >
              {t("profilo.leggiTutti")}
            </Link>
          )}
          <Interruttore
            attivo={mostraSalvati}
            onCambia={alternaSalvati}
            etichetta={t("profilo.toggleSalvati")}
          />
        </div>
      </section>

      {fileDaRitagliare && (
        <RitagliaAvatar
          file={fileDaRitagliare}
          onAnnulla={() => setFileDaRitagliare(null)}
          onConferma={usaRitaglio}
        />
      )}

      {editorMuro && (
        <EditorMuro
          onChiudi={() => setEditorMuro(false)}
          onSalvato={() => router.refresh()}
        />
      )}

      {caricamento && null}
    </div>
  );
}
