#!/usr/bin/env node
/**
 * Production static server for Vite builds.
 *
 * Important: missing /assets/* must 404 (not SPA HTML). Returning HTML for
 * hashed JS/CSS lets CDNs cache a broken response and black-screen the app
 * after deploys when an old index.html still points at a removed file.
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const distRoot = join(fileURLToPath(new URL("..", import.meta.url)), "dist");
const port = Number(process.env.PORT || 3000);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".map": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

function safeJoin(root, requestPath) {
  const decoded = decodeURIComponent(requestPath.split("?")[0] || "/");
  const cleaned = normalize(decoded).replace(/^(\.\.(\/|\\|$))+/, "");
  const full = join(root, cleaned);
  if (full !== root && !full.startsWith(root + sep)) {
    return null;
  }
  return full;
}

function cacheControl(relPath) {
  if (relPath.startsWith("/assets/")) {
    return "public, max-age=31536000, immutable";
  }
  if (relPath.endsWith(".html") || relPath === "/" || relPath === "/index.html") {
    return "no-cache";
  }
  return "public, max-age=3600, must-revalidate";
}

async function sendFile(res, filePath, relPath) {
  const body = await readFile(filePath);
  const type = MIME[extname(filePath).toLowerCase()] || "application/octet-stream";
  res.writeHead(200, {
    "Content-Type": type,
    "Cache-Control": cacheControl(relPath),
    "X-Content-Type-Options": "nosniff",
  });
  res.end(body);
}

async function sendSpa(res) {
  const indexPath = join(distRoot, "index.html");
  const body = await readFile(indexPath);
  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-cache",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(body);
}

const server = createServer(async (req, res) => {
  try {
    const urlPath = req.url || "/";
    let rel = decodeURIComponent(urlPath.split("?")[0] || "/");
    if (rel === "/") rel = "/index.html";

    const filePath = safeJoin(distRoot, rel);
    if (!filePath) {
      res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Bad request");
      return;
    }

    try {
      const info = await stat(filePath);
      if (info.isFile()) {
        await sendFile(res, filePath, rel);
        return;
      }
    } catch {
      // fall through
    }

    if (rel.startsWith("/assets/")) {
      res.writeHead(404, {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      res.end("Not found");
      return;
    }

    await sendSpa(res);
  } catch (err) {
    console.error(err);
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Server error");
  }
});

server.listen(port, () => {
  console.log(`donna-web serving ${distRoot} on :${port}`);
});
