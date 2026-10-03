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

type Esito =
  | { ok: true }
  | { ok: false; errore: string };

type ContestoAuth = {
  utente: User | null;
  caricamento: boolean;
  nickname: string;
  registrati: (email: string, password: string, nickname: string) => Promise<Esito>;
  accedi: (email: string, password: string) => Promise<Esito>;
  esci: () => Promise<void>;
};

const Contesto = createContext<ContestoAuth | null>(null);

const NICKNAME_KEY = "muri-parlanti:nickname";

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

  async function registrati(
    email: string,
    password: string,
    nickname: string
  ): Promise<Esito> {
    const nick = nickname.trim();
    if (!nick) return { ok: false, errore: "Inserisci un nome." };
    if (password.length < 6) {
      return { ok: false, errore: "La password deve avere almeno 6 caratteri." };
    }
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(NICKNAME_KEY, nick);
      }
      const { data, error } = await getClienteAuth().auth.signUp({
        email: email.trim(),
        password,
        options: { data: { nickname: nick } },
      });
      if (error) return { ok: false, errore: traducErrore(error.message) };
      // Se la conferma email è abilitata, il data.user non è ancora attivo.
      if (data.user && !data.session) {
        return {
          ok: false,
          errore:
            "Ti abbiamo inviato una mail di conferma. Aprila e poi accedi con la stessa email e password.",
        };
      }
      return { ok: true };
    } catch {
      return { ok: false, errore: "Errore di rete. Riprova." };
    }
  }

  async function accedi(email: string, password: string): Promise<Esito> {
    try {
      const { error } = await getClienteAuth().auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) return { ok: false, errore: traducErrore(error.message) };
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

function traducErrore(messaggio: string): string {
  if (/invalid login credentials/i.test(messaggio)) {
    return "Email o password non corretti.";
  }
  if (/already registered/i.test(messaggio)) {
    return "Questa email è già registrata. Prova ad accedere.";
  }
  if (/email.*not.*confirmed/i.test(messaggio)) {
    return "Conferma prima la mail che ti abbiamo inviato, poi accedi.";
  }
  if (/password/i.test(messaggio) && /at least 6/i.test(messaggio)) {
    return "La password deve avere almeno 6 caratteri.";
  }
  return messaggio;
}
