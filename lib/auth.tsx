"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { getClienteAuth } from "@/lib/clienteAuth";

type Esito = { ok: true; messaggio?: string } | { ok: false; errore: string };

type ContestoAuth = {
  utente: User | null;
  caricamento: boolean;
  nickname: string;
  /** Crea l'account con username + email di recupero + password (poi accede). */
  registrati: (
    username: string,
    email: string,
    password: string
  ) => Promise<Esito>;
  /** Accede con username oppure email di recupero + password. */
  accedi: (identificativo: string, password: string) => Promise<Esito>;
  /** Invia il link di reimpostazione all'email di recupero dell'account. */
  recuperaPassword: (identificativo: string) => Promise<Esito>;
  /** Imposta/aggiorna lo username dell'account connesso (account esistenti). */
  impostaUsername: (username: string) => Promise<Esito>;
  esci: () => Promise<void>;
};

const Contesto = createContext<ContestoAuth | null>(null);

const NICKNAME_KEY = "muri-parlanti:nickname";
const FORMATO_USERNAME = /^[a-z0-9_]{3,20}$/;

/** Legge il nickname dai metadati utente o dal backup locale. */
function leggiNickname(u: User | null): string {
  if (!u) {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(NICKNAME_KEY) ?? "";
  }
  const daMeta = (u.user_metadata?.nickname as string | undefined) ?? "";
  if (daMeta) return daMeta;
  if (typeof window !== "undefined") {
    return window.localStorage.getItem(NICKNAME_KEY) ?? "";
  }
  return "";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [utente, setUtente] = useState<User | null>(null);
  const [caricamento, setCaricamento] = useState(true);
  const [ultimoNickname, setUltimoNickname] = useState("");

  useEffect(() => {
    const supabase = getClienteAuth();

    async function inizializza() {
      const { data } = await supabase.auth.getUser();
      const u = data.user ?? null;
      setUtente(u);
      setUltimoNickname(leggiNickname(u));
      setCaricamento(false);
    }

    inizializza();

    const { data: abbonamento } = supabase.auth.onAuthStateChange(
      (_evento, sessione) => {
        const u = sessione?.user ?? null;
        setUtente(u);
        setUltimoNickname(leggiNickname(u));
        setCaricamento(false);
      }
    );

    return () => abbonamento.subscription.unsubscribe();
  }, []);

  /** Chiama una rotta API di auth e restituisce il JSON (o null). */
  async function chiamaApi(
    percorso: string,
    corpo: unknown
  ): Promise<{ status: number; dati: Record<string, unknown> | null }> {
    const r = await fetch(percorso, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
    });
    const dati = (await r.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    return { status: r.status, dati };
  }

  async function registrati(
    username: string,
    email: string,
    password: string
  ): Promise<Esito> {
    const nick = username.trim().toLowerCase();
    if (!FORMATO_USERNAME.test(nick)) {
      return {
        ok: false,
        errore:
          "Username non valido: 3-20 caratteri tra lettere minuscole, numeri e underscore.",
      };
    }
    if (password.length < 6) {
      return { ok: false, errore: "La password deve avere almeno 6 caratteri." };
    }
    try {
      const { dati } = await chiamaApi("/api/auth/registrati", {
        username: nick,
        email: email.trim(),
        password,
      });
      if (!dati?.ok) {
        return {
          ok: false,
          errore: (dati?.errore as string) ?? "Registrazione non riuscita.",
        };
      }
      // Registrazione riuscita: accedi subito per aprire la sessione.
      if (typeof window !== "undefined") {
        window.localStorage.setItem(NICKNAME_KEY, nick);
      }
      return await accedi(nick, password);
    } catch {
      return { ok: false, errore: "Errore di rete. Riprova." };
    }
  }

  async function accedi(
    identificativo: string,
    password: string
  ): Promise<Esito> {
    const id = identificativo.trim();
    if (!id || !password) {
      return { ok: false, errore: "Inserisci username (o email) e password." };
    }
    try {
      const { dati } = await chiamaApi("/api/auth/login", {
        identificativo: id,
        password,
      });
      if (!dati?.ok) {
        return {
          ok: false,
          errore: (dati?.errore as string) ?? "Accesso non riuscito.",
        };
      }
      const { error } = await getClienteAuth().auth.setSession({
        access_token: dati.access_token as string,
        refresh_token: dati.refresh_token as string,
      });
      if (error) {
        return { ok: false, errore: "Accesso non riuscito. Riprova." };
      }
      return { ok: true };
    } catch {
      return { ok: false, errore: "Errore di rete. Riprova." };
    }
  }

  async function recuperaPassword(identificativo: string): Promise<Esito> {
    const id = identificativo.trim();
    if (!id) {
      return { ok: false, errore: "Inserisci il tuo username o la tua email." };
    }
    try {
      const { dati } = await chiamaApi("/api/auth/recupero", {
        identificativo: id,
      });
      if (!dati?.ok) {
        return {
          ok: false,
          errore: (dati?.errore as string) ?? "Invio non riuscito.",
        };
      }
      return {
        ok: true,
        messaggio:
          (dati.messaggio as string) ??
          "Se l'account esiste, ti abbiamo inviato un'email con il link di recupero.",
      };
    } catch {
      return { ok: false, errore: "Errore di rete. Riprova." };
    }
  }

  async function impostaUsername(username: string): Promise<Esito> {
    const u = username.trim().toLowerCase();
    if (!FORMATO_USERNAME.test(u)) {
      return {
        ok: false,
        errore:
          "Username non valido: 3-20 caratteri tra lettere minuscole, numeri e underscore.",
      };
    }
    try {
      const { data } = await getClienteAuth().auth.getSession();
      const token = data.session?.access_token;
      if (!token) return { ok: false, errore: "Accedi per procedere." };
      const r = await fetch("/api/auth/username", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username: u }),
      });
      const dati = (await r.json().catch(() => null)) as Record<
        string,
        unknown
      > | null;
      if (!dati?.ok) {
        return {
          ok: false,
          errore: (dati?.errore as string) ?? "Salvataggio non riuscito.",
        };
      }
      return { ok: true };
    } catch {
      return { ok: false, errore: "Errore di rete. Riprova." };
    }
  }

  async function esci(): Promise<void> {
    await getClienteAuth().auth.signOut();
  }

  return (
    <Contesto.Provider
      value={{
        utente,
        caricamento,
        nickname: ultimoNickname,
        registrati,
        accedi,
        recuperaPassword,
        impostaUsername,
        esci,
      }}
    >
      {children}
    </Contesto.Provider>
  );
}

export function useAuth(): ContestoAuth {
  const ctx = useContext(Contesto);
  if (!ctx) throw new Error("useAuth deve essere usato dentro AuthProvider");
  return ctx;
}
