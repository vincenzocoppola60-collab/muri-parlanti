import { NextResponse } from "next/server";
import {
  getAdmin,
  getAnonServer,
  normalizzaUsername,
  sitoPubblico,
} from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Recupero password: l'utente inserisce username (o email di recupero) e il
 * server invia il link di reimpostazione all'email di recupero dell'account.
 *
 * Per non rivelare quali account esistono, la risposta e' SEMPRE la stessa,
 * sia che l'account esista sia che non esista.
 */
export async function POST(req: Request) {
  let corpo: unknown;
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ errore: "Richiesta non valida." }, { status: 400 });
  }

  const dati = corpo as { identificativo?: unknown };
  const identificativo = String(dati.identificativo ?? "").trim();

  const rispostaGenerica = NextResponse.json({
    ok: true,
    messaggio:
      "Se l'account esiste, ti abbiamo inviato un'email con il link per reimpostare la password. Controlla anche la posta indesiderata.",
  });

  if (!identificativo) {
    return NextResponse.json(
      { errore: "Inserisci il tuo username o la tua email." },
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
      // Nessun account: risposta identica per non rivelare nulla.
      return rispostaGenerica;
    }

    const anon = getAnonServer();
    await anon.auth.resetPasswordForEmail(email, {
      redirectTo: `${sitoPubblico()}/reimposta`,
    });

    return rispostaGenerica;
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
