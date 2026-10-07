"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * Multilingua del sito.
 *
 * - `lingua` e' la lingua dell'interfaccia (salvata sul dispositivo).
 * - `traduciPubblici` e' l'opzione, accanto alla bandiera, che decide se
 *   tradurre automaticamente i post pubblici (quelli degli altri utenti)
 *   nella lingua scelta. Resta una preferenza locale, non un dato di account.
 */

export type CodiceLingua = "it" | "en" | "es" | "fr" | "de";

export type Lingua = {
  codice: CodiceLingua;
  nome: string;
  bandiera: string;
  /** Locale BCP-47, usato per date e per la richiesta di traduzione. */
  locale: string;
};

export const LINGUE: Lingua[] = [
  { codice: "it", nome: "Italiano", bandiera: "🇮🇹", locale: "it-IT" },
  { codice: "en", nome: "English", bandiera: "🇬🇧", locale: "en-GB" },
  { codice: "es", nome: "Español", bandiera: "🇪🇸", locale: "es-ES" },
  { codice: "fr", nome: "Français", bandiera: "🇫🇷", locale: "fr-FR" },
  { codice: "de", nome: "Deutsch", bandiera: "🇩🇪", locale: "de-DE" },
];

const LINGUA_PREDEFINITA: CodiceLingua = "it";
const LINGUA_KEY = "muri-parlanti:lingua";
const TRADUCI_KEY = "muri-parlanti:traduci-pubblici";

type Parole = Record<string, string>;

/** Italiano = lingua di partenza: ogni chiave esiste qui e fa da fallback. */
const IT: Parole = {
  "nav.menu": "Menu",
  "nav.chiudi": "Chiudi il menu",
  "nav.apri": "Apri il menu",
  "nav.home": "Home",
  "nav.tuoProfilo": "Il tuo profilo",
  "nav.mieiMuri": "I tuoi muri",
  "nav.salvati": "Post-it salvati",
  "nav.scansiona": "Scansiona QR",
  "nav.impostazioni": "Impostazioni",
  "nav.admin": "Pannello admin",
  "nav.esci": "Esci dall'account",
  "nav.creaAccount": "Crea account gratuito",
  "nav.ospite": "Ospite",
  "nav.ospiteDescr":
    "Crea un account gratuito per profilo, post-it salvati e livelli.",
  "nav.toccaProfilo": "Tocca per aprire il profilo",
  "lingua.titolo": "Lingua",
  "lingua.scegli": "Scegli la lingua dell'interfaccia",
  "lingua.traduci": "Traduci i post pubblici",
  "lingua.traduciDescr":
    "Traduce i pensieri degli altri utenti nella lingua scelta. I tuoi post restano come li hai scritti.",
  "home.desc":
    "I muri della città raccontano storie. Scansiona il QR di un muro per scoprirlo e lascia il tuo pensiero, anche in anonimo. Crea un account gratuito per vedere i pensieri delle altre persone, aprire i profili degli autori e salvare i tuoi preferiti.",
  "home.footer": "Un pensiero anonimo per ogni muro. Sii gentile.",
  "pwa.titolo": "Sul telefono, come un'app",
  "pwa.testo":
    "Muri Parlanti è ottimizzata per funzionare direttamente dal telefono: salvala sulla Home e si apre a schermo intero, con accesso rapido, senza installazioni tradizionali né store.",
  "pwa.installa": "Salva sulla Home",
  "pwa.installaFatto": "App aggiunta alla Home",
  "pwa.ios":
    "Su iPhone/iPad: tocca Condividi e poi «Aggiungi alla schermata Home».",
  "pwa.altro":
    "Dal menu del browser scegli «Installa app» o «Aggiungi alla schermata Home».",
  "pwa.giaInstallata": "Stai già usando la versione salvata sulla Home.",
  "muro.pensieroUno": "1 pensiero lasciato",
  "muro.pensieri": "{n} pensieri lasciati",
  "muro.vuoto": "Nessun pensiero ancora. Sii il primo.",
  "muro.lascia": "Lascia un pensiero",
  "muro.invitoTitolo": "Questo muro è vivo",
  "muro.invitoTesto":
    "Crea un account gratuito per salvare i muri che visiti, tenere i tuoi post-it preferiti e salire di livello. Puoi comunque lasciare il tuo pensiero anche senza account.",
  "muro.invitoCta": "Crea account gratuito",
  "muro.chiudiInvito": "Chiudi invito",
  "muro.fotoMuro": "Foto del muro di {nome}",
  "editor.titolo": "Il tuo pensiero",
  "editor.placeholder": "Scrivi il tuo pensiero per questo muro...",
  "editor.firma": "Nome con cui firmi il pensiero",
  "editor.nome": "Il tuo nome (facoltativo)",
  "editor.firmaAccount":
    "Firmi con il tuo account: chi scansiona il muro potra' aprire il tuo profilo toccando il nome. Puoi cambiarlo nelle Impostazioni.",
  "editor.fotoAggiungi": "Aggiungi una foto",
  "editor.fotoFacoltativa": "(facoltativa)",
  "editor.fotoPronta": "Foto pronta: verra' caricata quando attacchi il pensiero.",
  "editor.rimuoviFoto": "Rimuovi la foto",
  "editor.anteprimaFoto": "Anteprima della foto",
  "editor.attacca": "Attacca",
  "editor.attaccando": "Attacco...",
  "editor.caricoFoto": "Carico foto...",
  "editor.annulla": "Annulla",
  "editor.fileNonImmagine": "Il file scelto non e' un'immagine.",
  "postit.tu": "Tu",
  "postit.tuo": "tuo",
  "postit.tuoPensiero": "È il tuo pensiero ({nome})",
  "postit.vediProfilo": "Vedi il profilo dell'autore",
  "postit.tradotto": "tradotto",
  "postit.mostraOriginale": "Mostra l'originale",
  "postit.mostraTraduzione": "Traduci",
  "postit.preferitoAggiungi": "Salva nei preferiti",
  "postit.preferitoRimuovi": "Rimuovi dai preferiti",
  "postit.fotoAllegata": "Foto allegata al pensiero",
  "postit.canzone": "Canzone allegata al pensiero",
  "postit.ascolta": "Ascolta la canzone",
  "editor.canzoneAggiungi": "Aggiungi una canzone",
  "editor.canzoneFacoltativa": "(facoltativa)",
  "editor.canzonePlaceholder": "Cerca una canzone",
  "editor.canzonePronta": "Canzone pronta:",
  "editor.canzoneCambia": "Cambia",
  "scegli.titolo": "Cerca una canzone",
  "scegli.placeholder": "Titolo o artista...",
  "scegli.cercando": "Sto cercando...",
  "scegli.vuoto": "Nessun risultato. Prova con un altro titolo.",
  "scegli.errore": "Ricerca non disponibile. Riprova.",
  "scegli.momento": "Scegli il momento (max 30 secondi)",
  "scegli.prova": "▶ Prova",
  "scegli.aggiungi": "Aggiungi la canzone",
  "scegli.linkUsa": "Usa questo link",
  "scegli.fonteTutti": "Tutti",
  "scegli.durata": "Durata",
  "scegli.senzaPorzione": "Anteprima non disponibile: la canzone parte dall'inizio.",
  "scegli.spotifyNonConfigurato": "Spotify non è configurato. Aggiungi le chiavi o usa un'altra fonte.",
  "scegli.youtubeNonConfigurato": "YouTube non è configurato. Aggiungi la chiave API o usa un'altra fonte.",
  "scegli.parteCompleta": "Scegli una parte della canzone (max 30 secondi)",
  "scegli.caricoPlayer": "Carico la canzone completa...",
  "scegli.errorePlayer": "Non riesco a caricare il player. Riprova.",
  "scegli.istruzioni": "Trascina la barra per scegliere la parte (max 30 secondi)",
  "scegli.riproduci": "▶ Ascolta la parte",
  "scegli.pausa": "⏸ Pausa",
  "editor.canzoneRimuovi": "Rimuovi la canzone",
  "editor.canzoneNonSupportata":
    "Link non riconosciuto.",
  "editor.erroreFoto":
    "Non sono riuscito a caricare la foto ({msg}). Riprova o rimuovila.",
  "popup.titolo": "Grazie per il tuo primo pensiero",
  "popup.testo":
    "Il tuo post-it è sul muro. Salva Muri Parlanti sulla Home del telefono: si apre a schermo intero e ritrovi subito i tuoi muri, senza installare nulla.",
  "popup.ok": "Va bene",
  "comune.chiudi": "Chiudi",

  "nav.menuPrincipale": "Menu principale",

  "accesso.accedi": "Accedi",
  "accesso.registrati": "Registrati",
  "accesso.phUsername": "Username (3-20: a-z, 0-9, _)",
  "accesso.phEmailRecupero": "Email di recupero",
  "accesso.phIdentificativo": "Username o email",
  "accesso.phIdentRecupero": "Username o email di recupero",
  "accesso.phPassword": "Password (min 6 caratteri)",
  "accesso.attendi": "Attendi…",
  "accesso.creaAccount": "Crea il tuo account",
  "accesso.inviaRecupero": "Invia il link di recupero",
  "accesso.passwordDimenticata": "Password dimenticata?",
  "accesso.tornaAccesso": "← Torna all'accesso",
  "accesso.notaUsername":
    "Lo username è il nome con cui accedi. L'email serve solo a recuperare la password se la dimentichi.",
  "accesso.accountCreato": "Account creato. Bentornato!",
  "accesso.controllaEmail": "Controlla la tua email di recupero.",

  "muri.titolo": "I tuoi muri",
  "muri.vuotoOspite":
    "Scansiona il QR del primo muro che incontri: lo salverai qui e potrai tornare a leggerlo quando vuoi.",
  "muri.vuotoAccount":
    "Non hai ancora nessun muro. Scansiona il QR del primo muro che incontri: resterà nel tuo account.",
  "muri.scansionaPrimo": "Scansiona il tuo primo muro",
  "muri.aggiungi": "＋ Aggiungi muro",
  "muri.neiTuoi": "✓ Nei tuoi muri",
  "muri.salva": "☆ Salva nei tuoi muri",

  "comune.tornaHome": "Torna alla home",
  "comune.tornaHomeFreccia": "← Torna alla home",
  "comune.homeFreccia": "← Home",
  "comune.punti": "punti",
  "comune.carico": "Carico…",
  "comune.attendi": "Attendi…",
  "comune.salvo": "Salvo…",
  "comune.rimozioneFallita": "Rimozione non riuscita. Riprova.",

  "crediti.ideaBy": "Idea by",
  "crediti.instagram": "Profilo Instagram del creatore",

  "progresso.piuPunti": "+{n} punti",
  "progresso.livelloSbloccato": "🎉 Livello {n} sbloccato!",

  "livello.1": "Neofita",
  "livello.2": "Esploratore",
  "livello.3": "Vagabondo",
  "livello.4": "Viaggiatore",
  "livello.5": "Cronista",
  "livello.6": "Narratore",
  "livello.7": "Leggenda dei muri",

  "profilo.noAccountTitolo": "Il tuo profilo",
  "profilo.noAccountTesto":
    "Con un account salvi i muri che visiti, i post-it preferiti e guadagni punti: ogni livello raggiunto ti regala un bonus.",
  "profilo.ciao": "Ciao, {nome} 👋",
  "profilo.tu": "Tu",
  "profilo.esci": "Esci",
  "profilo.punti": "{xp} punti",
  "profilo.alProssimo": "{n} punti al livello {lv}",
  "profilo.maxLivello": "Livello massimo raggiunto!",
  "profilo.muriEsplorati": "muri esplorati",
  "profilo.pensieriLasciati": "pensieri lasciati",
  "profilo.preferiti": "preferiti",
  "profilo.caricaFoto": "📷 Carica la foto di un muro",
  "profilo.ilMioProfilo": "👁️ Il mio profilo",
  "profilo.impostazioni": "⚙️ Impostazioni",
  "profilo.ricompense": "Ricompense di livello",
  "profilo.preferitiTitolo": "Post-it preferiti",
  "profilo.preferitiVuoto":
    "Nessun preferito: tocca il cuore 🤍 su un post-it per salvarlo qui.",
  "profilo.rimuoviPreferito": "Rimuovi dai preferiti",
  "profilo.guadagnaPunti":
    "Visita altri muri per guadagnare punti e salire di livello.",
  "profilo.fotoAlt": "Foto profilo di {nome}",

  "ritaglia.titolo": "Inquadra la foto",
  "ritaglia.testo":
    "Trascina l'immagine e regola lo zoom: dentro il cerchio va la parte che vuoi come foto profilo.",
  "ritaglia.noSupporto":
    "Il browser non supporta il ritaglio. Prova con un'altra foto.",
  "ritaglia.fallito": "Ritaglio non riuscito. Riprova.",
  "ritaglia.alt": "Foto da ritagliare",
  "ritaglia.carico": "Carico l'immagine…",
  "ritaglia.riduciZoom": "Riduci zoom",
  "ritaglia.zoomImmagine": "Zoom immagine",
  "ritaglia.aumentaZoom": "Aumenta zoom",
  "ritaglia.annulla": "✕ Annulla",
  "ritaglia.usa": "✓ Usa questa foto",

  "scan.errPermesso":
    "Permesso fotocamera negato. Apri il sito in Chrome, tocca l'icona del lucchetto accanto all'indirizzo e consenti la fotocamera, poi riprova. In alternativa usa \"Scatta una foto del QR\".",
  "scan.errNessunaCam":
    "Nessuna fotocamera trovata su questo dispositivo. Usa \"Scatta una foto del QR\".",
  "scan.errInUso":
    "La fotocamera è già in uso da un'altra app. Chiudila e riprova.",
  "scan.errNoModalita":
    "La fotocamera di questo dispositivo non supporta la modalità richiesta.",
  "scan.errSicura": "La fotocamera richiede una connessione sicura (https).",
  "scan.errAvvio": "Non sono riuscito ad avviare la fotocamera.",
  "scan.errNoEspone":
    "Questo dispositivo non espone la fotocamera al browser.",
  "scan.errNoVideo": "Elemento video non trovato.",
  "scan.invito":
    "Inquadra il QR code affisso sul muro per salvarlo tra i tuoi muri.",
  "scan.avvia": "📷 Avvia la fotocamera",
  "scan.avvio": "Avvio della fotocamera… (consenti l'accesso se richiesto)",
  "scan.inquadra": "Inquadra il QR code del muro.",
  "scan.ferma": "Ferma la fotocamera",
  "scan.riprova": "Riprova",
  "scan.browserIntegrato":
    "Stai usando il browser integrato di {nome}: a volte blocca la fotocamera. Apri il link in Chrome oppure usa Scatta una foto del QR qui sotto.",
  "scan.scatta": "📸 Scatta una foto del QR",
  "scan.scegliFoto": "🖼️ Oppure scegli una foto del QR code",
  "scan.noQrFoto":
    "Nessun QR riconosciuto nella foto. Riprova facendo una foto più vicina e dritta al QR code.",
  "scan.erroreSconosciuto": "Errore sconosciuto.",
  "scan.fotoNonLeggibile": "Foto non leggibile.",
  "scan.testoNonRiconosciuto":
    "Non riconosco questo testo. Incolla un link /muro/… oppure uno slug tipo piazza-del-mercato.",
  "scan.muroSalvato": "Muro salvato tra i tuoi muri.",
  "scan.vaiMuro": "Vai al muro",
  "scan.scansionaAltro": "Scansiona un altro muro",
  "scan.manualeLabel": "Niente fotocamera? Incolla lo slug o il link del muro:",
  "scan.manualePh": "es. piazza-del-mercato",
  "scan.salva": "Salva",

  "scansiona.titolo": "Scansiona un muro",

  "mieiMuriPag.testo":
    "I muri che hai incontrato: toccane uno per rileggere i pensieri.",

  "preferitiPag.titolo": "Post-it salvati",
  "preferitiPag.testo":
    "I pensieri che hai salvato con il cuore, dai muri che hai visitato.",
  "preferitiPag.serveAccount": "Serve un account",
  "preferitiPag.serveAccountTesto":
    "I post-it salvati restano nel tuo account: li ritrovi su ogni dispositivo dopo l'accesso.",
  "preferitiPag.accedi": "Accedi o crea account",
  "preferitiPag.errCarico":
    "Non sono riuscito a caricare i tuoi post-it salvati.",
  "preferitiPag.errRimuovi": "Rimozione non riuscita, riprova.",
  "preferitiPag.vuoto":
    "Nessun post-it salvato ancora. Tocca il cuore 🤍 su un pensiero per conservarlo qui.",
  "preferitiPag.rimuoviSalvati": "Rimuovi dai salvati",

  "impost.apro": "Apro le impostazioni…",
  "impost.titolo": "Impostazioni",
  "impost.noAccountTesto":
    "Accedi per gestire la foto profilo, la biografia e la privacy dei tuoi pensieri.",
  "impost.fotoProfilo": "Foto profilo",
  "impost.cambiaFoto": "🔄 Cambia foto",
  "impost.aggiungiFoto": "➕ Aggiungi foto",
  "impost.rimuoviFoto": "Rimuovi foto",
  "impost.fotoNota":
    "JPG, PNG o WebP: potrai trascinare l'immagine e scegliere con lo zoom quale parte finisce nel cerchio.",
  "impost.accesso": "Accesso",
  "impost.accessoNota":
    "Lo username è il nome con cui accedi (insieme alla password). L'email di recupero serve se dimentichi la password.",
  "impost.username": "Username",
  "impost.usernamePh": "es. mario_rossi",
  "impost.usernameManca":
    "Non hai ancora scelto uno username: scegline uno per accedere senza digitare l'email.",
  "impost.salvaUsername": "Salva username",
  "impost.usernameSalvato":
    "Username salvato ✓. Ora puoi accedere con questo nome.",
  "impost.profilo": "Il tuo profilo",
  "impost.nomePost": "Nome sui tuoi post-it",
  "impost.bio": "Biografia",
  "impost.bioPh": "Due righe su di te (opzionale)",
  "impost.mostraPostit": "Mostra i miei post-it sul profilo pubblico",
  "impost.mostraPostitNota":
    "Se lo disattivi, chi visita il tuo profilo non potrà leggere i pensieri che hai lasciato (restano comunque sul muro).",
  "impost.salvaModifiche": "Salva modifiche",
  "impost.profiloSalvato": "Profilo salvato ✓",
  "impost.fotoAggiornata": "Foto profilo aggiornata ✓",
  "impost.fotoRimossa": "Foto rimossa ✓",
  "impost.vediProfilo": "👁️ Vedi il mio profilo pubblico",
  "impost.mieiPostit": "I miei post-it",
  "impost.nessunPostit":
    "Non hai ancora lasciato pensieri: trova un QR code su un muro e scrivi il primo.",

  "foto.titolo": "Carica foto muro",
  "foto.noAccount": "Devi accedere per caricare la foto di un muro.",
  "foto.testo": "La foto verrà mostrata a chi scansiona il QR di quel muro.",
  "foto.errSlug":
    "Slug non valido: usa solo lettere minuscole e trattini (es. parco-cerillo).",
  "foto.errScegli": "Scegli una foto del muro.",
  "foto.errCarico": "Caricamento non riuscito, riprova.",
  "foto.fatto": "Foto caricata: ora il muro ha la sua immagine.",
  "foto.vaiMuro": "Vai al muro",
  "foto.altra": "Carica un'altra foto",
  "foto.slugLabel": "Slug del muro (es. parco-cerillo)",
  "foto.slugPh": "es. parco-cerillo",
  "foto.fotoLabel": "Foto del muro",
  "foto.caricamento": "Caricamento…",
  "foto.carica": "📷 Carica foto",

  "apri.titolo": "Apri un muro",
  "apri.cercoPos":
    "Un attimo: cerco la tua posizione per capire su quale muro sei…",
  "apri.cercoMuro": "Posizione trovata. Verifico la zona del muro…",
  "apri.trovato": "Muro trovato: apro {slug}…",
  "apri.errore":
    "Qualcosa è andato storto. Riscansiona il QR e riprova.",
  "apri.noGeo": "Questo dispositivo non supporta la geolocalizzazione.",
  "apri.fuoriZona":
    "Non sei nella zona di nessun muro. Avvicinati al muro e riscansiona il QR.",
  "apri.noMuri":
    "Non ci sono ancora muri: chiedi all'autore di crearne uno.",
  "apri.noCoord": "Nessun muro ha ancora le coordinate impostate.",
  "apri.noVicino": "Nessun muro abbastanza vicino. Ecco quelli più vicini a te:",
  "apri.posNegata":
    "Posizione non disponibile. Consenti l'accesso alla posizione e riscansiona il QR.",
  "apri.home": "← Home",

  "reimposta.titolo": "Nuova password",
  "reimposta.errCorta": "La password deve avere almeno 6 caratteri.",
  "reimposta.errDiversa": "Le due password non coincidono.",
  "reimposta.errFallito":
    "Non riuscito. Il link potrebbe essere scaduto: richiedine uno nuovo.",
  "reimposta.fatto": "Password aggiornata. Ti stiamo portando alla home…",
  "reimposta.verifico": "Verifico il link…",
  "reimposta.linkNonValido":
    "Il link di recupero non è valido o è scaduto. Torna all'accesso e richiedi una nuova email di recupero con «Password dimenticata?».",
  "reimposta.phPassword": "Nuova password (min 6 caratteri)",
  "reimposta.phRipeti": "Ripeti la nuova password",
  "reimposta.salva": "Salva la nuova password",

  "admin.pannello": "Pannello muri",
  "admin.noAccesso":
    "Devi accedere con l'account amministratore per gestire i muri.",
  "admin.noAdmin":
    "Questo account non è amministratore: non pu������������ creare né gestire i muri.",
  "admin.testo":
    "Solo tu puoi fondare un muro e generarne il QR. Tutti gli altri possono solo leggere e lasciare pensieri.",
  "admin.fonda": "Fonda un muro",
  "admin.nomeLuogo": "Nome del luogo",
  "admin.nomePh": "es. Parco Cerillo",
  "admin.latPh": "es. 40.8518",
  "admin.lngPh": "es. 14.2681",
  "admin.usaPos": "📍 Usa la mia posizione",
  "admin.lat": "Latitudine",
  "admin.lng": "Longitudine",
  "admin.raggio": "Raggio di riconoscimento (metri)",
  "admin.fotoLabel": "Foto del muro (facoltativa)",
  "admin.salvataggio": "Salvataggio…",
  "admin.fondaBtn": "Fonda il muro",
  "admin.muri": "I muri ({n})",
  "admin.caricoMuri": "Carico i muri…",
  "admin.nessunMuro": "Nessun muro ancora.",
  "admin.senzaCoord": "senza coordinate",
  "admin.raggioM": "raggio {m} m",
  "admin.apri": "Apri",
  "admin.svuota": "Svuota post-it",
  "admin.cancella": "Cancella",
  "admin.errNome":
    "Nome non valido: usa lettere e spazi (es. Parco Cerillo).",
  "admin.errCoord":
    "Inserisci sia latitudine sia longitudine, oppure nessuna.",
  "admin.salvato": "Muro \"{nome}\" salvato.",
  "admin.errSalvataggio": "Salvataggio non riuscito.",
  "admin.confCancella": "Cancellare il muro \"{nome}\"?",
  "admin.confSvuota":
    "Svuotare TUTTI i post-it del muro \"{nome}\"? L'operazione non è reversibile.",
  "admin.svuotati": "Post-it di {nome} svuotati.",
  "admin.noGeo":
    "La geolocalizzazione non è disponibile su questo dispositivo.",
  "admin.cercoPos": "Cerco la tua posizione…",
  "admin.posNonRilevata": "Posizione non rilevata: inseriscila a mano.",
  "admin.zona": "Zona di accesso del muro",
  "admin.zonaAiuto":
    "Tocca la mappa per disegnare il perimetro della zona: almeno 3 punti. Solo chi si trova dentro questa zona, scannerizzando il QR, potrà aprire il muro.",
  "admin.zonaVaiPos": "📍 Vai alla mia posizione",
  "admin.zonaIndietro": "Annulla ultimo punto",
  "admin.zonaPulisci": "Pulisci",
  "admin.zonaPunti": "{n} punti",
  "admin.senzaZona": "senza zona (raggio predefinito)",
  "admin.errZona": "Disegna almeno 3 punti sulla mappa per definire la zona.",

  "qr.muroDi": "Muro di {nome}",
  "qr.inquadra": "Inquadra il codice per lasciare un pensiero su questo muro.",
  "qr.alt": "QR Code del muro di {nome}",
  "qr.stampaNota":
    "Stampare: usa il pulsante qui sopra o Cmd/Ctrl+P. Il QR punta al muro pubblico, quindi funziona anche dopo aggiornamenti del sito.",
  "qr.stampa": "🖨️ Stampa",

  "errore.titolo": "Muri Parlanti",
  "errore.muroTesto":
    "Non sono riuscito a raggiungere il muro in questo momento. Il database potrebbe non essere configurato: riprova tra poco.",

  "profiloPub.pensieroUno": "1 pensiero lasciato",
  "profiloPub.pensieri": "{n} pensieri lasciati",
  "profiloPub.nascosto":
    "Questo profilo ha scelto di non mostrare i suoi post-it.",
  "profiloPub.vuoto": "Nessun pensiero ancora lasciato da questo autore.",
  "profiloPub.bio": "Bio",
  "profiloPub.fotoAlt": "Foto profilo di {nome}",
};

