"use client";

import SfondoMuro from "@/components/SfondoMuro";
import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { getClienteAuth } from "@/lib/clienteAuth";
import { normalizzaLuogo, nomeLuogo } from "@/lib/luoghi";
import { useLingua } from "@/lib/i18n";

type Stato = "inattivo" | "caricamento" | "fatto" | "errore";

export default function CaricaFoto() {
  const { t } = useLingua();
  const { utente, caricamento } = useAuth();
  const [slug, setSlug] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [stato, setStato] = useState<Stato>("inattivo");
  const [messaggio, setMessaggio] = useState("");
  const [slugFatto, setSlugFatto] = useState("");

  async function invia(ev: React.FormEvent) {
    ev.preventDefault();
    const s = normalizzaLuogo(slug);
    if (!s) {
      setStato("errore");
      setMessaggio(t("foto.errSlug"));
      return;
    }
    if (!file) {
      setStato("errore");
      setMessaggio(t("foto.errScegli"));
      return;
    }
    setStato("caricamento");
    setMessaggio("");
    try {
      const supabase = getClienteAuth();
      const estensione = (file.name.split(".").pop() ?? "jpg").toLowerCase();
      const percorso = `${s}/${Date.now()}.${estensione}`;
      const { error: errUpload } = await supabase.storage
        .from("foto-muri")
        .upload(percorso, file, { upsert: true, contentType: file.type });
      if (errUpload) throw new Error(errUpload.message);
      const { data: pub } = supabase.storage
        .from("foto-muri")
        .getPublicUrl(percorso);
      const { error: errUpsert } = await supabase.from("muri").upsert({
        slug: s,
        nome: nomeLuogo(s),
        foto_url: pub.publicUrl,
        aggiornato_il: new Date().toISOString(),
      });
      if (errUpsert) throw new Error(errUpsert.message);
      setStato("fatto");
      setSlugFatto(s);
    } catch (e) {
      setStato("errore");
      setMessaggio(e instanceof Error ? e.message : t("foto.errCarico"));
    }
  }

  if (caricamento) return null;

  if (!utente) {
    return (
      <main className="relative flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
        <SfondoMuro />
        <div aria-hidden className="fixed inset-0 -z-10 bg-stone-950/85" />
        <h1 className="font-scritta text-4xl text-amber-100">
          {t("foto.titolo")}
        </h1>
        <p className="max-w-md text-stone-300">{t("foto.noAccount")}</p>
        <Link
          href="/"
          className="rounded-full bg-amber-300 px-6 py-3 font-bold text-stone-900 shadow-xl transition hover:scale-105"
        >
          {t("comune.tornaHome")}
        </Link>
      </main>
    );
  }

  return (
    <main className="relative min-h-dvh">
      <SfondoMuro />
      <div
        aria-hidden
        className="fixed inset-0 -z-10 bg-gradient-to-b from-stone-950/80 via-stone-900/55 to-stone-950/90"
      />

      <div className="mx-auto mt-16 w-full max-w-md px-4 pb-16">
        <h1 className="font-scritta text-4xl text-amber-100">
          {t("foto.titolo")}
        </h1>
        <p className="mt-2 text-sm text-stone-300">{t("foto.testo")}</p>

        {stato === "fatto" ? (
          <div className="mt-6 rounded-lg border border-amber-100/20 bg-stone-900/60 p-6 text-center shadow-xl backdrop-blur-sm">
            <p className="text-3xl">✅</p>
            <h2 className="font-scritta mt-2 text-3xl text-amber-100">
              {nomeLuogo(slugFatto)}
            </h2>
            <p className="mt-2 text-sm text-stone-300">
              {t("foto.fatto")}
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <Link
                href={`/muro/${slugFatto}`}
                className="rounded-full bg-amber-300 px-6 py-3 text-base font-bold text-stone-900 shadow-xl transition hover:scale-105"
              >
                {t("foto.vaiMuro")}
              </Link>
              <button
                type="button"
                onClick={() => {
                  setStato("inattivo");
                  setSlug("");
                  setFile(null);
                }}
                className="rounded-full border border-amber-100/30 px-6 py-2.5 text-sm font-semibold text-amber-100 transition hover:bg-stone-950/50"
              >
                {t("foto.altra")}
              </button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={invia}
            className="mt-6 rounded-lg border border-amber-100/20 bg-stone-900/60 p-6 shadow-xl backdrop-blur-sm"
          >
            <label
              htmlFor="slug"
              className="block text-sm font-medium text-stone-300"
            >
              {t("foto.slugLabel")}
            </label>
            <input
              id="slug"
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder={t("foto.slugPh")}
              className="mt-2 w-full rounded-full border border-stone-600 bg-stone-950/60 px-4 py-2 text-base text-amber-50 outline-none placeholder:text-stone-500 focus:border-amber-300"
            />

            <label
              htmlFor="foto"
              className="mt-4 block text-sm font-medium text-stone-300"
            >
              {t("foto.fotoLabel")}
            </label>
            <input
              id="foto"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-2 w-full text-sm text-stone-300 file:mr-3 file:rounded-full file:border-0 file:bg-amber-300 file:px-4 file:py-2 file:text-sm file:font-bold file:text-stone-900"
            />

            {stato === "errore" && (
              <p className="mt-3 text-sm text-red-300">{messaggio}</p>
            )}

            <button
              type="submit"
              disabled={stato === "caricamento"}
              className="mt-5 w-full rounded-full bg-amber-300 px-6 py-3 text-base font-bold text-stone-900 shadow-xl transition hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              {stato === "caricamento" ? t("foto.caricamento") : t("foto.carica")}
            </button>
          </form>
        )}

        <Link
          href="/"
          className="mt-6 inline-block text-sm text-stone-400 transition hover:text-amber-100"
        >
          {t("comune.tornaHomeFreccia")}
        </Link>
      </div>
    </main>
  );
}
