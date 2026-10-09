import type { Metadata, Viewport } from "next";
import {
  Caveat,
  Rock_Salt,
  Permanent_Marker,
  Shadows_Into_Light,
  Bad_Script,
  Alex_Brush,
  Kalam,
  Indie_Flower,
  Architects_Daughter,
  Amatic_SC,
  Patrick_Hand,
  Gloria_Hallelujah,
  Satisfy,
  Coming_Soon,
  Bangers,
  Creepster,
  Pacifico,
  Sacramento,
  Kaushan_Script,
  Shrikhand,
} from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { LanguageProvider } from "@/lib/i18n";
import MenuLaterale from "@/components/MenuLaterale";
import SelettoreLingua from "@/components/SelettoreLingua";
import TastoHome from "@/components/TastoHome";
import RegistraServiceWorker from "@/components/RegistraServiceWorker";

// Font OFL (Google Fonts) — tutti usabili anche per progetti commerciali.
// Stile: writing, graffiti, a mano, street.
const caveat = Caveat({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-caveat",
});
const rockSalt = Rock_Salt({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-rock-salt",
});
const permanentMarker = Permanent_Marker({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-permanent-marker",
});
const shadowsIntoLight = Shadows_Into_Light({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-shadows-into-light",
});
const badScript = Bad_Script({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-bad-script",
});
const alexBrush = Alex_Brush({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-alex-brush",
});
const kalam = Kalam({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-kalam",
});
const indieFlower = Indie_Flower({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-indie-flower",
});
const architectsDaughter = Architects_Daughter({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-architects-daughter",
});
const amaticSC = Amatic_SC({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-amatic-sc",
});
const patrickHand = Patrick_Hand({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-patrick-hand",
});
const gloriaHallelujah = Gloria_Hallelujah({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-gloria-hallelujah",
});
const satisfy = Satisfy({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-satisfy",
});
const comingSoon = Coming_Soon({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-coming-soon",
});
const bangers = Bangers({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-bangers",
});
const creepster = Creepster({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-creepster",
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
const shrikhand = Shrikhand({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-shrikhand",
});

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
      className={[
        caveat.variable,
        rockSalt.variable,
        permanentMarker.variable,
        shadowsIntoLight.variable,
        badScript.variable,
        alexBrush.variable,
        kalam.variable,
        indieFlower.variable,
        architectsDaughter.variable,
        amaticSC.variable,
        patrickHand.variable,
        gloriaHallelujah.variable,
        satisfy.variable,
        comingSoon.variable,
        bangers.variable,
        creepster.variable,
        pacifico.variable,
        sacramento.variable,
        kaushanScript.variable,
        shrikhand.variable,
      ].join(" ")}
    >
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
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
