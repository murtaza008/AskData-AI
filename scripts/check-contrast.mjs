// WCAG contrast check for the colour tokens in src/app/globals.css.
// Reads the hex values from the `tokens:light` and `tokens:dark` blocks and
// checks every text/background pair the UI uses, in both themes.
//
//   npm run check:contrast        (exits 1 if any pair fails)
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

function block(marker) {
  const start = css.indexOf(marker);
  if (start === -1) throw new Error(`Token block not found: ${marker}`);
  const open = css.indexOf("{", start);
  const close = css.indexOf("}", open);
  const tokens = {};
  for (const m of css.slice(open + 1, close).matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    tokens[m[1]] = m[2];
  }
  return tokens;
}

const themes = {
  light: block("/* tokens:light */"),
  dark: block("/* tokens:dark */"),
};

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function ratio(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

// [foreground, background, minimum]. 4.5 for text; 3 for large text, icons,
// chart marks and focus rings (WCAG 1.4.11 non-text contrast).
const surfaces = ["bg", "surface", "surface-2", "sunken"];
const text = ["fg", "fg-muted", "fg-subtle", "accent-text", "danger-text", "success-text"];
const pairs = [
  ...text.flatMap((fg) => surfaces.map((bg) => [fg, bg, 4.5])),
  ["accent-fg", "accent", 4.5],
  ["accent-fg", "accent-hover", 4.5],
  ["accent-text", "accent-soft", 4.5],
  ["fg", "accent-soft", 4.5],
  ["fg-muted", "accent-soft", 4.5],
  ["danger-text", "danger-soft", 4.5],
  ["fg", "danger-soft", 4.5],
  ["danger-fg", "danger", 4.5],
  ["success-text", "success-soft", 4.5],
  ["inverse-fg", "inverse", 4.5],
  ["inverse-muted", "inverse", 4.5],
  ...["sql-keyword", "sql-string", "sql-number", "sql-fn"].flatMap((fg) => [
    [fg, "sunken", 4.5],
    [fg, "surface", 4.5],
  ]),
  ["focus", "bg", 3],
  ["focus", "surface", 3],
  ["accent", "surface", 3],
  ["accent", "bg", 3],
  ["danger", "surface", 3],
  ["success", "surface", 3],
  ["border-strong", "surface", 1.8],
  ...["chart-1", "chart-2", "chart-3", "chart-4", "chart-5", "chart-other"].map((c) => [c, "surface", 3]),
];

let failed = 0;
for (const [name, t] of Object.entries(themes)) {
  console.log(`\n${name}`);
  for (const [fg, bg, min] of pairs) {
    if (!t[fg] || !t[bg]) {
      console.log(`  MISSING  ${fg} on ${bg}`);
      failed++;
      continue;
    }
    const r = ratio(t[fg], t[bg]);
    const ok = r >= min;
    if (!ok) failed++;
    if (!ok || process.argv.includes("--all")) {
      console.log(`  ${ok ? "ok  " : "FAIL"}  ${r.toFixed(2).padStart(5)}  (min ${min})  ${fg} ${t[fg]} on ${bg} ${t[bg]}`);
    }
  }
  console.log(`  ${pairs.length} pairs checked`);
}
console.log(failed ? `\n${failed} pair(s) failed.` : "\nAll pairs pass.");
process.exit(failed ? 1 : 0);
