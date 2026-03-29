import type { Metadata } from "next";
import { Inconsolata, Chakra_Petch, Rajdhani, Caveat } from "next/font/google";
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

const caveat = Caveat({
  variable: "--font-handwritten",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "palantir at home",
  description: "Personal OSINT & conflict intelligence platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inconsolata.variable} ${chakraPetch.variable} ${rajdhani.variable} ${caveat.variable} h-full`}
    >
      <body className="h-full">{children}</body>
    </html>
  );
}
