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
  "nav.mieiMuri": "Muri visitati",
  "nav.salvati": "Post-it salvati",
  "nav.scansiona": "Scansiona QR",
  "nav.impostazioni": "Impostazioni",
  "nav.admin": "Pannello admin",
  "nav.esci": "Esci dall'account",
  "nav.creaAccount": "Crea account gratuito",
  "nav.ospite": "Ospite",
  "nav.ospiteDescr":
    "Crea un account gratuito per profilo, post-it salvati e muri preferiti.",
  "nav.toccaProfilo": "Clicca per andare al tuo profilo",
  "nav.fondaMuro": "Fonda un muro",
  "fonda.titolo": "Fonda un muro",
  "fonda.spiegazione":
    "Pensi che da qualche parte della città dovrebbe nascere un nuovo muro? Segnalalo qui. Indica sulla mappa il punto esatto e raccontaci perché lo fonderesti proprio lì: la tua idea arriverà a noi moderatori, che la valuteremo con attenzione.",
  "fonda.doveTitolo": "Dove vorresti il muro?",
  "fonda.doveAiuto":
    "Tocca la mappa per segnare un solo punto: la posizione precisa dove immagini il nuovo muro.",
  "fonda.usaPos": "📍 Usa la mia posizione",
  "fonda.togliPunto": "Togli il punto",
  "fonda.puntoScelto": "Punto scelto: {lat}, {lng}",
  "fonda.nessunPunto": "Nessun punto ancora: tocca la mappa.",
  "fonda.viaEtichetta": "Via:",
  "fonda.cercoVia": "Cerco la via…",
  "fonda.viaNonTrovata": "via non riconosciuta (vanno bene le coordinate)",
  "fonda.percheTitolo": "Perché vorresti fondarlo qui?",
  "fonda.perchePlaceholder":
    "Raccontaci in poche parole perché questo posto meriterebbe un muro…",
  "fonda.contaParole": "{n}/{min} parole",
  "fonda.errPunto": "Indica prima il punto sulla mappa.",
  "fonda.errMotivo": "Scrivi almeno {n} parole per spiegare la tua idea.",
  "fonda.errInvio": "Invio non riuscito. Riprova.",
  "fonda.invioInCorso": "Invio…",
  "fonda.condividi": "Condividi la tua idea",
  "fonda.notaFirmata":
    "La proposta arriverà ai moderatori firmata con il tuo account.",
  "fonda.notaAnonima":
    "Puoi inviare anche senza account: la proposta arriverà ai moderatori in forma anonima.",
  "fonda.invitoAccount": "Vuoi che la tua idea porti il tuo nome?",
  "fonda.soloRegistrati": "Serve un account",
  "fonda.soloRegistratiTesto":
    "Fondare un muro è riservato a chi ha un account gratuito: così la proposta arriva ai moderatori con il tuo nome. Accedi o crea un account in pochi secondi.",
  "fonda.vaiAccount": "Accedi o crea un account",
  "fonda.grazieTitolo": "Grazie di cuore!",
  "fonda.grazieTesto":
    "La tua idea è arrivata ai moderatori: la valuteremo con attenzione. Grazie per il tempo e l'interesse che hai dedicato a Muri Parlanti.",
  "fonda.altra": "Proponi un altro posto",
  "fonda.noGeo":
    "Il tuo dispositivo non permette di rilevare la posizione: tocca la mappa.",
  "fonda.posNonRilevata":
    "Posizione non rilevata: tocca la mappa per indicare il punto.",
  "admin.ideeTitolo": "Idee degli utenti ({n})",
  "admin.ideeCarico": "Carico le idee…",
  "admin.ideeVuote": "Nessuna idea ancora.",
  "admin.ideeVia": "Via",
  "admin.ideePerche": "Perché",
  "admin.ideeQuando": "Inviata il",
  "admin.ideeAnonimo": "anonimo",
  "admin.ideeStatoNuova": "Nuova",
  "admin.ideeStatoApprovata": "Approvata",
  "admin.ideeStatoRifiutata": "Rifiutata",
  "admin.ideeApprova": "Approva",
  "admin.ideeRifiuta": "Rifiuta",
  "admin.ideeCancella": "Cancella",
  "admin.ideeConfCancella": "Cancellare questa idea?",
  "admin.ideeErrore": "Operazione non riuscita.",
  "lingua.titolo": "Lingua",
  "lingua.scegli": "Scegli la lingua dell'interfaccia",
  "lingua.traduci": "Traduci i post pubblici",
  "lingua.traduciDescr":
    "Traduce i pensieri degli altri utenti nella lingua scelta. I tuoi post restano come li hai scritti.",
  "home.desc":
    "I muri della città raccontano storie. Scansiona il QR di un muro per scoprirlo e lascia il tuo pensiero, anche in anonimo. Crea un account gratuito per vedere i pensieri delle altre persone, aprire i profili degli autori e salvare i tuoi preferiti.",
  "home.footer": "Un pensiero anonimo per ogni muro. Sii gentile.",
  "intro.salta": "Salta",
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
  "muro.chiuso": "Questo muro è chiuso: ora è in sola lettura.",
  "muro.invitoTitolo": "Questo muro è vivo",
  "muro.invitoTesto":
    "Crea un account gratuito per salvare i muri che visiti e tenere i tuoi post-it preferiti. Puoi comunque lasciare il tuo pensiero anche senza account.",
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
  "editor.stile": "Stile",
  "editor.stileScegli": "Scegli uno stile",
  "editor.stileInfo": "Tocca uno stile per applicarlo al tuo post-it.",
  "editor.stileServeAccount":
    "Per scegliere lo stile del post-it serve un account gratuito. Accedi o registrati e torna qui: troverai subito tutti gli stili disponibili.",
  "editor.font": "Font",
  "editor.fontScegli": "Scegli un font",
  "editor.fontInfo": "Tutti i font sono subito disponibili.",
  "editor.fontCatAMano": "A mano",
  "editor.fontCatScrittura": "Scrittura",
  "editor.fontCatGraffiti": "Graffiti",
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
  "postit.ingrandisciFoto": "Tocca per ingrandire la foto",
  "postit.chiudiZoom": "Chiudi la foto",
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
  "scegli.istruzioni": "Trascina al centro per spostare, tira le manopole in basso per la durata (da 5 a 30 secondi)",
  "scegli.riproduci": "▶ Ascolta la parte",
  "scegli.pausa": "⏸ Pausa",
  "editor.canzoneRimuovi": "Rimuovi la canzone",
  "editor.canzoneNonSupportata":
    "Link non riconosciuto.",
  "editor.erroreFoto":
    "Non sono riuscito a caricare la foto ({msg}). Riprova o rimuovila.",
  "mod.nsfw":
    "Questo contenuto sembra di natura sessuale e non e' ammesso sul muro.",
  "mod.linguaggio":
    "Il pensiero contiene parole offensive e non puo' essere pubblicato.",
  "mod.link":
    "I link non sono ammessi nei pensieri. La musica va nel campo canzone.",
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

  "muri.titolo": "Muri visitati",
  "muri.vuotoOspite":
    "Scansiona il QR del primo muro che incontri: lo salverai qui e potrai tornare a leggerlo quando vuoi.",
  "muri.vuotoAccount":
    "Non hai ancora nessun muro. Scansiona il QR del primo muro che incontri: resterà nel tuo account.",
  "muri.scansionaPrimo": "Scansiona il tuo primo muro",
  "muri.aggiungi": "＋ Aggiungi muro",
  "muri.neiTuoi": "✓ Nei tuoi muri",
  "muri.salva": "☆ Salva nei tuoi muri",
  "muri.mappaVuota": "I muri che visiti compariranno qui sulla mappa.",
  "muri.paginaPrecedente": "Pagina precedente",
  "muri.paginaSuccessiva": "Pagina successiva",

  "comune.tornaHome": "Torna alla home",
  "comune.tornaHomeFreccia": "← Torna alla home",
  "comune.homeFreccia": "← Home",
  "comune.carico": "Carico…",
  "comune.attendi": "Attendi…",
  "comune.salvo": "Salvo…",
  "comune.rimozioneFallita": "Rimozione non riuscita. Riprova.",

  "crediti.ideaBy": "Idea by",
  "crediti.instagram": "Profilo Instagram del creatore",

  "profilo.noAccountTitolo": "Il tuo profilo",
  "profilo.noAccountTesto":
    "Con un account salvi i muri che visiti e i post-it preferiti, e ritrovi tutto su ogni dispositivo.",
  "profilo.ciao": "Ciao, {nome} 👋",
  "profilo.tu": "Tu",
  "profilo.esci": "Esci",
  "profilo.muriEsplorati": "muri esplorati",
  "profilo.pensieriLasciati": "pensieri lasciati",
  "profilo.preferiti": "preferiti",
  "profilo.caricaFoto": "📷 Carica la foto di un muro",
  "profilo.ilMioProfilo": "👁️ Il mio profilo",
  "profilo.impostazioni": "⚙️ Impostazioni",
  "profilo.gestione": "Gestione profilo",
  "profilo.gestioneNota":
    "Da qui puoi cambiare foto, username e biografia, e rivedere i post-it che hai lasciato e salvato.",
  "profilo.preferitiTitolo": "Post-it preferiti",
  "profilo.preferitiVuoto":
    "Nessun preferito: tocca il cuore 🤍 su un post-it per salvarlo qui.",
  "profilo.rimuoviPreferito": "Rimuovi dai preferiti",
  "profilo.fotoAlt": "Foto profilo di {nome}",
  "profilo.privacyVisibile": "I tuoi post-it si vedono nel profilo pubblico.",
  "profilo.privacyNascosti": "I tuoi post-it sono nascosti dal profilo pubblico.",
  "profilo.privacyGestisci": "Gestisci la privacy in Impostazioni →",
  "profilo.anteprimaApri": "👁️ Anteprima profilo pubblico",
  "profilo.anteprimaChiudi": "Chiudi anteprima",
  "profilo.caricaAltri": "Mostra altri post-it",
  "profilo.mostrati": "{visti} di {totale} post-it",
  "profilo.salvatiTitolo": "Post-it salvati",
  "profilo.leggiTutti": "Clicca per leggerli tutti →",
  "profilo.togglePostit": "Mostra i post-it nella tua bacheca pubblica",
  "profilo.toggleSalvati": "Mostra i post-it salvati nella tua bacheca pubblica",
  "profilo.modifica": "Modifica",
  "profilo.aggiorna": "Aggiorna",
  "profilo.aggiornaBio": "Aggiorna la tua bio",
  "profilo.scriviBio": "Scrivi una bio",
  "profilo.cliccaFoto": "Clicca per modificare",
  "profilo.bioTitolo": "Biografia",
  "profilo.elencoMiei": "I post-it di {nome}",
  "profilo.elencoSalvati": "I post-it salvati di {nome}",
  "profilo.pagina": "Pagina {n} di {t}",
  "profilo.prec": "Precedenti",
  "profilo.succ": "Successivi",
  "profilo.tornaAlProfilo": "← Torna al profilo",
  "profilo.nienteDaMostrare": "Qui non c’è niente da mostrare.",
  "profilo.modificaProfilo": "Modifica profilo",
  "profilo.aggiungiBio": "Aggiungi biografia",
  "profilo.cambiaFoto": "Cambia foto",

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
    "I muri che hai visitato: un tap lo mostra sulla mappa, due tap lo aprono.",

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
  "impost.profiloAltrove":
    "Foto, username e biografia si modificano dalla sezione «Il mio profilo».",
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

  "impost.tema": "Tema (sperimentale)",
  "impost.temaNota":
    "Prova un aspetto diverso dell'app. Per ora lo vedi solo tu come amministratore; la scelta resta su questo dispositivo.",
  "tema.ambra": "Ambra",
  "tema.graffiti": "Graffiti",
  "tema.disegnato": "Disegnato",
  "tema.attivo": "Attivo",

  // ── Prototipo layout (branch sperimenta-layout) ──
  "muri.suQuestoTelefono": "Su questo telefono",
  "muri.dalTuAccount": "Dal tuo account",
  "fonda.passoDi": "Passo {n} di {tot}",
  "fonda.passoDove": "Dove",
  "fonda.passoVia": "La via",
  "fonda.passoPerche": "Perché",
  "fonda.passoConferma": "Conferma",
  "fonda.viaConferma":
    "La via è ricavata dal punto: se non è giusta, torna indietro e sposta lo spillo.",
  "fonda.indietro": "Indietro",
  "fonda.avanti": "Avanti",
  "fonda.riepilogo": "Riepilogo della proposta",
  "fonda.riepilogoDove": "Luogo scelto",
  "fonda.riepilogoVia": "Via",
  "fonda.riepilogoPerche": "Perché lo apri",
  "campanella.titolo": "Notifiche",
  "campanella.nuove": "{n} nuove",
  "campanella.vuote": "Nessuna notifica per ora.",
  "campanella.accedi": "Accedi per vedere le notifiche.",
  "campanella.vediTutte": "Vedi tutte le notifiche",
  "impost.interruttori": "Interruttori",
  "impost.temaGraffiti": "Tema Graffiti",
  "impost.temaGraffitiNota":
    "Accendi per il tema graffiti, spegni per il tema carta (ambra).",

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

  // ── Collettivi / creator ─────────────────────────────────────────────
  "nav.notifiche": "Notifiche",
  "nav.adminCollettivi": "Collettivi (admin)",

  "segui.segui": "Segui",
  "segui.seguendo": "Seguendo",
  "segui.follower": "{n} follower",
  "segui.accedi": "Accedi per seguire questo creator.",

  "home.creatorSeguiti": "Creator che segui",

  "collettivo.muroInCorso": "Muro in corso",
  "collettivo.muroPrincipale": "Muro principale",
  "collettivo.bacheca": "Bacheca",
  "collettivo.bachecaVuota":
    "Questo collettivo non ha ancora pubblicato nessun muro.",
  "collettivo.tipoPrincipale": "Bacheca",
  "collettivo.tipoEvento": "Evento",
  "collettivo.statoAperto": "Aperto",
  "collettivo.statoChiuso": "Chiuso",
  "collettivo.apri": "Apri il muro",
  "collettivo.nonTrovato": "Collettivo non trovato.",
  "collettivo.nonTrovatoTesto":
    "Questo collettivo non esiste o non è più attivo.",

  "qrCollettivo.nessunMuro":
    "Questo collettivo non ha un muro aperto in questo momento.",
  "qrCollettivo.vaiProfilo": "Vai alla pagina del collettivo",

  "notifiche.titolo": "Notifiche",
  "notifiche.vuote": "Nessuna notifica per ora.",
  "notifiche.accedi": "Accedi per vedere le tue notifiche.",
  "notifiche.segnaTutte": "Segna tutte come lette",
  "notifiche.segnaUna": "Segna come letta",
  "notifiche.cancella": "Cancella",
  "notifiche.apri": "Apri il muro",
  "notifiche.nuova": "Nuova",

  "adminCol.titolo": "Collettivi",
  "adminCol.testo":
    "Crea i collettivi (es. RUINA) e i loro muri. Il muro principale è la bacheca sempre aperta: ci scrive solo l'organizzatore. I muri-evento si aprono e si chiudono.",
  "adminCol.nonAdmin": "Questa sezione è riservata all'amministratore.",
  "adminCol.nuovo": "Nuovo collettivo",
  "adminCol.modifica": "Modifica collettivo",
  "adminCol.nome": "Nome",
  "adminCol.slug": "Slug (indirizzo, es. ruina)",
  "adminCol.descrizione": "Descrizione",
  "adminCol.emoji": "Emoji",
  "adminCol.categoria": "Categoria",
  "adminCol.nessunaCategoria": "Nessuna",
  "adminCol.owner": "Account organizzatore (UUID)",
  "adminCol.ownerAiuto":
    "L'account condiviso del collettivo (es. CREATOR RUINA). Copia l'UUID utente da Supabase → Authentication → Users. Solo questo account potrà gestire i muri del collettivo.",
  "adminCol.attivo": "Attivo (visibile pubblicamente)",
  "adminCol.salva": "Salva",
  "adminCol.annulla": "Annulla",
  "adminCol.erroreNome": "Inserisci un nome.",
  "adminCol.erroreSlug": "Slug non valido: usa lettere minuscole, numeri e trattini.",
  "adminCol.salvato": "Collettivo salvato.",
  "adminCol.elenco": "Collettivi ({n})",
  "adminCol.nessuno": "Nessun collettivo ancora.",
  "adminCol.elimina": "Elimina",
  "adminCol.confElimina": "Eliminare il collettivo \"{nome}\"?",
  "adminCol.apriProfilo": "Pagina pubblica",
  "adminCol.muri": "Muri del collettivo",
  "adminCol.principalePresente": "Muro principale attivo",
  "adminCol.creaPrincipale": "Crea muro principale",
  "adminCol.nomePrincipale": "Nome della bacheca",
  "adminCol.nomeEvento": "Nome dell'evento",
  "adminCol.dataEvento": "Data evento (facoltativa)",
  "adminCol.apriEvento": "Apri muro evento",
  "adminCol.chiudi": "Chiudi muro",
  "adminCol.riapri": "Riapri muro",
  "adminCol.erroreMuro": "Operazione sul muro non riuscita.",
  "adminCol.erroreGenerico": "Operazione non riuscita.",
  "adminCol.apri": "Apri",
  "adminCol.statoAperto": "APERTO",
  "adminCol.statoChiuso": "CHIUSO",

  "nav.mioCollettivo": "Il mio collettivo",
  "gest.titolo": "Il mio collettivo",
  "gest.intro": "Da qui cambi la foto del collettivo e gestisci i suoi muri.",
  "gest.fotoTitolo": "Foto del collettivo",
  "gest.fotoTesto":
    "La foto del collettivo è quadrata (quelle delle persone restano rotonde).",
  "gest.fotoCambia": "Cambia foto",
  "gest.fotoSalvata": "Foto aggiornata.",
  "gest.fotoErrore": "Non è stato possibile cambiare la foto.",
  "gest.muriTitolo": "I muri",
  "gest.principaleInfo": "La bacheca è sempre aperta: qui scrivi solo tu.",
  "gest.eventoTitolo": "Nuovo muro evento",
  "gest.eventoNome": "Nome dell'evento",
  "gest.quando": "Quando?",
  "gest.eventoInizio": "Inizio (data e ora)",
  "gest.eventoFine": "Fine (data e ora)",
  "gest.eventoSpiega":
    "Indica inizio e fine: alla fine dell'evento il muro si chiude da solo e diventa in sola lettura, così nessuno può più scriverci dopo.",
  "gest.eventoSpiegaCampi":
    "Inizio e fine accettano sia la data sia l'orario. Esempio: 12/07/2026 alle 21:00.",
  "gest.eventoApri": "Apri il muro evento",
  "gest.eventoErroreNome": "Dai un nome all'evento.",
  "gest.eventoErroreDate": "La fine deve venire dopo l'inizio.",
  "gest.statoAperto": "Aperto",
  "gest.statoChiuso": "Chiuso",
  "gest.chiudi": "Chiudi ora",
  "gest.riapri": "Riapri",
  "gest.obbligatorio":
    "Solo l'account del collettivo può gestire questa pagina.",
  "ev.titolo": "Evento",
  "ev.dal": "Dal {inizio}",
  "ev.al": "al {fine}",
  "ev.chiusoDopoFine": "L'evento è finito: il muro è in sola lettura.",
  "ev.inCorso": "Evento in corso",
  "home.pannello": "Il tuo pannello",
  "muro.titolo": "Il tuo muro",
  "muro.sottotitolo":
    "Disegna lo sfondo del tuo muro: resta riservato a chi ha un account.",
  "muro.personalizza": "Personalizza il tuo muro",
  "muro.personalizzaBreve": "Personalizza muro",
  "muro.notaSfondo": "Il disegno è privato: chi non ha un account non può vederlo.",
  "muro.tela": "Tela da disegno",
  "muro.colore": "Colore",
  "muro.spessore": "Spessore",
  "muro.sfondo": "Colore del foglio",
  "muro.gomma": "Gomma",
  "muro.matita": "Matita",
  "muro.testo": "Testo",
  "muro.scrivi": "Scrivi qui...",
  "muro.conferma": "Conferma",
  "muro.penna": "Penna",
  "muro.marker": "Marker",
  "muro.pennello": "Pennello",
  "muro.spray": "Spray",
  "muro.annulla": "Annulla",
  "muro.ripristina": "Ripristina",
  "muro.pulisci": "Pulisci",
  "muro.rimuovi": "Rimuovi il muro",
  "muro.salva": "Salva il muro",
  "muro.salvando": "Salvataggio...",
  "muro.salvato": "Muro salvato.",
  "muro.rimosso": "Muro rimosso.",
  "muro.errore": "Non è stato possibile salvare il muro. Riprova.",
  "muro.caricamentoFallito":
    "Il muro precedente non si è caricato: salvando ora lo sostituirai.",
  "muro.chiudi": "Chiudi",
  "invito.occhiello": "Serve un account",
  "invito.titolo": "I profili sono riservati",
  "invito.testo":
    "Con un account gratuito apri i profili degli autori e vedi il loro muro personale, salvi i post-it che ti piacciono e tieni i tuoi muri preferiti. Si crea in pochi secondi.",
  "invito.dopo": "Più tardi",
  "invito.crea": "Crea account gratuito",
  "invito.entra": "Accedi",
};

