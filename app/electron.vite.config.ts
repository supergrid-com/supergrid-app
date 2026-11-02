import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";

// Three builds: main (Node), preload (sandboxed bridge), renderer (the manager UI, a plain web app).
export default defineConfig({
  main: { plugins: [externalizeDepsPlugin({ exclude: ["@supergrid/cloud", "@supergrid/app-kit"] })] },
  preload: { plugins: [externalizeDepsPlugin()] },
  renderer: {
    resolve: { alias: { "~": resolve("src/renderer/app") } },
    plugins: [tailwindcss(), react()],
  },
});
