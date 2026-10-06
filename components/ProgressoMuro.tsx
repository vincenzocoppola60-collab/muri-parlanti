"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import { useAuth } from "@/lib/auth";
import { useLingua } from "@/lib/i18n";
import { registraPensiero, registraVisita } from "@/lib/progresso";
import { statoLivello } from "@/lib/livelli";

export type ProgressoMuroHandle = {
  /** Da chiamare quando l'utente lascia un pensiero su questo muro. */
  pensieroAggiunto: () => Promise<void>;
};

/**
 * Mostra il livello corrente e un toast "+XP" quando visiti o scrivi su un muro.
 * Registra automaticamente la visita alla prima apertura (se l'utente è loggato).
 */
const ProgressoMuro = forwardRef<ProgressoMuroHandle, { luogo: string }>(
  function ProgressoMuro({ luogo }, ref) {
    const { utente, caricamento } = useAuth();
    const { t } = useLingua();
    const [xp, setXp] = useState(0);
    const [pronto, setPronto] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [livelloPrecedente, setLivelloPrecedente] = useState(0);

    useEffect(() => {
      if (!utente || caricamento) return;
      let attivo = true;
      setPronto(false);
      registraVisita(luogo)
        .then((esito) => {
          if (!attivo || !esito) return;
          setXp(esito.resoconto.totaleXp);
          setLivelloPrecedente(esito.stato.livello.numero);
          setPronto(true);
          if (esito.xpAggiunti > 0) {
            setToast(t("progresso.piuPunti", { n: esito.xpAggiunti }));
            setTimeout(() => setToast(null), 2600);
          }
        })
        .catch(() => {
          if (attivo) setPronto(true);
        });
      return () => {
        attivo = false;
      };
    }, [utente, caricamento, luogo]);

    useImperativeHandle(ref, () => ({
      async pensieroAggiunto() {
        if (!utente) return;
        try {
          const esito = await registraPensiero(luogo);
          if (!esito) return;
          setXp(esito.resoconto.totaleXp);
          const nuovoLivello =
            statoLivello(esito.resoconto.totaleXp).livello.numero;
          if (esito.xpAggiunti > 0) {
            setToast(t("progresso.piuPunti", { n: esito.xpAggiunti }));
            setTimeout(() => setToast(null), 2600);
          }
          if (nuovoLivello > livelloPrecedente) {
            setLivelloPrecedente(nuovoLivello);
            setToast(t("progresso.livelloSbloccato", { n: nuovoLivello }));
            setTimeout(() => setToast(null), 3200);
          }
        } catch {
          // Progresso non salvabile: il pensiero resta comunque sul muro.
        }
      },
    }));

    if (caricamento || !utente || !pronto) return null;

    const stato = statoLivello(xp);

    return (
      <>
        <div className="fixed bottom-5 right-4 z-40">
          {toast && (
            <span className="rounded-full bg-amber-300 px-4 py-2 text-sm font-bold text-stone-900 shadow-xl">
              {toast}
            </span>
          )}
        </div>

        {!toast && (
          <div className="mt-2 flex items-center justify-center gap-2 text-xs text-stone-400">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100/20 text-[11px] font-bold text-amber-200">
              {stato.livello.numero}
            </span>
            <span>
              {t(`livello.${stato.livello.numero}`)} · {xp} {t("comune.punti")}
            </span>
          </div>
        )}
      </>
    );
  }
);

export default ProgressoMuro;
