/* Service worker di Muri Parlanti.
 *
 * Serve solo a rendere l'app "salvabile sulla Home" e ad aprire una copia
 * essenziale quando manca la rete. Strategia volutamente prudente:
 *  - rete sempre per prima (nessun contenuto vecchio servito online);
 *  - la copia salvata si usa SOLO se la rete fallisce;
 *  - niente cache per le API e per tutto cio' che non e' del sito.
 *
 * In piu': quando esce una nuova versione del sito, questo service worker la
 * prende in carico e avvisa le pagine aperte, cosi' l'app salvata sulla Home
 * si aggiorna da sola invece di restare bloccata sulla vecchia versione.
 */
const CACHE = "muri-parlanti-v2";

self.addEventListener("install", () => {
  // Il nuovo service worker prende subito il posto del vecchio.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Pulizia delle cache vecchie.
      const nomi = await caches.keys();
      await Promise.all(nomi.filter((n) => n !== CACHE).map((n) => caches.delete(n)));
      // Prende il controllo delle pagine gia' aperte: fa scattare il
      // "controllerchange" che le fa ricaricare con la versione nuova.
      await self.clients.claim();
    })()
  );
});

// Le pagine aperte possono chiedere di attivare subito la versione nuova.
self.addEventListener("message", (event) => {
  if (event.data === "saltaAttesa") self.skipWaiting();
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