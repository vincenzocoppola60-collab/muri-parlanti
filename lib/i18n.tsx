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
  "editor.erroreFoto":
    "Non sono riuscito a caricare la foto ({msg}). Riprova o rimuovila.",
  "popup.titolo": "Grazie per il tuo primo pensiero",
  "popup.testo":
    "Il tuo post-it è sul muro. Salva Muri Parlanti sulla Home del telefono: si apre a schermo intero e ritrovi subito i tuoi muri, senza installare nulla.",
  "popup.ok": "Va bene",
  "comune.chiudi": "Chiudi",
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
    "From the browser menu choose “Install app” or “Add to Home screen”.",
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
  "editor.erroreFoto":
    "I could not upload the photo ({msg}). Try again or remove it.",
  "popup.titolo": "Thanks for your first thought",
  "popup.testo":
    "Your note is on the wall. Save Muri Parlanti to your phone's Home screen: it opens full screen and you can get straight back to your walls, with nothing to install.",
  "popup.ok": "Got it",
  "comune.chiudi": "Close",
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
  "editor.erroreFoto":
    "No he podido subir la foto ({msg}). Inténtalo de nuevo o quítala.",
  "popup.titolo": "Gracias por tu primer pensamiento",
  "popup.testo":
    "Tu nota está en el muro. Guarda Muri Parlanti en la pantalla de inicio del móvil: se abre a pantalla completa y vuelves enseguida a tus muros, sin instalar nada.",
  "popup.ok": "De acuerdo",
  "comune.chiudi": "Cerrar",
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
  "editor.erroreFoto":
    "Je n'ai pas pu envoyer la photo ({msg}). Réessayez ou retirez-la.",
  "popup.titolo": "Merci pour votre première pensée",
  "popup.testo":
    "Votre note est sur le mur. Enregistrez Muri Parlanti sur l'écran d'accueil du téléphone : elle s'ouvre en plein écran et vous retrouvez vos murs tout de suite, sans rien installer.",
  "popup.ok": "D'accord",
  "comune.chiudi": "Fermer",
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
    "Wähle im Browser-Menü „App installieren“ oder „Zum Home-Bildschirm“.",
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
  "postit.mostraTraduzione": "Übersetzen",
  "postit.preferitoAggiungi": "Zu Favoriten hinzufügen",
  "postit.preferitoRimuovi": "Aus Favoriten entfernen",
  "postit.fotoAllegata": "An den Gedanken angehängtes Foto",
  "editor.erroreFoto":
    "Ich konnte das Foto nicht hochladen ({msg}). Versuche es erneut oder entferne es.",
  "popup.titolo": "Danke für deinen ersten Gedanken",
  "popup.testo":
    "Deine Notiz hängt an der Wand. Speichere Muri Parlanti auf dem Startbildschirm deines Handys: sie öffnet sich im Vollbild und du bist sofort wieder bei deinen Wänden – ganz ohne Installation.",
  "popup.ok": "Alles klar",
  "comune.chiudi": "Schließen",
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
