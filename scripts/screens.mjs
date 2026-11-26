// Regenerates the README and landing-page screenshots in public/screens from
// the real app, signed in as the read-only demo account (light and dark).
// Builds first so the shots show current code, then builds again so the
// landing page bundles the new images.
//
//   npm run screens
import { spawnSync } from "node:child_process";

const run = (cmd, args, env = {}) => {
  const result = spawnSync(cmd, args, { stdio: "inherit", shell: true, env: { ...process.env, ...env } });
  if (result.status !== 0) process.exit(result.status ?? 1);
};

run("npx", ["next", "build"]);
run("npx", ["playwright", "test", "--project=screens", "-g", "marketing"], { SCREENS: "marketing" });
run("npx", ["next", "build"]);
console.log("Screenshots written to public/screens");
