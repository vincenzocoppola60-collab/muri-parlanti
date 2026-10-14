// Fuso orario esplicito: il server (UTC) e il dispositivo (es. Europe/Rome)
// devono produrre lo stesso testo, altrimenti React fallisce l'hydration
// (errore #418) e la pagina si rompe nella WebView dell'app.
//
// Formato NUMERICO compatto: "01/10/2026 13.32" (giorno/mese/anno ore.minuti).
// Si compone a mano dalle parti, perche' Intl inserisce virgole e due punti
// che qui non vogliamo. hourCycle "h23" evita che mezzanotte diventi "24".
const formattatore = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "Europe/Rome",
});

/** "01/10/2026 13.32" (fuso Europe/Rome, identico su server e client) */
export function formattaData(iso: string): string {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return "";
  const parti: Record<string, string> = {};
  for (const parte of formattatore.formatToParts(data)) {
    if (parte.type !== "literal") parti[parte.type] = parte.value;
  }
  return `${parti.day}/${parti.month}/${parti.year} ${parti.hour}.${parti.minute}`;
}

const formattatoreBreve = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Europe/Rome",
});

/** "01/10/2026": solo la data, senza orario (fuso Europe/Rome). */
export function formattaDataBreve(iso: string): string {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return "";
  return formattatoreBreve.format(data);
}

/** "13.32": solo l'ora (fuso Europe/Rome). */
export function formattaOra(iso: string): string {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return "";
  const parti: Record<string, string> = {};
  for (const parte of formattatore.formatToParts(data)) {
    if (parte.type !== "literal") parti[parte.type] = parte.value;
  }
  return `${parti.hour}.${parti.minute}`;
}
