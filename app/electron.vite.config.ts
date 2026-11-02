import { copyFileSync } from "node:fs";
import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";

// Three builds: main (Node), preload (sandboxed bridge), renderer (the manager UI, a plain web app).
// Main has a second entry, mcp: the stdio MCP server the coding agent spawns (see src/main/mcp.ts).
export default defineConfig({
  main: {
    plugins: [
      externalizeDepsPlugin({ exclude: ["@supergrid/cloud", "@supergrid/app-kit", "@supergrid/theme"] }),
      // the agent's theme guide, read by mcp.ts at runtime
      { name: "sg-theme-skill", closeBundle() { copyFileSync(resolve("../core/packages/theme/SKILL.md"), resolve("out/main/theme-SKILL.md")); } },
    ],
    build: { rollupOptions: { input: { index: resolve("src/main/index.ts"), mcp: resolve("src/main/mcp.ts") } } },
  },
  preload: { plugins: [externalizeDepsPlugin()] },
  renderer: {
    resolve: { alias: { "~": resolve("src/renderer/app") } },
    plugins: [tailwindcss(), react()],
  },
});
