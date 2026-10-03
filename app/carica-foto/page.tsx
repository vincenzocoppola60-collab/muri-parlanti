"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { getClienteAuth } from "@/lib/clienteAuth";
import { normalizzaLuogo, nomeLuogo } from "@/lib/luoghi";

type Stato = "inattivo" | "caricamento" | "fatto" | "errore";

export default function CaricaFoto() {
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
      setMessaggio(
        "Slug non valido: usa solo lettere minuscole e trattini (es. parco-cerillo)."
      );
      return;
    }
    if (!file) {
      setStato("errore");
      setMessaggio("Scegli una foto del muro.");
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
      setMessaggio(
        e instanceof Error ? e.message : "Caricamento non riuscito, riprova."
      );
    }
  }

  if (caricamento) return null;

  if (!utente) {
    return (
      <main className="relative flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
        <div
          aria-hidden
          className="fixed inset-0 -z-20 bg-cover bg-center"
          style={{ backgroundImage: "url(/images/brain.webp)" }}
        />
        <div aria-hidden className="fixed inset-0 -z-10 bg-stone-950/85" />
        <h1 className="font-scritta text-4xl text-amber-100">Carica foto muro</h1>
        <p className="max-w-md text-stone-300">
          Devi accedere per caricare la foto di un muro.
        </p>
        <Link
          href="/"
          className="rounded-full bg-amber-300 px-6 py-3 font-bold text-stone-900 shadow-xl transition hover:scale-105"
        >
          Torna alla home
        </Link>
      </main>
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

      <div className="mx-auto mt-16 w-full max-w-md px-4 pb-16">
        <h1 className="font-scritta text-4xl text-amber-100">Carica foto muro</h1>
        <p className="mt-2 text-sm text-stone-300">
          La foto verrà mostrata a chi scansiona il QR di quel muro.
        </p>

        {stato === "fatto" ? (
          <div className="mt-6 rounded-lg border border-amber-100/20 bg-stone-900/60 p-6 text-center shadow-xl backdrop-blur-sm">
            <p className="text-3xl">✅</p>
            <h2 className="font-scritta mt-2 text-3xl text-amber-100">
              {nomeLuogo(slugFatto)}
            </h2>
            <p className="mt-2 text-sm text-stone-300">
              Foto caricata: ora il muro ha la sua immagine.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <Link
                href={`/muro/${slugFatto}`}
                className="rounded-full bg-amber-300 px-6 py-3 text-base font-bold text-stone-900 shadow-xl transition hover:scale-105"
              >
                Vai al muro
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
                Carica un&apos;altra foto
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
              Slug del muro (es. parco-cerillo)
            </label>
            <input
              id="slug"
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="es. parco-cerillo"
              className="mt-2 w-full rounded-full border border-stone-600 bg-stone-950/60 px-4 py-2 text-sm text-amber-50 outline-none placeholder:text-stone-500 focus:border-amber-300"
            />

            <label
              htmlFor="foto"
              className="mt-4 block text-sm font-medium text-stone-300"
            >
              Foto del muro
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
              {stato === "caricamento" ? "Caricamento…" : "📷 Carica foto"}
            </button>
          </form>
        )}

        <Link
          href="/"
          className="mt-6 inline-block text-sm text-stone-400 transition hover:text-amber-100"
        >
          ← Torna alla home
        </Link>
      </div>
    </main>
  );
}
