"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { getClienteAuth } from "@/lib/clienteAuth";
import { comprimiImmagine } from "@/lib/immagini";
import { normalizzaLuogo, nomeLuogo } from "@/lib/luoghi";
import {
  cancellaMuro,
  eAmministratore,
  elencaMuri,
  salvaMuro,
  svuotaPostit,
  type MuroAdmin,
} from "@/lib/admin";
import { useLingua } from "@/lib/i18n";

type Stato = "inattivo" | "caricamento" | "fatto" | "errore";

export default function PannelloMuri() {
  const { t } = useLingua();
  const { utente, caricamento } = useAuth();
  const [controllo, setControllo] = useState(true);
  const [admin, setAdmin] = useState(false);

  const [muri, setMuri] = useState<MuroAdmin[]>([]);
  const [caricoMuri, setCaricoMuri] = useState(false);

  // Campi del form "fonda un muro"
  const [nome, setNome] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [raggio, setRaggio] = useState("200");
  const [foto, setFoto] = useState<File | null>(null);

  const [stato, setStato] = useState<Stato>("inattivo");
  const [messaggio, setMessaggio] = useState("");

  const ricaricaMuri = useCallback(async () => {
    setCaricoMuri(true);
    const lista = await elencaMuri();
    setMuri(lista);
    setCaricoMuri(false);
  }, []);

  useEffect(() => {
    if (caricamento) return;
    let vivo = true;
    (async () => {
      const si = await eAmministratore();
      if (!vivo) return;
      setAdmin(si);
      setControllo(false);
      if (si) await ricaricaMuri();
    })();
    return () => {
      vivo = false;
    };
  }, [caricamento, utente, ricaricaMuri]);

  function usaLaMiaPosizione() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setMessaggio(t("admin.noGeo"));
      return;
    }
    setMessaggio(t("admin.cercoPos"));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
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
    const latNum = lat ? Number(lat) : null;
    const lngNum = lng ? Number(lng) : null;
    if ((latNum === null) !== (lngNum === null)) {
      setStato("errore");
      setMessaggio(t("admin.errCoord"));
      return;
    }
    const raggioNum = Math.max(10, Number(raggio) || 200);

    setStato("caricamento");
    setMessaggio("");
    try {
      const fotoUrl = await caricaFotoMuro(slug);
      const esito = await salvaMuro({
        slug,
        nome: nomeLuogo(slug),
        lat: latNum,
        lng: lngNum,
        raggio_m: raggioNum,
        ...(fotoUrl ? { foto_url: fotoUrl } : {}),
      });
      if (!esito.ok) throw new Error(esito.errore);
      setStato("fatto");
      setMessaggio(t("admin.salvato", { nome: nomeLuogo(slug) }));
      setNome("");
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
            className="mt-2 w-full rounded-full border border-stone-600 bg-stone-950/60 px-4 py-2 text-sm text-amber-50 outline-none placeholder:text-stone-500 focus:border-amber-300"
          />

          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={usaLaMiaPosizione}
              className="self-start rounded-full border border-amber-100/30 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:bg-stone-950/50"
            >
              {t("admin.usaPos")}
            </button>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="lat" className="block text-sm font-medium text-stone-300">
                  {t("admin.lat")}
                </label>
                <input
                  id="lat"
                  type="text"
                  inputMode="decimal"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder={t("admin.latPh")}
                  className="mt-2 w-full rounded-full border border-stone-600 bg-stone-950/60 px-4 py-2 text-sm text-amber-50 outline-none placeholder:text-stone-500 focus:border-amber-300"
                />
              </div>
              <div>
                <label htmlFor="lng" className="block text-sm font-medium text-stone-300">
                  {t("admin.lng")}
                </label>
                <input
                  id="lng"
                  type="text"
                  inputMode="decimal"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  placeholder={t("admin.lngPh")}
                  className="mt-2 w-full rounded-full border border-stone-600 bg-stone-950/60 px-4 py-2 text-sm text-amber-50 outline-none placeholder:text-stone-500 focus:border-amber-300"
                />
              </div>
            </div>
          </div>

          <label htmlFor="raggio" className="mt-4 block text-sm font-medium text-stone-300">
            {t("admin.raggio")}
          </label>
          <input
            id="raggio"
            type="number"
            min={10}
            value={raggio}
            onChange={(e) => setRaggio(e.target.value)}
            className="mt-2 w-full rounded-full border border-stone-600 bg-stone-950/60 px-4 py-2 text-sm text-amber-50 outline-none focus:border-amber-300"
          />

          <label htmlFor="foto" className="mt-4 block text-sm font-medium text-stone-300">
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
                        {m.lat !== null && m.lng !== null
                          ? `${m.lat.toFixed(5)}, ${m.lng.toFixed(5)}`
                          : t("admin.senzaCoord")}{" "}
                        · {t("admin.raggioM", { m: m.raggio_m })}
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
      <p className="max-w-md text-stone-300">{testo}</p>
      <Link
        href="/"
        className="rounded-full bg-amber-300 px-6 py-3 font-bold text-stone-900 shadow-xl transition hover:scale-105"
      >
        {t("comune.tornaHome")}
      </Link>
    </main>
  );
}
