import path from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }

          if (id.includes("recharts") || id.includes("d3-")) {
            return "charts";
          }

          if (id.includes("framer-motion")) {
            return "motion";
          }

          if (
            /node_modules[/\\](react|react-dom|scheduler|react-router|react-router-dom|@remix-run[/\\]router)[/\\]/.test(id)
          ) {
            return "react-vendor";
          }

          return undefined;
        },
      },
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