const EN: Parole = {
  "nav.menu": "Menu",
  "nav.chiudi": "Close the menu",
  "nav.apri": "Open the menu",
  "nav.home": "Home",
  "nav.tuoProfilo": "Your profile",
  "nav.mieiMuri": "Visited walls",
  "nav.salvati": "Saved notes",
  "nav.scansiona": "Scan QR",
  "nav.impostazioni": "Settings",
  "nav.admin": "Admin panel",
  "nav.esci": "Sign out",
  "nav.creaAccount": "Create a free account",
  "nav.ospite": "Guest",
  "nav.ospiteDescr":
    "Create a free account for your profile, saved notes and favourite walls.",
  "nav.toccaProfilo": "Click to go to your profile",
  "nav.fondaMuro": "Found a wall",
  "fonda.titolo": "Found a wall",
  "fonda.spiegazione":
    "Think a new wall should be born somewhere in the city? Suggest it here. Mark the exact spot on the map and tell us why you would found it right there: your idea will reach us moderators, and we will review it carefully.",
  "fonda.doveTitolo": "Where would you like the wall?",
  "fonda.doveAiuto":
    "Tap the map to mark a single point: the exact spot where you picture the new wall.",
  "fonda.usaPos": "📍 Use my location",
  "fonda.togliPunto": "Remove the point",
  "fonda.puntoScelto": "Chosen point: {lat}, {lng}",
  "fonda.nessunPunto": "No point yet: tap the map.",
  "fonda.viaEtichetta": "Street:",
  "fonda.cercoVia": "Looking up the street…",
  "fonda.viaNonTrovata": "street not recognised (coordinates are fine)",
  "fonda.percheTitolo": "Why would you found it here?",
  "fonda.perchePlaceholder":
    "Tell us in a few words why this place deserves a wall…",
  "fonda.contaParole": "{n}/{min} words",
  "fonda.errPunto": "Mark the point on the map first.",
  "fonda.errMotivo": "Write at least {n} words to explain your idea.",
  "fonda.errInvio": "Sending failed. Try again.",
  "fonda.invioInCorso": "Sending…",
  "fonda.condividi": "Share your idea",
  "fonda.notaFirmata":
    "The suggestion will reach the moderators signed with your account.",
  "fonda.notaAnonima":
    "You can send it even without an account: the suggestion reaches the moderators anonymously.",
  "fonda.invitoAccount": "Want your idea to carry your name?",
  "fonda.soloRegistrati": "An account is required",
  "fonda.soloRegistratiTesto":
    "Founding a wall is reserved for people with a free account: that way your suggestion reaches the moderators under your name. Sign in or create an account in seconds.",
  "fonda.vaiAccount": "Sign in or create an account",
  "fonda.grazieTitolo": "Thank you so much!",
  "fonda.grazieTesto":
    "Your idea has reached the moderators: we will review it carefully. Thank you for the time and interest you put into Muri Parlanti.",
  "fonda.altra": "Suggest another place",
  "fonda.noGeo":
    "Your device does not allow location access: tap the map.",
  "fonda.posNonRilevata":
    "Location not detected: tap the map to mark the point.",
  "admin.ideeTitolo": "User ideas ({n})",
  "admin.ideeCarico": "Loading ideas…",
  "admin.ideeVuote": "No ideas yet.",
  "admin.ideeVia": "Street",
  "admin.ideePerche": "Why",
  "admin.ideeQuando": "Sent on",
  "admin.ideeAnonimo": "anonymous",
  "admin.ideeStatoNuova": "New",
  "admin.ideeStatoApprovata": "Approved",
  "admin.ideeStatoRifiutata": "Rejected",
  "admin.ideeApprova": "Approve",
  "admin.ideeRifiuta": "Reject",
  "admin.ideeCancella": "Delete",
  "admin.ideeConfCancella": "Delete this idea?",
  "admin.ideeErrore": "Operation failed.",
  "lingua.titolo": "Language",
  "lingua.scegli": "Choose the interface language",
  "lingua.traduci": "Translate public notes",
  "lingua.traduciDescr":
    "Translates other people's notes into the chosen language. Your own notes stay as you wrote them.",
  "home.desc":
    "The city's walls tell stories. Scan a wall's QR to discover it and leave your thought, anonymously too. Create a free account to read other people's thoughts, open authors' profiles and save your favourites.",
  "home.footer": "One anonymous thought per wall. Be kind.",
  "intro.salta": "Skip",
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
  "muro.chiuso": "This wall is closed: it is read-only now.",
  "muro.invitoTitolo": "This wall is alive",
  "muro.invitoTesto":
    "Create a free account to save the walls you visit and keep your favourite notes. You can still leave your thought without an account.",
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
  "editor.stile": "Style",
  "editor.stileScegli": "Choose a style",
  "editor.stileInfo": "Tap a style to apply it to your note.",
  "editor.stileServeAccount":
    "Choosing the note's style requires a free account. Sign in or sign up and come back: you'll find every style ready to use.",
  "editor.font": "Font",
  "editor.fontScegli": "Choose a font",
  "editor.fontInfo": "All fonts are available right away.",
  "editor.fontCatAMano": "Handwriting",
  "editor.fontCatScrittura": "Script",
  "editor.fontCatGraffiti": "Graffiti",
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
  "postit.ingrandisciFoto": "Tap to enlarge the photo",
  "postit.chiudiZoom": "Close the photo",
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
  "scegli.istruzioni": "Drag the middle to move, pull the bottom knobs for the length (5 to 30 seconds)",
  "scegli.riproduci": "▶ Play the part",
  "scegli.pausa": "⏸ Pause",
  "editor.canzoneRimuovi": "Remove the song",
  "editor.canzoneNonSupportata":
    "Link not recognised.",
  "editor.erroreFoto":
    "I could not upload the photo ({msg}). Try again or remove it.",
  "mod.nsfw": "This content looks sexual and is not allowed on the wall.",
  "mod.linguaggio":
    "Your thought contains offensive words and cannot be posted.",
  "mod.link": "Links are not allowed in thoughts. Music goes in the song field.",
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

  "muri.titolo": "Visited walls",
  "muri.vuotoOspite":
    "Scan the QR code of the first wall you come across: you'll save it here and can come back to read it whenever you like.",
  "muri.vuotoAccount":
    "You don't have any walls yet. Scan the QR code of the first wall you come across: it will stay in your account.",
  "muri.scansionaPrimo": "Scan your first wall",
  "muri.aggiungi": "＋ Add wall",
  "muri.neiTuoi": "✓ In your walls",
  "muri.salva": "☆ Save to your walls",
  "muri.mappaVuota": "The walls you visit will appear here on the map.",
  "muri.paginaPrecedente": "Previous page",
  "muri.paginaSuccessiva": "Next page",

  "comune.tornaHome": "Back to home",
  "comune.tornaHomeFreccia": "← Back to home",
  "comune.homeFreccia": "← Home",
  "comune.carico": "Loading…",
  "comune.attendi": "Please wait…",
  "comune.salvo": "Saving…",
  "comune.rimozioneFallita": "Removal failed. Please try again.",

  "crediti.ideaBy": "Idea by",
  "crediti.instagram": "Creator's Instagram profile",

  "profilo.noAccountTitolo": "Your profile",
  "profilo.noAccountTesto":
    "With an account you save the walls you visit and your favourite notes, and find everything on every device.",
  "profilo.ciao": "Hi, {nome} 👋",
  "profilo.tu": "You",
  "profilo.esci": "Log out",
  "profilo.muriEsplorati": "walls explored",
  "profilo.pensieriLasciati": "thoughts left",
  "profilo.preferiti": "favorites",
  "profilo.caricaFoto": "��� Upload a wall photo",
  "profilo.ilMioProfilo": "👁️ My profile",
  "profilo.impostazioni": "⚙️ Settings",
  "profilo.gestione": "Profile management",
  "profilo.gestioneNota":
    "Here you can change your photo, username and bio, and revisit the notes you left and saved.",
  "profilo.preferitiTitolo": "Favorite notes",
  "profilo.preferitiVuoto":
    "No favorites yet: tap the heart 🤍 on a note to save it here.",
  "profilo.rimuoviPreferito": "Remove from favorites",
  "profilo.fotoAlt": "Profile photo of {nome}",
  "profilo.privacyVisibile": "Your notes are shown on your public profile.",
  "profilo.privacyNascosti": "Your notes are hidden from your public profile.",
  "profilo.privacyGestisci": "Manage privacy in Settings →",
  "profilo.anteprimaApri": "👁️ Preview public profile",
  "profilo.anteprimaChiudi": "Close preview",
  "profilo.caricaAltri": "Show more notes",
  "profilo.mostrati": "{visti} of {totale} notes",
  "profilo.salvatiTitolo": "Saved notes",
  "profilo.leggiTutti": "Click to read them all →",
  "profilo.togglePostit": "Show your notes on your public board",
  "profilo.toggleSalvati": "Show your saved notes on your public board",
  "profilo.modifica": "Edit",
  "profilo.aggiorna": "Update",
  "profilo.aggiornaBio": "Update your bio",
  "profilo.scriviBio": "Write a bio",
  "profilo.cliccaFoto": "Click to change",
  "profilo.bioTitolo": "Biography",
  "profilo.elencoMiei": "{nome}’s notes",
  "profilo.elencoSalvati": "{nome}’s saved notes",
  "profilo.pagina": "Page {n} of {t}",
  "profilo.prec": "Previous",
  "profilo.succ": "Next",
  "profilo.tornaAlProfilo": "← Back to profile",
  "profilo.nienteDaMostrare": "There is nothing to show here.",
  "profilo.modificaProfilo": "Edit profile",
  "profilo.aggiungiBio": "Add biography",
  "profilo.cambiaFoto": "Change photo",

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
    "The walls you've visited: one tap shows it on the map, two taps open it.",

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
  "impost.profiloAltrove":
    "Photo, username and bio are edited from the «My profile» section.",
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

  "impost.tema": "Theme (experimental)",
  "impost.temaNota":
    "Try a different look for the app. For now only you, as admin, can see this; the choice stays on this device.",
  "tema.ambra": "Amber",
  "tema.graffiti": "Graffiti",
  "tema.disegnato": "Drawn",
  "tema.attivo": "Active",

  // ── Prototype layout (sperimenta-layout branch) ──
  "muri.suQuestoTelefono": "On this phone",
  "muri.dalTuAccount": "From your account",
  "fonda.passoDi": "Step {n} of {tot}",
  "fonda.passoDove": "Where",
  "fonda.passoVia": "The street",
  "fonda.passoPerche": "Why",
  "fonda.passoConferma": "Confirm",
  "fonda.viaConferma":
    "The street is derived from the point: if it is wrong, go back and move the pin.",
  "fonda.indietro": "Back",
  "fonda.avanti": "Next",
  "fonda.riepilogo": "Proposal summary",
  "fonda.riepilogoDove": "Chosen place",
  "fonda.riepilogoVia": "Street",
  "fonda.riepilogoPerche": "Why you open it",
  "campanella.titolo": "Notifications",
  "campanella.nuove": "{n} new",
  "campanella.vuote": "No notifications yet.",
  "campanella.accedi": "Log in to see your notifications.",
  "campanella.vediTutte": "See all notifications",
  "impost.interruttori": "Switches",
  "impost.temaGraffiti": "Graffiti theme",
  "impost.temaGraffitiNota":
    "Turn on for the graffiti theme, off for the paper (amber) theme.",

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

  "nav.mioCollettivo": "My collective",
  "gest.titolo": "My collective",
  "gest.intro": "From here you change the collective photo and manage its walls.",
  "gest.fotoTitolo": "Collective photo",
  "gest.fotoTesto": "The collective photo is square (people's photos stay round).",
  "gest.fotoCambia": "Change photo",
  "gest.fotoSalvata": "Photo updated.",
  "gest.fotoErrore": "The photo could not be changed.",
  "gest.muriTitolo": "Walls",
  "gest.principaleInfo": "The board is always open: only you write here.",
  "gest.eventoTitolo": "New event wall",
  "gest.eventoNome": "Event name",
  "gest.quando": "When?",
  "gest.eventoInizio": "Start (date and time)",
  "gest.eventoFine": "End (date and time)",
  "gest.eventoSpiega":
    "Set start and end: when the event ends the wall closes itself and becomes read-only, so nobody can write after it.",
  "gest.eventoSpiegaCampi":
    "Start and end accept both date and time. Example: 12/07/2026 at 21:00.",
  "gest.eventoApri": "Open event wall",
  "gest.eventoErroreNome": "Give the event a name.",
  "gest.eventoErroreDate": "The end must come after the start.",
  "gest.statoAperto": "Open",
  "gest.statoChiuso": "Closed",
  "gest.chiudi": "Close now",
  "gest.riapri": "Reopen",
  "gest.obbligatorio": "Only the collective account can manage this page.",
  "ev.titolo": "Event",
  "ev.dal": "From {inizio}",
  "ev.al": "to {fine}",
  "ev.chiusoDopoFine": "The event is over: the wall is read-only.",
  "ev.inCorso": "Event in progress",
  "home.pannello": "Your panel",
  "muro.titolo": "Your wall",
  "muro.sottotitolo":
    "Draw your wall background: it stays visible only to account holders.",
  "muro.personalizza": "Customise your wall",
  "muro.personalizzaBreve": "Customise wall",
  "muro.notaSfondo":
    "The drawing is private: people without an account cannot see it.",
  "muro.tela": "Drawing sheet",
  "muro.colore": "Colour",
  "muro.spessore": "Thickness",
  "muro.sfondo": "Sheet colour",
  "muro.gomma": "Eraser",
  "muro.matita": "Pencil",
  "muro.testo": "Text",
  "muro.scrivi": "Type here...",
  "muro.conferma": "Confirm",
  "muro.penna": "Pen",
  "muro.marker": "Highlighter",
  "muro.pennello": "Brush",
  "muro.spray": "Spray",
  "muro.annulla": "Undo",
  "muro.ripristina": "Redo",
  "muro.pulisci": "Clear",
  "muro.rimuovi": "Remove the wall",
  "muro.salva": "Save wall",
  "muro.salvando": "Saving...",
  "muro.salvato": "Wall saved.",
  "muro.rimosso": "Wall removed.",
  "muro.errore": "The wall could not be saved. Please try again.",
  "muro.caricamentoFallito":
    "The previous wall did not load: saving now will replace it.",
  "muro.chiudi": "Close",
  "invito.occhiello": "Account required",
  "invito.titolo": "Profiles are reserved",
  "invito.testo":
    "With a free account you open authors' profiles and see their personal wall, save the notes you like and keep your favourite walls. It takes seconds to create.",
  "invito.dopo": "Later",
  "invito.crea": "Create free account",
  "invito.entra": "Sign in",
};

