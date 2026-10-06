import { NextResponse } from "next/server";
import { getAdmin, getAnonServer, normalizzaUsername } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Accesso con USERNAME oppure EMAIL + password.
 *
 * Il server traduce l'identificativo nell'email dell'account (via username,
 * con la service_role) e fa il login con la chiave pubblica; alla fine
 * restituisce i token di sessione, che il browser imposta con setSession().
 * Cosi' l'email non viene mai esposta al client e chi ha solo lo username
 * puo' accedere.
 */
export async function POST(req: Request) {
  let corpo: unknown;
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ errore: "Richiesta non valida." }, { status: 400 });
  }

  const dati = corpo as { identificativo?: unknown; password?: unknown };
  const identificativo = String(dati.identificativo ?? "").trim();
  const password = String(dati.password ?? "");

  if (!identificativo || !password) {
    return NextResponse.json(
      { errore: "Inserisci username (o email) e password." },
      { status: 400 }
    );
  }

  try {
    const admin = getAdmin();

    let email: string | null = null;

    if (identificativo.includes("@")) {
      email = identificativo.toLowerCase();
    } else {
      const username = normalizzaUsername(identificativo);
      const { data: profilo } = await admin
        .from("profili")
        .select("id")
        .eq("username", username)
        .maybeSingle();
      if (profilo?.id) {
        const { data: utente } = await admin.auth.admin.getUserById(profilo.id);
        email = utente?.user?.email ?? null;
      }
    }

    if (!email) {
      return NextResponse.json(
        { errore: "Username o password non corretti." },
        { status: 401 }
      );
    }

    const anon = getAnonServer();
    const { data, error } = await anon.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      return NextResponse.json(
        { errore: "Username o password non corretti." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      ok: true,
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
  } catch (e) {
    return NextResponse.json(
      {
        errore:
          e instanceof Error && /SERVICE_ROLE/.test(e.message)
            ? "Server non configurato: manca la chiave Supabase di servizio."
            : "Errore del server. Riprova.",
      },
      { status: 500 }
    );
  }
}
