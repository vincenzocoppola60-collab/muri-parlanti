# Resoconto — Sezione "Il mio profilo" (vista proprietario)

Progetto: `muri-parlanti` (Next.js 16, React 19, Supabase, Tailwind 4)
Ambito: **solo locale** — nessun deploy, nessuna modifica al database remoto, nessuna migrazione eseguita.
Data: 12 ottobre 2026 — aggiornato il 13 ottobre 2026 (sezione 6)

---

## 1. Cosa era sbagliato (diagnosi di partenza)

Nella pagina `/profilo/[id]`, vista dal **proprietario** dell'account:

1. **Link auto-referenziale** — in fondo alla gestione c'era "👁️ Vedi il mio profilo pubblico" che puntava alla pagina in cui l'utente si trovava già.
2. **Doppio interruttore privacy** — `mostra_postit` esisteva sia in Gestione profilo sia in Impostazioni: due comandi per lo stesso campo vero.
3. **Salvataggio distruttivo in Impostazioni** — il toggle chiamava `salvaMioProfilo({ nickname: nickname || "Anonimo", bio: "", ... })`: un semplice interruttore **cancellava la biografia** dell'utente.
4. **Contenuto duplicato** — il proprietario vedeva le liste di gestione ("I miei post-it", "Salvati") **e** la stessa griglia pubblica 3×3 più sotto.
5. **Due schede con due salvataggi** — "Accesso" (username) e "Il tuo profilo" (nickname + bio) erano separate, con due pulsanti distinti.
6. **Nessuna paginazione** — la griglia si fermava a 60 post-it senza alcun "mostra altri", quindi il profilo sembrava incompleto.
7. **Nessuna gerarchia visiva** — sei schede identiche in colonna, senza indice né ancoraggi.

---

## 2. Cosa è stato cambiato (file per file)

### `lib/profili.ts`
- `caricaPostitDiUtente(userId, limite, offset)`: nuovo parametro `offset` (via `.range(da, da + limite - 1)`) per caricare le pagine successive.
- **Nuova** `impostaMostraPostit(mostra)`: `update` puntuale della **sola** colonna `profili.mostra_postit`. Non tocca nickname né bio. Se la riga profilo non esiste ancora, la crea con i dati minimi (nickname dai metadati o "Anonimo"). Questo elimina il salvataggio distruttivo del punto 3.

### `app/profilo/[id]/azioni.ts` (nuovo)
- Server action `altriPostit(utenteId, offset)`: pagina la griglia lato server. Valida l'UUID, ignora offset negativi/non finiti e si ferma oltre 5000. Espone **gli stessi dati già pubblici** della pagina profilo: nessun privilegio aggiuntivo.

### `components/GrigliaProfilo.tsx` (nuovo)
- Griglia 3×3 con **"Carica altri"** e contatore "N di M post-it" quando `totale` supera quanto già mostrato.
- Per il **proprietario** la griglia pubblica resta chiusa dietro un pulsante "👁️ Anteprima profilo pubblico" → niente più duplicazione (punto 4). Per i visitatori è aperta come prima.
- Nessun disallineamento di idratazione: al primo render (utente non ancora noto) client e server disegnano la griglia aperta, poi il proprietario la richiude.

### `app/profilo/[id]/page.tsx`
- La griglia inline è stata sostituita da `<GrigliaProfilo utenteId postit totale />`; il conteggio `totale` viene da `contaPostitDiUtente`.

### `components/GestioneProfilo.tsx` (riscritto)
- **Pillole-indice** in testa (Foto profilo / Il tuo profilo / I miei post-it / Post-it preferiti) con ancore `#foto`, `#identita`, `#miei`, `#salvati` e `scroll-mt-4` sulle schede → gerarchia visiva (punto 7).
- **Una sola scheda "Identità"**: username + nome sui post-it + biografia, con **UN solo pulsante "Salva modifiche"**. L'username viene salvato solo se è stato davvero modificato.
- **Privacy in sola lettura**: riga di stato ("I tuoi post-it si vedono / sono nascosti nel profilo pubblico") con collegamento a `/impostazioni`. L'interruttore resta dov'è unico (punto 2).
- **Rimosso** il link "Vedi il mio profilo pubblico" (punto 1).
- Le funzioni foto (ritaglio, rimozione) continuano a salvare con `salvaMioProfilo` passando il valore **vero** di `mostra_postit`, quindi non azzerano nulla.

### `app/impostazioni/page.tsx`
- `cambiaMostraPostit` ora chiama `impostaMostraPostit(nuovo)` invece di `salvaMioProfilo(...)`: l'interruttore non distrugge più la biografia (punto 3). Rimosso l'import e la variabile `nickname` diventati inutili.