const ES: Parole = {
  "nav.menu": "Menú",
  "nav.chiudi": "Cerrar el menú",
  "nav.apri": "Abrir el menú",
  "nav.home": "Inicio",
  "nav.tuoProfilo": "Tu perfil",
  "nav.mieiMuri": "Muros visitados",
  "nav.salvati": "Notas guardadas",
  "nav.scansiona": "Escanear QR",
  "nav.impostazioni": "Ajustes",
  "nav.admin": "Panel de administración",
  "nav.esci": "Cerrar sesión",
  "nav.creaAccount": "Crear cuenta gratis",
  "nav.ospite": "Invitado",
  "nav.ospiteDescr":
    "Crea una cuenta gratis para tu perfil, las notas guardadas y tus muros favoritos.",
  "nav.toccaProfilo": "Haz clic para ir a tu perfil",
  "nav.fondaMuro": "Funda un muro",
  "fonda.titolo": "Funda un muro",
  "fonda.spiegazione":
    "¿Crees que en algún lugar de la ciudad debería nacer un nuevo muro? Sugiérelo aquí. Marca en el mapa el punto exacto y cuéntanos por qué lo fundarías justo ahí: tu idea llegará a nosotros, los moderadores, y la valoraremos con atención.",
  "fonda.doveTitolo": "¿Dónde te gustaría el muro?",
  "fonda.doveAiuto":
    "Toca el mapa para marcar un solo punto: el lugar exacto donde imaginas el nuevo muro.",
  "fonda.usaPos": "📍 Usar mi ubicación",
  "fonda.togliPunto": "Quitar el punto",
  "fonda.puntoScelto": "Punto elegido: {lat}, {lng}",
  "fonda.nessunPunto": "Aún no hay punto: toca el mapa.",
  "fonda.viaEtichetta": "Calle:",
  "fonda.cercoVia": "Buscando la calle…",
  "fonda.viaNonTrovata": "calle no reconocida (las coordenadas están bien)",
  "fonda.percheTitolo": "¿Por qué lo fundarías aquí?",
  "fonda.perchePlaceholder":
    "Cuéntanos en pocas palabras por qué este lugar merecería un muro…",
  "fonda.contaParole": "{n}/{min} palabras",
  "fonda.errPunto": "Marca primero el punto en el mapa.",
  "fonda.errMotivo": "Escribe al menos {n} palabras para explicar tu idea.",
  "fonda.errInvio": "No se pudo enviar. Inténtalo de nuevo.",
  "fonda.invioInCorso": "Enviando…",
  "fonda.condividi": "Comparte tu idea",
  "fonda.notaFirmata":
    "La propuesta llegará a los moderadores firmada con tu cuenta.",
  "fonda.notaAnonima":
    "Puedes enviarla incluso sin cuenta: la propuesta llega a los moderadores de forma anónima.",
  "fonda.invitoAccount": "¿Quieres que tu idea lleve tu nombre?",
  "fonda.soloRegistrati": "Necesitas una cuenta",
  "fonda.soloRegistratiTesto":
    "Fundar un muro está reservado a quien tiene una cuenta gratuita: así la propuesta llega a los moderadores con tu nombre. Inicia sesión o crea una cuenta en unos segundos.",
  "fonda.vaiAccount": "Inicia sesión o crea una cuenta",
  "fonda.grazieTitolo": "¡Muchas gracias!",
  "fonda.grazieTesto":
    "Tu idea ha llegado a los moderadores: la valoraremos con atención. Gracias por el tiempo y el interés que has dedicado a Muri Parlanti.",
  "fonda.altra": "Propón otro lugar",
  "fonda.noGeo":
    "Tu dispositivo no permite obtener la ubicación: toca el mapa.",
  "fonda.posNonRilevata":
    "Ubicación no detectada: toca el mapa para marcar el punto.",
  "admin.ideeTitolo": "Ideas de los usuarios ({n})",
  "admin.ideeCarico": "Cargando ideas…",
  "admin.ideeVuote": "Aún no hay ideas.",
  "admin.ideeVia": "Calle",
  "admin.ideePerche": "Por qué",
  "admin.ideeQuando": "Enviada el",
  "admin.ideeAnonimo": "anónimo",
  "admin.ideeStatoNuova": "Nueva",
  "admin.ideeStatoApprovata": "Aprobada",
  "admin.ideeStatoRifiutata": "Rechazada",
  "admin.ideeApprova": "Aprobar",
  "admin.ideeRifiuta": "Rechazar",
  "admin.ideeCancella": "Eliminar",
  "admin.ideeConfCancella": "¿Eliminar esta idea?",
  "admin.ideeErrore": "La operación no se ha realizado.",
  "lingua.titolo": "Idioma",
  "lingua.scegli": "Elige el idioma de la interfaz",
  "lingua.traduci": "Traducir las notas públicas",
  "lingua.traduciDescr":
    "Traduce los pensamientos de otras personas al idioma elegido. Tus notas permanecen como las escribiste.",
  "home.desc":
    "Los muros de la ciudad cuentan historias. Escanea el QR de un muro para descubrirlo y deja tu pensamiento, también en anónimo. Crea una cuenta gratis para ver los pensamientos de otras personas, abrir los perfiles de los autores y guardar tus favoritos.",
  "home.footer": "Un pensamiento anónimo para cada muro. Sé amable.",
  "intro.salta": "Saltar",
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
  "muro.chiuso": "Este muro está cerrado: ahora es de solo lectura.",
  "muro.invitoTitolo": "Este muro está vivo",
  "muro.invitoTesto":
    "Crea una cuenta gratis para guardar los muros que visitas y conservar tus notas favoritas. También puedes dejar tu pensamiento sin cuenta.",
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
  "editor.stile": "Estilo",
  "editor.stileScegli": "Elige un estilo",
  "editor.stileInfo": "Toca un estilo para aplicarlo a tu post-it.",
  "editor.stileServeAccount":
    "Para elegir el estilo del post-it hace falta una cuenta gratis. Inicia sesión o regístrate y vuelve aquí: encontrarás todos los estilos listos para usar.",
  "editor.font": "Fuente",
  "editor.fontScegli": "Elige una fuente",
  "editor.fontInfo": "Todas las fuentes están disponibles al instante.",
  "editor.fontCatAMano": "A mano",
  "editor.fontCatScrittura": "Escritura",
  "editor.fontCatGraffiti": "Graffiti",
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
  "postit.ingrandisciFoto": "Toca para ampliar la foto",
  "postit.chiudiZoom": "Cerrar la foto",
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
  "scegli.istruzioni": "Arrastra el centro para mover, tira de las manoplas de abajo para la duración (de 5 a 30 segundos)",
  "scegli.riproduci": "▶ Escuchar la parte",
  "scegli.pausa": "⏸ Pausa",
  "editor.canzoneRimuovi": "Quitar la canción",
  "editor.canzoneNonSupportata":
    "Enlace no reconocido.",
  "editor.erroreFoto":
    "No he podido subir la foto ({msg}). Inténtalo de nuevo o quítala.",
  "mod.nsfw":
    "Este contenido parece de naturaleza sexual y no está permitido en el muro.",
  "mod.linguaggio":
    "Tu pensamiento contiene palabras ofensivas y no se puede publicar.",
  "mod.link":
    "No se permiten enlaces en los pensamientos. La música va en el campo canción.",
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

  "muri.titolo": "Muros visitados",
  "muri.vuotoOspite":
    "Escanea el QR del primer muro que encuentres: lo guardarás aquí y podrás volver a leerlo cuando quieras.",
  "muri.vuotoAccount":
    "Todavía no tienes ningún muro. Escanea el QR del primer muro que encuentres: se quedará en tu cuenta.",
  "muri.scansionaPrimo": "Escanea tu primer muro",
  "muri.aggiungi": "＋ Añadir muro",
  "muri.neiTuoi": "✓ En tus muros",
  "muri.salva": "☆ Guardar en tus muros",
  "muri.mappaVuota": "Los muros que visites aparecerán aquí en el mapa.",
  "muri.paginaPrecedente": "Página anterior",
  "muri.paginaSuccessiva": "Página siguiente",

  "comune.tornaHome": "Volver al inicio",
  "comune.tornaHomeFreccia": "← Volver al inicio",
  "comune.homeFreccia": "← Inicio",
  "comune.carico": "Cargando…",
  "comune.attendi": "Espera…",
  "comune.salvo": "Guardando…",
  "comune.rimozioneFallita": "No se pudo eliminar. Inténtalo de nuevo.",

  "crediti.ideaBy": "Idea de",
  "crediti.instagram": "Perfil de Instagram del creador",

  "profilo.noAccountTitolo": "Tu perfil",
  "profilo.noAccountTesto":
    "Con una cuenta guardas los muros que visitas y tus notas favoritas, y lo encuentras todo en cada dispositivo.",
  "profilo.ciao": "Hola, {nome} 👋",
  "profilo.tu": "Tú",
  "profilo.esci": "Salir",
  "profilo.muriEsplorati": "muros explorados",
  "profilo.pensieriLasciati": "pensamientos dejados",
  "profilo.preferiti": "favoritos",
  "profilo.caricaFoto": "📷 Sube la foto de un muro",
  "profilo.ilMioProfilo": "👁️ Mi perfil",
  "profilo.impostazioni": "⚙️ Ajustes",
  "profilo.gestione": "Gestión del perfil",
  "profilo.gestioneNota":
    "Desde aquí puedes cambiar tu foto, tu nombre de usuario y tu biografía, y revisar los post-it que has dejado y guardado.",
  "profilo.preferitiTitolo": "Post-it favoritos",
  "profilo.preferitiVuoto":
    "Ningún favorito: toca el corazón 🤍 en un post-it para guardarlo aquí.",
  "profilo.rimuoviPreferito": "Quitar de favoritos",
  "profilo.fotoAlt": "Foto de perfil de {nome}",
  "profilo.privacyVisibile": "Tus post-it se ven en tu perfil público.",
  "profilo.privacyNascosti": "Tus post-it están ocultos en tu perfil público.",
  "profilo.privacyGestisci": "Gestiona la privacidad en Ajustes →",
  "profilo.anteprimaApri": "👁️ Vista previa del perfil público",
  "profilo.anteprimaChiudi": "Cerrar vista previa",
  "profilo.caricaAltri": "Mostrar más post-it",
  "profilo.mostrati": "{visti} de {totale} post-it",
  "profilo.salvatiTitolo": "Post-it guardados",
  "profilo.leggiTutti": "Haz clic para leerlos todos →",
  "profilo.togglePostit": "Mostrar tus post-it en tu tablón público",
  "profilo.toggleSalvati": "Mostrar tus post-it guardados en tu tablón público",
  "profilo.modifica": "Editar",
  "profilo.aggiorna": "Actualizar",
  "profilo.aggiornaBio": "Actualiza tu bio",
  "profilo.scriviBio": "Escribe una bio",
  "profilo.cliccaFoto": "Haz clic para cambiar",
  "profilo.bioTitolo": "Biografía",
  "profilo.elencoMiei": "Los post-it de {nome}",
  "profilo.elencoSalvati": "Los post-it guardados de {nome}",
  "profilo.pagina": "Página {n} de {t}",
  "profilo.prec": "Anteriores",
  "profilo.succ": "Siguientes",
  "profilo.tornaAlProfilo": "← Volver al perfil",
  "profilo.nienteDaMostrare": "Aquí no hay nada que mostrar.",
  "profilo.modificaProfilo": "Editar perfil",
  "profilo.aggiungiBio": "Añadir biografía",
  "profilo.cambiaFoto": "Cambiar foto",

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
    "Los muros que has visitado: un toque lo muestra en el mapa, dos toques lo abren.",

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
  "impost.profiloAltrove":
    "La foto, el nombre de usuario y la biografía se editan desde la sección «Mi perfil».",
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

  "impost.tema": "Tema (experimental)",
  "impost.temaNota":
    "Prueba un aspecto distinto de la app. Por ahora solo tú, como administrador, lo ves; la elección queda en este dispositivo.",
  "tema.ambra": "Ámbar",
  "tema.graffiti": "Graffiti",
  "tema.disegnato": "Dibujado",
  "tema.attivo": "Activo",

  "muri.suQuestoTelefono": "En este teléfono",
  "muri.dalTuAccount": "Desde tu cuenta",
  "fonda.passoDi": "Paso {n} de {tot}",
  "fonda.passoDove": "Dónde",
  "fonda.passoVia": "La calle",
  "fonda.passoPerche": "Por qué",
  "fonda.passoConferma": "Confirmar",
  "fonda.viaConferma":
    "La calle se deduce del punto: si no es correcta, vuelve atrás y mueve el marcador.",
  "fonda.indietro": "Atrás",
  "fonda.avanti": "Siguiente",
  "fonda.riepilogo": "Resumen de la propuesta",
  "fonda.riepilogoDove": "Lugar elegido",
  "fonda.riepilogoVia": "Calle",
  "fonda.riepilogoPerche": "Por qué lo abres",
  "campanella.titolo": "Notificaciones",
  "campanella.nuove": "{n} nuevas",
  "campanella.vuote": "Todavía no hay notificaciones.",
  "campanella.accedi": "Inicia sesión para ver tus notificaciones.",
  "campanella.vediTutte": "Ver todas las notificaciones",
  "impost.interruttori": "Interruptores",
  "impost.temaGraffiti": "Tema Graffiti",
  "impost.temaGraffitiNota":
    "Actívalo para el tema graffiti, desactívalo para el tema papel (ámbar).",

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

  "nav.mioCollettivo": "Mi colectivo",
  "gest.titolo": "Mi colectivo",
  "gest.intro": "Desde aquí cambias la foto del colectivo y gestionas sus muros.",
  "gest.fotoTitolo": "Foto del colectivo",
  "gest.fotoTesto": "La foto del colectivo es cuadrada (las de las personas siguen redondas).",
  "gest.fotoCambia": "Cambiar foto",
  "gest.fotoSalvata": "Foto actualizada.",
  "gest.fotoErrore": "No se pudo cambiar la foto.",
  "gest.muriTitolo": "Los muros",
  "gest.principaleInfo": "El tablón siempre está abierto: aquí solo escribes tú.",
  "gest.eventoTitolo": "Nuevo muro de evento",
  "gest.eventoNome": "Nombre del evento",
  "gest.quando": "¿Cuándo?",
  "gest.eventoInizio": "Inicio (fecha y hora)",
  "gest.eventoFine": "Fin (fecha y hora)",
  "gest.eventoSpiega":
    "Indica inicio y fin: al terminar el evento el muro se cierra solo y pasa a solo lectura, así nadie puede escribir después.",
  "gest.eventoSpiegaCampi":
    "Inicio y fin aceptan fecha y hora. Ejemplo: 12/07/2026 a las 21:00.",
  "gest.eventoApri": "Abrir muro de evento",
  "gest.eventoErroreNome": "Ponle un nombre al evento.",
  "gest.eventoErroreDate": "El fin debe ser posterior al inicio.",
  "gest.statoAperto": "Abierto",
  "gest.statoChiuso": "Cerrado",
  "gest.chiudi": "Cerrar ahora",
  "gest.riapri": "Reabrir",
  "gest.obbligatorio": "Solo la cuenta del colectivo puede gestionar esta página.",
  "ev.titolo": "Evento",
  "ev.dal": "Del {inizio}",
  "ev.al": "al {fine}",
  "ev.chiusoDopoFine": "El evento ha terminado: el muro es de solo lectura.",
  "ev.inCorso": "Evento en curso",
  "home.pannello": "Tu panel",
  "muro.titolo": "Tu muro",
  "muro.sottotitolo":
    "Dibuja el fondo de tu muro: solo lo ven quienes tienen cuenta.",
  "muro.personalizza": "Personaliza tu muro",
  "muro.personalizzaBreve": "Personalizar muro",
  "muro.notaSfondo":
    "El dibujo es privado: quien no tiene cuenta no puede verlo.",
  "muro.tela": "Hoja de dibujo",
  "muro.colore": "Color",
  "muro.spessore": "Grosor",
  "muro.sfondo": "Color de la hoja",
  "muro.gomma": "Goma",
  "muro.matita": "Lápiz",
  "muro.testo": "Texto",
  "muro.scrivi": "Escribe aquí...",
  "muro.conferma": "Confirmar",
  "muro.penna": "Bolígrafo",
  "muro.marker": "Rotulador",
  "muro.pennello": "Pincel",
  "muro.spray": "Espray",
  "muro.annulla": "Deshacer",
  "muro.ripristina": "Rehacer",
  "muro.pulisci": "Limpiar",
  "muro.rimuovi": "Eliminar el muro",
  "muro.salva": "Guardar el muro",
  "muro.salvando": "Guardando...",
  "muro.salvato": "Muro guardado.",
  "muro.rimosso": "Muro eliminado.",
  "muro.errore": "No se ha podido guardar el muro. Inténtalo de nuevo.",
  "muro.caricamentoFallito":
    "El muro anterior no se ha cargado: si guardas ahora, lo sustituirás.",
  "muro.chiudi": "Cerrar",
  "invito.occhiello": "Hace falta una cuenta",
  "invito.titolo": "Los perfiles son reservados",
  "invito.testo":
    "Con una cuenta gratuita abres los perfiles de los autores y ves su muro personal, guardas los post-it que te gustan y conservas tus muros favoritos. Se crea en pocos segundos.",
  "invito.dopo": "Más tarde",
  "invito.crea": "Crear cuenta gratuita",
  "invito.entra": "Entrar",
};

