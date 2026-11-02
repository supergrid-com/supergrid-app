import { cloudflare } from "@cloudflare/vite-plugin";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// `vite dev` only: lets a shell hand the local platform a real connection without it ever being written to a file. See dev/README.md.
const FROM_SHELL = ["SG_CF_TOKEN", "SG_ACCOUNT_ID", "SG_RELEASE_FEED", "SG_RELEASE_PUBKEY"];
const shellVars = () => Object.fromEntries(FROM_SHELL.flatMap((k) => (process.env[k] ? [[k, process.env[k]!]] : [])));

export default defineConfig(({ command }) => ({
  plugins: [
    cloudflare({
      viteEnvironment: { name: "ssr" }, persistState: { path: "../.state" }, inspectorPort: false,
      ...(command === "serve" ? { config: (c: { vars?: Record<string, unknown> }) => ({ vars: { ...c.vars, ...shellVars() } }) } : {}),
    }),
    tailwindcss(),
    reactRouter(),
  ],
  // Scan every component up front. Left to discover them while a page runs, Vite re-bundles mid-session and two copies of React collide.
  optimizeDeps: { entries: ["app/**/*.tsx"] },
  resolve: {
    // `~/` is app/, the same alias the UI components were written against.
    alias: { "~": fileURLToPath(new URL("./app", import.meta.url)) },
  },
}));
