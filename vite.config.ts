import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { handleRazorpayApi } from "./scripts/razorpay-api.mjs";

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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  for (const key of [
        "RAZORPAY_KEY_ID",
        "RAZORPAY_KEY_SECRET",
        "RAZORPAY_PREORDER_AMOUNT_PAISE",
        "RAZORPAY_PREORDER_CURRENCY",
        "PREORDER_CALLBACK_ORIGIN",
  ]) {
    if (env[key] && !process.env[key]) {
      process.env[key] = env[key];
    }
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: "razorpay-api",
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            try {
              const handled = await handleRazorpayApi(req, res);
              if (!handled) next();
            } catch (err) {
              next(err);
            }
          });
        },
      },
    ],
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
  };
});
