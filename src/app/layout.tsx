import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import localFont from "next/font/local";
import type { ReactNode } from "react";
import { ThemeProvider } from "@/components/providers/theme-provider";
import "./globals.css";

// Archivo (semi-expanded) for headings, IBM Plex for text, figures and SQL.
// The two variable fonts are local files (see app/fonts/README.md).
const archivo = localFont({
  src: "./fonts/archivo-latin-variable.woff2",
  variable: "--font-archivo",
  weight: "100 900",
  display: "swap",
  declarations: [{ prop: "font-stretch", value: "62% 125%" }],
});
const plexSans = localFont({
  src: "./fonts/ibm-plex-sans-latin-variable.woff2",
  variable: "--font-plex-sans",
  weight: "100 700",
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
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
