"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
} from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useLingua } from "@/lib/i18n";
import RitagliaAvatar from "@/components/RitagliaAvatar";
import EditorMuro from "@/components/EditorMuro";
import MuroEsplorabile, { type ZonaMuro } from "@/components/MuroEsplorabile";
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
    <div className="flex items-center justify-between gap-3">
      <span className="scritta-sistema text-xs leading-snug">{etichetta}</span>
      <div className="flex shrink-0 items-center gap-2">
        <span
          className={
            "text-[11px] font-bold uppercase tracking-wide " +
            (attivo ? "text-amber-600" : "text-stone-500")
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

/**
 * Vista del profilo /profilo/[id], condivisa tra PROPRIETARIO e VISITATORE.
 *
 * Tutto il profilo vive su un MURO ESPLORABILE (MuroEsplorabile): una parete
 * spaziale che si trascina e si ingrandisce, mostrata per intero all'apertura
 * con nome, biografia e le due zone di post-it distribuite sulla parete.
 *
 * Prima del mount disegna la vista pubblica (identica a quella del server, per
 * non avere divergenze di idratazione); subito dopo, se l'account collegato e'
 * il proprietario, passa alla vista di gestione: foto cliccabile scritta sulla
 * parete, tasto "Modifica profilo" sulla parete, gli interruttori ON/OFF della
 * bacheca pubblica resi FISSI fuori dal muro e il matita che apre l'editor.
 *
 * Il VISITATORE vede solo cio' che gli interruttori lasciano visibile: quando
 * una zona e' spenta, NON compare affatto sulla parete (nessun segnaposto
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

  // Menu unico di modifica profilo (foto, username, bio).
  const [menuAperto, setMenuAperto] = useState(false);
  const [nickDraft, setNickDraft] = useState("");
  const [bioDraft, setBioDraft] = useState("");

  // Editor del muro personale (solo proprietario). Il muro in se' lo mostra
  // gia' SfondoMuro come sfondo a tutto schermo della pagina (e si aggiorna
  // da solo quando l'editor salva): qui serve solo il pulsante che lo apre.
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

  // Chiude il menu di modifica con Escape, come le altre finestre dell'app.
  useEffect(() => {
    if (!menuAperto) return;
    const alTasto = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuAperto(false);
    };
    window.addEventListener("keydown", alTasto);
    return () => window.removeEventListener("keydown", alTasto);
  }, [menuAperto]);

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

  function apriMenu() {
    setNickDraft(p.nickname);
    setBioDraft(p.bio ?? "");
    setErr(null);
    setMsg(null);
    setMenuAperto(true);
  }

  function chiudiMenu() {
    setMenuAperto(false);
  }

  async function salvaNick() {
    const ok = await salva({ nickname: nickDraft });
    if (ok) chiudiMenu();
  }

  async function salvaBio() {
    const ok = await salva({ bio: bioDraft });
    if (ok) chiudiMenu();
  }

  function cambiaFoto(evento: ChangeEvent<HTMLInputElement>) {
    const file = evento.target.files?.[0];
    evento.target.value = "";
    if (!file) return;
    setErr(null);
    setMsg(null);
    // Il ritaglio (z-50) deve stare sopra tutto: chiudiamo il menu prima.
    chiudiMenu();
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

  // Zone della parete. Per il proprietario entrambe esistono sempre (sono i
  // suoi interruttori a decidere cosa vedono gli altri); per il visitatore
  // solo quelle lasciate visibili, e mai zone vuote (nessun segnaposto).
  const zoneProprietario: ZonaMuro[] = [
    {
      chiave: "miei",
      titolo: t("impost.mieiPostit"),
      postit: miei,
      totale: mioTotale,
      href: `/profilo/${p.id}/postit`,
      vuoto: t("profiloPub.vuoto"),
    },
    {
      chiave: "salvati",
      titolo: t("profilo.salvatiTitolo"),
      postit: salvatiPostit,
      totale: salvatiPostit.length,
      href: `/profilo/${p.id}/salvati`,
      vuoto: t("profilo.nienteDaMostrare"),
      salvati: true,
    },
  ];

  const zoneVisitatore: ZonaMuro[] = [];
  if (mostraPostit && totalePostit > 0) {
    zoneVisitatore.push({
      chiave: "miei",
      titolo: t("profilo.elencoMiei", { nome: p.nickname }),
      postit: postitPreview,
      totale: totalePostit,
      href: `/profilo/${p.id}/postit`,
      vuoto: t("profiloPub.vuoto"),
    });
  }
  if (mostraSalvati && totaleSalvati > 0) {
    zoneVisitatore.push({
      chiave: "salvati",
      titolo: t("profilo.elencoSalvati", { nome: p.nickname }),
      postit: salvatiPreview.map((s) => ({
        id: s.id,
        testo: s.testo,
        nickname: s.nickname,
        luogo: s.luogo,
        creato_il: s.creato_il,
      })),
      totale: totaleSalvati,
      href: `/profilo/${p.id}/salvati`,
      vuoto: t("profilo.nienteDaMostrare"),
      salvati: true,
    });
  }

  // In attesa di sapere chi sta guardando: vista pubblica.
  if (!proprietario) {
    return (
      <MuroEsplorabile
        idMuro={p.id}
        nickname={p.nickname}
        bio={p.bio}
        avatar={avatar}
        altFoto={t("profilo.fotoAlt", { nome: p.nickname })}
        zone={zoneVisitatore}
      />
    );
  }

  // Vista del proprio profilo (proprietario).
  return (
    <>
      {/* Matita del muro personale: in alto a destra, appena sotto le icone
          della barra alta (stesso stile e allineato al suo bordo destro,
          con le aree di sicurezza rispettate). Apre l'editor esistente; il
          muro in se' e' gia' lo sfondo della pagina via SfondoMuro. */}
      <button
        type="button"
        onClick={() => {
          setErr(null);
          setMsg(null);
          setEditorMuro(true);
        }}
        title={t("muro.personalizzaBreve")}
        aria-label={t("muro.personalizzaBreve")}
        className="fixed right-[max(1rem,env(safe-area-inset-right))] top-[calc(max(1rem,env(safe-area-inset-top))+3.5rem)] z-30 flex h-11 w-11 items-center justify-center rounded-full border border-amber-100/25 bg-stone-950/70 text-lg text-amber-100 shadow-lg backdrop-blur transition hover:bg-stone-900 active:scale-95"
      >
        ✏️
      </button>

      {/* L'input nascosto della foto resta qui: l'avatar sulla parete (gestito
          da MuroEsplorabile) lo attiva. Tutto il resto della vista e' il muro
          esplorabile: parete, nome, bio, zone di post-it e interruttori FISSI
          fuori dalla parete. */}
      <input
        ref={inputFoto}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={cambiaFoto}
        className="hidden"
      />
      <MuroEsplorabile
        idMuro={p.id}
        nickname={p.nickname}
        bio={p.bio}
        avatar={avatar}
        altFoto={t("profilo.fotoAlt", { nome: p.nickname })}
        onAvatar={() => inputFoto.current?.click()}
        sottoAvatar={
          <>
            <button
              type="button"
              onClick={apriMenu}
              className="scritta-sistema-cornice px-3 py-1 text-xs"
            >
              {t("profilo.modificaProfilo")}
            </button>
            {!p.bio && (
              <button
                type="button"
                onClick={apriMenu}
                className="scritta-sistema-cornice px-3 py-1 text-xs"
              >
                {t("profilo.aggiungiBio")}
              </button>
            )}
          </>
        }
        zone={zoneProprietario}
        comandiFissi={
          <div className="flex flex-col gap-3">
            {mancaMigrazione && (
              <p className="rounded-lg border border-red-800 bg-[#fffdf4] p-2 text-[11px] font-semibold leading-snug text-red-800">
                {MESSAGGIO_MIGRAZIONE}
              </p>
            )}
            <Interruttore
              attivo={mostraPostit}
              onCambia={alternaPostit}
              etichetta={t("profilo.togglePostit")}
            />
            <Interruttore
              attivo={mostraSalvati}
              onCambia={alternaSalvati}
              etichetta={t("profilo.toggleSalvati")}
            />
          </div>
        }
      />

      {/* Messaggi: pillola FISSA in alto al centro, non si muove col muro. */}
      {(msg || err) && (
        <p
          className="scritta-sistema-cornice fixed left-1/2 top-[calc(max(1rem,env(safe-area-inset-top))+3.75rem)] z-40 w-max max-w-[86vw] -translate-x-1/2 px-3 py-1 text-center text-xs"
          style={err ? { color: "#991b1b" } : undefined}
        >
          {err ?? msg}
        </p>
      )}

      {/* Menu unico di modifica profilo: foto, username e bio. */}
      {menuAperto && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={chiudiMenu}
          className="fixed inset-0 z-[60] flex items-end justify-center bg-stone-950/70 p-4 backdrop-blur-sm sm:items-center sm:p-6"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-amber-100/25 bg-stone-900 p-5 text-left shadow-2xl"
          >
            <h2 className="font-scritta text-2xl text-amber-100">
              {t("profilo.modificaProfilo")}
            </h2>

            {/* Foto: tocca per scegliere l'immagine. */}
            <button
              type="button"
              onClick={() => inputFoto.current?.click()}
              disabled={caricandoAvatar}
              className="mx-auto mt-4 block disabled:cursor-not-allowed disabled:opacity-50"
            >
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatar}
                  alt={t("profilo.fotoAlt", { nome: p.nickname })}
                  className="h-20 w-20 rounded-full object-cover shadow-xl ring-2 ring-amber-300/60 transition hover:opacity-80"
                />
              ) : (
                <span className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-300 font-scritta text-3xl font-bold text-stone-900 shadow-xl transition hover:opacity-80">
                  {iniziale}
                </span>
              )}
            </button>
            <p className="mt-2 text-center text-xs text-stone-400">
              {t("profilo.cambiaFoto")}
            </p>

            {/* Username. */}
            <label
              htmlFor="nickMenu"
              className="mt-4 block text-[10px] font-bold uppercase tracking-[0.3em] text-amber-200/70"
            >
              {t("impost.nomePost")}
            </label>
            <input
              id="nickMenu"
              type="text"
              value={nickDraft}
              onChange={(e) => setNickDraft(e.target.value)}
              maxLength={MAX_NICK_PROFILO}
              className={campo + " mt-2"}
            />
            <button
              type="button"
              onClick={salvaNick}
              disabled={salvando}
              className={bottone + " mt-2 w-full"}
            >
              {t("profilo.aggiorna")}
            </button>

            {/* Biografia. */}
            <label
              htmlFor="bioMenu"
              className="mt-4 block text-[10px] font-bold uppercase tracking-[0.3em] text-amber-200/70"
            >
              {t("profilo.bioTitolo")}
            </label>
            <textarea
              id="bioMenu"
              value={bioDraft}
              onChange={(e) => setBioDraft(e.target.value)}
              maxLength={MAX_BIO}
              rows={3}
              placeholder={t("impost.bioPh")}
              className={area + " mt-2"}
            />
            <button
              type="button"
              onClick={salvaBio}
              disabled={salvando}
              className={bottone + " mt-2 w-full"}
            >
              {t("profilo.aggiorna")}
            </button>

            <button
              type="button"
              onClick={chiudiMenu}
              className="mt-4 w-full rounded-full px-3 py-2 text-sm font-semibold text-stone-300 transition hover:bg-stone-950/60"
            >
              {t("comune.chiudi")}
            </button>
          </div>
        </div>
      )}

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
    </>
  );
}
