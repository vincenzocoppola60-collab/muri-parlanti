import { NextResponse } from "next/server";
import { getAdmin, FORMATO_USERNAME, normalizzaUsername } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Imposta (o aggiorna) lo username dell'account CONNESSO: serve agli account
 * creati prima dell'introduzione dello username. Richiede il token di sessione
 * dell'utente nell'header Authorization; lo username scelto deve essere libero.
 */
export async function POST(req: Request) {
  // Token di sessione dal browser.
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.toLowerCase().startsWith("bearer ")
    ? auth.slice(7).trim()
    : "";
  if (!token) {
    return NextResponse.json({ errore: "Accedi per procedere." }, { status: 401 });
  }

  let corpo: unknown;
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ errore: "Richiesta non valida." }, { status: 400 });
  }

  const username = normalizzaUsername((corpo as { username?: unknown }).username);
  if (!FORMATO_USERNAME.test(username)) {
    return NextResponse.json(
      {
        errore:
          "Username non valido: 3-20 caratteri tra lettere minuscole, numeri e underscore.",
      },
      { status: 400 }
    );
  }

  try {
    const admin = getAdmin();

    // Chi sta chiamando? Il token deve appartenere a un utente valido.
    const { data: utenteData, error: errUtente } =
      await admin.auth.getUser(token);
    const uid = utenteData?.user?.id;
    if (errUtente || !uid) {
      return NextResponse.json({ errore: "Sessione non valida." }, { status: 401 });
    }

    // Lo username deve essere libero (o gia' assegnato a questo stesso utente).
    const { data: esistente } = await admin
      .from("profili")
      .select("id")
      .eq("username", username)
      .maybeSingle();
    if (esistente && esistente.id !== uid) {
      return NextResponse.json(
        { errore: "Questo username è già in uso. Scegline un altro." },
        { status: 409 }
      );
    }

    const { error } = await admin
      .from("profili")
      .upsert({ id: uid, username }, { onConflict: "id" });

    if (error) {
      // Vincolo di unicita' violato in una corsa: messaggio amichevole.
      if (/duplicate|unique|profili_username_unico/i.test(error.message)) {
        return NextResponse.json(
          { errore: "Questo username è già in uso. Scegline un altro." },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { errore: "Salvataggio non riuscito. Riprova." },
        { status: 400 }
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