const FR: Parole = {
  "nav.menu": "Menu",
  "nav.chiudi": "Fermer le menu",
  "nav.apri": "Ouvrir le menu",
  "nav.home": "Accueil",
  "nav.tuoProfilo": "Votre profil",
  "nav.mieiMuri": "Murs visités",
  "nav.salvati": "Notes enregistrées",
  "nav.scansiona": "Scanner un QR",
  "nav.impostazioni": "Réglages",
  "nav.admin": "Panneau admin",
  "nav.esci": "Se déconnecter",
  "nav.creaAccount": "Créer un compte gratuit",
  "nav.ospite": "Invité",
  "nav.ospiteDescr":
    "Créez un compte gratuit pour votre profil, vos notes enregistrées et vos murs favoris.",
  "nav.toccaProfilo": "Cliquez pour aller à votre profil",
  "nav.fondaMuro": "Fonder un mur",
  "fonda.titolo": "Fonder un mur",
  "fonda.spiegazione":
    "Vous pensez qu'un nouveau mur devrait naître quelque part en ville ? Suggérez-le ici. Indiquez le point exact sur la carte et dites-nous pourquoi vous le fonderiez là : votre idée nous parviendra, à nous les modérateurs, et nous l'étudierons attentivement.",
  "fonda.doveTitolo": "Où aimeriez-vous ce mur ?",
  "fonda.doveAiuto":
    "Touchez la carte pour marquer un seul point : l'endroit exact où vous imaginez le nouveau mur.",
  "fonda.usaPos": "📍 Utiliser ma position",
  "fonda.togliPunto": "Retirer le point",
  "fonda.puntoScelto": "Point choisi : {lat}, {lng}",
  "fonda.nessunPunto": "Pas encore de point : touchez la carte.",
  "fonda.viaEtichetta": "Rue :",
  "fonda.cercoVia": "Recherche de la rue…",
  "fonda.viaNonTrovata": "rue non reconnue (les coordonnées suffisent)",
  "fonda.percheTitolo": "Pourquoi le fonderiez-vous ici ?",
  "fonda.perchePlaceholder":
    "Dites-nous en quelques mots pourquoi cet endroit mériterait un mur…",
  "fonda.contaParole": "{n}/{min} mots",
  "fonda.errPunto": "Indiquez d'abord le point sur la carte.",
  "fonda.errMotivo": "Écrivez au moins {n} mots pour expliquer votre idée.",
  "fonda.errInvio": "Envoi échoué. Réessayez.",
  "fonda.invioInCorso": "Envoi…",
  "fonda.condividi": "Partagez votre idée",
  "fonda.notaFirmata":
    "La proposition parviendra aux modérateurs, signée avec votre compte.",
  "fonda.notaAnonima":
    "Vous pouvez l'envoyer même sans compte : la proposition parvient aux modérateurs de façon anonyme.",
  "fonda.invitoAccount": "Vous voulez que votre idée porte votre nom ?",
  "fonda.soloRegistrati": "Un compte est nécessaire",
  "fonda.soloRegistratiTesto":
    "Fonder un mur est réservé à celles et ceux qui ont un compte gratuit : ainsi votre proposition parvient aux modérateurs sous votre nom. Connectez-vous ou créez un compte en quelques secondes.",
  "fonda.vaiAccount": "Se connecter ou créer un compte",
  "fonda.grazieTitolo": "Merci beaucoup !",
  "fonda.grazieTesto":
    "Votre idée est parvenue aux modérateurs : nous l'étudierons attentivement. Merci pour le temps et l'intérêt que vous consacrez à Muri Parlanti.",
  "fonda.altra": "Proposer un autre endroit",
  "fonda.noGeo":
    "Votre appareil ne permet pas de détecter la position : touchez la carte.",
  "fonda.posNonRilevata":
    "Position non détectée : touchez la carte pour indiquer le point.",
  "admin.ideeTitolo": "Idées des utilisateurs ({n})",
  "admin.ideeCarico": "Chargement des idées…",
  "admin.ideeVuote": "Aucune idée pour le moment.",
  "admin.ideeVia": "Rue",
  "admin.ideePerche": "Pourquoi",
  "admin.ideeQuando": "Envoyée le",
  "admin.ideeAnonimo": "anonyme",
  "admin.ideeStatoNuova": "Nouvelle",
  "admin.ideeStatoApprovata": "Approuvée",
  "admin.ideeStatoRifiutata": "Refusée",
  "admin.ideeApprova": "Approuver",
  "admin.ideeRifiuta": "Refuser",
  "admin.ideeCancella": "Supprimer",
  "admin.ideeConfCancella": "Supprimer cette idée ?",
  "admin.ideeErrore": "L'opération a échoué.",
  "lingua.titolo": "Langue",
  "lingua.scegli": "Choisissez la langue de l'interface",
  "lingua.traduci": "Traduire les notes publiques",
  "lingua.traduciDescr":
    "Traduit les pensées des autres dans la langue choisie. Vos notes restent telles que vous les avez écrites.",
  "home.desc":
    "Les murs de la ville racontent des histoires. Scannez le QR d'un mur pour le découvrir et laissez votre pensée, même anonymement. Créez un compte gratuit pour lire les pensées des autres, ouvrir les profils des auteurs et enregistrer vos favoris.",
  "home.footer": "Une pensée anonyme par mur. Soyez bienveillant.",
  "intro.salta": "Passer",
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
  "muro.chiuso": "Ce mur est fermé : il est désormais en lecture seule.",
  "muro.invitoTitolo": "Ce mur est vivant",
  "muro.invitoTesto":
    "Créez un compte gratuit pour enregistrer les murs que vous visitez et garder vos notes préférées. Vous pouvez aussi laisser votre pensée sans compte.",
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
  "editor.stile": "Style",
  "editor.stileScegli": "Choisis un style",
  "editor.stileInfo": "Touche un style pour l'appliquer à ton post-it.",
  "editor.stileServeAccount":
    "Pour choisir le style du post-it, il faut un compte gratuit. Connecte-toi ou inscris-toi puis reviens ici : tu trouveras tous les styles prêts à l'emploi.",
  "editor.font": "Police",
  "editor.fontScegli": "Choisir une police",
  "editor.fontInfo": "Toutes les polices sont disponibles immédiatement.",
  "editor.fontCatAMano": "À la main",
  "editor.fontCatScrittura": "Écriture",
  "editor.fontCatGraffiti": "Graffiti",
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
  "postit.ingrandisciFoto": "Touche pour agrandir la photo",
  "postit.chiudiZoom": "Fermer la photo",
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
  "scegli.istruzioni": "Fais glisser au centre pour déplacer, tire les poignées en bas pour la durée (de 5 à 30 secondes)",
  "scegli.riproduci": "▶ Écouter la partie",
  "scegli.pausa": "⏸ Pause",
  "editor.canzoneRimuovi": "Retirer la chanson",
  "editor.canzoneNonSupportata":
    "Lien non reconnu.",
  "editor.erroreFoto":
    "Je n'ai pas pu envoyer la photo ({msg}). Réessayez ou retirez-la.",
  "mod.nsfw":
    "Ce contenu semble de nature sexuelle et n'est pas autorisé sur le mur.",
  "mod.linguaggio":
    "Votre pensée contient des mots offensants et ne peut pas être publiée.",
  "mod.link":
    "Les liens ne sont pas autorisés dans les pensées. La musique va dans le champ chanson.",
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

  "muri.titolo": "Murs visités",
  "muri.vuotoOspite":
    "Scannez le QR du premier mur que vous croisez : vous le sauvegarderez ici et pourrez le relire quand vous voulez.",
  "muri.vuotoAccount":
    "Vous n'avez encore aucun mur. Scannez le QR du premier mur que vous croisez : il restera dans votre compte.",
  "muri.scansionaPrimo": "Scannez votre premier mur",
  "muri.aggiungi": "＋ Ajouter un mur",
  "muri.neiTuoi": "✓ Dans vos murs",
  "muri.salva": "☆ Enregistrer dans vos murs",
  "muri.mappaVuota": "Les murs que vous visitez apparaîtront ici sur la carte.",
  "muri.paginaPrecedente": "Page précédente",
  "muri.paginaSuccessiva": "Page suivante",

  "comune.tornaHome": "Retour à l'accueil",
  "comune.tornaHomeFreccia": "← Retour à l'accueil",
  "comune.homeFreccia": "← Accueil",
  "comune.carico": "Chargement…",
  "comune.attendi": "Patientez…",
  "comune.salvo": "Enregistrement…",
  "comune.rimozioneFallita": "Échec de la suppression. Réessayez.",

  "crediti.ideaBy": "Idée de",
  "crediti.instagram": "Profil Instagram du créateur",

  "profilo.noAccountTitolo": "Votre profil",
  "profilo.noAccountTesto":
    "Avec un compte, vous sauvegardez les murs que vous visitez et vos notes préférées, et vous retrouvez tout sur chaque appareil.",
  "profilo.ciao": "Salut, {nome} 👋",
  "profilo.tu": "Vous",
  "profilo.esci": "Déconnexion",
  "profilo.muriEsplorati": "murs explorés",
  "profilo.pensieriLasciati": "pensées laissées",
  "profilo.preferiti": "favoris",
  "profilo.caricaFoto": "📷 Téléverser la photo d'un mur",
  "profilo.ilMioProfilo": "����️ Mon profil",
  "profilo.impostazioni": "⚙️ Paramètres",
  "profilo.gestione": "Gestion du profil",
  "profilo.gestioneNota":
    "D'ici, vous pouvez changer votre photo, votre nom d'utilisateur et votre bio, et revoir les post-it que vous avez laissés et enregistrés.",
  "profilo.preferitiTitolo": "Post-it favoris",
  "profilo.preferitiVuoto":
    "Aucun favori : touchez le cœur 🤍 sur un post-it pour l'enregistrer ici.",
  "profilo.rimuoviPreferito": "Retirer des favoris",
  "profilo.fotoAlt": "Photo de profil de {nome}",
  "profilo.privacyVisibile": "Vos post-it sont visibles sur votre profil public.",
  "profilo.privacyNascosti": "Vos post-it sont masqués de votre profil public.",
  "profilo.privacyGestisci": "Gérer la confidentialité dans Réglages →",
  "profilo.anteprimaApri": "👁️ Aperçu du profil public",
  "profilo.anteprimaChiudi": "Fermer l'aperçu",
  "profilo.caricaAltri": "Afficher plus de post-it",
  "profilo.mostrati": "{visti} sur {totale} post-it",
  "profilo.salvatiTitolo": "Post-it enregistrés",
  "profilo.leggiTutti": "Cliquez pour les lire tous →",
  "profilo.togglePostit": "Afficher vos post-it sur votre tableau public",
  "profilo.toggleSalvati": "Afficher vos post-it enregistrés sur votre tableau public",
  "profilo.modifica": "Modifier",
  "profilo.aggiorna": "Mettre à jour",
  "profilo.aggiornaBio": "Mettre à jour votre bio",
  "profilo.scriviBio": "Écrire une bio",
  "profilo.cliccaFoto": "Cliquez pour changer",
  "profilo.bioTitolo": "Biographie",
  "profilo.elencoMiei": "Les post-it de {nome}",
  "profilo.elencoSalvati": "Les post-it enregistrés de {nome}",
  "profilo.pagina": "Page {n} sur {t}",
  "profilo.prec": "Précédents",
  "profilo.succ": "Suivants",
  "profilo.tornaAlProfilo": "← Retour au profil",
  "profilo.nienteDaMostrare": "Il n’y a rien à afficher ici.",
  "profilo.modificaProfilo": "Modifier le profil",
  "profilo.aggiungiBio": "Ajouter une biographie",
  "profilo.cambiaFoto": "Changer la photo",

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
    "Les murs que vous avez visités : un appui l'affiche sur la carte, deux appuis l'ouvrent.",

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
  "impost.profiloAltrove":
    "La photo, le nom d'utilisateur et la bio se modifient depuis la section « Mon profil ».",
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

  "impost.tema": "Thème (expérimental)",
  "impost.temaNota":
    "Essayez un autre look de l'app. Pour l'instant, vous seul, en tant qu'admin, le voyez ; le choix reste sur cet appareil.",
  "tema.ambra": "Ambre",
  "tema.graffiti": "Graffiti",
  "tema.disegnato": "Dessiné",
  "tema.attivo": "Actif",

  "muri.suQuestoTelefono": "Sur ce téléphone",
  "muri.dalTuAccount": "Depuis ton compte",
  "fonda.passoDi": "Étape {n} sur {tot}",
  "fonda.passoDove": "Où",
  "fonda.passoVia": "La rue",
  "fonda.passoPerche": "Pourquoi",
  "fonda.passoConferma": "Confirmer",
  "fonda.viaConferma":
    "La rue est déduite du point : si elle est fausse, reviens en arrière et déplace l'épingle.",
  "fonda.indietro": "Retour",
  "fonda.avanti": "Suivant",
  "fonda.riepilogo": "Récapitulatif de la proposition",
  "fonda.riepilogoDove": "Lieu choisi",
  "fonda.riepilogoVia": "Rue",
  "fonda.riepilogoPerche": "Pourquoi tu l'ouvres",
  "campanella.titolo": "Notifications",
  "campanella.nuove": "{n} nouvelles",
  "campanella.vuote": "Aucune notification pour l'instant.",
  "campanella.accedi": "Connecte-toi pour voir tes notifications.",
  "campanella.vediTutte": "Voir toutes les notifications",
  "impost.interruttori": "Interrupteurs",
  "impost.temaGraffiti": "Thème Graffiti",
  "impost.temaGraffitiNota":
    "Active pour le thème graffiti, désactive pour le thème papier (ambre).",

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
  "reimposta.phPassword": "Nouveau mot de passe (min 6 caract��res)",
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

  "nav.mioCollettivo": "Mon collectif",
  "gest.titolo": "Mon collectif",
  "gest.intro": "D'ici tu changes la photo du collectif et gères ses murs.",
  "gest.fotoTitolo": "Photo du collectif",
  "gest.fotoTesto": "La photo du collectif est carrée (celles des personnes restent rondes).",
  "gest.fotoCambia": "Changer la photo",
  "gest.fotoSalvata": "Photo mise à jour.",
  "gest.fotoErrore": "Impossible de changer la photo.",
  "gest.muriTitolo": "Les murs",
  "gest.principaleInfo": "Le mur principal reste toujours ouvert : toi seul y écris.",
  "gest.eventoTitolo": "Nouveau mur d'événement",
  "gest.eventoNome": "Nom de l'événement",
  "gest.quando": "Quand ?",
  "gest.eventoInizio": "Début (date et heure)",
  "gest.eventoFine": "Fin (date et heure)",
  "gest.eventoSpiega":
    "Indique début et fin : à la fin de l'événement le mur se ferme tout seul et passe en lecture seule, ainsi personne ne peut plus écrire après.",
  "gest.eventoSpiegaCampi":
    "Début et fin acceptent la date et l'heure. Exemple : 12/07/2026 à 21h00.",
  "gest.eventoApri": "Ouvrir le mur d'événement",
  "gest.eventoErroreNome": "Donne un nom à l'événement.",
  "gest.eventoErroreDate": "La fin doit être après le début.",
  "gest.statoAperto": "Ouvert",
  "gest.statoChiuso": "Fermé",
  "gest.chiudi": "Fermer maintenant",
  "gest.riapri": "Réouvrir",
  "gest.obbligatorio": "Seul le compte du collectif peut gérer cette page.",
  "ev.titolo": "Événement",
  "ev.dal": "Du {inizio}",
  "ev.al": "au {fine}",
  "ev.chiusoDopoFine": "L'événement est terminé : le mur est en lecture seule.",
  "ev.inCorso": "Événement en cours",
  "home.pannello": "Ton panneau",
  "muro.titolo": "Ton mur",
  "muro.sottotitolo":
    "Dessine le fond de ton mur : il reste visible aux seuls titulaires d'un compte.",
  "muro.personalizza": "Personnalise ton mur",
  "muro.personalizzaBreve": "Personnaliser le mur",
  "muro.notaSfondo":
    "Le dessin est privé : les personnes sans compte ne peuvent pas le voir.",
  "muro.tela": "Feuille de dessin",
  "muro.colore": "Couleur",
  "muro.spessore": "Épaisseur",
  "muro.sfondo": "Couleur de la feuille",
  "muro.gomma": "Gomme",
  "muro.matita": "Crayon",
  "muro.testo": "Texte",
  "muro.scrivi": "Écrivez ici...",
  "muro.conferma": "Confirmer",
  "muro.penna": "Stylo",
  "muro.marker": "Surligneur",
  "muro.pennello": "Pinceau",
  "muro.spray": "Aérosol",
  "muro.annulla": "Annuler",
  "muro.ripristina": "Rétablir",
  "muro.pulisci": "Effacer",
  "muro.rimuovi": "Supprimer le mur",
  "muro.salva": "Enregistrer le mur",
  "muro.salvando": "Enregistrement...",
  "muro.salvato": "Mur enregistré.",
  "muro.rimosso": "Mur supprimé.",
  "muro.errore": "Le mur n'a pas pu être enregistré. Réessayez.",
  "muro.caricamentoFallito":
    "Le mur précédent ne s'est pas chargé : en enregistrant maintenant, vous le remplacerez.",
  "muro.chiudi": "Fermer",
  "invito.occhiello": "Compte requis",
  "invito.titolo": "Les profils sont réservés",
  "invito.testo":
    "Avec un compte gratuit, tu ouvres les profils des auteurs et vois leur mur personnel, tu enregistres les post-it qui te plaisent et tu gardes tes murs préférés. Il se crée en quelques secondes.",
  "invito.dopo": "Plus tard",
  "invito.crea": "Créer un compte gratuit",
  "invito.entra": "Se connecter",
};

