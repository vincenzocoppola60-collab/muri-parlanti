import { NextResponse } from "next/server";
import { getAdmin, FORMATO_USERNAME, normalizzaUsername, emailValida } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Registrazione account con USERNAME + email di recupero + password.
 *
 * L'account Supabase viene creato con email = email di recupero (confermata
 * subito, cosi' non serve un passaggio di conferma); lo username viene poi
 * salvato sulla riga del profilo. L'accesso e il recupero password useranno
 * lo username tramite le altre rotte.
 */
export async function POST(req: Request) {
  let corpo: unknown;
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ errore: "Richiesta non valida." }, { status: 400 });
  }

  const dati = corpo as {
    username?: unknown;
    email?: unknown;
    password?: unknown;
  };

  const username = normalizzaUsername(dati.username);
  const email = String(dati.email ?? "").trim().toLowerCase();
  const password = String(dati.password ?? "");

  if (!FORMATO_USERNAME.test(username)) {
    return NextResponse.json(
      {
        errore:
          "Username non valido: 3-20 caratteri tra lettere minuscole, numeri e underscore.",
      },
      { status: 400 }
    );
  }
  if (!emailValida(email)) {
    return NextResponse.json(
      { errore: "Email di recupero non valida." },
      { status: 400 }
    );
  }
  if (password.length < 6) {
    return NextResponse.json(
      { errore: "La password deve avere almeno 6 caratteri." },
      { status: 400 }
    );
  }

  try {
    const admin = getAdmin();

    // Lo username deve essere libero.
    const { data: esistente } = await admin
      .from("profili")
      .select("id")
      .eq("username", username)
      .maybeSingle();
    if (esistente) {
      return NextResponse.json(
        { errore: "Questo username è già in uso. Scegline un altro." },
        { status: 409 }
      );
    }

    // Crea l'utente con l'email di recupero, gia' confermata.
    const { data: creato, error: errCrea } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nickname: username, username },
    });

    if (errCrea || !creato?.user) {
      const msg = errCrea?.message ?? "";
      if (/already|registered|exists/i.test(msg)) {
        return NextResponse.json(
          { errore: "Questa email è già registrata. Prova ad accedere." },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { errore: "Registrazione non riuscita. Riprova." },
        { status: 400 }
      );
    }

    const uid = creato.user.id;

    // Salva username e nickname di default sul profilo (creato dal trigger).
    const { error: errProfilo } = await admin
      .from("profili")
      .upsert({ id: uid, username, nickname: username }, { onConflict: "id" });

    if (errProfilo) {
      // Non lasciare un account orfano: se il profilo non si aggiorna, rimuovi l'utente.
      try {
        await admin.auth.admin.deleteUser(uid);
      } catch {
        // ignore
      }
      return NextResponse.json(
        { errore: "Questo username è già in uso. Scegline un altro." },
        { status: 409 }
      );
    }

    return NextResponse.json({ ok: true });
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
