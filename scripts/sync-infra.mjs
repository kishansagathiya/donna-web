#!/usr/bin/env node
/**
 * Copy the becoming-ai-infra-engineer site into public/ so the Vite build
 * serves it at /becoming-ai-infra-engineer/.
 *
 * Source is the monorepo submodule (../becoming-ai-infra-engineer), or INFRA_DIR.
 * Railway builds donna-web alone, so the copied files are what production ships.
 */
import { cp, mkdir, rm, access } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot =
  process.env.INFRA_DIR || join(webRoot, "..", "becoming-ai-infra-engineer");
const destDir = join(webRoot, "public", "becoming-ai-infra-engineer");

const entries = [
  "index.html",
  "course.html",
  "course.css",
  "course.js",
  "jobs.js",
  "styles.css",
  "assets",
  "data",
];

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

if (!(await exists(sourceRoot))) {
  console.error(`Course repo not found at ${sourceRoot}`);
  console.error("Set INFRA_DIR or clone becoming-ai-infra-engineer next to donna-web.");
  process.exit(1);
}

await rm(destDir, { recursive: true, force: true });
await mkdir(destDir, { recursive: true });
for (const entry of entries) {
  const from = join(sourceRoot, entry);
  if (!(await exists(from))) {
    console.error(`Missing ${from}`);
    process.exit(1);
  }
  await cp(from, join(destDir, entry), { recursive: true });
}
console.log(`Synced ${sourceRoot} → ${destDir}`);
