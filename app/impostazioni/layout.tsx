import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Impostazioni",
};

export default function LayoutImpostazioni({ children }: { children: ReactNode }) {
  return children;
}
