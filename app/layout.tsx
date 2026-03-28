import type { Metadata } from "next";
import { Inconsolata, Chakra_Petch, Rajdhani } from "next/font/google";
import "./globals.css";

const inconsolata = Inconsolata({
  variable: "--font-mono",
  subsets: ["latin"],
});

const chakraPetch = Chakra_Petch({
  variable: "--font-heading",
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
});

const rajdhani = Rajdhani({
  variable: "--font-body",
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WAR ROOM — Surveillance Operations Center",
  description:
    "Self-hosted investigative research platform with map intelligence, RAG-powered document search, and visual research boards.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inconsolata.variable} ${chakraPetch.variable} ${rajdhani.variable} h-full`}
    >
      <body className="h-full">{children}</body>
    </html>
  );
}
