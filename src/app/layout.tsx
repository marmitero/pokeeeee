import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { DebugPanel } from "@/components/DebugPanel";

export const metadata: Metadata = {
  title: "Catchbound • MMORPG Retro Pixel Online",
  description:
    "MMORPG 16-Bit com variantes Shiny, Metallic, Mystic, Dark e Ghostly, Editor de Mundos interligados e Arena PvP Online.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-slate-100 text-slate-900 antialiased">
        {children}
        <DebugPanel />
      </body>
    </html>
  );
}
