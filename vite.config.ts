import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const backendTarget = "http://127.0.0.1:8787";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/chat": backendTarget,
      "/tts": backendTarget,
      "/knowledge": backendTarget,
      "/account": backendTarget,
      "/conversations": backendTarget,
      "/share": backendTarget,
      "/health": backendTarget,
      "/voice": {
        target: backendTarget.replace(/^http/, "ws"),
        ws: true,
      },
    },
  },
});
