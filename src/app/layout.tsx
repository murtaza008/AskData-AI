import type { Metadata, Viewport } from "next";
import { Archivo, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import type { ReactNode } from "react";
import { MotionProvider } from "@/components/motion/reveal";
import { ThemeProvider } from "@/components/providers/theme-provider";
import "./globals.css";

// Archivo (semi-expanded) for headings, IBM Plex for text, figures and SQL.
const archivo = Archivo({ subsets: ["latin"], variable: "--font-archivo", axes: ["wdth"], display: "swap" });
const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-sans",
  display: "swap",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "AskData AI: ask your database a question, get the SQL",
    template: "%s · AskData AI",
  },
  description:
    "AskData is an AI data analyst: ask in plain English, get the answer, the chart, and the exact read-only SQL that produced it.",
  openGraph: {
    title: "AskData AI: the AI data analyst that shows its work",
    description: "Ask in plain English. Get the answer, the chart, and the exact SQL that was run.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f3f5" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0e11" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // next-themes sets the `dark` class before first paint, hence suppressHydrationWarning.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${archivo.variable} ${plexSans.variable} ${plexMono.variable}`}
    >
      {/* Browser extensions (Grammarly, password managers) add attributes to
          <body> before React hydrates; this silences that harmless mismatch. */}
      <body suppressHydrationWarning>
        <ThemeProvider>
          <MotionProvider>{children}</MotionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
