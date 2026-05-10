// Dev wrapper that forces .env.local values to OVERRIDE process.env.
//
// Why this exists: Next.js (and dotenv generally) treats process.env as
// authoritative, so any var inherited from the parent shell wins over
// .env.local. That's a problem when the parent shell has its own
// ANTHROPIC_API_KEY (e.g. from a Claude Code session) — the project's
// key in .env.local is silently ignored.
//
// This wrapper loads .env.local with `override: true` and then spawns
// `next dev` in-process. Same behaviour as `pnpm next dev` otherwise.

import { config } from "dotenv";
import { spawn } from "node:child_process";

const r = config({ path: ".env.local", override: true });
if (r.error) {
  console.error("Failed to load .env.local:", r.error.message);
  process.exit(1);
}
const overridden = Object.keys(r.parsed ?? {});
console.log(`✓ Loaded .env.local (${overridden.length} vars, override=true)`);

const child = spawn("next", ["dev", ...process.argv.slice(2)], {
  stdio: "inherit",
  shell: false,
});
child.on("exit", (code) => process.exit(code ?? 0));
