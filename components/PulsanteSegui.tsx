"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useLingua } from "@/lib/i18n";
import { contaFollower, eSeguito, segui, smetti } from "@/lib/follow";

/**
 * Pulsante "Segui / Seguendo" di un collettivo.
 * Il follow e' "hard": richiede un account (senza login invita ad accedere).
 * FOLLOWER = chi segue Ruina e riceve le notifiche; NON e' un membro.
 */
export default function PulsanteSegui({
  collettivoId,
  followerIniziali,
}: {
  collettivoId: string;
  followerIniziali?: number;
}) {
  const { utente, caricamento } = useAuth();
  const { t } = useLingua();
  const [seguito, setSeguito] = useState(false);
  const [follower, setFollower] = useState(followerIniziali ?? 0);
  const [pronto, setPronto] = useState(false);
  const [messaggio, setMessaggio] = useState("");
  const [inCorso, setInCorso] = useState(false);

  useEffect(() => {
    let attivo = true;
    (async () => {
      const n = await contaFollower(collettivoId);
      if (attivo) setFollower(n);
      if (utente) {
        const s = await eSeguito(collettivoId);
        if (attivo) setSeguito(s);
      } else if (attivo) {
        setSeguito(false);
      }
      if (attivo) setPronto(true);
    })();
    return () => {
      attivo = false;
    };
  }, [collettivoId, utente]);

  async function alterna() {
    if (!utente) {
      setMessaggio(t("segui.accedi"));
      setTimeout(() => setMessaggio(""), 2600);
      return;
    }
    setInCorso(true);
    try {
      if (seguito) {
        const esito = await smetti(collettivoId);
        if (esito.ok) {
          setSeguito(false);
          setFollower((n) => Math.max(0, n - 1));
        } else {
          setMessaggio(esito.errore);
        }
      } else {
        const esito = await segui(collettivoId);
        if (esito.ok) {
          setSeguito(true);
          setFollower((n) => n + 1);
        } else {
          setMessaggio(esito.errore);
        }
      }
    } finally {
      setInCorso(false);
    }
  }

  const disabilitato = !pronto || caricamento || inCorso;

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={alterna}
        disabled={disabilitato && Boolean(utente)}
        className={`rounded-full px-6 py-2.5 text-sm font-bold shadow-lg transition active:scale-95 disabled:opacity-60 ${
          seguito
            ? "border border-amber-100/40 bg-stone-900/60 text-amber-100 hover:bg-stone-900/90"
            : "bg-amber-300 text-stone-900 hover:scale-105"
        }`}
      >
        {seguito ? `✓ ${t("segui.seguendo")}` : `+ ${t("segui.segui")}`}
      </button>
      <p className="text-xs text-stone-400">
        {t("segui.follower", { n: follower })}
      </p>
      {messaggio && <p className="text-xs text-amber-200">{messaggio}</p>}
    </div>
  );
}
