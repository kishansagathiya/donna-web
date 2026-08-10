#!/usr/bin/env node
/**
 * Build Donna Cafe (../music-wtf) and copy the static export into public/cafe.
 * Expects sibling checkout at ../../music-wtf relative to this script's package,
 * or CAFE_DIR env override.
 */
import { cp, mkdir, rm, access } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const cafeRoot =
  process.env.CAFE_DIR || join(webRoot, "..", "..", "music-wtf");
const outDir = join(cafeRoot, "out");
const destDir = join(webRoot, "public", "cafe");

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

if (!(await exists(cafeRoot))) {
  console.error(`Cafe repo not found at ${cafeRoot}`);
  console.error("Set CAFE_DIR or clone music-wtf as a sibling of the donna monorepo.");
  process.exit(1);
}

console.log(`Building cafe at ${cafeRoot}…`);
const build = spawnSync("npm", ["run", "build"], {
  cwd: cafeRoot,
  stdio: "inherit",
  shell: process.platform === "win32",
});
if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

if (!(await exists(outDir))) {
  console.error(`Expected export at ${outDir} — build did not produce out/`);
  process.exit(1);
}

await rm(destDir, { recursive: true, force: true });
await mkdir(destDir, { recursive: true });
await cp(outDir, destDir, { recursive: true });
console.log(`Synced ${outDir} → ${destDir}`);
