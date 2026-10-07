import type { Metadata, Viewport } from "next";
import { Caveat } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { LanguageProvider } from "@/lib/i18n";
import MenuLaterale from "@/components/MenuLaterale";
import SelettoreLingua from "@/components/SelettoreLingua";
import TastoHome from "@/components/TastoHome";
import RegistraServiceWorker from "@/components/RegistraServiceWorker";

const caveat = Caveat({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-caveat",
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
    <html lang="it" className={caveat.variable}>
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
