#!/usr/bin/env node
// Fails if a production build contains MSW or the demo sign-in (ADR 0003, 0004). Run after `pnpm build` (CI does).
// MSW's runtime always carries the "[MSW]" log prefix and the worker file name, and the demo client logs "[CE-DEMO]",
// so any of these strings in emitted JS means dev/demo code leaked into the bundle.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const roots = [".next/static", ".next/server"];
const markers = ["[MSW]", "mockServiceWorker", "[CE-DEMO]"];
const hits = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.(js|mjs|cjs)$/.test(name)) {
      const text = readFileSync(path, "utf8");
      for (const m of markers) if (text.includes(m)) hits.push(`${path}: contains ${m}`);
    }
  }
}

for (const root of roots) {
  if (!existsSync(root)) {
    console.error(`check-bundle: ${root} not found — run pnpm build first`);
    process.exit(2);
  }
  walk(root);
}

if (hits.length) {
  console.error(`check-bundle: dev/demo code found in the production build:\n${hits.join("\n")}`);
  process.exit(1);
}
console.log("check-bundle: no MSW and no demo sign-in in the production build");