### `lib/i18n.tsx`
- 7 nuove chiavi × 5 lingue (IT, EN, ES, FR, DE): `profilo.privacyVisibile`, `profilo.privacyNascosti`, `profilo.privacyGestisci`, `profilo.anteprimaApri`, `profilo.anteprimaChiudi`, `profilo.caricaAltri`, `profilo.mostrati`.
- Le pillole riusano chiavi già tradotte (`impost.fotoProfilo`, `impost.profilo`, `impost.mieiPostit`, `profilo.preferitiTitolo`).

---

## 3. Verifiche eseguite (locale)

| Verifica | Esito |
|---|---|
| `npm run build` (next build) | ✅ compilato, TypeScript e 19 pagine generate |
| `npx tsc --noEmit` | ✅ nessun errore |
| `npx eslint` sui file toccati | ✅ pulito (resta 1 errore **preesistente** in `GestioneProfilo.tsx:97`, presente identico in `git show HEAD` — non introdotto ora) |
| `GET /impostazioni` | ✅ 200 |
| `GET /profilo/<uuid valido ma inesistente>` | ✅ 404 (guardia sull'id) |
| `GET /profilo/abc` | ✅ 404 (formato non valido) |
| `GET /profilo/414c8516-…-5bcd0a534000` (profilo senza post-it) | ✅ 200, stato vuoto corretto |
| `GET /profilo/47dd0ea4-…-3a80cd0f3b02` (30 post-it, `mostra_postit=true`) | ✅ 200, griglia `grid-cols-3` renderizzata, 30 post-it, nessun link auto-referenziale nell'HTML |
| Prova "Carica altri" | ✅ con `LIMITE_GRIGLIA` abbassato temporaneamente a 8: HTML con **8 post-it + pulsante "Mostra altri post-it"**; poi `LIMITE_GRIGLIA` riportato a **60** e file verificato identico al backup con `diff` |

### Limiti di questa verifica (dichiarati, non nascosti)
- Il **click** su "Mostra altri" (chiamata alla server action) non è stato esercitato: richiede un browser autenticato. È stata verificata la prima pagina + la presenza del pulsante e la query con `offset` a livello di codice.
- Le prove sono state fatte con `curl` sulla **pagina pubblica**; il pannello di gestione è un componente client e si disegna solo con una sessione autenticata del proprietario, quindi il suo rendering non è visibile nell'HTML server.
- Nessun profilo del database locale ha più di 60 post-it, per questo la prova della paginazione ha richiesto l'abbassamento temporaneo (e poi il ripristino) di `LIMITE_GRIGLIA`.

---

## 4. Come provarlo a mano

1. `npm run dev` e apri `/profilo/<tuo-id>` con l'account del proprietario.
2. In cima alla gestione compaiono le 4 pillole: cliccandole si scorre alla scheda giusta.
3. Username, nome e bio stanno nella **stessa** scheda con **un solo** "Salva modifiche"; sotto c'è la riga di stato della privacy con il link a `/impostazioni`.
4. Non c'è più il pulsante "Vedi il mio profilo pubblico"; la griglia 3×3 dei tuoi post-it è dietro "👁️ Anteprima profilo pubblico".
5. In `/impostazioni` accendi/spegni la privacy dei post-it e ricontrolla la bio sul profilo: **deve restare** (prima spariva).

---

## 5. Note

- Tutte le modifiche sono **solo su file locali**; nessun deploy, nessuna migrazione SQL, nessuna modifica ai dati Supabase.
- Sono rimasti invariati i vincoli di privacy già esistenti: la server action `altriPostit` espone solo i post-it che il proprietario ha scelto di mostrare pubblicamente.
- Residuo noto e accettato: il server invia comunque nel primo payload HTML la prima pagina di post-it anche al proprietario (che poi la vede dietro il pulsante di anteprima). Per i profili normali sono poche decine di righe; se in futuro i profili cresceranno molto si potrà renderizzare il pulsante già dal server.

---

## 6. Aggiornamento del 13 ottobre 2026 — schermate dedicate, paginazione e privacy del visitatore

Questa sezione documenta le modifiche richieste dopo la prima stesura: separare gli elenchi lunghi in **schermate dedicate e paginate**, con anteprime compatte sulla pagina profilo, e il comportamento del **visitatore** quando il proprietario spegne le bacheche.

### 6.1 Nuove route dedicate

Sono state introdotte due pagine dinamiche che riusano lo stesso componente:

| Route | Contenuto | File |
|---|---|---|
| `/profilo/[id]/postit` | tutti i post-it lasciati dall'utente | `app/profilo/[id]/postit/page.tsx` |
| `/profilo/[id]/salvati` | i post-it che l'utente ha salvato (preferiti) | `app/profilo/[id]/salvati/page.tsx` |

Entrambe montano `<ElencoPaginato utenteId tipo nickname />` (`components/ElencoPaginato.tsx`).

### 6.2 Paginazione (10 per pagina)

- Costante `PER_PAGINA = 10` esportata da `components/ElencoPaginato.tsx`.
- Frecce **avanti/indietro** in fondo alla schermata; lo scorrimento verticale infinito è stato eliminato.
- I dati vengono caricati una volta (fino a `LIMITE_ELENCO = 500` elementi) e poi impaginati lato client, così il cambio pagina è istantaneo.
- Per il **proprietario** l'elenco arriva dal client autenticato (`caricaMieiPostit` / `caricaPreferiti`): vede sempre i propri contenuti, anche con la bacheca pubblica spenta.
- Per il **visitatore** l'elenco arriva dalle server action `elencoPostitProfilo` / `elencoSalvatiProfilo` (`app/profilo/[id]/azioni.ts`), che rispettano gli interruttori di privacy.

### 6.3 Anteprime sulla pagina profilo

Il componente interno `CorniceElenco` (`components/VistaProfilo.tsx`, righe ~89-130) mostra:

- un **titolo** (`profilo.elencoMiei` → "I post-it di {nome}", `profilo.elencoSalvati` → "I post-it salvati di {nome}");
- una **griglia 3×3** limitata a `postit.slice(0, 5)` (primi 5 elementi);
- il link `profilo.leggiTutti` → **"Clicca per leggerli tutti →"** verso la schermata dedicata, mostrato solo se `totale > 0`.

Quindi sulla pagina profilo gli elenchi restano compatti e il dettaglio completo si apre su richiesta, senza occupare tutta la pagina.

### 6.4 Comportamento del visitatore (privacy)

La vista visitatore (ramo `if (!proprietario)` di `VistaProfilo.tsx`) rende **solo** foto, nome, bio e le cornici degli elenchi **se esistono davvero e sono abilitate**:

```jsx
{mostraPostit  && totalePostit  > 0 && <CorniceElenco … href={`/profilo/${p.id}/postit`}  />}
{mostraSalvati && totaleSalvati > 0 && <CorniceElenco … href={`/profilo/${p.id}/salvati`} />}
```

Conseguenze verificate a livello di codice:

- con `mostra_postit` **off** o zero post-it → la cornice "I miei post-it" **non** viene disegnata;
- con `mostra_salvati` **off** o zero salvati → la cornice salvati **non** viene disegnata;
- se entrambe sono spente, il visitatore vede **unicamente** foto, nome e bio: **nessuna casella "profilo privato"**, nessun segnaposto vuoto;
- `p.bio` è reso solo se non vuoto.

Il proprietario può comandare i due interruttori dalla propria vista (`mostra_postit`, `mostra_salvati`), restando interruttori separati.

### 6.5 Migrazione 0031 — in sospeso

- File pronto: `supabase/migrations/0031_profilo_mostra_salvati.sql` (aggiunge la colonna `profili.mostra_salvati`).
- **Non è stata eseguita** alcuna migrazione: l'ambito resta solo locale.
- Finché la 0031 non viene eseguita nell'SQL Editor di Supabase, selezionare `mostra_salvati` produce l'errore PostgREST **42703** (`column does not exist`); l'interruttore "salva/mostra i post-it salvati" del proprietario mostra il messaggio di migrazione invece di funzionare.
- Il messaggio in `lib/profili.ts` (`MESSAGGIO_MIGRAZIONE`) ora cita entrambi i file: `0005_profili.sql` (tabella profili) e `0031_profilo_mostra_salvati.sql` (privacy dei salvati).

### 6.6 Verifiche eseguite

| Verifica | Esito |
|---|---|
| `npx tsc --noEmit` | ✅ 0 errori |
| `next build` isolato | ✅ 19 pagine generate; entrambe le nuove route presenti come **ƒ dynamic** |
| Verifica automatica in browser (build isolata, viewport 390px) | ✅ 16 controlli su 16 PASS |
| Rendering visitatore con entrambe le bacheche spente | ✅ solo foto, nome, bio — nessun segnaposto |
| Paginazione 10/pagina con frecce avanti/indietro | ✅ verificata sulle route `/postit` e `/salvati` |

Screenshot catturati in `/tmp/mp-shot3/`: `visitatore-390.png`, `postit-pagina1-390.png`, `postit-pagina2-390.png`, `postit-ultima-390.png`, `salvati-piet-390.png`.

### 6.7 Note d'ambiente (per riproducibilità)

- La build/esecuzione di prova è stata fatta in una **copia isolata** del progetto (rsync + clone APFS copy-on-write di `node_modules` con `cp -c -R`), per **non sovrascrivere la `.next`** del server di produzione attivo sulla porta **3210**.
- Turbopack rifiuta `node_modules` con symlink nel build copiato: risolto con il clone copy-on-write APFS.
- Il dev server sulla porta **3000** riflette il codice corrente; il server sulla **3210** serve la build precedente.
