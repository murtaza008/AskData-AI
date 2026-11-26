# Fonts

Latin subsets of two variable fonts, served with `next/font/local`:

- `archivo-latin-variable.woff2`: Archivo (weights 100–900, widths 62–125%), by Omnibus-Type. SIL Open Font License 1.1.
- `ibm-plex-sans-latin-variable.woff2`: IBM Plex Sans (variable), by IBM. SIL Open Font License 1.1.

Both come from Google Fonts. They are kept locally because `next/font/google`
fails under `next dev` (Turbopack) for fonts whose CSS declares `font-stretch`.
IBM Plex Mono still loads through `next/font/google`.
