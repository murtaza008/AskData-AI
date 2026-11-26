// First-load JS per route, gzipped, measured from the real HTML of a running
// production server (`npm run build && npm start`). Lazy chunks (charts, the
// landing 3D scene, the command palette) are not in the HTML, so they are not
// counted here; they load on demand.
//
//   node scripts/bundle-report.mjs [baseUrl] [--json out.json] [--routes extra,routes]
//
// Signed-in routes are fetched as the public demo account (read-only).
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";

const args = process.argv.slice(2);
const base = args.find((a) => a.startsWith("http")) ?? "http://localhost:3000";
const jsonOut = args.includes("--json") ? args[args.indexOf("--json") + 1] : null;
const extra = args.includes("--routes") ? args[args.indexOf("--routes") + 1].split(",") : [];

const DEMO = { email: "demo@askdata.app", password: "askdata-demo" };
const publicRoutes = ["/", "/login", "/signup", "/this-page-does-not-exist"];
const appRoutes = ["/app", "/app/dashboard", "/app/upload", ...extra];

/** Sign in through Auth.js's credentials callback and return the cookie header. */
async function demoCookie() {
  const jar = new Map();
  const keep = (res) => {
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const [pair] = c.split(";");
      const [name, ...rest] = pair.split("=");
      jar.set(name.trim(), rest.join("="));
    }
  };
  const header = () => [...jar].map(([k, v]) => `${k}=${v}`).join("; ");

  const csrfRes = await fetch(`${base}/api/auth/csrf`);
  keep(csrfRes);
  const { csrfToken } = await csrfRes.json();
  const res = await fetch(`${base}/api/auth/callback/credentials`, {
    method: "POST",
    redirect: "manual",
    headers: { "content-type": "application/x-www-form-urlencoded", cookie: header() },
    body: new URLSearchParams({ csrfToken, email: DEMO.email, password: DEMO.password, callbackUrl: `${base}/app` }),
  });
  keep(res);
  return header();
}

const gzCache = new Map();
function gzSize(src) {
  if (gzCache.has(src)) return gzCache.get(src);
  const rel = src.replace(/^\/_next\//, "").split("?")[0];
  const file = path.join(".next", decodeURIComponent(rel));
  const size = existsSync(file) ? gzipSync(readFileSync(file)).length : 0;
  gzCache.set(src, size);
  return size;
}

async function measure(route, cookie) {
  const res = await fetch(base + route, { headers: cookie ? { cookie } : {}, redirect: "manual" });
  const html = await res.text();
  const srcs = [...new Set([...html.matchAll(/src="(\/_next\/static\/[^"]+\.js)"/g)].map((m) => m[1]))];
  const bytes = srcs.reduce((sum, s) => sum + gzSize(s), 0);
  return { route, status: res.status, scripts: srcs.length, kb: +(bytes / 1024).toFixed(1) };
}

const cookie = await demoCookie();
if (!cookie.includes("session-token")) console.warn("Demo sign-in failed; signed-in routes will show redirects.");

// One real conversation of the demo account, so the conversation route is measured too.
try {
  const res = await fetch(`${base}/api/conversations`, { headers: { cookie } });
  const { conversations } = await res.json();
  if (conversations?.[0]) appRoutes.push(`/app/c/${conversations[0].id}`);
} catch {
  // no conversation route then
}

const rows = [];
for (const r of publicRoutes) rows.push(await measure(r, ""));
for (const r of appRoutes) rows.push(await measure(r, cookie));

console.log("route".padEnd(52), "status", "scripts", "first-load JS (gzip)");
for (const r of rows) {
  const label = r.route.startsWith("/app/c/") ? "/app/c/[id]" : r.route;
  console.log(label.padEnd(52), String(r.status).padEnd(6), String(r.scripts).padEnd(7), `${r.kb} kB`);
}
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(rows, null, 2));
