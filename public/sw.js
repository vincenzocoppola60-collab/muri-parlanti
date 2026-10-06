/* Service worker di Muri Parlanti.
 *
 * Serve solo a rendere l'app "salvabile sulla Home" e ad aprire una copia
 * essenziale quando manca la rete. Strategia volutamente prudente:
 *  - rete sempre per prima (nessun contenuto vecchio servito online);
 *  - la copia salvata si usa SOLO se la rete fallisce;
 *  - niente cache per le API e per tutto cio' che non e' del sito.
 */
const CACHE = "muri-parlanti-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const nomi = await caches.keys();
      await Promise.all(nomi.filter((n) => n !== CACHE).map((n) => caches.delete(n)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }
  // Solo il nostro sito; API Supabase, auth e simili passano dritte.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    (async () => {
      try {
        const risposta = await fetch(req);
        // Mettiamo da parte solo risorse statiche andate a buon fine.
        if (risposta.ok && /\.(?:png|jpg|jpeg|webp|svg|ico|css|js|woff2?)$/.test(url.pathname)) {
          const cache = await caches.open(CACHE);
          cache.put(req, risposta.clone());
        }
        return risposta;
      } catch {
        // Rete assente: proviamo la copia salvata del sito.
        const salvata = await caches.match(req);
        if (salvata) return salvata;
        return new Response("Contenuto non disponibile senza rete.", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }
    })()
  );
});