const EN: Parole = {
  "nav.menu": "Menu",
  "nav.chiudi": "Close the menu",
  "nav.apri": "Open the menu",
  "nav.home": "Home",
  "nav.tuoProfilo": "Your profile",
  "nav.mieiMuri": "Your walls",
  "nav.salvati": "Saved notes",
  "nav.scansiona": "Scan QR",
  "nav.impostazioni": "Settings",
  "nav.admin": "Admin panel",
  "nav.esci": "Sign out",
  "nav.creaAccount": "Create a free account",
  "nav.ospite": "Guest",
  "nav.ospiteDescr":
    "Create a free account for your profile, saved notes and levels.",
  "nav.toccaProfilo": "Tap to open your profile",
  "lingua.titolo": "Language",
  "lingua.scegli": "Choose the interface language",
  "lingua.traduci": "Translate public notes",
  "lingua.traduciDescr":
    "Translates other people's notes into the chosen language. Your own notes stay as you wrote them.",
  "home.desc":
    "The city's walls tell stories. Scan a wall's QR to discover it and leave your thought, anonymously too. Create a free account to read other people's thoughts, open authors' profiles and save your favourites.",
  "home.footer": "One anonymous thought per wall. Be kind.",
  "pwa.titolo": "On your phone, like an app",
  "pwa.testo":
    "Muri Parlanti is optimised to run straight from your phone: save it to your Home screen and it opens full screen, with quick access, no traditional install and no app store.",
  "pwa.installa": "Save to Home screen",
  "pwa.installaFatto": "App added to your Home screen",
  "pwa.ios": "On iPhone/iPad: tap Share, then “Add to Home Screen”.",
  "pwa.altro":
    "From the browser menu choose ���Install app” or “Add to Home screen”.",
  "pwa.giaInstallata": "You are already using the version saved to your Home screen.",
  "muro.pensieroUno": "1 thought left",
  "muro.pensieri": "{n} thoughts left",
  "muro.vuoto": "No thoughts yet. Be the first.",
  "muro.lascia": "Leave a thought",
  "muro.invitoTitolo": "This wall is alive",
  "muro.invitoTesto":
    "Create a free account to save the walls you visit, keep your favourite notes and level up. You can still leave your thought without an account.",
  "muro.invitoCta": "Create a free account",
  "muro.chiudiInvito": "Close invitation",
  "muro.fotoMuro": "Photo of {nome}'s wall",
  "editor.titolo": "Your thought",
  "editor.placeholder": "Write your thought for this wall...",
  "editor.firma": "Name you sign the thought with",
  "editor.nome": "Your name (optional)",
  "editor.firmaAccount":
    "You sign with your account: anyone scanning the wall can open your profile by tapping the name. You can change it in Settings.",
  "editor.fotoAggiungi": "Add a photo",
  "editor.fotoFacoltativa": "(optional)",
  "editor.fotoPronta": "Photo ready: it will be uploaded when you post the thought.",
  "editor.rimuoviFoto": "Remove the photo",
  "editor.anteprimaFoto": "Photo preview",
  "editor.attacca": "Post it",
  "editor.attaccando": "Posting...",
  "editor.caricoFoto": "Uploading photo...",
  "editor.annulla": "Cancel",
  "editor.fileNonImmagine": "The chosen file is not an image.",
  "postit.tu": "You",
  "postit.tuo": "yours",
  "postit.tuoPensiero": "This is your thought ({nome})",
  "postit.vediProfilo": "See the author's profile",
  "postit.tradotto": "translated",
  "postit.mostraOriginale": "Show the original",
  "postit.mostraTraduzione": "Translate",
  "postit.preferitoAggiungi": "Save to favourites",
  "postit.preferitoRimuovi": "Remove from favourites",
  "postit.fotoAllegata": "Photo attached to the thought",
  "postit.canzone": "Song attached to the thought",
  "postit.ascolta": "Listen to the song",
  "editor.canzoneAggiungi": "Add a song",
  "editor.canzoneFacoltativa": "(optional)",
  "editor.canzonePlaceholder": "Search for a song",
  "editor.canzonePronta": "Song ready:",
  "editor.canzoneCambia": "Change",
  "scegli.titolo": "Search for a song",
  "scegli.placeholder": "Title or artist...",
  "scegli.cercando": "Searching...",
  "scegli.vuoto": "No results. Try another title.",
  "scegli.errore": "Search unavailable. Try again.",
  "scegli.momento": "Choose the moment (max 30 seconds)",
  "scegli.prova": "▶ Preview",
  "scegli.aggiungi": "Add the song",
  "scegli.linkUsa": "Use this link",
  "scegli.fonteTutti": "All",
  "scegli.durata": "Duration",
  "scegli.senzaPorzione": "Preview unavailable: the song plays from the beginning.",
  "scegli.spotifyNonConfigurato": "Spotify isn't configured. Add the keys or pick another source.",
  "scegli.youtubeNonConfigurato": "YouTube isn't configured. Add the API key or pick another source.",
  "scegli.parteCompleta": "Choose a part of the song (max 30 seconds)",
  "scegli.caricoPlayer": "Loading the full song...",
  "scegli.errorePlayer": "Couldn't load the player. Try again.",
  "scegli.istruzioni": "Drag the bar to choose the part (max 30 seconds)",
  "scegli.riproduci": "▶ Play the part",
  "scegli.pausa": "⏸ Pause",
  "editor.canzoneRimuovi": "Remove the song",
  "editor.canzoneNonSupportata":
    "Link not recognised.",
  "editor.erroreFoto":
    "I could not upload the photo ({msg}). Try again or remove it.",
  "popup.titolo": "Thanks for your first thought",
  "popup.testo":
    "Your note is on the wall. Save Muri Parlanti to your phone's Home screen: it opens full screen and you can get straight back to your walls, with nothing to install.",
  "popup.ok": "Got it",
  "comune.chiudi": "Close",

  "nav.menuPrincipale": "Main menu",

  "accesso.accedi": "Log in",
  "accesso.registrati": "Sign up",
  "accesso.phUsername": "Username (3-20: a-z, 0-9, _)",
  "accesso.phEmailRecupero": "Recovery email",
  "accesso.phIdentificativo": "Username or email",
  "accesso.phIdentRecupero": "Username or recovery email",
  "accesso.phPassword": "Password (min 6 characters)",
  "accesso.attendi": "Please wait…",
  "accesso.creaAccount": "Create your account",
  "accesso.inviaRecupero": "Send the recovery link",
  "accesso.passwordDimenticata": "Forgot your password?",
  "accesso.tornaAccesso": "← Back to log in",
  "accesso.notaUsername":
    "Your username is the name you log in with. The email is only used to recover your password if you forget it.",
  "accesso.accountCreato": "Account created. Welcome back!",
  "accesso.controllaEmail": "Check your recovery email.",

  "muri.titolo": "Your walls",
  "muri.vuotoOspite":
    "Scan the QR code of the first wall you come across: you'll save it here and can come back to read it whenever you like.",
  "muri.vuotoAccount":
    "You don't have any walls yet. Scan the QR code of the first wall you come across: it will stay in your account.",
  "muri.scansionaPrimo": "Scan your first wall",
  "muri.aggiungi": "＋ Add wall",
  "muri.neiTuoi": "✓ In your walls",
  "muri.salva": "☆ Save to your walls",

  "comune.tornaHome": "Back to home",
  "comune.tornaHomeFreccia": "← Back to home",
  "comune.homeFreccia": "← Home",
  "comune.punti": "points",
  "comune.carico": "Loading…",
  "comune.attendi": "Please wait…",
  "comune.salvo": "Saving…",
  "comune.rimozioneFallita": "Removal failed. Please try again.",

  "crediti.ideaBy": "Idea by",
  "crediti.instagram": "Creator's Instagram profile",

  "progresso.piuPunti": "+{n} points",
  "progresso.livelloSbloccato": "🎉 Level {n} unlocked!",

  "livello.1": "Newcomer",
  "livello.2": "Explorer",
  "livello.3": "Wanderer",
  "livello.4": "Traveler",
  "livello.5": "Chronicler",
  "livello.6": "Storyteller",
  "livello.7": "Legend of the walls",

  "profilo.noAccountTitolo": "Your profile",
  "profilo.noAccountTesto":
    "With an account you save the walls you visit and your favorite notes, and you earn points: every level you reach gives you a bonus.",
  "profilo.ciao": "Hi, {nome} 👋",
  "profilo.tu": "You",
  "profilo.esci": "Log out",
  "profilo.punti": "{xp} points",
  "profilo.alProssimo": "{n} points to level {lv}",
  "profilo.maxLivello": "Maximum level reached!",
  "profilo.muriEsplorati": "walls explored",
  "profilo.pensieriLasciati": "thoughts left",
  "profilo.preferiti": "favorites",
  "profilo.caricaFoto": "��� Upload a wall photo",
  "profilo.ilMioProfilo": "👁️ My profile",
  "profilo.impostazioni": "⚙️ Settings",
  "profilo.ricompense": "Level rewards",
  "profilo.preferitiTitolo": "Favorite notes",
  "profilo.preferitiVuoto":
    "No favorites yet: tap the heart 🤍 on a note to save it here.",
  "profilo.rimuoviPreferito": "Remove from favorites",
  "profilo.guadagnaPunti":
    "Visit more walls to earn points and level up.",
  "profilo.fotoAlt": "Profile photo of {nome}",

  "ritaglia.titolo": "Frame the photo",
  "ritaglia.testo":
    "Drag the image and adjust the zoom: whatever is inside the circle becomes your profile photo.",
  "ritaglia.noSupporto":
    "The browser doesn't support cropping. Try another photo.",
  "ritaglia.fallito": "Cropping failed. Please try again.",
  "ritaglia.alt": "Photo to crop",
  "ritaglia.carico": "Loading the image…",
  "ritaglia.riduciZoom": "Zoom out",
  "ritaglia.zoomImmagine": "Image zoom",
  "ritaglia.aumentaZoom": "Zoom in",
  "ritaglia.annulla": "✕ Cancel",
  "ritaglia.usa": "✓ Use this photo",

  "scan.errPermesso":
    "Camera permission denied. Open the site in Chrome, tap the padlock icon next to the address and allow the camera, then try again. Alternatively use \"Take a photo of the QR\".",
  "scan.errNessunaCam":
    "No camera found on this device. Use \"Take a photo of the QR\".",
  "scan.errInUso":
    "The camera is already in use by another app. Close it and try again.",
  "scan.errNoModalita":
    "This device's camera doesn't support the requested mode.",
  "scan.errSicura": "The camera requires a secure connection (https).",
  "scan.errAvvio": "I couldn't start the camera.",
  "scan.errNoEspone":
    "This device doesn't expose the camera to the browser.",
  "scan.errNoVideo": "Video element not found.",
  "scan.invito":
    "Frame the QR code affixed to the wall to save it among your walls.",
  "scan.avvia": "📷 Start the camera",
  "scan.avvio": "Starting the camera… (allow access if prompted)",
  "scan.inquadra": "Frame the wall's QR code.",
  "scan.ferma": "Stop the camera",
  "scan.riprova": "Try again",
  "scan.browserIntegrato":
    "You're using the built-in browser of {nome}: it sometimes blocks the camera. Open the link in Chrome or use Take a photo of the QR below.",
  "scan.scatta": "📸 Take a photo of the QR",
  "scan.scegliFoto": "🖼️ Or choose a photo of the QR code",
  "scan.noQrFoto":
    "No QR recognized in the photo. Try again with a closer, straight photo of the QR code.",
  "scan.erroreSconosciuto": "Unknown error.",
  "scan.fotoNonLeggibile": "Photo not readable.",
  "scan.testoNonRiconosciuto":
    "I don't recognize this text. Paste a /muro/… link or a slug like piazza-del-mercato.",
  "scan.muroSalvato": "Wall saved among your walls.",
  "scan.vaiMuro": "Go to the wall",
  "scan.scansionaAltro": "Scan another wall",
  "scan.manualeLabel": "No camera? Paste the wall's slug or link:",
  "scan.manualePh": "e.g. piazza-del-mercato",
  "scan.salva": "Save",

  "scansiona.titolo": "Scan a wall",

  "mieiMuriPag.testo":
    "The walls you've come across: tap one to read its thoughts again.",

  "preferitiPag.titolo": "Saved notes",
  "preferitiPag.testo":
    "The thoughts you saved with the heart, from the walls you visited.",
  "preferitiPag.serveAccount": "An account is required",
  "preferitiPag.serveAccountTesto":
    "Saved notes stay in your account: you'll find them on every device after logging in.",
  "preferitiPag.accedi": "Log in or create an account",
  "preferitiPag.errCarico":
    "I couldn't load your saved notes.",
  "preferitiPag.errRimuovi": "Removal failed, please try again.",
  "preferitiPag.vuoto":
    "No saved notes yet. Tap the heart 🤍 on a thought to keep it here.",
  "preferitiPag.rimuoviSalvati": "Remove from saved",

  "impost.apro": "Opening settings…",
  "impost.titolo": "Settings",
  "impost.noAccountTesto":
    "Log in to manage your profile photo, bio and the privacy of your thoughts.",
  "impost.fotoProfilo": "Profile photo",
  "impost.cambiaFoto": "🔄 Change photo",
  "impost.aggiungiFoto": "➕ Add photo",
  "impost.rimuoviFoto": "Remove photo",
  "impost.fotoNota":
    "JPG, PNG or WebP: you can drag the image and use zoom to choose which part ends up in the circle.",
  "impost.accesso": "Login",
  "impost.accessoNota":
    "Your username is the name you log in with (together with the password). The recovery email is used if you forget your password.",
  "impost.username": "Username",
  "impost.usernamePh": "e.g. mario_rossi",
  "impost.usernameManca":
    "You haven't chosen a username yet: pick one so you can log in without typing your email.",
  "impost.salvaUsername": "Save username",
  "impost.usernameSalvato":
    "Username saved ✓. You can now log in with this name.",
  "impost.profilo": "Your profile",
  "impost.nomePost": "Name on your notes",
  "impost.bio": "Bio",
  "impost.bioPh": "Two lines about you (optional)",
  "impost.mostraPostit": "Show my notes on my public profile",
  "impost.mostraPostitNota":
    "If you turn this off, visitors to your profile won't be able to read the thoughts you've left (they stay on the wall anyway).",
  "impost.salvaModifiche": "Save changes",
  "impost.profiloSalvato": "Profile saved ✓",
  "impost.fotoAggiornata": "Profile photo updated ✓",
  "impost.fotoRimossa": "Photo removed ✓",
  "impost.vediProfilo": "👁️ View my public profile",
  "impost.mieiPostit": "My notes",
  "impost.nessunPostit":
    "You haven't left any thoughts yet: find a QR code on a wall and write your first.",

  "foto.titolo": "Upload wall photo",
  "foto.noAccount": "You must log in to upload a wall photo.",
  "foto.testo": "The photo will be shown to anyone who scans that wall's QR code.",
  "foto.errSlug":
    "Invalid slug: use only lowercase letters and hyphens (e.g. parco-cerillo).",
  "foto.errScegli": "Choose a photo of the wall.",
  "foto.errCarico": "Upload failed, please try again.",
  "foto.fatto": "Photo uploaded: the wall now has its image.",
  "foto.vaiMuro": "Go to the wall",
  "foto.altra": "Upload another photo",
  "foto.slugLabel": "Wall slug (e.g. parco-cerillo)",
  "foto.slugPh": "e.g. parco-cerillo",
  "foto.fotoLabel": "Wall photo",
  "foto.caricamento": "Uploading…",
  "foto.carica": "📷 Upload photo",

  "apri.titolo": "Open a wall",
  "apri.cercoPos":
    "One moment: getting your location to figure out which wall you're at…",
  "apri.cercoMuro": "Location found. Checking the wall's area…",
  "apri.trovato": "Wall found: opening {slug}…",
  "apri.errore":
    "Something went wrong. Scan the QR again and retry.",
  "apri.noGeo": "This device doesn't support geolocation.",
  "apri.fuoriZona":
    "You're not inside any wall's area. Move closer to the wall and scan the QR again.",
  "apri.noMuri":
    "There are no walls yet: ask the author to create one.",
  "apri.noCoord": "No wall has its coordinates set yet.",
  "apri.noVicino": "No wall close enough. Here are the ones nearest to you:",
  "apri.posNegata":
    "Location unavailable. Allow location access and scan the QR again.",
  "apri.home": "← Home",

  "reimposta.titolo": "New password",
  "reimposta.errCorta": "The password must be at least 6 characters.",
  "reimposta.errDiversa": "The two passwords don't match.",
  "reimposta.errFallito":
    "Failed. The link may have expired: request a new one.",
  "reimposta.fatto": "Password updated. Taking you home…",
  "reimposta.verifico": "Verifying the link…",
  "reimposta.linkNonValido":
    "The recovery link is invalid or has expired. Go back to login and request a new recovery email using «Forgot your password?».",
  "reimposta.phPassword": "New password (min 6 characters)",
  "reimposta.phRipeti": "Repeat the new password",
  "reimposta.salva": "Save the new password",

  "admin.pannello": "Walls panel",
  "admin.noAccesso":
    "You must log in with the administrator account to manage the walls.",
  "admin.noAdmin":
    "This account is not an administrator: it cannot create or manage walls.",
  "admin.testo":
    "Only you can found a wall and generate its QR. Everyone else can only read and leave thoughts.",
  "admin.fonda": "Found a wall",
  "admin.nomeLuogo": "Place name",
  "admin.nomePh": "e.g. Parco Cerillo",
  "admin.latPh": "e.g. 40.8518",
  "admin.lngPh": "e.g. 14.2681",
  "admin.usaPos": "📍 Use my location",
  "admin.lat": "Latitude",
  "admin.lng": "Longitude",
  "admin.raggio": "Recognition radius (meters)",
  "admin.fotoLabel": "Wall photo (optional)",
  "admin.salvataggio": "Saving…",
  "admin.fondaBtn": "Found the wall",
  "admin.muri": "Walls ({n})",
  "admin.caricoMuri": "Loading walls…",
  "admin.nessunMuro": "No walls yet.",
  "admin.senzaCoord": "no coordinates",
  "admin.raggioM": "radius {m} m",
  "admin.apri": "Open",
  "admin.svuota": "Empty notes",
  "admin.cancella": "Delete",
  "admin.errNome":
    "Invalid name: use letters and spaces (e.g. Parco Cerillo).",
  "admin.errCoord":
    "Enter both latitude and longitude, or neither.",
  "admin.salvato": "Wall \"{nome}\" saved.",
  "admin.errSalvataggio": "Save failed.",
  "admin.confCancella": "Delete the wall \"{nome}\"?",
  "admin.confSvuota":
    "Empty ALL the notes on the wall \"{nome}\"? This cannot be undone.",
  "admin.svuotati": "Notes of {nome} emptied.",
  "admin.noGeo":
    "Geolocation is not available on this device.",
  "admin.cercoPos": "Getting your location…",
  "admin.posNonRilevata": "Location not detected: enter it manually.",
  "admin.zona": "Wall access area",
  "admin.zonaAiuto":
    "Tap the map to draw the perimeter of the area: at least 3 points. Only people inside this area can open the wall by scanning the QR.",
  "admin.zonaVaiPos": "📍 Go to my location",
  "admin.zonaIndietro": "Undo last point",
  "admin.zonaPulisci": "Clear",
  "admin.zonaPunti": "{n} points",
  "admin.senzaZona": "no area (default radius)",
  "admin.errZona": "Draw at least 3 points on the map to define the area.",

  "qr.muroDi": "Wall of {nome}",
  "qr.inquadra": "Frame the code to leave a thought on this wall.",
  "qr.alt": "QR Code of the wall of {nome}",
  "qr.stampaNota":
    "To print: use the button above or Cmd/Ctrl+P. The QR points to the public wall, so it works even after site updates.",
  "qr.stampa": "🖨️ Print",

  "errore.titolo": "Muri Parlanti",
  "errore.muroTesto":
    "I couldn't reach the wall right now. The database may not be configured: try again shortly.",

  "profiloPub.pensieroUno": "1 thought left",
  "profiloPub.pensieri": "{n} thoughts left",
  "profiloPub.nascosto":
    "This profile has chosen not to show its notes.",
  "profiloPub.vuoto": "No thoughts left by this author yet.",
  "profiloPub.bio": "Bio",
  "profiloPub.fotoAlt": "Profile photo of {nome}",
};

