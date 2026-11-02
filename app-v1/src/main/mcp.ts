// The MCP server the coding agent gets for a workspace: themes for now, the rest of the workspace
// RPC later. A plain stdio JSON-RPC loop with no SDK, run as a Node script (ELECTRON_RUN_AS_NODE)
// so nothing from Electron is loaded. The workspace URL and token arrive in the environment from
// agent.ts; the agent never sees the token.
//
// Protocol: MCP 2025-06-18 over newline-delimited JSON-RPC: initialize, tools/list, tools/call.
import { createInterface } from "node:readline";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { applyPatch, parseTheme, shift, ThemeError, themeSchema, themeToCss, type Theme, type ThemeRecord, type ThemeSummary } from "@supergrid/theme";

const WS_URL = process.env.SG_WORKSPACE_URL ?? "";
const WS_TOKEN = process.env.SG_WORKSPACE_TOKEN ?? "";
const WS_NAME = process.env.SG_WORKSPACE_NAME ?? "the workspace";

type Json = Record<string, unknown>;
type Rpc = { jsonrpc: "2.0"; id?: number | string | null; method?: string; params?: Json; result?: unknown; error?: { code: number; message: string } };

async function ws<T>(method: string, args: unknown[] = []): Promise<T> {
  if (!WS_URL || !WS_TOKEN) throw new Error("No workspace connection: SG_WORKSPACE_URL and SG_WORKSPACE_TOKEN are not set.");
  const res = await fetch(`${WS_URL.replace(/\/$/, "")}/_ws/rpc`, { method: "POST", headers: { authorization: `Bearer ${WS_TOKEN}`, "content-type": "application/json" }, body: JSON.stringify({ method, args }) });
  const text = await res.text();
  let json: { result?: T; error?: unknown } = {};
  try { json = text ? JSON.parse(text) : {}; } catch { /* not json */ }
  if (json.error !== undefined) throw new Error(typeof json.error === "string" ? json.error : JSON.stringify(json.error));
  if (!res.ok) throw new Error(`Workspace answered ${res.status}${text ? `: ${text.slice(0, 200)}` : ""}`);
  return json.result as T;
}

function guideText(): string {
  // SKILL.md ships next to the built server (see electron.vite.config.ts); fall back to the source tree in dev.
  for (const p of [join(__dirname, "theme-SKILL.md"), join(__dirname, "../../../core/packages/theme/SKILL.md")]) {
    try { return readFileSync(p, "utf8"); } catch { /* next */ }
  }
  return "See @supergrid/theme/SKILL.md.";
}

const themeIdSchema = { type: "string", pattern: "^[a-z][a-z0-9-]{0,39}$", description: "The theme's id (slug)." };

