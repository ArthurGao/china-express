#!/usr/bin/env node
// Fails if a production build contains MSW. Run after `pnpm build` (CI does). MSW's runtime always carries the
// "[MSW]" log prefix and the worker file name, so either string in emitted JS means mocks leaked into the bundle.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const roots = [".next/static", ".next/server"];
const markers = ["[MSW]", "mockServiceWorker"];
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
    console.error(`check-no-msw: ${root} not found — run pnpm build first`);
    process.exit(2);
  }
  walk(root);
}

if (hits.length) {
  console.error(`check-no-msw: MSW found in the production build:\n${hits.join("\n")}`);
  process.exit(1);
}
console.log("check-no-msw: no MSW in the production build");