const ES: Parole = {
  "nav.menu": "Menú",
  "nav.chiudi": "Cerrar el menú",
  "nav.apri": "Abrir el menú",
  "nav.home": "Inicio",
  "nav.tuoProfilo": "Tu perfil",
  "nav.mieiMuri": "Tus muros",
  "nav.salvati": "Notas guardadas",
  "nav.scansiona": "Escanear QR",
  "nav.impostazioni": "Ajustes",
  "nav.admin": "Panel de administración",
  "nav.esci": "Cerrar sesión",
  "nav.creaAccount": "Crear cuenta gratis",
  "nav.ospite": "Invitado",
  "nav.ospiteDescr":
    "Crea una cuenta gratis para tu perfil, las notas guardadas y los niveles.",
  "nav.toccaProfilo": "Toca para abrir el perfil",
  "lingua.titolo": "Idioma",
  "lingua.scegli": "Elige el idioma de la interfaz",
  "lingua.traduci": "Traducir las notas públicas",
  "lingua.traduciDescr":
    "Traduce los pensamientos de otras personas al idioma elegido. Tus notas permanecen como las escribiste.",
  "home.desc":
    "Los muros de la ciudad cuentan historias. Escanea el QR de un muro para descubrirlo y deja tu pensamiento, también en anónimo. Crea una cuenta gratis para ver los pensamientos de otras personas, abrir los perfiles de los autores y guardar tus favoritos.",
  "home.footer": "Un pensamiento anónimo para cada muro. Sé amable.",
  "pwa.titolo": "En el móvil, como una app",
  "pwa.testo":
    "Muri Parlanti está optimizada para funcionar directamente desde el móvil: guárdala en la pantalla de inicio y se abre a pantalla completa, con acceso rápido, sin instalaciones tradicionales ni tienda de aplicaciones.",
  "pwa.installa": "Guardar en inicio",
  "pwa.installaFatto": "App añadida al inicio",
  "pwa.ios":
    "En iPhone/iPad: toca Compartir y luego «Añadir a pantalla de inicio».",
  "pwa.altro":
    "En el menú del navegador elige «Instalar aplicación» o «Añadir a pantalla de inicio».",
  "pwa.giaInstallata": "Ya estás usando la versión guardada en la pantalla de inicio.",
  "muro.pensieroUno": "1 pensamiento dejado",
  "muro.pensieri": "{n} pensamientos dejados",
  "muro.vuoto": "Todavía no hay pensamientos. Sé el primero.",
  "muro.lascia": "Deja un pensamiento",
  "muro.invitoTitolo": "Este muro está vivo",
  "muro.invitoTesto":
    "Crea una cuenta gratis para guardar los muros que visitas, conservar tus notas favoritas y subir de nivel. También puedes dejar tu pensamiento sin cuenta.",
  "muro.invitoCta": "Crear cuenta gratis",
  "muro.chiudiInvito": "Cerrar invitación",
  "muro.fotoMuro": "Foto del muro de {nome}",
  "editor.titolo": "Tu pensamiento",
  "editor.placeholder": "Escribe tu pensamiento para este muro...",
  "editor.firma": "Nombre con el que firmas el pensamiento",
  "editor.nome": "Tu nombre (opcional)",
  "editor.firmaAccount":
    "Firmas con tu cuenta: quien escanee el muro podrá abrir tu perfil tocando el nombre. Puedes cambiarlo en Ajustes.",
  "editor.fotoAggiungi": "Añadir una foto",
  "editor.fotoFacoltativa": "(opcional)",
  "editor.fotoPronta": "Foto lista: se subirá cuando publiques el pensamiento.",
  "editor.rimuoviFoto": "Quitar la foto",
  "editor.anteprimaFoto": "Vista previa de la foto",
  "editor.attacca": "Publicar",
  "editor.attaccando": "Publicando...",
  "editor.caricoFoto": "Subiendo foto...",
  "editor.annulla": "Cancelar",
  "editor.fileNonImmagine": "El archivo elegido no es una imagen.",
  "postit.tu": "Tú",
  "postit.tuo": "tuyo",
  "postit.tuoPensiero": "Es tu pensamiento ({nome})",
  "postit.vediProfilo": "Ver el perfil del autor",
  "postit.tradotto": "traducido",
  "postit.mostraOriginale": "Ver el original",
  "postit.mostraTraduzione": "Traducir",
  "postit.preferitoAggiungi": "Guardar en favoritos",
  "postit.preferitoRimuovi": "Quitar de favoritos",
  "postit.fotoAllegata": "Foto adjunta al pensamiento",
  "postit.canzone": "Canción adjunta al pensamiento",
  "postit.ascolta": "Escuchar la canción",
  "editor.canzoneAggiungi": "Añadir una canción",
  "editor.canzoneFacoltativa": "(opcional)",
  "editor.canzonePlaceholder": "Buscar una canción",
  "editor.canzonePronta": "Canción lista:",
  "editor.canzoneCambia": "Cambiar",
  "scegli.titolo": "Buscar una canción",
  "scegli.placeholder": "Título o artista...",
  "scegli.cercando": "Buscando...",
  "scegli.vuoto": "Sin resultados. Prueba con otro título.",
  "scegli.errore": "Búsqueda no disponible. Inténtalo de nuevo.",
  "scegli.momento": "Elige el momento (máx. 30 segundos)",
  "scegli.prova": "▶ Probar",
  "scegli.aggiungi": "Añadir la canción",
  "scegli.linkUsa": "Usar este enlace",
  "scegli.fonteTutti": "Todos",
  "scegli.durata": "Duración",
  "scegli.senzaPorzione": "Vista previa no disponible: la canción empieza desde el principio.",
  "scegli.spotifyNonConfigurato": "Spotify no está configurado. Añade las claves o elige otra fuente.",
  "scegli.youtubeNonConfigurato": "YouTube no está configurado. Añade la clave API o elige otra fuente.",
  "scegli.parteCompleta": "Elige una parte de la canción (máx. 30 segundos)",
  "scegli.caricoPlayer": "Cargando la canción completa...",
  "scegli.errorePlayer": "No se pudo cargar el reproductor. Inténtalo de nuevo.",
  "scegli.istruzioni": "Arrastra la barra para elegir la parte (máx. 30 segundos)",
  "scegli.riproduci": "▶ Escuchar la parte",
  "scegli.pausa": "⏸ Pausa",
  "editor.canzoneRimuovi": "Quitar la canción",
  "editor.canzoneNonSupportata":
    "Enlace no reconocido.",
  "editor.erroreFoto":
    "No he podido subir la foto ({msg}). Inténtalo de nuevo o quítala.",
  "popup.titolo": "Gracias por tu primer pensamiento",
  "popup.testo":
    "Tu nota está en el muro. Guarda Muri Parlanti en la pantalla de inicio del móvil: se abre a pantalla completa y vuelves enseguida a tus muros, sin instalar nada.",
  "popup.ok": "De acuerdo",
  "comune.chiudi": "Cerrar",

  "nav.menuPrincipale": "Menú principal",

  "accesso.accedi": "Iniciar sesión",
  "accesso.registrati": "Registrarse",
  "accesso.phUsername": "Usuario (3-20: a-z, 0-9, _)",
  "accesso.phEmailRecupero": "Email de recuperación",
  "accesso.phIdentificativo": "Usuario o email",
  "accesso.phIdentRecupero": "Usuario o email de recuperación",
  "accesso.phPassword": "Contraseña (mín. 6 caracteres)",
  "accesso.attendi": "Espera…",
  "accesso.creaAccount": "Crea tu cuenta",
  "accesso.inviaRecupero": "Enviar el enlace de recuperación",
  "accesso.passwordDimenticata": "¿Olvidaste la contraseña?",
  "accesso.tornaAccesso": "← Volver al inicio de sesión",
  "accesso.notaUsername":
    "El usuario es el nombre con el que inicias sesión. El email solo sirve para recuperar la contraseña si la olvidas.",
  "accesso.accountCreato": "Cuenta creada. ¡Bienvenido de nuevo!",
  "accesso.controllaEmail": "Revisa tu email de recuperación.",

  "muri.titolo": "Tus muros",
  "muri.vuotoOspite":
    "Escanea el QR del primer muro que encuentres: lo guardarás aquí y podrás volver a leerlo cuando quieras.",
  "muri.vuotoAccount":
    "Todavía no tienes ningún muro. Escanea el QR del primer muro que encuentres: se quedará en tu cuenta.",
  "muri.scansionaPrimo": "Escanea tu primer muro",
  "muri.aggiungi": "＋ Añadir muro",
  "muri.neiTuoi": "✓ En tus muros",
  "muri.salva": "☆ Guardar en tus muros",

  "comune.tornaHome": "Volver al inicio",
  "comune.tornaHomeFreccia": "← Volver al inicio",
  "comune.homeFreccia": "← Inicio",
  "comune.punti": "puntos",
  "comune.carico": "Cargando…",
  "comune.attendi": "Espera…",
  "comune.salvo": "Guardando…",
  "comune.rimozioneFallita": "No se pudo eliminar. Inténtalo de nuevo.",

  "crediti.ideaBy": "Idea de",
  "crediti.instagram": "Perfil de Instagram del creador",

  "progresso.piuPunti": "+{n} puntos",
  "progresso.livelloSbloccato": "🎉 ¡Nivel {n} desbloqueado!",

  "livello.1": "Novato",
  "livello.2": "Explorador",
  "livello.3": "Vagabundo",
  "livello.4": "Viajero",
  "livello.5": "Cronista",
  "livello.6": "Narrador",
  "livello.7": "Leyenda de los muros",

  "profilo.noAccountTitolo": "Tu perfil",
  "profilo.noAccountTesto":
    "Con una cuenta guardas los muros que visitas y los post-it favoritos, y ganas puntos: cada nivel que alcanzas te da un bonus.",
  "profilo.ciao": "Hola, {nome} 👋",
  "profilo.tu": "Tú",
  "profilo.esci": "Salir",
  "profilo.punti": "{xp} puntos",
  "profilo.alProssimo": "{n} puntos para el nivel {lv}",
  "profilo.maxLivello": "¡Nivel máximo alcanzado!",
  "profilo.muriEsplorati": "muros explorados",
  "profilo.pensieriLasciati": "pensamientos dejados",
  "profilo.preferiti": "favoritos",
  "profilo.caricaFoto": "📷 Sube la foto de un muro",
  "profilo.ilMioProfilo": "👁️ Mi perfil",
  "profilo.impostazioni": "⚙️ Ajustes",
  "profilo.ricompense": "Recompensas de nivel",
  "profilo.preferitiTitolo": "Post-it favoritos",
  "profilo.preferitiVuoto":
    "Ningún favorito: toca el corazón 🤍 en un post-it para guardarlo aquí.",
  "profilo.rimuoviPreferito": "Quitar de favoritos",
  "profilo.guadagnaPunti":
    "Visita más muros para ganar puntos y subir de nivel.",
  "profilo.fotoAlt": "Foto de perfil de {nome}",

  "ritaglia.titolo": "Encuadra la foto",
  "ritaglia.testo":
    "Arrastra la imagen y ajusta el zoom: en el círculo va la parte que quieras como foto de perfil.",
  "ritaglia.noSupporto":
    "El navegador no admite el recorte. Prueba con otra foto.",
  "ritaglia.fallito": "No se pudo recortar. Inténtalo de nuevo.",
  "ritaglia.alt": "Foto para recortar",
  "ritaglia.carico": "Cargando la imagen…",
  "ritaglia.riduciZoom": "Reducir zoom",
  "ritaglia.zoomImmagine": "Zoom de la imagen",
  "ritaglia.aumentaZoom": "Aumentar zoom",
  "ritaglia.annulla": "✕ Cancelar",
  "ritaglia.usa": "✓ Usar esta foto",

  "scan.errPermesso":
    "Permiso de cámara denegado. Abre el sitio en Chrome, toca el icono del candado junto a la dirección y permite la cámara, luego vuelve a intentarlo. También puedes usar \"Hacer una foto del QR\".",
  "scan.errNessunaCam":
    "No se encontró ninguna cámara en este dispositivo. Usa \"Hacer una foto del QR\".",
  "scan.errInUso":
    "La cámara ya está en uso por otra app. Ciérrala y vuelve a intentarlo.",
  "scan.errNoModalita":
    "La cámara de este dispositivo no admite el modo solicitado.",
  "scan.errSicura": "La cámara requiere una conexión segura (https).",
  "scan.errAvvio": "No pude iniciar la cámara.",
  "scan.errNoEspone":
    "Este dispositivo no expone la cámara al navegador.",
  "scan.errNoVideo": "Elemento de vídeo no encontrado.",
  "scan.invito":
    "Encuadra el código QR pegado en el muro para guardarlo entre tus muros.",
  "scan.avvia": "📷 Iniciar la cámara",
  "scan.avvio": "Iniciando la cámara… (permite el acceso si se solicita)",
  "scan.inquadra": "Encuadra el código QR del muro.",
  "scan.ferma": "Detener la cámara",
  "scan.riprova": "Reintentar",
  "scan.browserIntegrato":
    "Estás usando el navegador integrado de {nome}: a veces bloquea la cámara. Abre el enlace en Chrome o usa Hacer una foto del QR aquí abajo.",
  "scan.scatta": "📸 Hacer una foto del QR",
  "scan.scegliFoto": "🖼️ O bien elige una foto del código QR",
  "scan.noQrFoto":
    "No se reconoció ningún QR en la foto. Vuelve a intentarlo con una foto más cercana y recta del código QR.",
  "scan.erroreSconosciuto": "Error desconocido.",
  "scan.fotoNonLeggibile": "Foto no legible.",
  "scan.testoNonRiconosciuto":
    "No reconozco este texto. Pega un enlace /muro/… o un slug como piazza-del-mercato.",
  "scan.muroSalvato": "Muro guardado entre tus muros.",
  "scan.vaiMuro": "Ir al muro",
  "scan.scansionaAltro": "Escanear otro muro",
  "scan.manualeLabel": "¿Sin cámara? Pega el slug o el enlace del muro:",
  "scan.manualePh": "ej. piazza-del-mercato",
  "scan.salva": "Guardar",

  "scansiona.titolo": "Escanea un muro",

  "mieiMuriPag.testo":
    "Los muros que has encontrado: toca uno para releer sus pensamientos.",

  "preferitiPag.titolo": "Post-it guardados",
  "preferitiPag.testo":
    "Los pensamientos que guardaste con el corazón, de los muros que visitaste.",
  "preferitiPag.serveAccount": "Se necesita una cuenta",
  "preferitiPag.serveAccountTesto":
    "Los post-it guardados se quedan en tu cuenta: los encuentras en cada dispositivo tras iniciar sesión.",
  "preferitiPag.accedi": "Inicia sesión o crea una cuenta",
  "preferitiPag.errCarico":
    "No pude cargar tus post-it guardados.",
  "preferitiPag.errRimuovi": "No se pudo eliminar, inténtalo de nuevo.",
  "preferitiPag.vuoto":
    "Aún no hay post-it guardados. Toca el corazón 🤍 en un pensamiento para conservarlo aquí.",
  "preferitiPag.rimuoviSalvati": "Quitar de guardados",

  "impost.apro": "Abriendo los ajustes…",
  "impost.titolo": "Ajustes",
  "impost.noAccountTesto":
    "Inicia sesión para gestionar la foto de perfil, la biografía y la privacidad de tus pensamientos.",
  "impost.fotoProfilo": "Foto de perfil",
  "impost.cambiaFoto": "🔄 Cambiar foto",
  "impost.aggiungiFoto": "➕ Añadir foto",
  "impost.rimuoviFoto": "Quitar foto",
  "impost.fotoNota":
    "JPG, PNG o WebP: podrás arrastrar la imagen y elegir con el zoom qué parte queda en el círculo.",
  "impost.accesso": "Inicio de sesión",
  "impost.accessoNota":
    "El usuario es el nombre con el que inicias sesión (junto con la contraseña). El email de recuperación sirve si olvidas la contraseña.",
  "impost.username": "Usuario",
  "impost.usernamePh": "ej. mario_rossi",
  "impost.usernameManca":
    "Todavía no has elegido un usuario: elige uno para iniciar sesión sin escribir el email.",
  "impost.salvaUsername": "Guardar usuario",
  "impost.usernameSalvato":
    "Usuario guardado ✓. Ahora puedes iniciar sesión con este nombre.",
  "impost.profilo": "Tu perfil",
  "impost.nomePost": "Nombre en tus post-it",
  "impost.bio": "Biografía",
  "impost.bioPh": "Dos líneas sobre ti (opcional)",
  "impost.mostraPostit": "Mostrar mis post-it en el perfil público",
  "impost.mostraPostitNota":
    "Si lo desactivas, quienes visiten tu perfil no podrán leer los pensamientos que has dejado (de todos modos permanecen en el muro).",
  "impost.salvaModifiche": "Guardar cambios",
  "impost.profiloSalvato": "Perfil guardado ✓",
  "impost.fotoAggiornata": "Foto de perfil actualizada ✓",
  "impost.fotoRimossa": "Foto eliminada ✓",
  "impost.vediProfilo": "👁️ Ver mi perfil público",
  "impost.mieiPostit": "Mis post-it",
  "impost.nessunPostit":
    "Aún no has dejado pensamientos: encuentra un código QR en un muro y escribe el primero.",

  "foto.titolo": "Subir foto del muro",
  "foto.noAccount": "Debes iniciar sesión para subir la foto de un muro.",
  "foto.testo": "La foto se mostrará a quien escanee el QR de ese muro.",
  "foto.errSlug":
    "Slug no válido: usa solo letras minúsculas y guiones (ej. parco-cerillo).",
  "foto.errScegli": "Elige una foto del muro.",
  "foto.errCarico": "No se pudo subir, inténtalo de nuevo.",
  "foto.fatto": "Foto subida: ahora el muro tiene su imagen.",
  "foto.vaiMuro": "Ir al muro",
  "foto.altra": "Subir otra foto",
  "foto.slugLabel": "Slug del muro (ej. parco-cerillo)",
  "foto.slugPh": "ej. parco-cerillo",
  "foto.fotoLabel": "Foto del muro",
  "foto.caricamento": "Subiendo…",
  "foto.carica": "📷 Subir foto",

  "apri.titolo": "Abrir un muro",
  "apri.cercoPos":
    "Un momento: busco tu ubicación para saber en qué muro estás…",
  "apri.cercoMuro": "Ubicación encontrada. Verifico la zona del muro…",
  "apri.trovato": "Muro encontrado: abriendo {slug}…",
  "apri.errore":
    "Algo salió mal. Vuelve a escanear el QR e inténtalo de nuevo.",
  "apri.noGeo": "Este dispositivo no admite la geolocalización.",
  "apri.fuoriZona":
    "No estás en la zona de ningún muro. Acércate al muro y vuelve a escanear el QR.",
  "apri.noMuri":
    "Todavía no hay muros: pide al autor que cree uno.",
  "apri.noCoord": "Ningún muro tiene aún las coordenadas configuradas.",
  "apri.noVicino": "Ningún muro lo suficientemente cerca. Aquí están los más cercanos a ti:",
  "apri.posNegata":
    "Ubicación no disponible. Permite el acceso a la ubicación y vuelve a escanear el QR.",
  "apri.home": "← Inicio",

  "reimposta.titolo": "Nueva contraseña",
  "reimposta.errCorta": "La contraseña debe tener al menos 6 caracteres.",
  "reimposta.errDiversa": "Las dos contraseñas no coinciden.",
  "reimposta.errFallito":
    "No se pudo. El enlace puede haber caducado: solicita uno nuevo.",
  "reimposta.fatto": "Contraseña actualizada. Te llevamos al inicio…",
  "reimposta.verifico": "Verificando el enlace…",
  "reimposta.linkNonValido":
    "El enlace de recuperación no es válido o ha caducado. Vuelve al inicio de sesión y solicita un nuevo email de recuperación con «¿Olvidaste la contraseña?».",
  "reimposta.phPassword": "Nueva contraseña (mín. 6 caracteres)",
  "reimposta.phRipeti": "Repite la nueva contraseña",
  "reimposta.salva": "Guardar la nueva contraseña",

  "admin.pannello": "Panel de muros",
  "admin.noAccesso":
    "Debes iniciar sesión con la cuenta de administrador para gestionar los muros.",
  "admin.noAdmin":
    "Esta cuenta no es administradora: no puede crear ni gestionar muros.",
  "admin.testo":
    "Solo tú puedes fundar un muro y generar su QR. Todos los demás solo pueden leer y dejar pensamientos.",
  "admin.fonda": "Fundar un muro",
  "admin.nomeLuogo": "Nombre del lugar",
  "admin.nomePh": "ej. Parco Cerillo",
  "admin.latPh": "ej. 40.8518",
  "admin.lngPh": "ej. 14.2681",
  "admin.usaPos": "📍 Usar mi ubicación",
  "admin.lat": "Latitud",
  "admin.lng": "Longitud",
  "admin.raggio": "Radio de reconocimiento (metros)",
  "admin.fotoLabel": "Foto del muro (opcional)",
  "admin.salvataggio": "Guardando…",
  "admin.fondaBtn": "Fundar el muro",
  "admin.muri": "Los muros ({n})",
  "admin.caricoMuri": "Cargando los muros…",
  "admin.nessunMuro": "Ningún muro todavía.",
  "admin.senzaCoord": "sin coordenadas",
  "admin.raggioM": "radio {m} m",
  "admin.apri": "Abrir",
  "admin.svuota": "Vaciar post-it",
  "admin.cancella": "Eliminar",
  "admin.errNome":
    "Nombre no válido: usa letras y espacios (ej. Parco Cerillo).",
  "admin.errCoord":
    "Introduce latitud y longitud, o ninguna.",
  "admin.salvato": "Muro \"{nome}\" guardado.",
  "admin.errSalvataggio": "No se pudo guardar.",
  "admin.confCancella": "¿Eliminar el muro \"{nome}\"?",
  "admin.confSvuota":
    "¿Vaciar TODOS los post-it del muro \"{nome}\"? La operación no es reversible.",
  "admin.svuotati": "Post-it de {nome} vaciados.",
  "admin.noGeo":
    "La geolocalización no está disponible en este dispositivo.",
  "admin.cercoPos": "Buscando tu ubicación…",
  "admin.posNonRilevata": "Ubicación no detectada: introdúcela a mano.",
  "admin.zona": "Zona de acceso del muro",
  "admin.zonaAiuto":
    "Toca el mapa para dibujar el perímetro de la zona: al menos 3 puntos. Solo quien esté dentro de esta zona podrá abrir el muro escaneando el QR.",
  "admin.zonaVaiPos": "📍 Ir a mi ubicación",
  "admin.zonaIndietro": "Deshacer último punto",
  "admin.zonaPulisci": "Limpiar",
  "admin.zonaPunti": "{n} puntos",
  "admin.senzaZona": "sin zona (radio predeterminado)",
  "admin.errZona": "Dibuja al menos 3 puntos en el mapa para definir la zona.",

  "qr.muroDi": "Muro de {nome}",
  "qr.inquadra": "Encuadra el código para dejar un pensamiento en este muro.",
  "qr.alt": "Código QR del muro de {nome}",
  "qr.stampaNota":
    "Para imprimir: usa el botón de arriba o Cmd/Ctrl+P. El QR apunta al muro público, así que funciona también tras las actualizaciones del sitio.",
  "qr.stampa": "🖨️ Imprimir",

  "errore.titolo": "Muri Parlanti",
  "errore.muroTesto":
    "No pude alcanzar el muro en este momento. Puede que la base de datos no esté configurada: vuelve a intentarlo en un rato.",

  "profiloPub.pensieroUno": "1 pensamiento dejado",
  "profiloPub.pensieri": "{n} pensamientos dejados",
  "profiloPub.nascosto":
    "Este perfil ha elegido no mostrar sus post-it.",
  "profiloPub.vuoto": "Ningún pensamiento dejado todavía por este autor.",
  "profiloPub.bio": "Bio",
  "profiloPub.fotoAlt": "Foto de perfil de {nome}",
};

