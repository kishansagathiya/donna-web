import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const backendTarget =
  process.env.DONNA_API_PROXY?.trim() || "http://127.0.0.1:8787";

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
  "/skills",
  "/employees",
  "/schedules",
  "/reminders",
  "/desktop",
];

export default defineConfig({
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  base: process.env.TAURI_ENV_PLATFORM ? "./" : "/",
  server: {
    port: 5173,
    strictPort: Boolean(process.env.TAURI_ENV_PLATFORM),
    proxy: {
      ...Object.fromEntries(apiProxyPrefixes.map((prefix) => [prefix, backendTarget])),
      "/voice": {
        target: backendTarget.replace(/^http/, "ws"),
        ws: true,
      },
    },
  },
});
