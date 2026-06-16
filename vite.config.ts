import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const backendTarget = "http://127.0.0.1:8787";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/chat": backendTarget,
      "/knowledge": backendTarget,
      "/account": backendTarget,
      "/health": backendTarget,
    },
  },
});