const FR: Parole = {
  "nav.menu": "Menu",
  "nav.chiudi": "Fermer le menu",
  "nav.apri": "Ouvrir le menu",
  "nav.home": "Accueil",
  "nav.tuoProfilo": "Votre profil",
  "nav.mieiMuri": "Vos murs",
  "nav.salvati": "Notes enregistrées",
  "nav.scansiona": "Scanner un QR",
  "nav.impostazioni": "Réglages",
  "nav.admin": "Panneau admin",
  "nav.esci": "Se déconnecter",
  "nav.creaAccount": "Créer un compte gratuit",
  "nav.ospite": "Invité",
  "nav.ospiteDescr":
    "Créez un compte gratuit pour votre profil, vos notes enregistrées et vos niveaux.",
  "nav.toccaProfilo": "Touchez pour ouvrir le profil",
  "lingua.titolo": "Langue",
  "lingua.scegli": "Choisissez la langue de l'interface",
  "lingua.traduci": "Traduire les notes publiques",
  "lingua.traduciDescr":
    "Traduit les pensées des autres dans la langue choisie. Vos notes restent telles que vous les avez écrites.",
  "home.desc":
    "Les murs de la ville racontent des histoires. Scannez le QR d'un mur pour le découvrir et laissez votre pensée, même anonymement. Créez un compte gratuit pour lire les pensées des autres, ouvrir les profils des auteurs et enregistrer vos favoris.",
  "home.footer": "Une pensée anonyme par mur. Soyez bienveillant.",
  "pwa.titolo": "Sur le téléphone, comme une appli",
  "pwa.testo":
    "Muri Parlanti est optimisée pour fonctionner directement depuis le téléphone : enregistrez-la sur l'écran d'accueil et elle s'ouvre en plein écran, avec un accès rapide, sans installation classique ni boutique d'applications.",
  "pwa.installa": "Enregistrer sur l'accueil",
  "pwa.installaFatto": "Appli ajoutée à l'accueil",
  "pwa.ios":
    "Sur iPhone/iPad : touchez Partager puis « Sur l'écran d'accueil ».",
  "pwa.altro":
    "Dans le menu du navigateur, choisissez « Installer l'application » ou « Ajouter à l'écran d'accueil ».",
  "pwa.giaInstallata": "Vous utilisez déjà la version enregistrée sur l'écran d'accueil.",
  "muro.pensieroUno": "1 pensée laissée",
  "muro.pensieri": "{n} pensées laissées",
  "muro.vuoto": "Aucune pensée pour l'instant. Soyez le premier.",
  "muro.lascia": "Laisser une pensée",
  "muro.invitoTitolo": "Ce mur est vivant",
  "muro.invitoTesto":
    "Créez un compte gratuit pour enregistrer les murs que vous visitez, garder vos notes préférées et monter de niveau. Vous pouvez aussi laisser votre pensée sans compte.",
  "muro.invitoCta": "Créer un compte gratuit",
  "muro.chiudiInvito": "Fermer l'invitation",
  "muro.fotoMuro": "Photo du mur de {nome}",
  "editor.titolo": "Votre pensée",
  "editor.placeholder": "Écrivez votre pensée pour ce mur...",
  "editor.firma": "Nom avec lequel vous signez la pensée",
  "editor.nome": "Votre nom (facultatif)",
  "editor.firmaAccount":
    "Vous signez avec votre compte : qui scanne le mur peut ouvrir votre profil en touchant le nom. Vous pouvez le changer dans les Réglages.",
  "editor.fotoAggiungi": "Ajouter une photo",
  "editor.fotoFacoltativa": "(facultative)",
  "editor.fotoPronta": "Photo prête : elle sera envoyée quand vous publierez la pensée.",
  "editor.rimuoviFoto": "Retirer la photo",
  "editor.anteprimaFoto": "Aperçu de la photo",
  "editor.attacca": "Publier",
  "editor.attaccando": "Publication...",
  "editor.caricoFoto": "Envoi de la photo...",
  "editor.annulla": "Annuler",
  "editor.fileNonImmagine": "Le fichier choisi n'est pas une image.",
  "postit.tu": "Vous",
  "postit.tuo": "à vous",
  "postit.tuoPensiero": "C'est votre pensée ({nome})",
  "postit.vediProfilo": "Voir le profil de l'auteur",
  "postit.tradotto": "traduit",
  "postit.mostraOriginale": "Voir l'original",
  "postit.mostraTraduzione": "Traduire",
  "postit.preferitoAggiungi": "Enregistrer dans les favoris",
  "postit.preferitoRimuovi": "Retirer des favoris",
  "postit.fotoAllegata": "Photo jointe à la pensée",
  "postit.canzone": "Chanson jointe à la pensée",
  "postit.ascolta": "Écouter la chanson",
  "editor.canzoneAggiungi": "Ajouter une chanson",
  "editor.canzoneFacoltativa": "(facultatif)",
  "editor.canzonePlaceholder": "Chercher une chanson",
  "editor.canzonePronta": "Chanson prête :",
  "editor.canzoneCambia": "Changer",
  "scegli.titolo": "Chercher une chanson",
  "scegli.placeholder": "Titre ou artiste...",
  "scegli.cercando": "Recherche...",
  "scegli.vuoto": "Aucun résultat. Essayez un autre titre.",
  "scegli.errore": "Recherche indisponible. Réessayez.",
  "scegli.momento": "Choisissez le moment (max 30 secondes)",
  "scegli.prova": "▶ Essayer",
  "scegli.aggiungi": "Ajouter la chanson",
  "scegli.linkUsa": "Utiliser ce lien",
  "scegli.fonteTutti": "Tout",
  "scegli.durata": "Durée",
  "scegli.senzaPorzione": "Aperçu indisponible : la chanson démarre depuis le début.",
  "scegli.spotifyNonConfigurato": "Spotify n'est pas configuré. Ajoutez les clés ou choisissez une autre source.",
  "scegli.youtubeNonConfigurato": "YouTube n'est pas configuré. Ajoutez la clé API ou choisissez une autre source.",
  "scegli.parteCompleta": "Choisissez une partie de la chanson (max 30 secondes)",
  "scegli.caricoPlayer": "Chargement de la chanson complète...",
  "scegli.errorePlayer": "Impossible de charger le lecteur. Réessayez.",
  "scegli.istruzioni": "Fais glisser la barre pour choisir la partie (max 30 secondes)",
  "scegli.riproduci": "▶ Écouter la partie",
  "scegli.pausa": "⏸ Pause",
  "editor.canzoneRimuovi": "Retirer la chanson",
  "editor.canzoneNonSupportata":
    "Lien non reconnu.",
  "editor.erroreFoto":
    "Je n'ai pas pu envoyer la photo ({msg}). Réessayez ou retirez-la.",
  "popup.titolo": "Merci pour votre première pens��e",
  "popup.testo":
    "Votre note est sur le mur. Enregistrez Muri Parlanti sur l'écran d'accueil du téléphone : elle s'ouvre en plein écran et vous retrouvez vos murs tout de suite, sans rien installer.",
  "popup.ok": "D'accord",
  "comune.chiudi": "Fermer",

  "nav.menuPrincipale": "Menu principal",

  "accesso.accedi": "Se connecter",
  "accesso.registrati": "S'inscrire",
  "accesso.phUsername": "Nom d'utilisateur (3-20 : a-z, 0-9, _)",
  "accesso.phEmailRecupero": "Email de récupération",
  "accesso.phIdentificativo": "Nom d'utilisateur ou email",
  "accesso.phIdentRecupero": "Nom d'utilisateur ou email de récupération",
  "accesso.phPassword": "Mot de passe (min 6 caractères)",
  "accesso.attendi": "Patientez…",
  "accesso.creaAccount": "Créez votre compte",
  "accesso.inviaRecupero": "Envoyer le lien de récupération",
  "accesso.passwordDimenticata": "Mot de passe oublié ?",
  "accesso.tornaAccesso": "← Retour à la connexion",
  "accesso.notaUsername":
    "Le nom d'utilisateur est le nom avec lequel vous vous connectez. L'email sert uniquement à récupérer le mot de passe si vous l'oubliez.",
  "accesso.accountCreato": "Compte créé. Bon retour !",
  "accesso.controllaEmail": "Vérifiez votre email de récupération.",

  "muri.titolo": "Vos murs",
  "muri.vuotoOspite":
    "Scannez le QR du premier mur que vous croisez : vous le sauvegarderez ici et pourrez le relire quand vous voulez.",
  "muri.vuotoAccount":
    "Vous n'avez encore aucun mur. Scannez le QR du premier mur que vous croisez : il restera dans votre compte.",
  "muri.scansionaPrimo": "Scannez votre premier mur",
  "muri.aggiungi": "＋ Ajouter un mur",
  "muri.neiTuoi": "✓ Dans vos murs",
  "muri.salva": "☆ Enregistrer dans vos murs",

  "comune.tornaHome": "Retour à l'accueil",
  "comune.tornaHomeFreccia": "← Retour à l'accueil",
  "comune.homeFreccia": "← Accueil",
  "comune.punti": "points",
  "comune.carico": "Chargement…",
  "comune.attendi": "Patientez…",
  "comune.salvo": "Enregistrement…",
  "comune.rimozioneFallita": "Échec de la suppression. Réessayez.",

  "crediti.ideaBy": "Idée de",
  "crediti.instagram": "Profil Instagram du créateur",

  "progresso.piuPunti": "+{n} points",
  "progresso.livelloSbloccato": "🎉 Niveau {n} débloqué !",

  "livello.1": "Novice",
  "livello.2": "Explorateur",
  "livello.3": "Vagabond",
  "livello.4": "Voyageur",
  "livello.5": "Chroniqueur",
  "livello.6": "Conteur",
  "livello.7": "Légende des murs",

  "profilo.noAccountTitolo": "Votre profil",
  "profilo.noAccountTesto":
    "Avec un compte, vous sauvegardez les murs que vous visitez et vos post-it préférés, et vous gagnez des points : chaque niveau atteint vous offre un bonus.",
  "profilo.ciao": "Salut, {nome} 👋",
  "profilo.tu": "Vous",
  "profilo.esci": "Déconnexion",
  "profilo.punti": "{xp} points",
  "profilo.alProssimo": "{n} points avant le niveau {lv}",
  "profilo.maxLivello": "Niveau maximum atteint !",
  "profilo.muriEsplorati": "murs explorés",
  "profilo.pensieriLasciati": "pensées laissées",
  "profilo.preferiti": "favoris",
  "profilo.caricaFoto": "📷 Téléverser la photo d'un mur",
  "profilo.ilMioProfilo": "����️ Mon profil",
  "profilo.impostazioni": "⚙️ Paramètres",
  "profilo.ricompense": "Récompenses de niveau",
  "profilo.preferitiTitolo": "Post-it favoris",
  "profilo.preferitiVuoto":
    "Aucun favori : touchez le cœur 🤍 sur un post-it pour l'enregistrer ici.",
  "profilo.rimuoviPreferito": "Retirer des favoris",
  "profilo.guadagnaPunti":
    "Visitez d'autres murs pour gagner des points et monter de niveau.",
  "profilo.fotoAlt": "Photo de profil de {nome}",

  "ritaglia.titolo": "Cadrez la photo",
  "ritaglia.testo":
    "Faites glisser l'image et réglez le zoom : la partie dans le cercle devient votre photo de profil.",
  "ritaglia.noSupporto":
    "Le navigateur ne prend pas en charge le recadrage. Essayez une autre photo.",
  "ritaglia.fallito": "Échec du recadrage. Réessayez.",
  "ritaglia.alt": "Photo à recadrer",
  "ritaglia.carico": "Chargement de l'image…",
  "ritaglia.riduciZoom": "Réduire le zoom",
  "ritaglia.zoomImmagine": "Zoom de l'image",
  "ritaglia.aumentaZoom": "Augmenter le zoom",
  "ritaglia.annulla": "✕ Annuler",
  "ritaglia.usa": "✓ Utiliser cette photo",

  "scan.errPermesso":
    "Autorisation caméra refusée. Ouvrez le site dans Chrome, touchez l'icône du cadenas à côté de l'adresse et autorisez la caméra, puis réessayez. Sinon, utilisez « Prendre une photo du QR ».",
  "scan.errNessunaCam":
    "Aucune caméra trouvée sur cet appareil. Utilisez « Prendre une photo du QR ».",
  "scan.errInUso":
    "La caméra est déjà utilisée par une autre app. Fermez-la et réessayez.",
  "scan.errNoModalita":
    "La caméra de cet appareil ne prend pas en charge le mode demandé.",
  "scan.errSicura": "La caméra nécessite une connexion sécurisée (https).",
  "scan.errAvvio": "Je n'ai pas pu démarrer la caméra.",
  "scan.errNoEspone":
    "Cet appareil n'expose pas la caméra au navigateur.",
  "scan.errNoVideo": "Élément vidéo introuvable.",
  "scan.invito":
    "Cadrez le code QR collé sur le mur pour l'enregistrer parmi vos murs.",
  "scan.avvia": "📷 Démarrer la caméra",
  "scan.avvio": "Démarrage de la caméra… (autorisez l'accès si demandé)",
  "scan.inquadra": "Cadrez le code QR du mur.",
  "scan.ferma": "Arrêter la caméra",
  "scan.riprova": "Réessayer",
  "scan.browserIntegrato":
    "Vous utilisez le navigateur intégré de {nome} : il bloque parfois la caméra. Ouvrez le lien dans Chrome ou utilisez Prendre une photo du QR ci-dessous.",
  "scan.scatta": "📸 Prendre une photo du QR",
  "scan.scegliFoto": "🖼️ Ou choisissez une photo du code QR",
  "scan.noQrFoto":
    "Aucun QR reconnu dans la photo. Réessayez avec une photo plus proche et bien droite du code QR.",
  "scan.erroreSconosciuto": "Erreur inconnue.",
  "scan.fotoNonLeggibile": "Photo illisible.",
  "scan.testoNonRiconosciuto":
    "Je ne reconnais pas ce texte. Collez un lien /muro/… ou un slug comme piazza-del-mercato.",
  "scan.muroSalvato": "Mur enregistré parmi vos murs.",
  "scan.vaiMuro": "Aller au mur",
  "scan.scansionaAltro": "Scanner un autre mur",
  "scan.manualeLabel": "Pas de caméra ? Collez le slug ou le lien du mur :",
  "scan.manualePh": "ex. piazza-del-mercato",
  "scan.salva": "Enregistrer",

  "scansiona.titolo": "Scanner un mur",

  "mieiMuriPag.testo":
    "Les murs que vous avez croisés : touchez-en un pour relire ses pensées.",

  "preferitiPag.titolo": "Post-it enregistrés",
  "preferitiPag.testo":
    "Les pensées que vous avez enregistrées avec le cœur, des murs que vous avez visités.",
  "preferitiPag.serveAccount": "Un compte est nécessaire",
  "preferitiPag.serveAccountTesto":
    "Les post-it enregistrés restent dans votre compte : vous les retrouvez sur chaque appareil après connexion.",
  "preferitiPag.accedi": "Connectez-vous ou créez un compte",
  "preferitiPag.errCarico":
    "Je n'ai pas pu charger vos post-it enregistrés.",
  "preferitiPag.errRimuovi": "Échec de la suppression, réessayez.",
  "preferitiPag.vuoto":
    "Aucun post-it enregistré pour l'instant. Touchez le cœur 🤍 sur une pensée pour la conserver ici.",
  "preferitiPag.rimuoviSalvati": "Retirer des enregistrés",

  "impost.apro": "Ouverture des paramètres…",
  "impost.titolo": "Paramètres",
  "impost.noAccountTesto":
    "Connectez-vous pour gérer la photo de profil, la biographie et la confidentialité de vos pensées.",
  "impost.fotoProfilo": "Photo de profil",
  "impost.cambiaFoto": "🔄 Changer la photo",
  "impost.aggiungiFoto": "➕ Ajouter une photo",
  "impost.rimuoviFoto": "Retirer la photo",
  "impost.fotoNota":
    "JPG, PNG ou WebP : vous pourrez faire glisser l'image et choisir avec le zoom la partie qui apparaît dans le cercle.",
  "impost.accesso": "Connexion",
  "impost.accessoNota":
    "Le nom d'utilisateur est le nom avec lequel vous vous connectez (avec le mot de passe). L'email de récupération sert si vous oubliez le mot de passe.",
  "impost.username": "Nom d'utilisateur",
  "impost.usernamePh": "ex. mario_rossi",
  "impost.usernameManca":
    "Vous n'avez pas encore choisi de nom d'utilisateur : choisissez-en un pour vous connecter sans saisir l'email.",
  "impost.salvaUsername": "Enregistrer le nom d'utilisateur",
  "impost.usernameSalvato":
    "Nom d'utilisateur enregistré ✓. Vous pouvez maintenant vous connecter avec ce nom.",
  "impost.profilo": "Votre profil",
  "impost.nomePost": "Nom sur vos post-it",
  "impost.bio": "Biographie",
  "impost.bioPh": "Deux lignes sur vous (facultatif)",
  "impost.mostraPostit": "Afficher mes post-it sur le profil public",
  "impost.mostraPostitNota":
    "Si vous le désactivez, les visiteurs de votre profil ne pourront pas lire les pensées que vous avez laissées (elles restent sur le mur).",
  "impost.salvaModifiche": "Enregistrer les modifications",
  "impost.profiloSalvato": "Profil enregistré ✓",
  "impost.fotoAggiornata": "Photo de profil mise à jour ✓",
  "impost.fotoRimossa": "Photo supprimée ✓",
  "impost.vediProfilo": "👁️ Voir mon profil public",
  "impost.mieiPostit": "Mes post-it",
  "impost.nessunPostit":
    "Vous n'avez encore laissé aucune pensée : trouvez un code QR sur un mur et écrivez la première.",

  "foto.titolo": "Téléverser la photo du mur",
  "foto.noAccount": "Vous devez vous connecter pour téléverser la photo d'un mur.",
  "foto.testo": "La photo sera montrée à quiconque scanne le QR de ce mur.",
  "foto.errSlug":
    "Slug invalide : utilisez uniquement des lettres minuscules et des tirets (ex. parco-cerillo).",
  "foto.errScegli": "Choisissez une photo du mur.",
  "foto.errCarico": "Échec du téléversement, réessayez.",
  "foto.fatto": "Photo téléversée : le mur a maintenant son image.",
  "foto.vaiMuro": "Aller au mur",
  "foto.altra": "Téléverser une autre photo",
  "foto.slugLabel": "Slug du mur (ex. parco-cerillo)",
  "foto.slugPh": "ex. parco-cerillo",
  "foto.fotoLabel": "Photo du mur",
  "foto.caricamento": "Téléversement…",
  "foto.carica": "📷 Téléverser la photo",

  "apri.titolo": "Ouvrir un mur",
  "apri.cercoPos":
    "Un instant : je cherche votre position pour savoir à quel mur vous êtes…",
  "apri.cercoMuro": "Position trouvée. Je vérifie la zone du mur…",
  "apri.trovato": "Mur trouvé : ouverture de {slug}…",
  "apri.errore":
    "Quelque chose s'est mal passé. Rescannez le QR et réessayez.",
  "apri.noGeo": "Cet appareil ne prend pas en charge la géolocalisation.",
  "apri.fuoriZona":
    "Vous n'êtes dans la zone d'aucun mur. Rapprochez-vous du mur et rescannez le QR.",
  "apri.noMuri":
    "Il n'y a pas encore de murs : demandez à l'auteur d'en créer un.",
  "apri.noCoord": "Aucun mur n'a encore ses coordonnées définies.",
  "apri.noVicino": "Aucun mur assez proche. Voici les plus proches de vous :",
  "apri.posNegata":
    "Position indisponible. Autorisez l'accès à la position et rescannez le QR.",
  "apri.home": "← Accueil",

  "reimposta.titolo": "Nouveau mot de passe",
  "reimposta.errCorta": "Le mot de passe doit comporter au moins 6 caractères.",
  "reimposta.errDiversa": "Les deux mots de passe ne correspondent pas.",
  "reimposta.errFallito":
    "Échec. Le lien a peut-être expiré : demandez-en un nouveau.",
  "reimposta.fatto": "Mot de passe mis à jour. Nous vous ramenons à l'accueil…",
  "reimposta.verifico": "Vérification du lien…",
  "reimposta.linkNonValido":
    "Le lien de récupération est invalide ou a expiré. Retournez à la connexion et demandez un nouvel email de récupération avec « Mot de passe oublié ? ».",
  "reimposta.phPassword": "Nouveau mot de passe (min 6 caractères)",
  "reimposta.phRipeti": "Répétez le nouveau mot de passe",
  "reimposta.salva": "Enregistrer le nouveau mot de passe",

  "admin.pannello": "Panneau des murs",
  "admin.noAccesso":
    "Vous devez vous connecter avec le compte administrateur pour gérer les murs.",
  "admin.noAdmin":
    "Ce compte n'est pas administrateur : il ne peut ni créer ni gérer les murs.",
  "admin.testo":
    "Vous seul pouvez fonder un mur et générer son QR. Tous les autres peuvent seulement lire et laisser des pensées.",
  "admin.fonda": "Fonder un mur",
  "admin.nomeLuogo": "Nom du lieu",
  "admin.nomePh": "ex. Parco Cerillo",
  "admin.latPh": "ex. 40.8518",
  "admin.lngPh": "ex. 14.2681",
  "admin.usaPos": "📍 Utiliser ma position",
  "admin.lat": "Latitude",
  "admin.lng": "Longitude",
  "admin.raggio": "Rayon de reconnaissance (mètres)",
  "admin.fotoLabel": "Photo du mur (facultative)",
  "admin.salvataggio": "Enregistrement…",
  "admin.fondaBtn": "Fonder le mur",
  "admin.muri": "Les murs ({n})",
  "admin.caricoMuri": "Chargement des murs…",
  "admin.nessunMuro": "Aucun mur pour l'instant.",
  "admin.senzaCoord": "sans coordonnées",
  "admin.raggioM": "rayon {m} m",
  "admin.apri": "Ouvrir",
  "admin.svuota": "Vider les post-it",
  "admin.cancella": "Supprimer",
  "admin.errNome":
    "Nom invalide : utilisez des lettres et des espaces (ex. Parco Cerillo).",
  "admin.errCoord":
    "Saisissez la latitude et la longitude, ou aucune des deux.",
  "admin.salvato": "Mur \"{nome}\" enregistré.",
  "admin.errSalvataggio": "Échec de l'enregistrement.",
  "admin.confCancella": "Supprimer le mur \"{nome}\" ?",
  "admin.confSvuota":
    "Vider TOUS les post-it du mur \"{nome}\" ? L'opération est irréversible.",
  "admin.svuotati": "Post-it de {nome} vidés.",
  "admin.noGeo":
    "La géolocalisation n'est pas disponible sur cet appareil.",
  "admin.cercoPos": "Je cherche votre position…",
  "admin.posNonRilevata": "Position non détectée : saisissez-la manuellement.",
  "admin.zona": "Zone d'accès du mur",
  "admin.zonaAiuto":
    "Touchez la carte pour tracer le périmètre de la zone : au moins 3 points. Seules les personnes situées dans cette zone pourront ouvrir le mur en scannant le QR.",
  "admin.zonaVaiPos": "📍 Aller à ma position",
  "admin.zonaIndietro": "Annuler le dernier point",
  "admin.zonaPulisci": "Effacer",
  "admin.zonaPunti": "{n} points",
  "admin.senzaZona": "sans zone (rayon par défaut)",
  "admin.errZona": "Tracez au moins 3 points sur la carte pour définir la zone.",

  "qr.muroDi": "Mur de {nome}",
  "qr.inquadra": "Cadrez le code pour laisser une pensée sur ce mur.",
  "qr.alt": "Code QR du mur de {nome}",
  "qr.stampaNota":
    "Pour imprimer : utilisez le bouton ci-dessus ou Cmd/Ctrl+P. Le QR pointe vers le mur public, il fonctionne donc aussi après les mises à jour du site.",
  "qr.stampa": "🖨️ Imprimer",

  "errore.titolo": "Muri Parlanti",
  "errore.muroTesto":
    "Je n'ai pas pu atteindre le mur pour le moment. La base de données n'est peut-être pas configurée : réessayez bientôt.",

  "profiloPub.pensieroUno": "1 pensée laissée",
  "profiloPub.pensieri": "{n} pensées laissées",
  "profiloPub.nascosto":
    "Ce profil a choisi de ne pas montrer ses post-it.",
  "profiloPub.vuoto": "Aucune pensée encore laissée par cet auteur.",
  "profiloPub.bio": "Bio",
  "profiloPub.fotoAlt": "Photo de profil de {nome}",
};

