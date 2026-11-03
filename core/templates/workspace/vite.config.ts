import { cloudflare } from "@cloudflare/vite-plugin";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { workspaceViteConfig } from "@supergrid/app-kit/vite";
import { resolve } from "node:path";
import { defineConfig } from "vite";

// One Vite build for the workspace Worker and every app under apps/. `.sg/` is regenerated from the manifests first.
export default defineConfig(({ command }) => ({
  ...workspaceViteConfig(command, { cloudflare, reactRouter, tailwindcss }, { dir: import.meta.dirname }),
  // `~` is this repo's app/ folder: the shared kit, the admin layer, the site frame. A plain path, not a URL's pathname.
  resolve: { alias: { "~": resolve(import.meta.dirname, "app") }, dedupe: ["react", "react-dom", "react-router"] },
}));
