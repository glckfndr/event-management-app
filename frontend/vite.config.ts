import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  const port = Number(env.VITE_PORT) || 8090;

  return {
    plugins: [react(), tailwindcss()],
    server: {
      host: "0.0.0.0",
      port,
      strictPort: true,
    },
  };
});