const DE: Parole = {
  "nav.menu": "Menü",
  "nav.chiudi": "Menü schließen",
  "nav.apri": "Menü öffnen",
  "nav.home": "Start",
  "nav.tuoProfilo": "Dein Profil",
  "nav.mieiMuri": "Deine Wände",
  "nav.salvati": "Gespeicherte Notizen",
  "nav.scansiona": "QR scannen",
  "nav.impostazioni": "Einstellungen",
  "nav.admin": "Admin-Bereich",
  "nav.esci": "Abmelden",
  "nav.creaAccount": "Kostenloses Konto erstellen",
  "nav.ospite": "Gast",
  "nav.ospiteDescr":
    "Erstelle ein kostenloses Konto für Profil, gespeicherte Notizen und Level.",
  "nav.toccaProfilo": "Tippen, um das Profil zu öffnen",
  "lingua.titolo": "Sprache",
  "lingua.scegli": "Sprache der Oberfläche wählen",
  "lingua.traduci": "Öffentliche Notizen übersetzen",
  "lingua.traduciDescr":
    "Übersetzt die Gedanken anderer in die gewählte Sprache. Deine eigenen Notizen bleiben, wie du sie geschrieben hast.",
  "home.desc":
    "Die Wände der Stadt erzählen Geschichten. Scanne den QR-Code einer Wand, um sie zu entdecken, und hinterlasse deinen Gedanken – auch anonym. Erstelle ein kostenloses Konto, um die Gedanken anderer zu lesen, Profile der Autorinnen und Autoren zu öffnen und Favoriten zu speichern.",
  "home.footer": "Ein anonymer Gedanke pro Wand. Sei freundlich.",
  "pwa.titolo": "Am Handy, wie eine App",
  "pwa.testo":
    "Muri Parlanti ist dafür optimiert, direkt am Handy zu laufen: speichere sie auf dem Startbildschirm, dann öffnet sie sich im Vollbild, mit schnellem Zugriff – ohne klassische Installation und ohne App-Store.",
  "pwa.installa": "Zum Startbildschirm",
  "pwa.installaFatto": "App zum Startbildschirm hinzugefügt",
  "pwa.ios":
    "Auf iPhone/iPad: „Teilen“ antippen, dann „Zum Home-Bildschirm“.",
  "pwa.altro":
    "Wähle im Browser-Menü ��App installieren“ oder „Zum Home-Bildschirm“.",
  "pwa.giaInstallata": "Du nutzt bereits die auf dem Startbildschirm gespeicherte Version.",
  "muro.pensieroUno": "1 Gedanke hinterlassen",
  "muro.pensieri": "{n} Gedanken hinterlassen",
  "muro.vuoto": "Noch keine Gedanken. Sei der Erste.",
  "muro.lascia": "Gedanken hinterlassen",
  "muro.invitoTitolo": "Diese Wand lebt",
  "muro.invitoTesto":
    "Erstelle ein kostenloses Konto, um besuchte Wände zu speichern, deine Lieblingsnotizen zu behalten und aufzusteigen. Du kannst deinen Gedanken auch ohne Konto hinterlassen.",
  "muro.invitoCta": "Kostenloses Konto erstellen",
  "muro.chiudiInvito": "Einladung schließen",
  "muro.fotoMuro": "Foto der Wand von {nome}",
  "editor.titolo": "Dein Gedanke",
  "editor.placeholder": "Schreibe deinen Gedanken für diese Wand...",
  "editor.firma": "Name, mit dem du den Gedanken unterschreibst",
  "editor.nome": "Dein Name (optional)",
  "editor.firmaAccount":
    "Du unterschreibst mit deinem Konto: Wer die Wand scannt, kann dein Profil öffnen, indem er den Namen antippt. Du kannst ihn in den Einstellungen ändern.",
  "editor.fotoAggiungi": "Foto hinzufügen",
  "editor.fotoFacoltativa": "(optional)",
  "editor.fotoPronta": "Foto bereit: wird beim Veröffentlichen hochgeladen.",
  "editor.rimuoviFoto": "Foto entfernen",
  "editor.anteprimaFoto": "Fotovorschau",
  "editor.attacca": "Anheften",
  "editor.attaccando": "Wird angeheftet...",
  "editor.caricoFoto": "Foto wird hochgeladen...",
  "editor.annulla": "Abbrechen",
  "editor.fileNonImmagine": "Die gewählte Datei ist kein Bild.",
  "postit.tu": "Du",
  "postit.tuo": "deins",
  "postit.tuoPensiero": "Das ist dein Gedanke ({nome})",
  "postit.vediProfilo": "Profil der Autorin/des Autors ansehen",
  "postit.tradotto": "übersetzt",
  "postit.mostraOriginale": "Original anzeigen",
  "postit.mostraTraduzione": "��bersetzen",
  "postit.preferitoAggiungi": "Zu Favoriten hinzufügen",
  "postit.preferitoRimuovi": "Aus Favoriten entfernen",
  "postit.fotoAllegata": "An den Gedanken angehängtes Foto",
  "postit.canzone": "An den Gedanken angehängter Song",
  "postit.ascolta": "Song anhören",
  "editor.canzoneAggiungi": "Einen Song hinzufügen",
  "editor.canzoneFacoltativa": "(optional)",
  "editor.canzonePlaceholder": "Einen Song suchen",
  "editor.canzonePronta": "Song bereit:",
  "editor.canzoneCambia": "Ändern",
  "scegli.titolo": "Song suchen",
  "scegli.placeholder": "Titel oder Künstler...",
  "scegli.cercando": "Suche läuft...",
  "scegli.vuoto": "Keine Ergebnisse. Versuch einen anderen Titel.",
  "scegli.errore": "Suche nicht verfügbar. Versuch es erneut.",
  "scegli.momento": "Wähle den Moment (max. 30 Sekunden)",
  "scegli.prova": "▶ Probe",
  "scegli.aggiungi": "Song hinzufügen",
  "scegli.linkUsa": "Diesen Link verwenden",
  "scegli.fonteTutti": "Alle",
  "scegli.durata": "Dauer",
  "scegli.senzaPorzione": "Vorschau nicht verfügbar: Der Song startet von Beginn an.",
  "scegli.spotifyNonConfigurato": "Spotify ist nicht konfiguriert. Füge die Schlüssel hinzu oder wähle eine andere Quelle.",
  "scegli.youtubeNonConfigurato": "YouTube ist nicht konfiguriert. Füge den API-Schlüssel hinzu oder wähle eine andere Quelle.",
  "scegli.parteCompleta": "Wähle einen Teil des Songs (max. 30 Sekunden)",
  "scegli.caricoPlayer": "Der ganze Song wird geladen...",
  "scegli.errorePlayer": "Player konnte nicht geladen werden. Versuch es erneut.",
  "scegli.istruzioni": "Ziehe den Balken, um den Teil zu wählen (max. 30 Sekunden)",
  "scegli.riproduci": "▶ Teil anhören",
  "scegli.pausa": "⏸ Pause",
  "editor.canzoneRimuovi": "Song entfernen",
  "editor.canzoneNonSupportata":
    "Link nicht erkannt.",
  "editor.erroreFoto":
    "Ich konnte das Foto nicht hochladen ({msg}). Versuche es erneut oder entferne es.",
  "popup.titolo": "Danke für deinen ersten Gedanken",
  "popup.testo":
    "Deine Notiz hängt an der Wand. Speichere Muri Parlanti auf dem Startbildschirm deines Handys: sie öffnet sich im Vollbild und du bist sofort wieder bei deinen Wänden – ganz ohne Installation.",
  "popup.ok": "Alles klar",
  "comune.chiudi": "Schließen",

  "nav.menuPrincipale": "Hauptmenü",

  "accesso.accedi": "Anmelden",
  "accesso.registrati": "Registrieren",
  "accesso.phUsername": "Benutzername (3-20: a-z, 0-9, _)",
  "accesso.phEmailRecupero": "Wiederherstellungs-E-Mail",
  "accesso.phIdentificativo": "Benutzername oder E-Mail",
  "accesso.phIdentRecupero": "Benutzername oder Wiederherstellungs-E-Mail",
  "accesso.phPassword": "Passwort (min. 6 Zeichen)",
  "accesso.attendi": "Warte…",
  "accesso.creaAccount": "Erstelle dein Konto",
  "accesso.inviaRecupero": "Wiederherstellungslink senden",
  "accesso.passwordDimenticata": "Passwort vergessen?",
  "accesso.tornaAccesso": "← Zurück zur Anmeldung",
  "accesso.notaUsername":
    "Der Benutzername ist der Name, mit dem du dich anmeldest. Die E-Mail dient nur zur Wiederherstellung des Passworts, falls du es vergisst.",
  "accesso.accountCreato": "Konto erstellt. Willkommen zurück!",
  "accesso.controllaEmail": "Prüfe deine Wiederherstellungs-E-Mail.",

  "muri.titolo": "Deine Wände",
  "muri.vuotoOspite":
    "Scanne den QR-Code der ersten Wand, die du findest: Du speicherst sie hier und kannst sie jederzeit wieder lesen.",
  "muri.vuotoAccount":
    "Du hast noch keine Wand. Scanne den QR-Code der ersten Wand, die du findest: Sie bleibt in deinem Konto.",
  "muri.scansionaPrimo": "Scanne deine erste Wand",
  "muri.aggiungi": "＋ Wand hinzufügen",
  "muri.neiTuoi": "✓ In deinen Wänden",
  "muri.salva": "☆ In deinen Wänden speichern",

  "comune.tornaHome": "Zurück zur Startseite",
  "comune.tornaHomeFreccia": "← Zurück zur Startseite",
  "comune.homeFreccia": "← Startseite",
  "comune.punti": "Punkte",
  "comune.carico": "Lädt…",
  "comune.attendi": "Warte…",
  "comune.salvo": "Speichern…",
  "comune.rimozioneFallita": "Entfernen fehlgeschlagen. Versuche es erneut.",

  "crediti.ideaBy": "Idee von",
  "crediti.instagram": "Instagram-Profil des Erstellers",

  "progresso.piuPunti": "+{n} Punkte",
  "progresso.livelloSbloccato": "🎉 Level {n} freigeschaltet!",

  "livello.1": "Neuling",
  "livello.2": "Entdecker",
  "livello.3": "Wanderer",
  "livello.4": "Reisender",
  "livello.5": "Chronist",
  "livello.6": "Erzähler",
  "livello.7": "Legende der Wände",

  "profilo.noAccountTitolo": "Dein Profil",
  "profilo.noAccountTesto":
    "Mit einem Konto speicherst du die Wände, die du besuchst, und deine Lieblings-Post-its, und du sammelst Punkte: Jedes erreichte Level schenkt dir einen Bonus.",
  "profilo.ciao": "Hallo, {nome} 👋",
  "profilo.tu": "Du",
  "profilo.esci": "Abmelden",
  "profilo.punti": "{xp} Punkte",
  "profilo.alProssimo": "{n} Punkte bis Level {lv}",
  "profilo.maxLivello": "Höchstes Level erreicht!",
  "profilo.muriEsplorati": "erkundete Wände",
  "profilo.pensieriLasciati": "hinterlassene Gedanken",
  "profilo.preferiti": "Favoriten",
  "profilo.caricaFoto": "📷 Foto einer Wand hochladen",
  "profilo.ilMioProfilo": "👁️ Mein Profil",
  "profilo.impostazioni": "⚙️ Einstellungen",
  "profilo.ricompense": "Level-Belohnungen",
  "profilo.preferitiTitolo": "Lieblings-Post-its",
  "profilo.preferitiVuoto":
    "Keine Favoriten: Tippe auf das Herz 🤍 bei einem Post-it, um es hier zu speichern.",
  "profilo.rimuoviPreferito": "Aus Favoriten entfernen",
  "profilo.guadagnaPunti":
    "Besuche weitere Wände, um Punkte zu sammeln und im Level aufzusteigen.",
  "profilo.fotoAlt": "Profilfoto von {nome}",

  "ritaglia.titolo": "Foto ausrichten",
  "ritaglia.testo":
    "Ziehe das Bild und passe den Zoom an: Der Teil im Kreis wird dein Profilfoto.",
  "ritaglia.noSupporto":
    "Der Browser unterstützt das Zuschneiden nicht. Versuche es mit einem anderen Foto.",
  "ritaglia.fallito": "Zuschneiden fehlgeschlagen. Versuche es erneut.",
  "ritaglia.alt": "Zuzuschneidendes Foto",
  "ritaglia.carico": "Bild wird geladen…",
  "ritaglia.riduciZoom": "Zoom verkleinern",
  "ritaglia.zoomImmagine": "Bild-Zoom",
  "ritaglia.aumentaZoom": "Zoom vergrößern",
  "ritaglia.annulla": "✕ Abbrechen",
  "ritaglia.usa": "✓ Dieses Foto verwenden",

  "scan.errPermesso":
    "Kamerazugriff verweigert. Öffne die Seite in Chrome, tippe auf das Schloss-Symbol neben der Adresse und erlaube die Kamera, dann versuche es erneut. Alternativ nutze \"Foto vom QR machen\".",
  "scan.errNessunaCam":
    "Keine Kamera auf diesem Gerät gefunden. Nutze \"Foto vom QR machen\".",
  "scan.errInUso":
    "Die Kamera wird bereits von einer anderen App verwendet. Schließe sie und versuche es erneut.",
  "scan.errNoModalita":
    "Die Kamera dieses Geräts unterstützt den angeforderten Modus nicht.",
  "scan.errSicura": "Die Kamera erfordert eine sichere Verbindung (https).",
  "scan.errAvvio": "Die Kamera konnte nicht gestartet werden.",
  "scan.errNoEspone":
    "Dieses Gerät stellt dem Browser die Kamera nicht zur Verfügung.",
  "scan.errNoVideo": "Video-Element nicht gefunden.",
  "scan.invito":
    "Richte den QR-Code an der Wand aus, um sie zu deinen Wänden hinzuzufügen.",
  "scan.avvia": "📷 Kamera starten",
  "scan.avvio": "Kamera wird gestartet… (erlaube den Zugriff, falls gefragt)",
  "scan.inquadra": "Richte den QR-Code der Wand aus.",
  "scan.ferma": "Kamera stoppen",
  "scan.riprova": "Erneut versuchen",
  "scan.browserIntegrato":
    "Du verwendest den integrierten Browser von {nome}: Er blockiert manchmal die Kamera. Öffne den Link in Chrome oder nutze Foto vom QR machen unten.",
  "scan.scatta": "📸 Foto vom QR machen",
  "scan.scegliFoto": "🖼️ Oder wähle ein Foto des QR-Codes",
  "scan.noQrFoto":
    "Kein QR im Foto erkannt. Versuche es erneut mit einem näheren und geraden Foto des QR-Codes.",
  "scan.erroreSconosciuto": "Unbekannter Fehler.",
  "scan.fotoNonLeggibile": "Foto nicht lesbar.",
  "scan.testoNonRiconosciuto":
    "Ich erkenne diesen Text nicht. Füge einen Link /muro/… oder einen Slug wie piazza-del-mercato ein.",
  "scan.muroSalvato": "Wand zu deinen Wänden hinzugefügt.",
  "scan.vaiMuro": "Zur Wand",
  "scan.scansionaAltro": "Weitere Wand scannen",
  "scan.manualeLabel": "Keine Kamera? Füge den Slug oder den Link der Wand ein:",
  "scan.manualePh": "z. B. piazza-del-mercato",
  "scan.salva": "Speichern",

  "scansiona.titolo": "Eine Wand scannen",

  "mieiMuriPag.testo":
    "Die Wände, die du gefunden hast: Tippe auf eine, um ihre Gedanken erneut zu lesen.",

  "preferitiPag.titolo": "Gespeicherte Post-its",
  "preferitiPag.testo":
    "Die Gedanken, die du mit dem Herz gespeichert hast, von den Wänden, die du besucht hast.",
  "preferitiPag.serveAccount": "Ein Konto ist erforderlich",
  "preferitiPag.serveAccountTesto":
    "Gespeicherte Post-its bleiben in deinem Konto: Nach der Anmeldung findest du sie auf jedem Gerät wieder.",
  "preferitiPag.accedi": "Anmelden oder Konto erstellen",
  "preferitiPag.errCarico":
    "Deine gespeicherten Post-its konnten nicht geladen werden.",
  "preferitiPag.errRimuovi": "Entfernen fehlgeschlagen, versuche es erneut.",
  "preferitiPag.vuoto":
    "Noch keine gespeicherten Post-its. Tippe auf das Herz 🤍 bei einem Gedanken, um ihn hier aufzubewahren.",
  "preferitiPag.rimuoviSalvati": "Aus Gespeicherten entfernen",

  "impost.apro": "Einstellungen werden geöffnet…",
  "impost.titolo": "Einstellungen",
  "impost.noAccountTesto":
    "Melde dich an, um Profilfoto, Biografie und die Privatsphäre deiner Gedanken zu verwalten.",
  "impost.fotoProfilo": "Profilfoto",
  "impost.cambiaFoto": "🔄 Foto ändern",
  "impost.aggiungiFoto": "➕ Foto hinzufügen",
  "impost.rimuoviFoto": "Foto entfernen",
  "impost.fotoNota":
    "JPG, PNG oder WebP: Du kannst das Bild ziehen und mit dem Zoom wählen, welcher Teil im Kreis landet.",
  "impost.accesso": "Anmeldung",
  "impost.accessoNota":
    "Der Benutzername ist der Name, mit dem du dich anmeldest (zusammen mit dem Passwort). Die Wiederherstellungs-E-Mail dient, falls du das Passwort vergisst.",
  "impost.username": "Benutzername",
  "impost.usernamePh": "z. B. mario_rossi",
  "impost.usernameManca":
    "Du hast noch keinen Benutzernamen gewählt: Wähle einen, um dich ohne E-Mail-Eingabe anzumelden.",
  "impost.salvaUsername": "Benutzername speichern",
  "impost.usernameSalvato":
    "Benutzername gespeichert ✓. Du kannst dich jetzt mit diesem Namen anmelden.",
  "impost.profilo": "Dein Profil",
  "impost.nomePost": "Name auf deinen Post-its",
  "impost.bio": "Biografie",
  "impost.bioPh": "Zwei Zeilen über dich (optional)",
  "impost.mostraPostit": "Meine Post-its im öffentlichen Profil zeigen",
  "impost.mostraPostitNota":
    "Wenn du das deaktivierst, können Besucher deines Profils die hinterlassenen Gedanken nicht lesen (sie bleiben trotzdem an der Wand).",
  "impost.salvaModifiche": "Änderungen speichern",
  "impost.profiloSalvato": "Profil gespeichert ✓",
  "impost.fotoAggiornata": "Profilfoto aktualisiert ✓",
  "impost.fotoRimossa": "Foto entfernt ✓",
  "impost.vediProfilo": "👁️ Mein öffentliches Profil ansehen",
  "impost.mieiPostit": "Meine Post-its",
  "impost.nessunPostit":
    "Du hast noch keine Gedanken hinterlassen: Finde einen QR-Code an einer Wand und schreibe den ersten.",

  "foto.titolo": "Wandfoto hochladen",
  "foto.noAccount": "Du musst dich anmelden, um das Foto einer Wand hochzuladen.",
  "foto.testo": "Das Foto wird allen gezeigt, die den QR dieser Wand scannen.",
  "foto.errSlug":
    "Ungültiger Slug: Verwende nur Kleinbuchstaben und Bindestriche (z. B. parco-cerillo).",
  "foto.errScegli": "Wähle ein Foto der Wand.",
  "foto.errCarico": "Hochladen fehlgeschlagen, versuche es erneut.",
  "foto.fatto": "Foto hochgeladen: Die Wand hat jetzt ihr Bild.",
  "foto.vaiMuro": "Zur Wand",
  "foto.altra": "Weiteres Foto hochladen",
  "foto.slugLabel": "Slug der Wand (z. B. parco-cerillo)",
  "foto.slugPh": "z. B. parco-cerillo",
  "foto.fotoLabel": "Foto der Wand",
  "foto.caricamento": "Wird hochgeladen…",
  "foto.carica": "📷 Foto hochladen",

  "apri.titolo": "Eine Wand öffnen",
  "apri.cercoPos":
    "Einen Moment: Ich suche deinen Standort, um zu erkennen, an welcher Wand du bist…",
  "apri.cercoMuro": "Standort gefunden. Ich prüfe den Bereich der Wand…",
  "apri.trovato": "Wand gefunden: {slug} wird geöffnet…",
  "apri.errore":
    "Etwas ist schiefgelaufen. Scanne den QR-Code erneut und versuche es noch einmal.",
  "apri.noGeo": "Dieses Gerät unterstützt keine Geolokalisierung.",
  "apri.fuoriZona":
    "Du bist im Bereich keiner Wand. Geh näher an die Wand und scanne den QR-Code erneut.",
  "apri.noMuri":
    "Es gibt noch keine Wände: Bitte den Autor, eine zu erstellen.",
  "apri.noCoord": "Bei keiner Wand sind die Koordinaten eingestellt.",
  "apri.noVicino": "Keine Wand nah genug. Hier sind die nächstgelegenen:",
  "apri.posNegata":
    "Standort nicht verfügbar. Erlaube den Standortzugriff und scanne den QR-Code erneut.",
  "apri.home": "← Startseite",

  "reimposta.titolo": "Neues Passwort",
  "reimposta.errCorta": "Das Passwort muss mindestens 6 Zeichen haben.",
  "reimposta.errDiversa": "Die beiden Passwörter stimmen nicht überein.",
  "reimposta.errFallito":
    "Fehlgeschlagen. Der Link ist vielleicht abgelaufen: Fordere einen neuen an.",
  "reimposta.fatto": "Passwort aktualisiert. Wir bringen dich zur Startseite…",
  "reimposta.verifico": "Link wird überprüft…",
  "reimposta.linkNonValido":
    "Der Wiederherstellungslink ist ungültig oder abgelaufen. Geh zurück zur Anmeldung und fordere eine neue Wiederherstellungs-E-Mail über «Passwort vergessen?» an.",
  "reimposta.phPassword": "Neues Passwort (min. 6 Zeichen)",
  "reimposta.phRipeti": "Neues Passwort wiederholen",
  "reimposta.salva": "Neues Passwort speichern",

  "admin.pannello": "Wand-Verwaltung",
  "admin.noAccesso":
    "Du musst dich mit dem Administratorkonto anmelden, um die Wände zu verwalten.",
  "admin.noAdmin":
    "Dieses Konto ist kein Administrator: Es kann keine Wände erstellen oder verwalten.",
  "admin.testo":
    "Nur du kannst eine Wand gründen und ihren QR generieren. Alle anderen können nur lesen und Gedanken hinterlassen.",
  "admin.fonda": "Eine Wand gründen",
  "admin.nomeLuogo": "Name des Ortes",
  "admin.nomePh": "z. B. Parco Cerillo",
  "admin.latPh": "z. B. 40.8518",
  "admin.lngPh": "z. B. 14.2681",
  "admin.usaPos": "📍 Meinen Standort verwenden",
  "admin.lat": "Breitengrad",
  "admin.lng": "Längengrad",
  "admin.raggio": "Erkennungsradius (Meter)",
  "admin.fotoLabel": "Wandfoto (optional)",
  "admin.salvataggio": "Speichern…",
  "admin.fondaBtn": "Wand gründen",
  "admin.muri": "Die Wände ({n})",
  "admin.caricoMuri": "Wände werden geladen…",
  "admin.nessunMuro": "Noch keine Wand.",
  "admin.senzaCoord": "ohne Koordinaten",
  "admin.raggioM": "Radius {m} m",
  "admin.apri": "Öffnen",
  "admin.svuota": "Post-its leeren",
  "admin.cancella": "Löschen",
  "admin.errNome":
    "Ungültiger Name: Verwende Buchstaben und Leerzeichen (z. B. Parco Cerillo).",
  "admin.errCoord":
    "Gib sowohl Breiten- als auch Längengrad ein, oder keinen.",
  "admin.salvato": "Wand \"{nome}\" gespeichert.",
  "admin.errSalvataggio": "Speichern fehlgeschlagen.",
  "admin.confCancella": "Wand \"{nome}\" löschen?",
  "admin.confSvuota":
    "ALLE Post-its der Wand \"{nome}\" leeren? Der Vorgang ist nicht umkehrbar.",
  "admin.svuotati": "Post-its von {nome} geleert.",
  "admin.noGeo":
    "Die Geolokalisierung ist auf diesem Gerät nicht verfügbar.",
  "admin.cercoPos": "Ich suche deinen Standort…",
  "admin.posNonRilevata": "Standort nicht erkannt: Gib ihn manuell ein.",
  "admin.zona": "Zugangsbereich der Wand",
  "admin.zonaAiuto":
    "Tippe auf die Karte, um den Umriss des Bereichs zu zeichnen: mindestens 3 Punkte. Nur wer sich in diesem Bereich befindet, kann die Wand durch Scannen des QR-Codes öffnen.",
  "admin.zonaVaiPos": "📍 Zu meinem Standort",
  "admin.zonaIndietro": "Letzten Punkt rückgängig",
  "admin.zonaPulisci": "Leeren",
  "admin.zonaPunti": "{n} Punkte",
  "admin.senzaZona": "ohne Bereich (Standardradius)",
  "admin.errZona": "Zeichne mindestens 3 Punkte auf der Karte, um den Bereich festzulegen.",

  "qr.muroDi": "Wand von {nome}",
  "qr.inquadra": "Richte den Code aus, um einen Gedanken an dieser Wand zu hinterlassen.",
  "qr.alt": "QR-Code der Wand von {nome}",
  "qr.stampaNota":
    "Zum Drucken: Nutze die Schaltfläche oben oder Cmd/Ctrl+P. Der QR verweist auf die öffentliche Wand, funktioniert also auch nach Website-Aktualisierungen.",
  "qr.stampa": "🖨️ Drucken",

  "errore.titolo": "Muri Parlanti",
  "errore.muroTesto":
    "Ich konnte die Wand gerade nicht erreichen. Die Datenbank ist möglicherweise nicht konfiguriert: Versuche es gleich noch einmal.",

  "profiloPub.pensieroUno": "1 Gedanke hinterlassen",
  "profiloPub.pensieri": "{n} Gedanken hinterlassen",
  "profiloPub.nascosto":
    "Dieses Profil zeigt seine Post-its nicht an.",
  "profiloPub.vuoto": "Von diesem Autor wurde noch kein Gedanke hinterlassen.",
  "profiloPub.bio": "Bio",
  "profiloPub.fotoAlt": "Profilfoto von {nome}",
};

