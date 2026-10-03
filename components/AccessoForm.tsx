"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth";

type Modalita = "accedi" | "registrati";

export default function AccessoForm() {
  const { accedi, registrati } = useAuth();
  const [modalita, setModalita] = useState<Modalita>("accedi");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
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

    const esito =
      modalita === "accedi"
        ? await accedi(email, password)
        : await registrati(email, password, nickname);

    setInviando(false);

    if (esito.ok) {
      if (modalita === "registrati") setMessaggio("Account creato. Bentornato!");
      // Se ha richiesto conferma email, registrati restituisce ok:false con messaggio.
    } else {
      setErrore(esito.errore);
    }
  }

  const campo =
    "w-full rounded-full border border-stone-600 bg-stone-950/60 px-4 py-2 text-sm text-amber-50 outline-none placeholder:text-stone-500 focus:border-amber-300";

  return (
    <form
      onSubmit={invia}
      className="rounded-lg border border-amber-100/20 bg-stone-900/60 p-6 shadow-xl backdrop-blur-sm"
    >
      <div className="mb-4 flex rounded-full bg-stone-950/50 p-1">
        {(
          [
            ["accedi", "Accedi"],
            ["registrati", "Registrati"],
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
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={30}
          placeholder="Il tuo nome"
          autoComplete="nickname"
          className={campo + " mb-3"}
        />
      )}

      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        autoComplete="email"
        className={campo + " mb-3"}
      />

      <input
        type="password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password (min 6 caratteri)"
        autoComplete={
          modalita === "accedi" ? "current-password" : "new-password"
        }
        className={campo}
      />

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
        disabled={inviando || !email || !password || (modalita === "registrati" && !nickname)}
        className="mt-5 w-full rounded-full bg-amber-300 px-6 py-3 text-base font-bold text-stone-900 shadow-xl transition hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {inviando
          ? "Attendi…"
          : modalita === "accedi"
            ? "Accedi"
            : "Crea il tuo account"}
      </button>

      <p className="mt-3 text-center text-xs text-stone-500">
        {modalita === "accedi"
          ? "Non hai un account? Creane uno per salvare i progressi e sbloccare livelli."
          : "Registrandoti salvi i muri visitati e sblocchi livelli guadagnando punti."}
      </p>
    </form>
  );
}
