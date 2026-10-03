"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { caricaProgresso } from "@/lib/progresso";
import { LIVELLI, statoLivello } from "@/lib/livelli";
import {
  caricaPreferiti,
  rimuoviPreferito,
  type Preferito,
} from "@/lib/preferiti";
import AccessoForm from "@/components/AccessoForm";
import { nomeLuogo } from "@/lib/luoghi";
import {
  caricaMioProfilo,
  urlAvatar,
  type Profilo,
} from "@/lib/profili";

export default function ProfiloCard() {
  const { utente, caricamento, nickname, esci } = useAuth();
  const [totaleXp, setTotaleXp] = useState(0);
  const [muriVisita, setMuriVisita] = useState(0);
  const [pensieri, setPensieri] = useState(0);
  const [preferiti, setPreferiti] = useState<Preferito[]>([]);
  const [profilo, setProfilo] = useState<Profilo | null>(null);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    if (!utente) {
      setPronto(true);
      return;
    }
    let attivo = true;
    Promise.all([
      caricaProgresso(utente.id),
      caricaPreferiti(utente.id).catch(() => [] as Preferito[]),
      caricaMioProfilo().then((esito) => esito.profilo).catch(() => null),
    ])
      .then(([resoconto, pref, p]) => {
        if (!attivo) return;
        setTotaleXp(resoconto.totaleXp);
        setMuriVisita(resoconto.righe.length);
        setPensieri(resoconto.righe.reduce((s, r) => s + r.pensieri, 0));
        setPreferiti(pref);
        setProfilo(p);
        setPronto(true);
      })
      .catch(() => {
        if (attivo) setPronto(true);
      });
    return () => {
      attivo = false;
    };
  }, [utente]);

  async function togliPreferito(id: string) {
    if (!utente) return;
    try {
      await rimuoviPreferito(utente.id, id);
      setPreferiti((attuali) => attuali.filter((p) => p.id !== id));
    } catch {
      // Silenzioso: il preferito resta in lista.
    }
  }

  if (caricamento || !pronto) return null;

  if (!utente) {
    return (
      <div className="mx-auto w-full max-w-md">
        <h2 className="font-scritta text-3xl text-amber-100">Il tuo profilo</h2>
        <p className="mb-4 mt-2 max-w-md text-sm text-stone-300">
          Con un account salvi i muri che visiti, i post-it preferiti e
          guadagni punti: ogni livello raggiunto ti regala un bonus.
        </p>
        <AccessoForm />
      </div>
    );
  }

  const stato = statoLivello(totaleXp);
  const nome = profilo?.nickname || nickname || "Tu";
  const avatar = urlAvatar(profilo);
  const iniziale =
    (profilo?.nickname || nome || "?").trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="mx-auto w-full max-w-md rounded-lg border border-amber-100/20 bg-stone-900/60 p-6 shadow-xl backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatar}
              alt={`Foto profilo di ${nome}`}
              className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-amber-300/60"
            />
          ) : (
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-300 font-scritta text-xl font-bold text-stone-900">
              {iniziale}
            </span>
          )}
          <div className="min-w-0">
            <h2 className="font-scritta text-3xl text-amber-100">Ciao, {nome} 👋</h2>
          </div>
        </div>
        <button
          type="button"
          onClick={esci}
          className="shrink-0 rounded-full border border-amber-100/30 px-3 py-1 text-xs font-semibold text-stone-300 transition hover:bg-stone-950/60"
        >
          Esci
        </button>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-300 font-scritta text-2xl font-bold text-stone-900 shadow-lg">
          {stato.livello.numero}
        </span>
        <div className="min-w-0">
          <p className="font-scritta text-xl leading-tight text-amber-100">
            {stato.livello.nome}
          </p>
          <p className="text-xs text-stone-400">{totaleXp} punti</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="h-3 w-full overflow-hidden rounded-full bg-stone-950/60">
          <div
            className="h-full rounded-full bg-amber-300 transition-all"
            style={{ width: `${stato.percentuale}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-xs text-stone-400">
          <span>
            {stato.prossimo
              ? `${stato.puntiAlProssimo} punti al livello ${stato.prossimo.numero}`
              : "Livello massimo raggiunto!"}
          </span>
          <span>{stato.percentuale}%</span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-stone-950/40 p-3">
          <p className="font-scritta text-2xl text-amber-100">{muriVisita}</p>
          <p className="text-xs text-stone-400">muri esplorati</p>
        </div>
        <div className="rounded-lg bg-stone-950/40 p-3">
          <p className="font-scritta text-2xl text-amber-100">{pensieri}</p>
          <p className="text-xs text-stone-400">pensieri lasciati</p>
        </div>
        <div className="rounded-lg bg-stone-950/40 p-3">
          <p className="font-scritta text-2xl text-amber-100">{preferiti.length}</p>
          <p className="text-xs text-stone-400">preferiti</p>
        </div>
      </div>

      <Link
        href="/carica-foto"
        className="mt-4 block rounded-full border border-amber-100/30 px-4 py-2 text-center text-sm font-semibold text-amber-100 transition hover:bg-stone-950/60"
      >
        📷 Carica la foto di un muro
      </Link>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Link
          href={`/profilo/${utente.id}`}
          className="rounded-full border border-amber-100/30 px-3 py-2 text-center text-sm font-semibold text-amber-100 transition hover:bg-stone-950/60"
        >
          👁️ Il mio profilo
        </Link>
        <Link
          href="/impostazioni"
          className="rounded-full border border-amber-100/30 px-3 py-2 text-center text-sm font-semibold text-amber-100 transition hover:bg-stone-950/60"
        >
          ⚙️ Impostazioni
        </Link>
      </div>

      {/* Ricompense di livello */}
      <div className="mt-6">
        <h3 className="font-scritta text-lg text-amber-100">Ricompense di livello</h3>
        <ul className="mt-2 space-y-1.5">
          {LIVELLI.filter((l) => l.bonus > 0).map((l) => {
            const sbloccato = totaleXp >= l.soglia;
            return (
              <li
                key={l.numero}
                className={
                  "flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm " +
                  (sbloccato
                    ? "bg-amber-100/10 text-amber-100"
                    : "bg-stone-950/40 text-stone-500")
                }
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className={
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold " +
                      (sbloccato
                        ? "bg-amber-300 text-stone-900"
                        : "bg-stone-800 text-stone-500")
                    }
                  >
                    {l.numero}
                  </span>
                  <span className="truncate">{l.nome}</span>
                </span>
                <span className="shrink-0 text-xs font-semibold">
                  {sbloccato ? `✓ +${l.bonus} punti` : `🔒 +${l.bonus} punti`}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Post-it preferiti */}
      <div className="mt-6">
        <h3 className="font-scritta text-lg text-amber-100">Post-it preferiti</h3>
        {preferiti.length === 0 ? (
          <p className="mt-2 text-xs text-stone-500">
            Nessun preferito: tocca il cuore 🤍 su un post-it per salvarlo qui.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {preferiti.map((p) => (
              <li
                key={p.id}
                className="rounded-lg bg-stone-950/40 px-3 py-2 text-sm text-stone-200"
              >
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/muro/${p.luogo}`}
                    className="min-w-0 flex-1 transition hover:text-amber-100"
                  >
                    <span className="line-clamp-2 block">{p.testo}</span>
                    <span className="mt-0.5 block text-xs text-stone-500">
                      ~ {p.nickname} · {nomeLuogo(p.luogo) ?? p.luogo}
                    </span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => togliPreferito(p.id)}
                    aria-label="Rimuovi dai preferiti"
                    className="shrink-0 rounded-full px-1.5 text-stone-500 transition hover:text-red-300"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {stato.prossimo && (
        <p className="mt-4 text-center text-xs text-stone-500">
          Visita altri muri per guadagnare punti e salire di livello.
        </p>
      )}
    </div>
  );
}
