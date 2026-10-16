import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Target backend untuk proxy dev (override via env VITE_BACKEND_URL, mis. http://localhost:4001)
const backendUrl = process.env.VITE_BACKEND_URL || "http://localhost:4000";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: backendUrl,
        changeOrigin: true,
      },
      "/socket.io": {
        target: backendUrl,
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom"],
          "vendor-charts": ["recharts"],
          "vendor-icons": ["lucide-react"],
        },
      },
    },
  },
});
