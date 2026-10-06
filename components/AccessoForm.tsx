"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth";
import { useLingua } from "@/lib/i18n";

type Modalita = "accedi" | "registrati" | "recupera";

export default function AccessoForm() {
  const { t } = useLingua();
  const { accedi, registrati, recuperaPassword } = useAuth();
  const [modalita, setModalita] = useState<Modalita>("accedi");
  const [identificativo, setIdentificativo] = useState(""); // username o email
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviando, setInviando] = useState(false);
  const [messaggio, setMessaggio] = useState<string | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  function cambioModalita(nuova: Modalita) {
    setModalita(nuova);
    setErrore(null);
    setMessaggio(null);
  }

  async function invia(e: FormEvent) {
    e.preventDefault();
    setErrore(null);
    setMessaggio(null);
    setInviando(true);

    let esito;
    if (modalita === "accedi") {
      esito = await accedi(identificativo, password);
    } else if (modalita === "registrati") {
      esito = await registrati(username, email, password);
    } else {
      esito = await recuperaPassword(identificativo);
    }

    setInviando(false);

    if (esito.ok) {
      if (modalita === "registrati") {
        setMessaggio(t("accesso.accountCreato"));
      } else if (modalita === "recupera") {
        setMessaggio(esito.messaggio ?? t("accesso.controllaEmail"));
      }
    } else {
      setErrore(esito.errore);
    }
  }

  const campo =
    "w-full rounded-full border border-stone-600 bg-stone-950/60 px-4 py-2 text-sm text-amber-50 outline-none placeholder:text-stone-500 focus:border-amber-300";

  const puoInviare =
    !inviando &&
    (modalita === "accedi"
      ? Boolean(identificativo.trim() && password)
      : modalita === "registrati"
        ? Boolean(username.trim() && email.trim() && password)
        : Boolean(identificativo.trim()));

  return (
    <form
      onSubmit={invia}
      className="rounded-lg border border-amber-100/20 bg-stone-900/60 p-6 shadow-xl backdrop-blur-sm"
    >
      <div className="mb-4 flex rounded-full bg-stone-950/50 p-1">
        {(
          [
            ["accedi", t("accesso.accedi")],
            ["registrati", t("accesso.registrati")],
          ] as [Modalita, string][]
        ).map(([modo, etichetta]) => (
          <button
            key={modo}
            type="button"
            onClick={() => cambioModalita(modo)}
            className={
              "flex-1 rounded-full py-1.5 text-sm font-bold transition " +
              (modalita === modo
                ? "bg-amber-300 text-stone-900"
                : "text-stone-300 hover:text-amber-100")
            }
          >
            {etichetta}
          </button>
        ))}
      </div>

      {modalita === "registrati" && (
        <>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={20}
            placeholder={t("accesso.phUsername")}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            className={campo + " mb-3"}
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("accesso.phEmailRecupero")}
            autoComplete="email"
            className={campo + " mb-3"}
          />
        </>
      )}

      {modalita === "accedi" && (
        <input
          type="text"
          value={identificativo}
          onChange={(e) => setIdentificativo(e.target.value)}
          placeholder={t("accesso.phIdentificativo")}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          className={campo + " mb-3"}
        />
      )}

      {modalita === "recupera" && (
        <input
          type="text"
          value={identificativo}
          onChange={(e) => setIdentificativo(e.target.value)}
          placeholder={t("accesso.phIdentRecupero")}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          className={campo}
        />
      )}

      {modalita !== "recupera" && (
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t("accesso.phPassword")}
          autoComplete={
            modalita === "accedi" ? "current-password" : "new-password"
          }
          className={campo}
        />
      )}

      {(errore || messaggio) && (
        <p
          className={
            "mt-3 text-sm font-semibold " +
            (errore ? "text-red-300" : "text-amber-300")
          }
        >
          {errore ?? messaggio}
        </p>
      )}

      <button
        type="submit"
        disabled={!puoInviare}
        className="mt-5 w-full rounded-full bg-amber-300 px-6 py-3 text-base font-bold text-stone-900 shadow-xl transition hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {inviando
          ? t("accesso.attendi")
          : modalita === "accedi"
            ? t("accesso.accedi")
            : modalita === "registrati"
              ? t("accesso.creaAccount")
              : t("accesso.inviaRecupero")}
      </button>

      {modalita === "accedi" && (
        <button
          type="button"
          onClick={() => cambioModalita("recupera")}
          className="mt-3 w-full text-center text-xs font-semibold text-stone-400 transition hover:text-amber-100"
        >
          {t("accesso.passwordDimenticata")}
        </button>
      )}

      {modalita === "recupera" && (
        <button
          type="button"
          onClick={() => cambioModalita("accedi")}
          className="mt-3 w-full text-center text-xs font-semibold text-stone-400 transition hover:text-amber-100"
        >
          {t("accesso.tornaAccesso")}
        </button>
      )}

      {modalita === "registrati" && (
        <p className="mt-3 text-xs text-stone-500">
          {t("accesso.notaUsername")}
        </p>
      )}
    </form>
  );
}
