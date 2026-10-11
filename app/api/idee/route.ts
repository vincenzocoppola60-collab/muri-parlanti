import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Numero minimo di parole richiesto nel "perche'". */
const PAROLE_MINIME = 10;

/** Conta le parole di un testo (spazi, a capo e tab multipli contano uno). */
function contaParole(testo: string): number {
  const pulito = testo.trim();
  if (!pulito) return 0;
  return pulito.split(/\s+/).filter(Boolean).length;
}

/**
 * "Fonda un muro": riceve una proposta SOLO da un utente registrato.
 *
 * L'utente deve presentare il proprio token di sessione nell'header
 * Authorization. La riga viene scritta con la service_role key (getAdmin),
 * che scavalca la RLS: cosi' l'invio funziona anche quando la policy di
 * INSERT sulla tabella idee_muri non e' configurata sul database.
 *
 * Gli anonimi NON possono inviare: la rotta risponde 401 senza token valido.
 */
export async function POST(req: Request) {
  // 1) Token di sessione dal browser.
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.toLowerCase().startsWith("bearer ")
    ? auth.slice(7).trim()
    : "";
  if (!token) {
    return NextResponse.json(
      { errore: "Devi accedere per proporre un muro." },
      { status: 401 }
    );
  }

  // 2) Corpo della richiesta.
  let corpo: unknown;
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ errore: "Richiesta non valida." }, { status: 400 });
  }

  const c = corpo as {
    lat?: unknown;
    lng?: unknown;
    via?: unknown;
    motivo?: unknown;
  };
  const lat = Number(c.lat);
  const lng = Number(c.lng);
  const motivo = String(c.motivo ?? "").trim();
  const via = typeof c.via === "string" ? c.via.trim().slice(0, 300) : "";

  // 3) Validazione dei dati (non ci si fida del browser).
  if (
    !Number.isFinite(lat) ||
    lat < -90 ||
    lat > 90 ||
    !Number.isFinite(lng) ||
    lng < -180 ||
    lng > 180
  ) {
    return NextResponse.json(
      { errore: "Indica il punto sulla mappa." },
      { status: 400 }
    );
  }
  if (contaParole(motivo) < PAROLE_MINIME) {
    return NextResponse.json(
      { errore: `Il perché deve avere almeno ${PAROLE_MINIME} parole.` },
      { status: 400 }
    );
  }

  // 4) Scrittura con i privilegi di servizio.
  try {
    const admin = getAdmin();

    // Chi sta chiamando? Il token deve appartenere a un utente valido.
    const { data: utenteData, error: errUtente } =
      await admin.auth.getUser(token);
    const uid = utenteData?.user?.id;
    if (errUtente || !uid) {
      return NextResponse.json(
        { errore: "Sessione non valida. Accedi di nuovo." },
        { status: 401 }
      );
    }

    const riga: Record<string, unknown> = {
      utente_id: uid,
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
      motivo,
    };
    if (via) riga.via = via;

    const { data, error } = await admin
      .from("idee_muri")
      .insert(riga)
      .select("id")
      .single();

    if (error) {
      // Il trigger del database marchia i motivi troppo corti.
      if (/muri_idea:motivo_corto/.test(error.message)) {
        return NextResponse.json(
          { errore: `Il perché deve avere almeno ${PAROLE_MINIME} parole.` },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { errore: "Invio non riuscito. Riprova." },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, id: String(data.id) });
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