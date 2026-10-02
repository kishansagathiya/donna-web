#!/usr/bin/env node
/**
 * Copy the becoming-ai-infra-engineer site into public/ so the Vite build
 * serves it at /becoming-ai-infra-engineer/.
 *
 * Source is the monorepo submodule (../becoming-ai-infra-engineer), or INFRA_DIR.
 * Railway builds donna-web alone, so the copied files are what production ships.
 * The daily sync workflow owns data/jobs.json. Keep that file when it is newer
 * than the copy coming from the source repo.
 */
import { cp, mkdir, readFile, rm, writeFile, access } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot =
  process.env.INFRA_DIR || join(webRoot, "..", "becoming-ai-infra-engineer");
const destDir = join(webRoot, "public", "becoming-ai-infra-engineer");

const entries = [
  "index.html",
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

function updatedAt(text) {
  try {
    const time = Date.parse(JSON.parse(text).updated_at);
    return Number.isFinite(time) ? time : 0;
  } catch {
    return 0;
  }
}

if (!(await exists(sourceRoot))) {
  console.error(`Course repo not found at ${sourceRoot}`);
  console.error("Set INFRA_DIR or clone becoming-ai-infra-engineer next to donna-web.");
  process.exit(1);
}

const jobsPath = join(destDir, "data", "jobs.json");
const publishedJobs = (await exists(jobsPath)) ? await readFile(jobsPath, "utf8") : null;

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

if (publishedJobs && (await exists(jobsPath))) {
  const copied = await readFile(jobsPath, "utf8");
  if (updatedAt(publishedJobs) > updatedAt(copied)) {
    await writeFile(jobsPath, publishedJobs.endsWith("\n") ? publishedJobs : `${publishedJobs}\n`);
    console.log("Kept the newer published job list");
  }
}
console.log(`Synced ${sourceRoot} → ${destDir}`);
