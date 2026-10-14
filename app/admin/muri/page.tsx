"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useAuth } from "@/lib/auth";
import { getClienteAuth } from "@/lib/clienteAuth";
import { comprimiImmagine } from "@/lib/immagini";
import { normalizzaLuogo, nomeLuogo } from "@/lib/luoghi";
import {
  cancellaMuro,
  centroPoligono,
  eAmministratore,
  elencaMuri,
  salvaMuro,
  svuotaPostit,
  type MuroAdmin,
  type Punto,
} from "@/lib/admin";
import { useLingua } from "@/lib/i18n";
import { formattaData } from "@/lib/formato";
import {
  cambiaStatoIdea,
  elencaIdee,
  eliminaIdea,
  type IdeaIdea,
  type StatoIdea,
} from "@/lib/idee";

// Le mappe (Leaflet) si caricano solo nel browser.
const DisegnaZona = dynamic(() => import("@/components/DisegnaZona"), {
  ssr: false,
});
const MappaPunto = dynamic(() => import("@/components/MappaPunto"), {
  ssr: false,
});

type Stato = "inattivo" | "caricamento" | "fatto" | "errore";

export default function PannelloMuri() {
  const { t } = useLingua();
  const { utente, caricamento } = useAuth();
  const [controllo, setControllo] = useState(true);
  const [admin, setAdmin] = useState(false);

  const [muri, setMuri] = useState<MuroAdmin[]>([]);
  const [caricoMuri, setCaricoMuri] = useState(false);

  // Proposte "Fonda un muro" ricevute dagli utenti.
  const [idee, setIdee] = useState<IdeaIdea[]>([]);
  const [caricoIdee, setCaricoIdee] = useState(false);
  const [messaggioIdee, setMessaggioIdee] = useState("");

  // Campi del form "fonda un muro"
  const [nome, setNome] = useState("");
  const [zona, setZona] = useState<Punto[]>([]);
  const [centro, setCentro] = useState<Punto | null>(null);
  const [foto, setFoto] = useState<File | null>(null);

  const [stato, setStato] = useState<Stato>("inattivo");
  const [messaggio, setMessaggio] = useState("");

  const ricaricaMuri = useCallback(async () => {
    setCaricoMuri(true);
    const lista = await elencaMuri();
    setMuri(lista);
    setCaricoMuri(false);
  }, []);

  const ricaricaIdee = useCallback(async () => {
    setCaricoIdee(true);
    const lista = await elencaIdee();
    setIdee(lista);
    setCaricoIdee(false);
  }, []);

  useEffect(() => {
    if (caricamento) return;
    let vivo = true;
    (async () => {
      const si = await eAmministratore();
      if (!vivo) return;
      setAdmin(si);
      setControllo(false);
      if (si) {
        await ricaricaMuri();
        await ricaricaIdee();
      }
    })();
    return () => {
      vivo = false;
    };
  }, [caricamento, utente, ricaricaMuri, ricaricaIdee]);

  /** Centra la mappa sulla posizione dell'admin (per disegnare la zona). */
  function vaiAllaMiaPosizione() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setMessaggio(t("admin.noGeo"));
      return;
    }
    setMessaggio(t("admin.cercoPos"));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCentro([
          Number(pos.coords.latitude.toFixed(6)),
          Number(pos.coords.longitude.toFixed(6)),
        ]);
        setMessaggio("");
      },
      () => setMessaggio(t("admin.posNonRilevata")),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function caricaFotoMuro(slug: string): Promise<string | null> {
    if (!foto) return null;
    const supabase = getClienteAuth();
    const compressa = await comprimiImmagine(foto);
    const estensione = (compressa.name.split(".").pop() ?? "jpg").toLowerCase();
    const percorso = `${slug}/${Date.now()}.${estensione}`;
    const { error } = await supabase.storage
      .from("foto-muri")
      .upload(percorso, compressa, {
        upsert: true,
        contentType: compressa.type || "image/jpeg",
      });
    if (error) throw new Error(error.message);
    const { data } = supabase.storage.from("foto-muri").getPublicUrl(percorso);
    return data.publicUrl;
  }

  async function invia(ev: React.FormEvent) {
    ev.preventDefault();
    const slug = normalizzaLuogo(nome);
    if (!slug) {
      setStato("errore");
      setMessaggio(t("admin.errNome"));
      return;
    }
    if (zona.length < 3) {
      setStato("errore");
      setMessaggio(t("admin.errZona"));
      return;
    }
    const [latCentro, lngCentro] = centroPoligono(zona);

    setStato("caricamento");
    setMessaggio("");
    try {
      const fotoUrl = await caricaFotoMuro(slug);
      const esito = await salvaMuro({
        slug,
        nome: nomeLuogo(slug),
        lat: latCentro,
        lng: lngCentro,
        zona,
        ...(fotoUrl ? { foto_url: fotoUrl } : {}),
      });
      if (!esito.ok) throw new Error(esito.errore);
      setStato("fatto");
      setMessaggio(t("admin.salvato", { nome: nomeLuogo(slug) }));
      setNome("");
      setZona([]);
      setCentro(null);
      setFoto(null);
      await ricaricaMuri();
    } catch (e) {
      setStato("errore");
      setMessaggio(e instanceof Error ? e.message : t("admin.errSalvataggio"));
    }
  }

  async function rimuovi(slug: string) {
    if (!window.confirm(t("admin.confCancella", { nome: nomeLuogo(slug) }))) return;
    const esito = await cancellaMuro(slug);
    if (!esito.ok) {
      setMessaggio(esito.errore);
      return;
    }
    await ricaricaMuri();
  }

  async function cambiaStato(id: string, nuovo: StatoIdea) {
    setMessaggioIdee("");
    const esito = await cambiaStatoIdea(id, nuovo);
    if (!esito.ok) {
      setMessaggioIdee(esito.errore || t("admin.ideeErrore"));
      return;
    }
    await ricaricaIdee();
  }

  async function rimuoviIdea(id: string) {
    if (!window.confirm(t("admin.ideeConfCancella"))) return;
    setMessaggioIdee("");
    const esito = await eliminaIdea(id);
    if (!esito.ok) {
      setMessaggioIdee(esito.errore || t("admin.ideeErrore"));
      return;
    }
    await ricaricaIdee();
  }

  function etichettaStato(stato: StatoIdea): string {
    if (stato === "approvata") return t("admin.ideeStatoApprovata");
    if (stato === "rifiutata") return t("admin.ideeStatoRifiutata");
    return t("admin.ideeStatoNuova");
  }

  async function svuota(slug: string) {
    if (
      !window.confirm(t("admin.confSvuota", { nome: nomeLuogo(slug) }))
    )
      return;
    const esito = await svuotaPostit(slug);
    setMessaggio(
      esito.ok ? t("admin.svuotati", { nome: nomeLuogo(slug) }) : esito.errore
    );
  }

  if (caricamento || controllo) return null;

  if (!utente) {
    return (
      <Schermata titolo={t("admin.pannello")} testo={t("admin.noAccesso")} />
    );
  }

  if (!admin) {
    return (
      <Schermata titolo={t("admin.pannello")} testo={t("admin.noAdmin")} />
    );
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

      <div className="mx-auto w-full max-w-2xl px-4 pb-20 pt-16">
        <h1 className="font-scritta text-4xl text-amber-100">
          {t("admin.pannello")}
        </h1>
        <p className="mt-2 text-sm text-stone-300">{t("admin.testo")}</p>

        {/* Form: fonda / aggiorna un muro */}
        <form
          onSubmit={invia}
          className="mt-6 rounded-lg border border-amber-100/20 bg-stone-900/60 p-6 shadow-xl backdrop-blur-sm"
        >
          <h2 className="font-scritta text-2xl text-amber-100">
            {t("admin.fonda")}
          </h2>

          <label htmlFor="nome" className="mt-4 block text-sm font-medium text-stone-300">
            {t("admin.nomeLuogo")}
          </label>
          <input
            id="nome"
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder={t("admin.nomePh")}
            className="mt-2 w-full rounded-full border border-stone-600 bg-stone-950/60 px-4 py-2 text-base text-amber-50 outline-none placeholder:text-stone-500 focus:border-amber-300"
          />

          {/* Mappa: disegna la zona di accesso del muro */}
          <label className="mt-5 block text-sm font-medium text-stone-300">
            {t("admin.zona")}
          </label>
          <p className="mt-1 text-xs leading-relaxed text-stone-400">
            {t("admin.zonaAiuto")}
          </p>

          <div className="mt-2">
            <DisegnaZona punti={zona} onChange={setZona} centro={centro} />
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={vaiAllaMiaPosizione}
              className="rounded-full border border-amber-100/30 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:bg-stone-950/50"
            >
              {t("admin.zonaVaiPos")}
            </button>
            <button
              type="button"
              onClick={() => setZona((z) => z.slice(0, -1))}
              disabled={zona.length === 0}
              className="rounded-full border border-amber-100/30 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:bg-stone-950/50 disabled:opacity-40"
            >
              {t("admin.zonaIndietro")}
            </button>
            <button
              type="button"
              onClick={() => setZona([])}
              disabled={zona.length === 0}
              className="rounded-full border border-amber-100/30 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:bg-stone-950/50 disabled:opacity-40"
            >
              {t("admin.zonaPulisci")}
            </button>
            <span className="text-xs text-stone-400">
              {t("admin.zonaPunti", { n: zona.length })}
            </span>
          </div>

          <label htmlFor="foto" className="mt-5 block text-sm font-medium text-stone-300">
            {t("admin.fotoLabel")}
          </label>
          <input
            id="foto"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
            className="mt-2 w-full text-sm text-stone-300 file:mr-3 file:rounded-full file:border-0 file:bg-amber-300 file:px-4 file:py-2 file:text-sm file:font-bold file:text-stone-900"
          />

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
            disabled={stato === "caricamento"}
            className="mt-5 w-full rounded-full bg-amber-300 px-6 py-3 text-base font-bold text-stone-900 shadow-xl transition hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            {stato === "caricamento" ? t("admin.salvataggio") : t("admin.fondaBtn")}
          </button>
        </form>

        {/* Elenco muri */}
        <section className="mt-8">
          <h2 className="font-scritta text-2xl text-amber-100">
            {t("admin.muri", { n: muri.length })}
          </h2>
          {caricoMuri ? (
            <p className="mt-3 text-sm text-stone-400">
              {t("admin.caricoMuri")}
            </p>
          ) : muri.length === 0 ? (
            <p className="mt-3 text-sm text-stone-400">{t("admin.nessunMuro")}</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {muri.map((m) => (
                <li
                  key={m.slug}
                  className="rounded-lg border border-amber-100/15 bg-stone-900/55 p-4 shadow-lg backdrop-blur-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-scritta text-2xl text-amber-100">
                        {m.nome}
                      </p>
                      <p className="text-xs text-stone-400">
                        {m.slug} ·{" "}
                        {m.zona
                          ? t("admin.zonaPunti", { n: m.zona.length })
                          : t("admin.senzaZona")}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-sm">
                    <Link
                      href={`/qr/${m.slug}`}
                      className="rounded-full bg-amber-300 px-4 py-2 font-bold text-stone-900 transition hover:scale-105"
                    >
                      QR
                    </Link>
                    <Link
                      href={`/muro/${m.slug}`}
                      className="rounded-full border border-amber-100/30 px-4 py-2 font-semibold text-amber-100 transition hover:bg-stone-950/50"
                    >
                      {t("admin.apri")}
                    </Link>
                    <button
                      type="button"
                      onClick={() => svuota(m.slug)}
                      className="rounded-full border border-amber-100/30 px-4 py-2 font-semibold text-amber-100 transition hover:bg-stone-950/50"
                    >
                      {t("admin.svuota")}
                    </button>
                    <button
                      type="button"
                      onClick={() => rimuovi(m.slug)}
                      className="rounded-full border border-red-400/40 px-4 py-2 font-semibold text-red-300 transition hover:bg-red-500/10"
                    >
                      {t("admin.cancella")}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Proposte "Fonda un muro" degli utenti */}
        <section className="mt-12">
          <h2 className="font-scritta text-2xl text-amber-100">
            {t("admin.ideeTitolo", { n: idee.length })}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-stone-400">
            {t("admin.ideeTesto")}
          </p>

          {messaggioIdee && (
            <p className="mt-3 text-sm text-red-300">{messaggioIdee}</p>
          )}

          {caricoIdee ? (
            <p className="mt-3 text-sm text-stone-400">{t("admin.ideeCarico")}</p>
          ) : idee.length === 0 ? (
            <p className="mt-3 text-sm text-stone-400">{t("admin.ideeVuote")}</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-4">
              {idee.map((idea) => (
                <li
                  key={idea.id}
                  className="rounded-lg border border-amber-100/15 bg-stone-900/55 p-4 shadow-lg backdrop-blur-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-scritta text-xl text-amber-100">
                        {idea.via ||
                          `${idea.lat.toFixed(5)}, ${idea.lng.toFixed(5)}`}
                      </p>
                      <p className="text-xs text-stone-400">
                        {t("admin.ideeQuando")} {formattaData(idea.creato_il)} ·{" "}
                        {idea.utente_id
                          ? idea.utente_id.slice(0, 8)
                          : t("admin.ideeAnonimo")}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${classiStato(
                        idea.stato
                      )}`}
                    >
                      {etichettaStato(idea.stato)}
                    </span>
                  </div>

                  {/* Il punto esatto sulla mappa (sola lettura) */}
                  <div className="mt-3">
                    <MappaPunto punto={[idea.lat, idea.lng]} altezza={180} />
                  </div>

                  <div className="mt-3">
                    <p className="text-xs font-semibold text-stone-400">
                      {t("admin.ideePerche")}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-stone-200">
                      {idea.motivo}
                    </p>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-sm">
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${idea.lat}&mlon=${idea.lng}#map=19/${idea.lat}/${idea.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full border border-amber-100/30 px-4 py-2 font-semibold text-amber-100 transition hover:bg-stone-950/50"
                    >
                      {t("admin.apri")}
                    </a>
                    <button
                      type="button"
                      onClick={() => cambiaStato(idea.id, "approvata")}
                      disabled={idea.stato === "approvata"}
                      className="rounded-full border border-emerald-400/40 px-4 py-2 font-semibold text-emerald-200 transition hover:bg-emerald-500/10 disabled:opacity-40"
                    >
                      {t("admin.ideeApprova")}
                    </button>
                    <button
                      type="button"
                      onClick={() => cambiaStato(idea.id, "rifiutata")}
                      disabled={idea.stato === "rifiutata"}
                      className="rounded-full border border-amber-100/30 px-4 py-2 font-semibold text-amber-100 transition hover:bg-stone-950/50 disabled:opacity-40"
                    >
                      {t("admin.ideeRifiuta")}
                    </button>
                    <button
                      type="button"
                      onClick={() => rimuoviIdea(idea.id)}
                      className="rounded-full border border-red-400/40 px-4 py-2 font-semibold text-red-300 transition hover:bg-red-500/10"
                    >
                      {t("admin.ideeCancella")}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <Link
          href="/"
          className="mt-8 inline-block text-sm text-stone-400 transition hover:text-amber-100"
        >
          {t("comune.tornaHomeFreccia")}
        </Link>
      </div>
    </main>
  );
}

/** Colori del badge di stato della proposta. */
function classiStato(stato: StatoIdea): string {
  if (stato === "approvata") return "bg-emerald-400/20 text-emerald-200";
  if (stato === "rifiutata") return "bg-red-400/20 text-red-200";
  return "bg-amber-300/20 text-amber-100";
}

function Schermata({ titolo, testo }: { titolo: string; testo: string }) {
  const { t } = useLingua();
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <div
        aria-hidden
        className="fixed inset-0 -z-20 bg-cover bg-center"
        style={{ backgroundImage: "url(/images/brain.webp)" }}
      />
      <div aria-hidden className="fixed inset-0 -z-10 bg-stone-950/85" />
      <h1 className="font-scritta text-4xl text-amber-100">{titolo}</h1>
      <p className="scritta-sistema max-w-md">{testo}</p>
      <Link
        href="/"
        className="rounded-full bg-amber-300 px-6 py-3 font-bold text-stone-900 shadow-xl transition hover:scale-105"
      >
        {t("comune.tornaHome")}
      </Link>
    </main>
  );
}
