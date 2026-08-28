import type { Metadata } from "next";
import { Cinzel, Inter } from "next/font/google";
import "./globals.css";

const display = Cinzel({ variable: "--font-display", subsets: ["latin"] });
const sans = Inter({ variable: "--font-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Fiordevalle | Idle RPG",
  description: "Explore Fiordevalle e Ryukuzam, evolua personagens e enfrente criaturas.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className={`${display.variable} ${sans.variable}`}>{children}</body>
    </html>
  );
}
