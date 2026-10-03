// Fuso orario esplicito: il server (UTC) e il dispositivo (es. Europe/Rome)
// devono produrre lo stesso testo, altrimenti React fallisce l'hydration
// (errore #418) e la pagina si rompe nella WebView dell'app.
const formattatore = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Rome",
});

/** "28 agosto 2026, 14:32" (fuso Europe/Rome, identico su server e client) */
export function formattaData(iso: string): string {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return "";
  return formattatore.format(data);
}