type Tool = { name: string; description: string; inputSchema: Json; run: (args: Json) => Promise<unknown> };
const tools: Tool[] = [
  {
    name: "theme_guide",
    description: `How themes work in ${WS_NAME} and the JSON Schema of a theme document. Read this before creating or editing a theme.`,
    inputSchema: { type: "object", properties: {} },
    run: async () => ({ guide: guideText(), schema: themeSchema }),
  },
  {
    name: "list_themes",
    description: "The workspace's themes: id, name, mode, primary color, and which one is the default that apps load.",
    inputSchema: { type: "object", properties: {} },
    run: () => ws<ThemeSummary[]>("listThemes"),
  },
  {
    name: "get_theme",
    description: "One theme's full document. Omit id for the default. withCss adds the CSS variables it compiles to.",
    inputSchema: { type: "object", properties: { id: themeIdSchema, withCss: { type: "boolean" } } },
    run: async ({ id, withCss }) => {
      const theme = await ws<Theme>("readTheme", [typeof id === "string" ? id : null]);
      return withCss ? { theme, css: themeToCss(theme) } : theme;
    },
  },
  {
    name: "save_theme",
    description: "Change a theme. Pass { id, patch } to merge a partial document over the existing theme (null removes an optional value), or { theme } with a full document to create or replace one. Returns the saved theme.",
    inputSchema: {
      type: "object",
      properties: {
        id: themeIdSchema,
        patch: { type: "object", description: "A partial theme document: only the branches to change." },
        theme: { type: "object", description: "A full theme document (see theme_guide)." },
      },
    },
    run: async ({ id, patch, theme }) => {
      if (theme && typeof theme === "object") {
        const full = parseTheme(theme);
        return ws<ThemeRecord>("saveTheme", [full]);
      }
      if (typeof id !== "string" || !patch || typeof patch !== "object") throw new Error("Pass { id, patch } or { theme }.");
      const base = await ws<Theme>("readTheme", [id]);
      const next = applyPatch(base, patch as Theme);
      return ws<ThemeRecord>("saveTheme", [next]);
    },
  },
  {
    name: "create_theme",
    description: "A new theme copied from another (default: the default theme). Give it a name; the id is derived unless you pass one. Set mode to dark to start a dark counterpart (brand colors are lightened a step).",
    inputSchema: { type: "object", required: ["name"], properties: { name: { type: "string", maxLength: 60 }, id: themeIdSchema, from: themeIdSchema, mode: { enum: ["light", "dark"] } } },
    run: async ({ name, id, from, mode }) => {
      const base = await ws<Theme>("readTheme", [typeof from === "string" ? from : null]);
      const slug = typeof id === "string" ? id : String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "theme";
      const existing = await ws<ThemeSummary[]>("listThemes");
      if (existing.some((t) => t.id === slug)) throw new Error(`A theme with id "${slug}" exists; pass another id.`);
      const doc: Theme = { ...base, id: slug, name: String(name), mode: mode === "dark" || mode === "light" ? mode : base.mode };
      if (mode && mode !== base.mode) {
        const dir = mode === "dark" ? 0.12 : -0.12;
        doc.colors = { ...base.colors, primary: shift(base.colors.primary, dir), secondary: shift(base.colors.secondary, dir), accent: shift(base.colors.accent, dir),
          background: mode === "dark" ? "#0b0b0f" : "#ffffff", foreground: mode === "dark" ? "#ededf0" : "#171717" };
      }
      return ws<ThemeRecord>("saveTheme", [parseTheme(doc)]);
    },
  },
  {
    name: "set_default_theme",
    description: "Make a theme the default: the one every app and page loads.",
    inputSchema: { type: "object", required: ["id"], properties: { id: themeIdSchema } },
    run: ({ id }) => ws<ThemeSummary[]>("setDefaultTheme", [id]),
  },
  {
    name: "delete_theme",
    description: "Remove a theme. The default theme cannot be removed.",
    inputSchema: { type: "object", required: ["id"], properties: { id: themeIdSchema } },
    run: async ({ id }) => { await ws("removeTheme", [id]); return { ok: true, id }; },
  },
];

const out = (msg: Rpc) => process.stdout.write(`${JSON.stringify(msg)}\n`);
const text = (v: unknown) => ({ content: [{ type: "text", text: typeof v === "string" ? v : JSON.stringify(v, null, 2) }] });

async function handle(msg: Rpc): Promise<void> {
  const { id, method, params = {} } = msg;
  if (method === undefined) return; // a response to something we never sent
  const reply = (result: unknown) => { if (id !== undefined && id !== null) out({ jsonrpc: "2.0", id, result }); };
  try {
    switch (method) {
      case "initialize":
        return reply({ protocolVersion: (params.protocolVersion as string) || "2025-06-18", capabilities: { tools: {} }, serverInfo: { name: "supergrid", version: "0.1.0" }, instructions: `Tools for ${WS_NAME}: its design themes. Call theme_guide before editing a theme.` });
      case "notifications/initialized":
      case "notifications/cancelled":
        return;
      case "ping":
        return reply({});
      case "tools/list":
        return reply({ tools: tools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) });
      case "tools/call": {
        const tool = tools.find((t) => t.name === params.name);
        if (!tool) throw new Error(`Unknown tool ${String(params.name)}`);
        try {
          return reply(text(await tool.run((params.arguments as Json) ?? {})));
        } catch (e) {
          const message = e instanceof ThemeError ? `The theme is not valid:\n- ${e.problems.join("\n- ")}` : (e as Error).message;
          return reply({ ...text(message), isError: true });
        }
      }
      default:
        if (id !== undefined && id !== null) out({ jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } });
    }
  } catch (e) {
    if (id !== undefined && id !== null) out({ jsonrpc: "2.0", id, error: { code: -32603, message: (e as Error).message } });
  }
}

createInterface({ input: process.stdin }).on("line", (line) => {
  const raw = line.trim();
  if (!raw) return;
  let msg: Rpc;
  try { msg = JSON.parse(raw) as Rpc; } catch { return out({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }); }
  void handle(msg);
});
process.stdin.on("end", () => process.exit(0));