const DE: Parole = {
  "nav.menu": "Menü",
  "nav.chiudi": "Menü schließen",
  "nav.apri": "Menü öffnen",
  "nav.home": "Start",
  "nav.tuoProfilo": "Dein Profil",
  "nav.mieiMuri": "Besuchte Wände",
  "nav.salvati": "Gespeicherte Notizen",
  "nav.scansiona": "QR scannen",
  "nav.impostazioni": "Einstellungen",
  "nav.admin": "Admin-Bereich",
  "nav.esci": "Abmelden",
  "nav.creaAccount": "Kostenloses Konto erstellen",
  "nav.ospite": "Gast",
  "nav.ospiteDescr":
    "Erstelle ein kostenloses Konto für Profil, gespeicherte Notizen und Lieblingswände.",
  "nav.toccaProfilo": "Klicken, um zu deinem Profil zu gehen",
  "nav.fondaMuro": "Mauer gründen",
  "fonda.titolo": "Eine Mauer gründen",
  "fonda.spiegazione":
    "Findest du, dass irgendwo in der Stadt eine neue Mauer entstehen sollte? Schlage es hier vor. Markiere den genauen Punkt auf der Karte und erzähl uns, warum du sie genau dort gründen würdest: deine Idee erreicht uns Moderatoren, und wir prüfen sie sorgfältig.",
  "fonda.doveTitolo": "Wo soll die Mauer sein?",
  "fonda.doveAiuto":
    "Tippe auf die Karte, um einen einzigen Punkt zu markieren: den genauen Ort, an dem du die neue Mauer siehst.",
  "fonda.usaPos": "📍 Meinen Standort nutzen",
  "fonda.togliPunto": "Punkt entfernen",
  "fonda.puntoScelto": "Gewählter Punkt: {lat}, {lng}",
  "fonda.nessunPunto": "Noch kein Punkt: tippe auf die Karte.",
  "fonda.viaEtichetta": "Straße:",
  "fonda.cercoVia": "Straße wird gesucht…",
  "fonda.viaNonTrovata": "Straße nicht erkannt (die Koordinaten genügen)",
  "fonda.percheTitolo": "Warum würdest du sie hier gründen?",
  "fonda.perchePlaceholder":
    "Erzähl uns in wenigen Worten, warum dieser Ort eine Mauer verdient…",
  "fonda.contaParole": "{n}/{min} Wörter",
  "fonda.errPunto": "Markiere zuerst den Punkt auf der Karte.",
  "fonda.errMotivo": "Schreibe mindestens {n} Wörter, um deine Idee zu erklären.",
  "fonda.errInvio": "Senden fehlgeschlagen. Versuch es erneut.",
  "fonda.invioInCorso": "Senden…",
  "fonda.condividi": "Teile deine Idee",
  "fonda.notaFirmata":
    "Der Vorschlag erreicht die Moderatoren mit deinem Konto signiert.",
  "fonda.notaAnonima":
    "Du kannst ihn auch ohne Konto senden: der Vorschlag erreicht die Moderatoren anonym.",
  "fonda.invitoAccount": "Soll deine Idee deinen Namen tragen?",
  "fonda.soloRegistrati": "Ein Konto ist nötig",
  "fonda.soloRegistratiTesto":
    "Eine Mauer zu gründen ist Leuten mit einem kostenlosen Konto vorbehalten: so erreicht dein Vorschlag die Moderatoren unter deinem Namen. Melde dich an oder erstelle in Sekunden ein Konto.",
  "fonda.vaiAccount": "Anmelden oder Konto erstellen",
  "fonda.grazieTitolo": "Vielen Dank!",
  "fonda.grazieTesto":
    "Deine Idee ist bei den Moderatoren angekommen: wir prüfen sie sorgfältig. Danke für die Zeit und das Interesse, die du Muri Parlanti widmest.",
  "fonda.altra": "Anderen Ort vorschlagen",
  "fonda.noGeo":
    "Dein Gerät erlaubt keine Standortermittlung: tippe auf die Karte.",
  "fonda.posNonRilevata":
    "Standort nicht erkannt: tippe auf die Karte, um den Punkt zu markieren.",
  "admin.ideeTitolo": "Ideen der Nutzer ({n})",
  "admin.ideeCarico": "Ideen werden geladen…",
  "admin.ideeVuote": "Noch keine Ideen.",
  "admin.ideeVia": "Straße",
  "admin.ideePerche": "Warum",
  "admin.ideeQuando": "Gesendet am",
  "admin.ideeAnonimo": "anonym",
  "admin.ideeStatoNuova": "Neu",
  "admin.ideeStatoApprovata": "Genehmigt",
  "admin.ideeStatoRifiutata": "Abgelehnt",
  "admin.ideeApprova": "Genehmigen",
  "admin.ideeRifiuta": "Ablehnen",
  "admin.ideeCancella": "Löschen",
  "admin.ideeConfCancella": "Diese Idee löschen?",
  "admin.ideeErrore": "Vorgang fehlgeschlagen.",
  "lingua.titolo": "Sprache",
  "lingua.scegli": "Sprache der Oberfläche wählen",
  "lingua.traduci": "Öffentliche Notizen übersetzen",
  "lingua.traduciDescr":
    "Übersetzt die Gedanken anderer in die gewählte Sprache. Deine eigenen Notizen bleiben, wie du sie geschrieben hast.",
  "home.desc":
    "Die Wände der Stadt erzählen Geschichten. Scanne den QR-Code einer Wand, um sie zu entdecken, und hinterlasse deinen Gedanken – auch anonym. Erstelle ein kostenloses Konto, um die Gedanken anderer zu lesen, Profile der Autorinnen und Autoren zu öffnen und Favoriten zu speichern.",
  "home.footer": "Ein anonymer Gedanke pro Wand. Sei freundlich.",
  "intro.salta": "Überspringen",
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
  "muro.chiuso": "Diese Wand ist geschlossen: sie ist jetzt schreibgeschützt.",
  "muro.invitoTitolo": "Diese Wand lebt",
  "muro.invitoTesto":
    "Erstelle ein kostenloses Konto, um besuchte Wände zu speichern und deine Lieblingsnotizen zu behalten. Du kannst deinen Gedanken auch ohne Konto hinterlassen.",
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
  "editor.stile": "Stil",
  "editor.stileScegli": "Waehle einen Stil",
  "editor.stileInfo": "Tippe einen Stil an, um ihn auf dein Post-it anzuwenden.",
  "editor.stileServeAccount":
    "Um den Stil des Post-its zu wählen, brauchst du ein kostenloses Konto. Melde dich an oder registriere dich und komm zurück: Du findest alle Stile sofort einsatzbereit.",
  "editor.font": "Schriftart",
  "editor.fontScegli": "Eine Schriftart wählen",
  "editor.fontInfo": "Alle Schriftarten sind sofort verfügbar.",
  "editor.fontCatAMano": "Handschrift",
  "editor.fontCatScrittura": "Schreibschrift",
  "editor.fontCatGraffiti": "Graffiti",
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
  "postit.ingrandisciFoto": "Zum Vergrößern des Fotos tippen",
  "postit.chiudiZoom": "Foto schließen",
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
  "scegli.istruzioni": "Ziehe die Mitte zum Verschieben, ziehe die Griffe unten für die Länge (5 bis 30 Sekunden)",
  "scegli.riproduci": "▶ Teil anhören",
  "scegli.pausa": "⏸ Pause",
  "editor.canzoneRimuovi": "Song entfernen",
  "editor.canzoneNonSupportata":
    "Link nicht erkannt.",
  "editor.erroreFoto":
    "Ich konnte das Foto nicht hochladen ({msg}). Versuche es erneut oder entferne es.",
  "mod.nsfw":
    "Dieser Inhalt wirkt sexuell und ist an der Wand nicht erlaubt.",
  "mod.linguaggio":
    "Dein Gedanke enthält beleidigende Worte und kann nicht veröffentlicht werden.",
  "mod.link":
    "Links sind in Gedanken nicht erlaubt. Musik gehört in das Lied-Feld.",
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

  "muri.titolo": "Besuchte Wände",
  "muri.vuotoOspite":
    "Scanne den QR-Code der ersten Wand, die du findest: Du speicherst sie hier und kannst sie jederzeit wieder lesen.",
  "muri.vuotoAccount":
    "Du hast noch keine Wand. Scanne den QR-Code der ersten Wand, die du findest: Sie bleibt in deinem Konto.",
  "muri.scansionaPrimo": "Scanne deine erste Wand",
  "muri.aggiungi": "＋ Wand hinzufügen",
  "muri.neiTuoi": "✓ In deinen Wänden",
  "muri.salva": "☆ In deinen Wänden speichern",
  "muri.mappaVuota": "Die Wände, die du besuchst, erscheinen hier auf der Karte.",
  "muri.paginaPrecedente": "Vorherige Seite",
  "muri.paginaSuccessiva": "Nächste Seite",

  "comune.tornaHome": "Zurück zur Startseite",
  "comune.tornaHomeFreccia": "← Zurück zur Startseite",
  "comune.homeFreccia": "← Startseite",
  "comune.carico": "Lädt…",
  "comune.attendi": "Warte…",
  "comune.salvo": "Speichern…",
  "comune.rimozioneFallita": "Entfernen fehlgeschlagen. Versuche es erneut.",

  "crediti.ideaBy": "Idee von",
  "crediti.instagram": "Instagram-Profil des Erstellers",

  "profilo.noAccountTitolo": "Dein Profil",
  "profilo.noAccountTesto":
    "Mit einem Konto speicherst du die Wände, die du besuchst, und deine Lieblingsnotizen, und findest alles auf jedem Gerät wieder.",
  "profilo.ciao": "Hallo, {nome} 👋",
  "profilo.tu": "Du",
  "profilo.esci": "Abmelden",
  "profilo.muriEsplorati": "erkundete Wände",
  "profilo.pensieriLasciati": "hinterlassene Gedanken",
  "profilo.preferiti": "Favoriten",
  "profilo.caricaFoto": "📷 Foto einer Wand hochladen",
  "profilo.ilMioProfilo": "👁️ Mein Profil",
  "profilo.impostazioni": "���️ Einstellungen",
  "profilo.gestione": "Profilverwaltung",
  "profilo.gestioneNota":
    "Hier kannst du Foto, Benutzername und Bio ändern und die Post-its ansehen, die du hinterlassen und gespeichert hast.",
  "profilo.preferitiTitolo": "Lieblings-Post-its",
  "profilo.preferitiVuoto":
    "Keine Favoriten: Tippe auf das Herz 🤍 bei einem Post-it, um es hier zu speichern.",
  "profilo.rimuoviPreferito": "Aus Favoriten entfernen",
  "profilo.fotoAlt": "Profilfoto von {nome}",
  "profilo.privacyVisibile": "Deine Post-its sind im öffentlichen Profil sichtbar.",
  "profilo.privacyNascosti": "Deine Post-its sind im öffentlichen Profil versteckt.",
  "profilo.privacyGestisci": "Datenschutz in den Einstellungen verwalten →",
  "profilo.anteprimaApri": "👁️ Vorschau des öffentlichen Profils",
  "profilo.anteprimaChiudi": "Vorschau schließen",
  "profilo.caricaAltri": "Mehr Post-its anzeigen",
  "profilo.mostrati": "{visti} von {totale} Post-its",
  "profilo.salvatiTitolo": "Gespeicherte Post-its",
  "profilo.leggiTutti": "Klicke, um alle zu lesen →",
  "profilo.togglePostit": "Deine Post-its auf deiner öffentlichen Pinnwand zeigen",
  "profilo.toggleSalvati": "Deine gespeicherten Post-its auf deiner öffentlichen Pinnwand zeigen",
  "profilo.modifica": "Bearbeiten",
  "profilo.aggiorna": "Aktualisieren",
  "profilo.aggiornaBio": "Bio aktualisieren",
  "profilo.scriviBio": "Eine Bio schreiben",
  "profilo.cliccaFoto": "Zum Ändern klicken",
  "profilo.bioTitolo": "Biografie",
  "profilo.elencoMiei": "Die Post-its von {nome}",
  "profilo.elencoSalvati": "Die gespeicherten Post-its von {nome}",
  "profilo.pagina": "Seite {n} von {t}",
  "profilo.prec": "Zurück",
  "profilo.succ": "Weiter",
  "profilo.tornaAlProfilo": "← Zurück zum Profil",
  "profilo.nienteDaMostrare": "Hier gibt es nichts zu sehen.",
  "profilo.modificaProfilo": "Profil bearbeiten",
  "profilo.aggiungiBio": "Biografie hinzufügen",
  "profilo.cambiaFoto": "Foto ändern",

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
    "Die Wände, die du besucht hast: Ein Tipp zeigt sie auf der Karte, zwei Tipps öffnen sie.",

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
  "impost.profiloAltrove":
    "Foto, Benutzername und Bio änderst du im Bereich « Mein Profil ».",
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

  "impost.tema": "Design (experimentell)",
  "impost.temaNota":
    "Probiere ein anderes Aussehen der App. Vorerst siehst nur du als Admin das; die Wahl bleibt auf diesem Gerät.",
  "tema.ambra": "Bernstein",
  "tema.graffiti": "Graffiti",
  "tema.disegnato": "Gezeichnet",
  "tema.attivo": "Aktiv",

  "muri.suQuestoTelefono": "Auf diesem Telefon",
  "muri.dalTuAccount": "Aus deinem Konto",
  "fonda.passoDi": "Schritt {n} von {tot}",
  "fonda.passoDove": "Wo",
  "fonda.passoVia": "Die Straße",
  "fonda.passoPerche": "Warum",
  "fonda.passoConferma": "Bestätigen",
  "fonda.viaConferma":
    "Die Straße wird aus dem Punkt abgeleitet: wenn sie falsch ist, gehe zurück und verschiebe die Nadel.",
  "fonda.indietro": "Zurück",
  "fonda.avanti": "Weiter",
  "fonda.riepilogo": "Zusammenfassung des Vorschlags",
  "fonda.riepilogoDove": "Gewählter Ort",
  "fonda.riepilogoVia": "Straße",
  "fonda.riepilogoPerche": "Warum du ihn öffnest",
  "campanella.titolo": "Benachrichtigungen",
  "campanella.nuove": "{n} neue",
  "campanella.vuote": "Noch keine Benachrichtigungen.",
  "campanella.accedi": "Melde dich an, um deine Benachrichtigungen zu sehen.",
  "campanella.vediTutte": "Alle Benachrichtigungen ansehen",
  "impost.interruttori": "Schalter",
  "impost.temaGraffiti": "Graffiti-Thema",
  "impost.temaGraffitiNota":
    "Einschalten für das Graffiti-Thema, ausschalten für das Papier-Thema (Bernstein).",

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

  "nav.mioCollettivo": "Mein Kollektiv",
  "gest.titolo": "Mein Kollektiv",
  "gest.intro": "Hier änderst du das Foto des Kollektivs und verwaltest seine Wände.",
  "gest.fotoTitolo": "Foto des Kollektivs",
  "gest.fotoTesto": "Das Foto des Kollektivs ist quadratisch (die von Personen bleiben rund).",
  "gest.fotoCambia": "Foto ändern",
  "gest.fotoSalvata": "Foto aktualisiert.",
  "gest.fotoErrore": "Das Foto konnte nicht geändert werden.",
  "gest.muriTitolo": "Die Wände",
  "gest.principaleInfo": "Die Pinnwand bleibt immer offen: nur du schreibst hier.",
  "gest.eventoTitolo": "Neue Event-Wand",
  "gest.eventoNome": "Name des Events",
  "gest.quando": "Wann?",
  "gest.eventoInizio": "Beginn (Datum und Uhrzeit)",
  "gest.eventoFine": "Ende (Datum und Uhrzeit)",
  "gest.eventoSpiega":
    "Gib Beginn und Ende an: Am Ende des Events schließt sich die Wand selbst und wird schreibgeschützt, sodass niemand danach schreiben kann.",
  "gest.eventoSpiegaCampi":
    "Beginn und Ende nehmen Datum und Uhrzeit an. Beispiel: 12.07.2026 um 21:00.",
  "gest.eventoApri": "Event-Wand öffnen",
  "gest.eventoErroreNome": "Gib dem Event einen Namen.",
  "gest.eventoErroreDate": "Das Ende muss nach dem Beginn liegen.",
  "gest.statoAperto": "Offen",
  "gest.statoChiuso": "Geschlossen",
  "gest.chiudi": "Jetzt schließen",
  "gest.riapri": "Wieder öffnen",
  "gest.obbligatorio": "Nur das Konto des Kollektivs kann diese Seite verwalten.",
  "ev.titolo": "Event",
  "ev.dal": "Von {inizio}",
  "ev.al": "bis {fine}",
  "ev.chiusoDopoFine": "Das Event ist vorbei: die Wand ist schreibgeschützt.",
  "ev.inCorso": "Event läuft",
  "home.pannello": "Dein Bereich",
  "muro.titolo": "Deine Wand",
  "muro.sottotitolo":
    "Zeichne den Hintergrund deiner Wand: er bleibt nur für Kontoinhaber sichtbar.",
  "muro.personalizza": "Wand gestalten",
  "muro.personalizzaBreve": "Wand gestalten",
  "muro.notaSfondo":
    "Die Zeichnung ist privat: Wer kein Konto hat, kann sie nicht sehen.",
  "muro.tela": "Zeichenblatt",
  "muro.colore": "Farbe",
  "muro.spessore": "Stärke",
  "muro.sfondo": "Blattfarbe",
  "muro.gomma": "Radiergummi",
  "muro.matita": "Bleistift",
  "muro.testo": "Text",
  "muro.scrivi": "Hier schreiben...",
  "muro.conferma": "Bestätigen",
  "muro.penna": "Stift",
  "muro.marker": "Textmarker",
  "muro.pennello": "Pinsel",
  "muro.spray": "Sprühfarbe",
  "muro.annulla": "Rückgängig",
  "muro.ripristina": "Wiederholen",
  "muro.pulisci": "Leeren",
  "muro.rimuovi": "Wand entfernen",
  "muro.salva": "Wand speichern",
  "muro.salvando": "Speichern...",
  "muro.salvato": "Wand gespeichert.",
  "muro.rimosso": "Wand entfernt.",
  "muro.errore": "Die Wand konnte nicht gespeichert werden. Bitte erneut versuchen.",
  "muro.caricamentoFallito":
    "Die vorherige Wand wurde nicht geladen: Beim Speichern wird sie ersetzt.",
  "muro.chiudi": "Schließen",
  "invito.occhiello": "Konto erforderlich",
  "invito.titolo": "Profile sind geschützt",
  "invito.testo":
    "Mit einem kostenlosen Konto öffnest du die Profile der Autorinnen und Autoren und siehst ihre persönliche Wand, speicherst die Post-its, die dir gefallen, und behältst deine Lieblingswände. Es ist in Sekunden erstellt.",
  "invito.dopo": "Später",
  "invito.crea": "Kostenloses Konto erstellen",
  "invito.entra": "Anmelden",
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
