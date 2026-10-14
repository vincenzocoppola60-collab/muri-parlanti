"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useLingua } from "@/lib/i18n";
import { eAmministratore } from "@/lib/admin";
import {
  elencaCategorieCreatorAdmin,
  type CategoriaCreator,
} from "@/lib/categorieCreator";
import {
  apriMuroEvento,
  cancellaCollettivo,
  chiudiMuro,
  creaMuroCollettivo,
  elencaCollettivi,
  elencaMuriCollettivo,
  riapriMuro,
  salvaCollettivo,
  slugify,
  type Collettivo,
  type MuroCollettivo,
} from "@/lib/collettivi";

type FormCollettivo = {
  id?: string;
  nome: string;
  slug: string;
  descrizione: string;
  categoria_id: string;
  emoji: string;
  owner_utente_id: string;
  attivo: boolean;
};

const FORM_VUOTO: FormCollettivo = {
  nome: "",
  slug: "",
  descrizione: "",
  categoria_id: "",
  emoji: "",
  owner_utente_id: "",
  attivo: true,
};

/** "2026-07-12T21:00" (datetime-local) -> ISO con fuso, oppure null. */
function aIso(valore: string): string | null {
  if (!valore) return null;
  const d = new Date(valore);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Pannello admin dei collettivi/creator (es. RUINA).
 *
 * Crea i collettivi, il loro muro principale (bacheca sempre aperta) e i
 * muri-evento (si apre uno alla volta). La sicurezza vera e' nella RLS: anche
 * forzando l'URL, un non-admin non puo' scrivere.
 */
export default function PannelloCollettivi() {
  const { t } = useLingua();
  const { utente, caricamento } = useAuth();
  const [controllo, setControllo] = useState(true);
  const [admin, setAdmin] = useState(false);

  const [collettivi, setCollettivi] = useState<Collettivo[]>([]);
  const [categorie, setCategorie] = useState<CategoriaCreator[]>([]);
  const [muriPer, setMuriPer] = useState<Record<string, MuroCollettivo[]>>({});

  const [form, setForm] = useState<FormCollettivo>(FORM_VUOTO);
  const [salvando, setSalvando] = useState(false);
  const [messaggio, setMessaggio] = useState("");
  const [errore, setErrore] = useState("");

  // Nome e finestra (inizio/fine) del nuovo evento, per collettivo.
  const [nomeEvento, setNomeEvento] = useState<Record<string, string>>({});
  const [inizioEvento, setInizioEvento] = useState<Record<string, string>>({});
  const [fineEvento, setFineEvento] = useState<Record<string, string>>({});
  const [occupato, setOccupato] = useState<Record<string, boolean>>({});

  const ricaricaTutto = useCallback(async () => {
    const [cs, categorie] = await Promise.all([
      elencaCollettivi(),
      elencaCategorieCreatorAdmin(),
    ]);
    setCollettivi(cs);
    setCategorie(categorie);
    const mappa: Record<string, MuroCollettivo[]> = {};
    await Promise.all(
      cs.map(async (c) => {
        mappa[c.id] = await elencaMuriCollettivo(c.id);
      })
    );
    setMuriPer(mappa);
  }, []);

  const ricaricaMuri = useCallback(async (collettivoId: string) => {
    const muri = await elencaMuriCollettivo(collettivoId);
    setMuriPer((m) => ({ ...m, [collettivoId]: muri }));
  }, []);

  useEffect(() => {
    if (caricamento) return;
    let vivo = true;
    (async () => {
      const si = await eAmministratore();
      if (!vivo) return;
      setAdmin(si);
      setControllo(false);
      if (si) await ricaricaTutto();
    })();
    return () => {
      vivo = false;
    };
  }, [caricamento, utente, ricaricaTutto]);

  async function invia(ev: React.FormEvent) {
    ev.preventDefault();
    setErrore("");
    setMessaggio("");
    const nome = form.nome.trim();
    if (!nome) {
      setErrore(t("adminCol.erroreNome"));
      return;
    }
    const slug = slugify(form.slug || nome);
    if (!slug) {
      setErrore(t("adminCol.erroreSlug"));
      return;
    }
    setSalvando(true);
    const esito = await salvaCollettivo({
      id: form.id,
      slug,
      nome,
      descrizione: form.descrizione.trim() || null,
      categoria_id: form.categoria_id || null,
      emoji: form.emoji.trim() || null,
      owner_utente_id: form.owner_utente_id.trim() || undefined,
      attivo: form.attivo,
    });
    setSalvando(false);
    if (!esito.ok) {
      setErrore(esito.errore || t("adminCol.erroreGenerico"));
      return;
    }
    setForm(FORM_VUOTO);
    setMessaggio(t("adminCol.salvato"));
    await ricaricaTutto();
  }

  function modifica(c: Collettivo) {
    setErrore("");
    setMessaggio("");
    setForm({
      id: c.id,
      nome: c.nome,
      slug: c.slug,
      descrizione: c.descrizione ?? "",
      categoria_id: c.categoria_id ?? "",
      emoji: c.emoji ?? "",
      owner_utente_id: c.owner_utente_id ?? "",
      attivo: c.attivo,
    });
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  }

  async function elimina(c: Collettivo) {
    if (!window.confirm(t("adminCol.confElimina", { nome: c.nome }))) return;
    const ok = await cancellaCollettivo(c.id);
    if (!ok) {
      setErrore(t("adminCol.erroreGenerico"));
      return;
    }
    await ricaricaTutto();
  }

  async function creaPrincipale(c: Collettivo) {
    setOccupato((o) => ({ ...o, [c.id]: true }));
    setErrore("");
    const esito = await creaMuroCollettivo({
      slug: c.slug,
      nome: c.nome,
      collettivo_id: c.id,
      tipo: "principale",
    });
    setOccupato((o) => ({ ...o, [c.id]: false }));
    if (!esito.ok) {
      setErrore(esito.errore || t("adminCol.erroreMuro"));
      return;
    }
    await ricaricaMuri(c.id);
  }

  async function apriEvento(c: Collettivo) {
    const nome = (nomeEvento[c.id] ?? "").trim();
    if (!nome) {
      setErrore(t("adminCol.erroreNome"));
      return;
    }
    const isoInizio = aIso(inizioEvento[c.id] ?? "");
    const isoFine = aIso(fineEvento[c.id] ?? "");
    if (isoInizio && isoFine && Date.parse(isoFine) < Date.parse(isoInizio)) {
      setErrore(t("gest.eventoErroreDate"));
      return;
    }
    const slug = `${c.slug}-${slugify(nome)}`.slice(0, 60);
    setOccupato((o) => ({ ...o, [c.id]: true }));
    setErrore("");
    const esito = await apriMuroEvento({
      collettivoId: c.id,
      slug,
      nome,
      dataInizio: isoInizio,
      dataFine: isoFine,
    });
    setOccupato((o) => ({ ...o, [c.id]: false }));
    if (!esito.ok) {
      setErrore(esito.errore || t("adminCol.erroreMuro"));
      return;
    }
    setNomeEvento((s) => ({ ...s, [c.id]: "" }));
    setInizioEvento((s) => ({ ...s, [c.id]: "" }));
    setFineEvento((s) => ({ ...s, [c.id]: "" }));
    await ricaricaMuri(c.id);
  }

  async function alternaStato(c: Collettivo, m: MuroCollettivo) {
    if (m.tipo === "principale") return; // la bacheca resta sempre aperta
    setOccupato((o) => ({ ...o, [c.id]: true }));
    if (m.stato === "chiuso") await riapriMuro(m.slug);
    else await chiudiMuro(m.slug);
    setOccupato((o) => ({ ...o, [c.id]: false }));
    await ricaricaMuri(c.id);
  }

  if (controllo) {
    return (
      <Schermata titolo={t("nav.admin")} testo="…" />
    );
  }
  if (!utente) {
    return <Schermata titolo={t("admin.pannello")} testo={t("admin.noAccesso")} />;
  }
  if (!admin) {
    return <Schermata titolo={t("admin.pannello")} testo={t("admin.noAdmin")} />;
  }

  return (
    <main className="relative min-h-dvh pb-16">
      <div
        aria-hidden
        className="fixed inset-0 -z-20 bg-cover bg-center"
        style={{ backgroundImage: "url(/images/brain.webp)" }}
      />
      <div aria-hidden className="fixed inset-0 -z-10 bg-stone-950/85" />

      <div className="mx-auto w-full max-w-3xl px-4 pt-24">
        <h1 className="font-scritta text-4xl text-amber-100">
          {t("adminCol.titolo")}
        </h1>
        <p className="mt-1 text-xs leading-relaxed text-stone-400">
          {t("adminCol.testo")}
        </p>

        <div className="mt-4 flex gap-3 text-sm">
          <Link
            href="/admin/muri"
            className="text-stone-400 transition hover:text-amber-100"
          >
            ← {t("nav.admin")}
          </Link>
        </div>

        {/* Form nuovo/modifica collettivo */}
        <form
          onSubmit={invia}
          className="mt-6 rounded-xl border border-amber-100/15 bg-stone-900/55 p-4 shadow-lg backdrop-blur-sm"
        >
          <h2 className="font-scritta text-2xl text-amber-100">
            {form.id ? t("adminCol.modifica") : t("adminCol.nuovo")}
          </h2>

          <label className="mt-3 block text-sm text-stone-300">
            {t("adminCol.nome")}
            <input
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-amber-100/20 bg-stone-950/60 px-3 py-2 text-base text-amber-50 outline-none focus:border-amber-300/60"
            />
          </label>

          <label className="mt-3 block text-sm text-stone-300">
            {t("adminCol.slug")}
            <input
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-amber-100/20 bg-stone-950/60 px-3 py-2 text-base text-amber-50 outline-none focus:border-amber-300/60"
            />
          </label>

          <label className="mt-3 block text-sm text-stone-300">
            {t("adminCol.descrizione")}
            <textarea
              value={form.descrizione}
              onChange={(e) =>
                setForm((f) => ({ ...f, descrizione: e.target.value }))
              }
              rows={2}
              className="mt-1 w-full rounded-lg border border-amber-100/20 bg-stone-950/60 px-3 py-2 text-base text-amber-50 outline-none focus:border-amber-300/60"
            />
          </label>

          <div className="mt-3 flex flex-wrap gap-4">
            <label className="block text-sm text-stone-300">
              {t("adminCol.emoji")}
              <input
                value={form.emoji}
                onChange={(e) =>
                  setForm((f) => ({ ...f, emoji: e.target.value }))
                }
                placeholder="🎪"
                className="mt-1 w-24 rounded-lg border border-amber-100/20 bg-stone-950/60 px-3 py-2 text-center text-xl text-amber-50 outline-none focus:border-amber-300/60"
              />
            </label>

            <label className="block text-sm text-stone-300">
              {t("adminCol.categoria")}
              <select
                value={form.categoria_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, categoria_id: e.target.value }))
                }
                className="mt-1 rounded-lg border border-amber-100/20 bg-stone-950/60 px-3 py-2 text-base text-amber-50 outline-none focus:border-amber-300/60"
              >
                <option value="">{t("adminCol.nessunaCategoria")}</option>
                {categorie.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.emoji} {cat.nome}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="mt-3 block text-sm text-stone-300">
            {t("adminCol.owner")}
            <input
              value={form.owner_utente_id}
              onChange={(e) =>
                setForm((f) => ({ ...f, owner_utente_id: e.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-amber-100/20 bg-stone-950/60 px-3 py-2 font-mono text-sm text-amber-50 outline-none focus:border-amber-300/60"
            />
            <span className="mt-1 block text-xs text-stone-500">
              {t("adminCol.ownerAiuto")}
            </span>
          </label>

          <label className="mt-3 flex items-center gap-3 text-sm text-stone-300">
            <input
              type="checkbox"
              checked={form.attivo}
              onChange={(e) =>
                setForm((f) => ({ ...f, attivo: e.target.checked }))
              }
              className="h-4 w-4"
            />
            {t("adminCol.attivo")}
          </label>

          {errore && <p className="mt-3 text-sm text-red-300">{errore}</p>}
          {messaggio && <p className="mt-3 text-sm text-emerald-300">{messaggio}</p>}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={salvando}
              className="rounded-full bg-amber-300 px-6 py-2.5 text-sm font-bold text-stone-900 shadow-lg transition hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              {salvando ? "…" : t("adminCol.salva")}
            </button>
            {form.id && (
              <button
                type="button"
                onClick={() => {
                  setForm(FORM_VUOTO);
                  setErrore("");
                  setMessaggio("");
                }}
                className="rounded-full border border-amber-100/30 px-6 py-2.5 text-sm font-semibold text-amber-100 transition hover:bg-stone-950/50"
              >
                {t("adminCol.annulla")}
              </button>
            )}
          </div>
        </form>

        {/* Elenco collettivi */}
        <section className="mt-10">
          <h2 className="font-scritta text-3xl text-amber-100">
            {t("adminCol.elenco", { n: collettivi.length })}
          </h2>
          {collettivi.length === 0 ? (
            <p className="mt-3 text-sm text-stone-400">
              {t("adminCol.nessuno")}
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-4">
              {collettivi.map((c) => {
                const muri = muriPer[c.id] ?? [];
                const principale = muri.find((m) => m.tipo === "principale");
                const busy = occupato[c.id] ?? false;
                return (
                  <li
                    key={c.id}
                    className="rounded-xl border border-amber-100/15 bg-stone-900/55 p-4 shadow-lg backdrop-blur-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 font-scritta text-2xl text-amber-100">
                          <span aria-hidden>{c.emoji ?? "🎪"}</span>
                          <span className="truncate">{c.nome}</span>
                          {!c.attivo && (
                            <span className="rounded-full bg-stone-700/50 px-2 py-0.5 text-xs font-bold text-stone-300">
                              OFF
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-stone-400">/c/{c.slug}</p>
                        {c.owner_utente_id ? (
                          <p className="mt-0.5 truncate font-mono text-[10px] text-stone-500">
                            owner: {c.owner_utente_id}
                          </p>
                        ) : (
                          <p className="mt-0.5 text-[10px] text-amber-300">
                            {t("adminCol.owner")}: —
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-sm">
                      <Link
                        href={`/collettivo/${c.slug}`}
                        className="rounded-full border border-amber-100/30 px-4 py-2 text-xs font-semibold text-amber-100 transition hover:bg-stone-950/50"
                      >
                        {t("adminCol.apriProfilo")}
                      </Link>
                      <button
                        type="button"
                        onClick={() => modifica(c)}
                        className="rounded-full border border-amber-100/30 px-4 py-2 text-xs font-semibold text-amber-100 transition hover:bg-stone-950/50"
                      >
                        {t("adminCol.modifica")}
                      </button>
                      <button
                        type="button"
                        onClick={() => elimina(c)}
                        className="rounded-full border border-red-400/40 px-4 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/10"
                      >
                        {t("adminCol.elimina")}
                      </button>
                    </div>

                    {/* Muri del collettivo */}
                    <div className="mt-4 border-t border-amber-100/10 pt-3">
                      <p className="text-xs font-semibold text-stone-400">
                        {t("adminCol.muri")}
                      </p>

                      {principale ? (
                        <p className="mt-2 text-xs text-emerald-300">
                          ✓ {t("adminCol.principalePresente")} · /muro/
                          {principale.slug}
                        </p>
                      ) : (
                        <button
                          type="button"
                          onClick={() => creaPrincipale(c)}
                          disabled={busy}
                          className="mt-2 rounded-full bg-amber-300 px-4 py-2 text-xs font-bold text-stone-900 transition hover:scale-105 disabled:opacity-50"
                        >
                          {t("adminCol.creaPrincipale")}
                        </button>
                      )}

                      {muri.length > 0 && (
                        <ul className="mt-3 flex flex-col gap-2">
                          {muri.map((m) => (
                            <li
                              key={m.slug}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-100/10 bg-stone-950/40 px-3 py-2"
                            >
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-semibold text-amber-100">
                                  {m.nome}
                                </span>
                                <span className="text-[10px] text-stone-500">
                                  /muro/{m.slug} ·{" "}
                                  {m.tipo === "principale"
                                    ? t("collettivo.tipoPrincipale")
                                    : t("collettivo.tipoEvento")}
                                </span>
                              </span>
                              <span className="flex items-center gap-2">
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                    m.stato === "chiuso"
                                      ? "bg-stone-700/50 text-stone-300"
                                      : "bg-emerald-400/20 text-emerald-200"
                                  }`}
                                >
                                  {m.stato === "chiuso"
                                    ? t("adminCol.statoChiuso")
                                    : t("adminCol.statoAperto")}
                                </span>
                                {m.tipo === "evento" && (
                                  <button
                                    type="button"
                                    onClick={() => alternaStato(c, m)}
                                    disabled={busy}
                                    className="rounded-full border border-amber-100/30 px-3 py-1 text-[10px] font-semibold text-amber-100 transition hover:bg-stone-950/50 disabled:opacity-50"
                                  >
                                    {m.stato === "chiuso"
                                      ? t("adminCol.riapri")
                                      : t("adminCol.chiudi")}
                                  </button>
                                )}
                                <Link
                                  href={`/muro/${m.slug}`}
                                  className="rounded-full border border-amber-100/30 px-3 py-1 text-[10px] font-semibold text-amber-100 transition hover:bg-stone-950/50"
                                >
                                  {t("adminCol.apri")}
                                </Link>
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* Nuovo muro-evento */}
                      <div className="mt-3 flex flex-wrap items-end gap-2">
                        <label className="text-xs text-stone-400">
                          {t("adminCol.nomeEvento")}
                          <input
                            value={nomeEvento[c.id] ?? ""}
                            onChange={(e) =>
                              setNomeEvento((s) => ({
                                ...s,
                                [c.id]: e.target.value,
                              }))
                            }
                            className="mt-1 block w-48 rounded-lg border border-amber-100/20 bg-stone-950/60 px-3 py-1.5 text-sm text-amber-50 outline-none focus:border-amber-300/60"
                          />
                        </label>
                        <label className="text-xs text-stone-400">
                          {t("gest.eventoInizio")}
                          <input
                            type="datetime-local"
                            value={inizioEvento[c.id] ?? ""}
                            onChange={(e) =>
                              setInizioEvento((s) => ({
                                ...s,
                                [c.id]: e.target.value,
                              }))
                            }
                            className="mt-1 block rounded-lg border border-amber-100/20 bg-stone-950/60 px-3 py-1.5 text-sm text-amber-50 outline-none focus:border-amber-300/60"
                          />
                        </label>
                        <label className="text-xs text-stone-400">
                          {t("gest.eventoFine")}
                          <input
                            type="datetime-local"
                            value={fineEvento[c.id] ?? ""}
                            onChange={(e) =>
                              setFineEvento((s) => ({
                                ...s,
                                [c.id]: e.target.value,
                              }))
                            }
                            className="mt-1 block rounded-lg border border-amber-100/20 bg-stone-950/60 px-3 py-1.5 text-sm text-amber-50 outline-none focus:border-amber-300/60"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => apriEvento(c)}
                          disabled={busy}
                          className="rounded-full bg-amber-300 px-4 py-2 text-xs font-bold text-stone-900 transition hover:scale-105 disabled:opacity-50"
                        >
                          {t("adminCol.apriEvento")}
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
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
