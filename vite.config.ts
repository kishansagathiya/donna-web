import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const backendTarget = "http://127.0.0.1:8787";

/** REST prefixes forwarded to donna-server-go in `npm run dev`. */
const apiProxyPrefixes = [
  "/chat",
  "/tts",
  "/knowledge",
  "/account",
  "/conversations",
  "/share",
  "/health",
  "/agent-runs",
  "/notes",
  "/intents",
  "/action-runs",
  "/memory",
  "/integrations",
  "/imports",
  "/errors",
  "/cafe",
];

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      ...Object.fromEntries(apiProxyPrefixes.map((prefix) => [prefix, backendTarget])),
      "/voice": {
        target: backendTarget.replace(/^http/, "ws"),
        ws: true,
      },
    },
  },
});
