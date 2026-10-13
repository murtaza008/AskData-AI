import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Libre_Franklin, Newsreader } from "next/font/google";
import type { ReactNode } from "react";
import { MotionProvider } from "@/components/motion/reveal";
import { ThemeProvider } from "@/components/providers/theme-provider";
import "./globals.css";

const newsreader = Newsreader({ subsets: ["latin"], variable: "--font-newsreader", display: "swap" });
const franklin = Libre_Franklin({ subsets: ["latin"], variable: "--font-franklin", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "AskData AI — Ask your database a question, get the SQL",
    template: "%s — AskData AI",
  },
  description:
    "AskData is an AI data analyst: ask in plain English, get the answer, the chart, and the exact read-only SQL that produced it.",
  openGraph: {
    title: "AskData AI — the AI data analyst that shows its work",
    description: "Ask in plain English. Get the answer, the chart, and the exact SQL that was run.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f0e8" },
    { media: "(prefers-color-scheme: dark)", color: "#141210" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // next-themes sets the `dark` class before hydration, hence suppressHydrationWarning.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${newsreader.variable} ${franklin.variable} ${jetbrains.variable}`}
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
