"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  apriMuroEvento,
  caricaFotoCollettivoBlob,
  caricaMioCollettivo,
  chiudiMuriScaduti,
  chiudiMuro,
  elencaMuriCollettivo,
  riapriMuro,
  salvaFotoCollettivo,
  slugify,
  type Collettivo,
  type MuroCollettivo,
} from "@/lib/collettivi";
import { formattaData } from "@/lib/formato";
import { useAuth } from "@/lib/auth";
import { useLingua } from "@/lib/i18n";
import RitagliaAvatar from "@/components/RitagliaAvatar";

/** "2026-07-12T21:00" (datetime-local) -> ISO con fuso, oppure null. */
function aIso(valore: string): string | null {
  if (!valore) return null;
  const d = new Date(valore);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Il muro-evento e' ancora scrivibile? (stato aperto e fine non passata) */
function scrivibile(m: MuroCollettivo): boolean {
  if (m.stato === "chiuso") return false;
  if (m.tipo === "evento" && m.data_fine) {
    const fine = Date.parse(m.data_fine);
    if (Number.isFinite(fine) && Date.now() > fine) return false;
  }
  return true;
}

/**
 * Sezione di gestione del PROPRIO collettivo (mostrata dentro /collettivo/<slug>
 * solo all'account del collettivo): foto quadrata, elenco muri con apri/chiudi e
 * creazione di un nuovo muro-evento con inizio e fine (data + ora).
 *
 * La sicurezza vera e' nel database: RPC SECURITY DEFINER (0029) e RLS (0025).
 * Qui, se l'account non e' il proprietario, non mostriamo nulla.
 */
export default function GestioneCollettivo({
  collettivo,
}: {
  collettivo: Collettivo;
}) {
  const { t } = useLingua();
  const { utente } = useAuth();

  const [mio, setMio] = useState(false);
  const [foto, setFoto] = useState<string | null>(collettivo.foto_url);
  const [fileScelto, setFileScelto] = useState<File | null>(null);
  const [fotoOccupata, setFotoOccupata] = useState(false);
  const [messaggioFoto, setMessaggioFoto] = useState("");
  const inputFoto = useRef<HTMLInputElement>(null);

  const [muri, setMuri] = useState<MuroCollettivo[]>([]);
  const [nomeEvento, setNomeEvento] = useState("");
  const [inizio, setInizio] = useState("");
  const [fine, setFine] = useState("");
  const [occupato, setOccupato] = useState(false);
  const [errore, setErrore] = useState("");

  // Verifica di proprieta': solo l'account del collettivo vede questa sezione.
  useEffect(() => {
    let attivo = true;
    if (!utente) {
      setMio(false);
      return;
    }
    caricaMioCollettivo()
      .then((c) => {
        if (attivo) setMio(!!c && c.id === collettivo.id);
      })
      .catch(() => attivo && setMio(false));
    return () => {
      attivo = false;
    };
  }, [utente, collettivo.id]);

  // Chiude gli eventuali muri-evento scaduti e carica l'elenco dei muri.
  useEffect(() => {
    if (!mio) return;
    let attivo = true;
    (async () => {
      await chiudiMuriScaduti();
      const lista = await elencaMuriCollettivo(collettivo.id);
      if (attivo) setMuri(lista);
    })();
    return () => {
      attivo = false;
    };
  }, [mio, collettivo.id]);

  async function ricaricaMuri() {
    setMuri(await elencaMuriCollettivo(collettivo.id));
  }

  async function confermaFoto(blob: Blob) {
    setFileScelto(null);
    setFotoOccupata(true);
    setMessaggioFoto("");
    const caricamento = await caricaFotoCollettivoBlob(blob);
    if (!caricamento.ok) {
      setFotoOccupata(false);
      setMessaggioFoto(caricamento.errore);
      return;
    }
    const salvataggio = await salvaFotoCollettivo(caricamento.url);
    setFotoOccupata(false);
    if (!salvataggio.ok) {
      setMessaggioFoto(salvataggio.errore);
      return;
    }
    setFoto(salvataggio.collettivo.foto_url);
    setMessaggioFoto(t("gest.fotoSalvata"));
  }

  async function creaEvento(ev: React.FormEvent) {
    ev.preventDefault();
    setErrore("");
    const nome = nomeEvento.trim();
    if (!nome) {
      setErrore(t("gest.eventoErroreNome"));
      return;
    }
    const isoInizio = aIso(inizio);
    const isoFine = aIso(fine);
    if (isoInizio && isoFine && Date.parse(isoFine) < Date.parse(isoInizio)) {
      setErrore(t("gest.eventoErroreDate"));
      return;
    }
    setOccupato(true);
    const esito = await apriMuroEvento({
      collettivoId: collettivo.id,
      slug: `${collettivo.slug}-${slugify(nome)}`.slice(0, 60),
      nome,
      dataInizio: isoInizio,
      dataFine: isoFine,
    });
    setOccupato(false);
    if (!esito.ok) {
      setErrore(esito.errore || t("gest.eventoErroreNome"));
      return;
    }
    setNomeEvento("");
    setInizio("");
    setFine("");
    await ricaricaMuri();
  }

  async function alterna(m: MuroCollettivo) {
    if (m.tipo === "principale") return;
    setOccupato(true);
    if (m.stato === "chiuso") await riapriMuro(m.slug);
    else await chiudiMuro(m.slug);
    setOccupato(false);
    await ricaricaMuri();
  }

  if (!mio) return null;

  return (
    <section className="mx-auto mt-10 w-full max-w-3xl px-4">
      <div className="rounded-2xl border border-amber-100/20 bg-stone-900/60 p-5 shadow-xl backdrop-blur-sm">
        <h2 className="font-scritta text-3xl text-amber-100">
          {t("gest.titolo")}
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-stone-400">
          {t("gest.intro")}
        </p>

        {/* Foto del collettivo (quadrata) */}
        <div className="mt-5 flex items-center gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-amber-100/30 bg-stone-950/60 text-3xl">
            {foto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={foto} alt={collettivo.nome} className="h-full w-full object-cover" />
            ) : (
              <span aria-hidden>{collettivo.emoji ?? "🎪"}</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-scritta text-xl text-amber-100">
              {t("gest.fotoTitolo")}
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-stone-400">
              {t("gest.fotoTesto")}
            </p>
            <button
              type="button"
              onClick={() => inputFoto.current?.click()}
              disabled={fotoOccupata}
              className="mt-2 rounded-full bg-amber-300 px-4 py-1.5 text-xs font-bold text-stone-900 transition hover:scale-105 disabled:opacity-50"
            >
              {fotoOccupata ? "…" : t("gest.fotoCambia")}
            </button>
            <input
              ref={inputFoto}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                if (f) setFileScelto(f);
                e.target.value = "";
              }}
            />
          </div>
        </div>
        {messaggioFoto && (
          <p className="mt-2 text-xs font-semibold text-emerald-300">
            {messaggioFoto}
          </p>
        )}

        {/* Muri del collettivo */}
        <div className="mt-6 border-t border-amber-100/10 pt-4">
          <h3 className="font-scritta text-2xl text-amber-100">
            {t("gest.muriTitolo")}
          </h3>
          {muri.length === 0 ? (
            <p className="mt-2 text-sm text-stone-400">—</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {muri.map((m) => {
                const ok = scrivibile(m);
                return (
                  <li
                    key={m.slug}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-100/10 bg-stone-950/40 px-3 py-2"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-amber-100">
                        {m.nome}
                      </span>
                      <span className="block text-[10px] text-stone-500">
                        {m.tipo === "principale"
                          ? t("collettivo.tipoPrincipale")
                          : t("collettivo.tipoEvento")}
                        {m.tipo === "principale" && ` · ${t("gest.principaleInfo")}`}
                      </span>
                      {m.tipo === "evento" && (m.data_inizio || m.data_fine) && (
                        <span className="block text-[10px] text-stone-500">
                          {m.data_inizio
                            ? t("ev.dal", { inizio: formattaData(m.data_inizio) })
                            : ""}
                          {m.data_fine
                            ? ` ${t("ev.al", { fine: formattaData(m.data_fine) })}`
                            : ""}
                        </span>
                      )}
                    </span>
                    <span className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          ok
                            ? "bg-emerald-400/20 text-emerald-200"
                            : "bg-stone-700/50 text-stone-300"
                        }`}
                      >
                        {ok ? t("gest.statoAperto") : t("gest.statoChiuso")}
                      </span>
                      {m.tipo === "evento" && (
                        <button
                          type="button"
                          onClick={() => alterna(m)}
                          disabled={occupato}
                          className="rounded-full border border-amber-100/30 px-3 py-1 text-[10px] font-semibold text-amber-100 transition hover:bg-stone-950/50 disabled:opacity-50"
                        >
                          {m.stato === "chiuso" ? t("gest.riapri") : t("gest.chiudi")}
                        </button>
                      )}
                      <Link
                        href={`/muro/${m.slug}`}
                        className="rounded-full border border-amber-100/30 px-3 py-1 text-[10px] font-semibold text-amber-100 transition hover:bg-stone-950/50"
                      >
                        {t("collettivo.apri")}
                      </Link>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Nuovo muro-evento con inizio e fine */}
        <form
          onSubmit={creaEvento}
          className="mt-6 rounded-xl border border-amber-100/15 bg-stone-950/40 p-4"
        >
          <h3 className="font-scritta text-2xl text-amber-100">
            {t("gest.eventoTitolo")}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-amber-200/80">
            {t("gest.eventoSpiega")}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-stone-400">
            {t("gest.eventoSpiegaCampi")}
          </p>

          <label className="mt-3 block text-sm text-stone-300">
            {t("gest.eventoNome")}
            <input
              value={nomeEvento}
              onChange={(e) => setNomeEvento(e.target.value)}
              className="mt-1 w-full rounded-lg border border-amber-100/20 bg-stone-950/60 px-3 py-2 text-base text-amber-50 outline-none focus:border-amber-300/60"
            />
          </label>

          <p className="mt-3 text-xs font-bold uppercase tracking-[0.2em] text-amber-200/70">
            {t("gest.quando")}
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            <label className="text-xs text-stone-400">
              {t("gest.eventoInizio")}
              <input
                type="datetime-local"
                value={inizio}
                onChange={(e) => setInizio(e.target.value)}
                className="mt-1 block rounded-lg border border-amber-100/20 bg-stone-950/60 px-3 py-1.5 text-sm text-amber-50 outline-none focus:border-amber-300/60"
              />
            </label>
            <label className="text-xs text-stone-400">
              {t("gest.eventoFine")}
              <input
                type="datetime-local"
                value={fine}
                onChange={(e) => setFine(e.target.value)}
                className="mt-1 block rounded-lg border border-amber-100/20 bg-stone-950/60 px-3 py-1.5 text-sm text-amber-50 outline-none focus:border-amber-300/60"
              />
            </label>
          </div>

          {errore && <p className="mt-3 text-sm text-red-300">{errore}</p>}

          <button
            type="submit"
            disabled={occupato}
            className="mt-4 rounded-full bg-amber-300 px-6 py-2.5 text-sm font-bold text-stone-900 shadow-lg transition hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            {occupato ? "…" : t("gest.eventoApri")}
          </button>
        </form>
      </div>

      {fileScelto && (
        <RitagliaAvatar
          file={fileScelto}
          maschera="quadrato"
          onAnnulla={() => setFileScelto(null)}
          onConferma={confermaFoto}
        />
      )}
    </section>
  );
}
