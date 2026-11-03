import { cloudflare } from "@cloudflare/vite-plugin";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { appViteConfig } from "@supergrid/app-kit/vite";
import { defineConfig } from "vite";
import manifest from "./supergrid.app.json";

// Dev composes the workspace Worker and this app in one server (workspaceConfig points at it); build builds the app alone.
export default defineConfig(({ command }) => ({
  ...appViteConfig(manifest, command, { cloudflare, reactRouter, tailwindcss }, { workspaceConfig: process.env.SG_WORKSPACE_CONFIG ?? "../workspace/wrangler.jsonc", dir: import.meta.dirname }),
  resolve: { alias: { "~": new URL("./app", import.meta.url).pathname } },
}));
