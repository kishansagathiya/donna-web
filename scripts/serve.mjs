#!/usr/bin/env node
/**
 * Production static server for Vite builds.
 *
 * Important: missing /assets/* must 404 (not SPA HTML). Returning HTML for
 * hashed JS/CSS lets CDNs cache a broken response and black-screen the app
 * after deploys when an old index.html still points at a removed file.
 *
 * /cafe and /becoming-ai-infra-engineer are synced static sites. Serve their
 * files (and directory indexes) and never fall back to the SPA for a missing
 * file under those paths. A directory URL without a trailing slash redirects
 * so relative links in those sites resolve inside the directory.
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { handleRazorpayApi } from "./razorpay-api.mjs";

const distRoot = join(fileURLToPath(new URL("..", import.meta.url)), "dist");
const port = Number(process.env.PORT || 3000);
const STATIC_SITES = ["/cafe/", "/becoming-ai-infra-engineer/"];

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
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
  if (relPath.startsWith("/assets/") || relPath.includes("/_next/static/")) {
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

function sendNotFound(res) {
  res.writeHead(404, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  res.end("Not found");
}

const server = createServer(async (req, res) => {
  try {
    if (await handleRazorpayApi(req, res)) {
      return;
    }

    const urlPath = req.url || "/";
    const queryIndex = urlPath.indexOf("?");
    const query = queryIndex === -1 ? "" : urlPath.slice(queryIndex);
    const pathname = decodeURIComponent(
      (queryIndex === -1 ? urlPath : urlPath.slice(0, queryIndex)) || "/",
    );
    if (pathname !== "/" && !pathname.endsWith("/") && !pathname.split("/").pop().includes(".")) {
      const indexPath = safeJoin(distRoot, `${pathname}/index.html`);
      if (indexPath) {
        try {
          const indexInfo = await stat(indexPath);
          if (indexInfo.isFile()) {
            res.writeHead(308, {
              Location: `${pathname}/${query}`,
              "Cache-Control": "no-cache",
            });
            res.end();
            return;
          }
        } catch {
          // not a directory index
        }
      }
    }

    let rel = pathname;
    if (rel === "/") rel = "/index.html";

    // Directory index: /cafe or /cafe/ → /cafe/index.html
    if (rel.endsWith("/")) {
      rel = `${rel}index.html`;
    }

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
      if (info.isDirectory()) {
        const indexRel = rel.endsWith("/") ? `${rel}index.html` : `${rel}/index.html`;
        const indexPath = safeJoin(distRoot, indexRel);
        if (indexPath) {
          try {
            const indexInfo = await stat(indexPath);
            if (indexInfo.isFile()) {
              await sendFile(res, indexPath, indexRel);
              return;
            }
          } catch {
            // fall through
          }
        }
      }
    } catch {
      // fall through
    }

    if (
      rel.startsWith("/assets/") ||
      STATIC_SITES.some((prefix) => rel.startsWith(prefix) || rel + "/" === prefix)
    ) {
      sendNotFound(res);
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
