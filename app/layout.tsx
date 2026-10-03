import type { Metadata } from "next";
import { Caveat } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import MenuLaterale from "@/components/MenuLaterale";
import TastoHome from "@/components/TastoHome";

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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className={caveat.variable}>
      <body className="min-h-dvh bg-stone-950 font-sans antialiased">
        <AuthProvider>
        <MenuLaterale />
        <TastoHome />
        {children}
      </AuthProvider>
      </body>
    </html>
  );
}