const DIZIONARIO: Record<CodiceLingua, Parole> = {
  it: IT,
  en: EN,
  es: ES,
  fr: FR,
  de: DE,
};

export function lingueDa(codice: CodiceLingua): Lingua {
  return LINGUE.find((l) => l.codice === codice) ?? LINGUE[0];
}

function eCodiceLingua(valore: string | null): valore is CodiceLingua {
  return !!valore && LINGUE.some((l) => l.codice === valore);
}

type ContestoLingua = {
  /** Lingua attiva dell'interfaccia. */
  lingua: CodiceLingua;
  /** Dati della lingua attiva (nome, bandiera, locale). */
  datiLingua: Lingua;
  /** Cambia lingua e la ricorda sul dispositivo. */
  cambiaLingua: (codice: CodiceLingua) => void;
  /** Traduce (o no) i post pubblici degli altri utenti. */
  traduciPubblici: boolean;
  setTraduciPubblici: (attivo: boolean) => void;
  /**
   * Testo nella lingua attiva. Sostituisce anche i segnaposto {nome}/{n}.
   * Se la chiave non esiste nella lingua scelta usa l'italiano.
   */
  t: (chiave: string, valori?: Record<string, string | number>) => string;
};

const Contesto = createContext<ContestoLingua | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Prima del mount usiamo l'italiano: il server e il client disegnano lo
  // stesso HTML e si evita ogni divergenza di idratazione.
  const [lingua, setLingua] = useState<CodiceLingua>(LINGUA_PREDEFINITA);
  const [traduciPubblici, setTraduci] = useState(false);

  useEffect(() => {
    // Lettura un attimo dopo il primo render: il server non conosce le scelte
    // salvate, e cosi' non si innesca un render a catena al mount.
    const id = window.setTimeout(() => {
      try {
        const salvata = window.localStorage.getItem(LINGUA_KEY);
        if (eCodiceLingua(salvata)) setLingua(salvata);
        const trad = window.localStorage.getItem(TRADUCI_KEY);
        if (trad === "1") setTraduci(true);
      } catch {
        // localStorage non disponibile (privacy mode): restano i valori iniziali.
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  // <html lang> resta coerente con la lingua scelta (importante per le app
  // che leggono la pagina e per gli screen reader).
  useEffect(() => {
    document.documentElement.lang = lingua;
  }, [lingua]);

  const cambiaLingua = useCallback((codice: CodiceLingua) => {
    setLingua(codice);
    try {
      window.localStorage.setItem(LINGUA_KEY, codice);
    } catch {
      // Nessun problema: la scelta vale solo per questa sessione.
    }
  }, []);

  const setTraduciPubblici = useCallback((attivo: boolean) => {
    setTraduci(attivo);
    try {
      window.localStorage.setItem(TRADUCI_KEY, attivo ? "1" : "0");
    } catch {
      // idem come sopra
    }
  }, []);

  const t = useCallback(
    (chiave: string, valori?: Record<string, string | number>) => {
      const base = DIZIONARIO[lingua][chiave] ?? IT[chiave] ?? chiave;
      if (!valori) return base;
      return base.replace(/\{(\w+)\}/g, (intero, nome: string) =>
        valori[nome] !== undefined ? String(valori[nome]) : intero
      );
    },
    [lingua]
  );

  const valore = useMemo<ContestoLingua>(
    () => ({
      lingua,
      datiLingua: lingueDa(lingua),
      cambiaLingua,
      traduciPubblici,
      setTraduciPubblici,
      t,
    }),
    [lingua, cambiaLingua, traduciPubblici, setTraduciPubblici, t]
  );

  return <Contesto.Provider value={valore}>{children}</Contesto.Provider>;
}

export function useLingua(): ContestoLingua {
  const ctx = useContext(Contesto);
  if (!ctx) {
    throw new Error("useLingua deve essere usato dentro LanguageProvider");
  }
  return ctx;
}
