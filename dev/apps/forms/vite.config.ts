import { cloudflare } from "@cloudflare/vite-plugin";
import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import { appViteConfig } from "@supergrid/app-kit/vite";
import manifest from "./supergrid.app.json";

export default defineConfig(({ command }) => appViteConfig(manifest, command, { cloudflare, reactRouter }, { workspaceConfig: "../../../core/workspace/wrangler.jsonc" }));
