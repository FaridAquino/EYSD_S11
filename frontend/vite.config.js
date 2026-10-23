import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// /api/* se reenvía a Flask, así no hace falta configurar CORS en el backend
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5000",
        rewrite: (ruta) => ruta.replace(/^\/api/, ""),
      },
    },
  },
});
