"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getClienteAuth } from "@/lib/clienteAuth";

/**
 * Pagina di reimpostazione password: si arriva dal link inviato per email
 * ("Password dimenticata?"). Il link apre una sessione temporanea di recupero
 * (gestita da detectSessionInUrl nel client di auth); qui l'utente sceglie la
 * nuova password con updateUser().
 */
export default function PaginaReimposta() {
  const router = useRouter();
  const [pronto, setPronto] = useState(false);
  const [controllato, setControllato] = useState(false);
  const [password, setPassword] = useState("");
  const [conferma, setConferma] = useState("");
  const [inviando, setInviando] = useState(false);
  const [fatto, setFatto] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getClienteAuth();

    // Il client legge il token di recupero dall'URL: se c'è, la sessione
    // compare e possiamo mostrare il form.
    const { data } = supabase.auth.onAuthStateChange((_evento, sessione) => {
      if (sessione) {
        setPronto(true);
        setControllato(true);
      }
    });

    supabase.auth.getSession().then(({ data: d }) => {
      if (d.session) setPronto(true);
    });

    // Dopo un breve margine, se non è arrivata nessuna sessione consideriamo
    // il link non valido o scaduto.
    const t = setTimeout(async () => {
      const { data: d } = await supabase.auth.getSession();
      setPronto(Boolean(d.session));
      setControllato(true);
    }, 2000);

    return () => {
      data.subscription.unsubscribe();
      clearTimeout(t);
    };
  }, []);

  async function invia(e: FormEvent) {
    e.preventDefault();
    setErrore(null);
    if (password.length < 6) {
      setErrore("La password deve avere almeno 6 caratteri.");
      return;
    }
    if (password !== conferma) {
      setErrore("Le due password non coincidono.");
      return;
    }
    setInviando(true);
    const { error } = await getClienteAuth().auth.updateUser({ password });
    setInviando(false);
    if (error) {
      setErrore("Non riuscito. Il link potrebbe essere scaduto: richiedine uno nuovo.");
      return;
    }
    setFatto(true);
    setTimeout(() => router.push("/"), 2500);
  }

  const campo =
    "w-full rounded-full border border-stone-600 bg-stone-950/60 px-4 py-2 text-sm text-amber-50 outline-none placeholder:text-stone-500 focus:border-amber-300";

  return (
    <main className="relative flex min-h-dvh items-center justify-center px-4">
      <div
        aria-hidden
        className="fixed inset-0 -z-20 bg-cover bg-center"
        style={{ backgroundImage: "url(/images/brain.webp)" }}
      />
      <div
        aria-hidden
        className="fixed inset-0 -z-10 bg-gradient-to-b from-stone-950/80 via-stone-900/50 to-stone-950/90"
      />

      <div className="relative w-full max-w-md">
        <Link
          href="/"
          className="text-[11px] font-bold uppercase tracking-[0.25em] text-amber-100/50 transition hover:text-amber-100"
        >
          ← Torna alla home
        </Link>

        <h1 className="mt-3 font-scritta text-4xl text-amber-100">
          Nuova password
        </h1>

        {fatto ? (
          <p className="mt-6 rounded-lg border border-amber-100/20 bg-stone-900/60 p-6 text-sm font-semibold text-amber-300">
            Password aggiornata. Ti stiamo portando alla home…
          </p>
        ) : !controllato ? (
          <p className="mt-6 rounded-lg border border-amber-100/20 bg-stone-900/60 p-6 text-sm text-stone-300">
            Verifico il link…
          </p>
        ) : !pronto ? (
          <div className="mt-6 rounded-lg border border-red-300/30 bg-red-950/40 p-6 text-sm leading-relaxed text-red-200">
            Il link di recupero non è valido o è scaduto. Torna all&apos;accesso e
            richiedi una nuova email di recupero con &laquo;Password
            dimenticata?&raquo;.
          </div>
        ) : (
          <form
            onSubmit={invia}
            className="mt-6 rounded-lg border border-amber-100/20 bg-stone-900/60 p-6 shadow-xl backdrop-blur-sm"
          >
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nuova password (min 6 caratteri)"
              autoComplete="new-password"
              className={campo + " mb-3"}
            />
            <input
              type="password"
              value={conferma}
              onChange={(e) => setConferma(e.target.value)}
              placeholder="Ripeti la nuova password"
              autoComplete="new-password"
              className={campo}
            />
            {errore && (
              <p className="mt-3 text-sm font-semibold text-red-300">{errore}</p>
            )}
            <button
              type="submit"
              disabled={inviando || !password || !conferma}
              className="mt-5 w-full rounded-full bg-amber-300 px-6 py-3 text-base font-bold text-stone-900 shadow-xl transition hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {inviando ? "Salvo…" : "Salva la nuova password"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
