import type { Metadata, Viewport } from "next";
import {
  Caveat,
  Shadows_Into_Light,
  Indie_Flower,
  Patrick_Hand,
  Architects_Daughter,
  Kalam,
  Gloria_Hallelujah,
  Coming_Soon,
  Satisfy,
  Pacifico,
  Sacramento,
  Kaushan_Script,
  Alex_Brush,
  Bad_Script,
  Amatic_SC,
  Permanent_Marker,
  Rock_Salt,
  Bangers,
  Shrikhand,
  Creepster,
  Sedgwick_Ave,
  Rubik_Spray_Paint,
  Rubik_Wet_Paint,
  Nosifer,
  Titan_One,
  Luckiest_Guy,
  Bungee,
} from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { LanguageProvider } from "@/lib/i18n";
import MenuLaterale from "@/components/MenuLaterale";
import SelettoreLingua from "@/components/SelettoreLingua";
import TastoHome from "@/components/TastoHome";
import RegistraServiceWorker from "@/components/RegistraServiceWorker";
import IntroApp from "@/components/IntroApp";
import { TEMI, TEMA_KEY, TEMA_PREDEFINITO } from "@/lib/temi";

// Font OFL (Google Fonts) — tutti usabili anche per progetti commerciali.
// Tre famiglie: a mano, scrittura, graffiti/street.
// Vedi lib/fonti.ts per codici/nomi/variabili usati dall'app.

// ── A mano ──────────────────────────────────────────────────────────────
const caveat = Caveat({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-caveat",
});
const shadowsIntoLight = Shadows_Into_Light({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-shadows-into-light",
});
const indieFlower = Indie_Flower({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-indie-flower",
});
const patrickHand = Patrick_Hand({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-patrick-hand",
});
const architectsDaughter = Architects_Daughter({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-architects-daughter",
});
const kalam = Kalam({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-kalam",
});
const gloriaHallelujah = Gloria_Hallelujah({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-gloria-hallelujah",
});
const comingSoon = Coming_Soon({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-coming-soon",
});

// ── Scrittura ───────────────────────────────────────────────────────────
const satisfy = Satisfy({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-satisfy",
});
const pacifico = Pacifico({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-pacifico",
});
const sacramento = Sacramento({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-sacramento",
});
const kaushanScript = Kaushan_Script({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-kaushan-script",
});
const alexBrush = Alex_Brush({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-alex-brush",
});
const badScript = Bad_Script({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-bad-script",
});
const amaticSC = Amatic_SC({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-amatic-sc",
});

// ── Graffiti / street ───────────────────────────────────────────────────
const permanentMarker = Permanent_Marker({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-permanent-marker",
});
const rockSalt = Rock_Salt({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-rock-salt",
});
const bangers = Bangers({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-bangers",
});
const shrikhand = Shrikhand({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-shrikhand",
});
const creepster = Creepster({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-creepster",
});
const sedgwickAve = Sedgwick_Ave({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-sedgwick-ave",
});
const rubikSprayPaint = Rubik_Spray_Paint({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-rubik-spray-paint",
});
const rubikWetPaint = Rubik_Wet_Paint({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-rubik-wet-paint",
});
const nosifer = Nosifer({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-nosifer",
});
const titanOne = Titan_One({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-titan-one",
});
const luckiestGuy = Luckiest_Guy({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-luckiest-guy",
});
const bungee = Bungee({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-bungee",
});

// Applica il tema prima del primo disegno, cosi' non c'e' un lampo di
// palette sbagliata all'apertura. Legge la scelta salvata sul dispositivo
// (vedi lib/temi.ts) e mette `data-tema` su <html>; il CSS fa il resto.
const scriptTema = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  TEMA_KEY
)});var ok=${JSON.stringify(
  TEMI.map((x) => x.codice)
)};if(t&&ok.indexOf(t)>=0&&t!==${JSON.stringify(
  TEMA_PREDEFINITO
)}){document.documentElement.setAttribute('data-tema',t);}}catch(e){}})();`;

export const metadata: Metadata = {
  title: {
    default: "Muri Parlanti",
    template: "%s · Muri Parlanti",
  },
  description: "Pensieri anonimi sui muri della città.",
  applicationName: "Muri Parlanti",
  // Icone per il telefono: la stessa usata quando si salva l'app sulla Home.
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  // Rende la pagina "app" quando si apre dalla Home su iPhone/iPad.
  appleWebApp: {
    capable: true,
    title: "Muri Parlanti",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0c0a09", // stone-950: barra del browser coerente con l'app
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="it"
      suppressHydrationWarning
      className={[
        caveat.variable,
        shadowsIntoLight.variable,
        indieFlower.variable,
        patrickHand.variable,
        architectsDaughter.variable,
        kalam.variable,
        gloriaHallelujah.variable,
        comingSoon.variable,
        satisfy.variable,
        pacifico.variable,
        sacramento.variable,
        kaushanScript.variable,
        alexBrush.variable,
        badScript.variable,
        amaticSC.variable,
        permanentMarker.variable,
        rockSalt.variable,
        bangers.variable,
        shrikhand.variable,
        creepster.variable,
        sedgwickAve.variable,
        rubikSprayPaint.variable,
        rubikWetPaint.variable,
        nosifer.variable,
        titanOne.variable,
        luckiestGuy.variable,
        bungee.variable,
      ].join(" ")}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptTema }} />
      </head>
      <body className="min-h-dvh bg-stone-950 font-sans antialiased">
        <LanguageProvider>
          <AuthProvider>
            <MenuLaterale />
            <div className="barra-alta">
              <TastoHome />
              <SelettoreLingua />
            </div>
            {children}
            <RegistraServiceWorker />
            <IntroApp />
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
