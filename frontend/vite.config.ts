import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Port 5173 matches the backend's default FRONTEND_URL / CORS origin.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
