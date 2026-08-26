import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pokémon Deluge RPG • MMORPG Retro Pixel Online & Editor de Mundos",
  description:
    "MMORPG 16-Bit inspirado no Pokémon Deluge com variantes Shiny, Metallic, Mystic, Dark e Ghostly, Editor de Mundos interligados e Arena PvP Online.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-slate-100 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
