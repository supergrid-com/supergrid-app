import { docGroups, findDoc } from "../../shared/docs";
import { str, ToolError, type Tool } from "./index";

// What the agent knows about the app itself: where the user is, the installed apps and the
// sitemap, moving the app to a page, the switch to Dev mode, and the docs.

/** The pages inside a workspace the agent may open: `database/<table>`, `library/themes/<id>`, and so on. */
const PAGES: { re: RegExp; label: (m: RegExpExecArray) => string }[] = [
  { re: /^$/, label: () => "Home" },
  { re: /^database(?:\/([a-z_][a-z0-9_]*))?$/, label: (m) => (m[1] ? `Database · ${m[1]}` : "Database") },
  { re: /^database\/(query|migrations|backups)$/, label: (m) => `Database · ${m[1]![0]!.toUpperCase()}${m[1]!.slice(1)}` },
  { re: /^workflows(?:\/([\w-]+))?$/, label: (m) => (m[1] ? `Workflows · ${m[1]}` : "Workflows") },
  { re: /^workflows\/(reports|events|logging|hooks)(?:\/([\w-]+))?$/, label: (m) => `Workflows · ${m[1]![0]!.toUpperCase()}${m[1]!.slice(1)}${m[2] ? ` · ${m[2]}` : ""}` },
  { re: /^library(?:\/(media|files|themes|skills|sitemap)(?:\/([\w.-]+))?)?$/, label: (m) => `Library · ${m[1] ? `${m[1][0]!.toUpperCase()}${m[1].slice(1)}` : "Images"}${m[2] ? ` · ${m[2]}` : ""}` },
  { re: /^apps\/([a-z0-9-]+)\/_dev(?:\/.*)?$/, label: (m) => `App · ${m[1]} · Dev` },
  { re: /^apps\/([a-z0-9-]+)(?:\/.*)?$/, label: (m) => `App · ${m[1]}` },
];

export function pageLabel(to: string): string | null {
  for (const p of PAGES) {
    const m = p.re.exec(to);
    if (m) return p.label(m);
  }
  return null;
}

const DEV_MEANS = "Dev mode unlocks: changing the shape of custom tables (db_create_table, db_add_column, db_drop_table), running write SQL by hand (db_execute), and, once apps are installed, building and changing their code. In Agent mode you work through the workspace: rows, themes, library, analytics, navigation.";

export const appTools: Tool[] = [
  {
    name: "app_context",
    description: "What is open in the SuperGrid app right now: the workspace, the page and table or app the user is looking at, whether the thread is in Dev mode, and what that unlocks. The same context arrives with every prompt; call this when you need it again mid-turn.",
    inputSchema: { type: "object", properties: {} },
    run: async (ctx) => ({
      mode: ctx.dev ? "dev" : "agent",
      devMeans: DEV_MEANS,
      context: ctx.context ?? { note: "The window has not reported where the user is yet." },
    }),
  },
  {
    name: "app_navigate",
    description: "Open a page of the workspace in the app, so the user sees what you are talking about. Pages: '' (home), database, database/<table>, database/query|migrations|backups, workflows, workflows/reports, workflows/events, workflows/hooks, workflows/logging, library (images), library/media, library/files, library/themes, library/themes/<id>, library/skills, library/sitemap, apps/<app> (its admin, with the screen's path after it), apps/<app>/_dev (its Dev panel: files, dev server, git, deploy).",
    inputSchema: { type: "object", required: ["to"], properties: { to: { type: "string" } } },
    run: async (ctx, { to }) => {
      const path = str(to, "to", { optional: true }).replace(/^\/+|\/+$/g, "");
      const label = pageLabel(path);
      if (label === null) throw new ToolError(`There is no page at "${path}". See the tool's description for the pages.`);
      ctx.navigate(path);
      ctx.widget({ type: "navigate", to: path, label });
      return { opened: path, label };
    },
  },
  {
    name: "apps_list",
    description: "The apps installed in this workspace: each with its public mount (where its pages live on the site), whether it has an admin screen, an API and operations, its entities and its admin menu. apps_local lists the app folders on this Mac, installed or not.",
    inputSchema: { type: "object", properties: {} },
    run: async (ctx) => {
      const ws = await ctx.ws();
      if (!ws.apps.length) return { apps: [], note: "No apps are installed in this workspace yet. The workspace still has its own tables (contacts, events, segments), themes, library, workflows and analytics." };
      return { apps: ws.apps.map((a) => ({ app: a.app, name: a.name, version: a.version ?? null, public: a.public ?? null, admin: a.admin, api: a.api, operations: !!a.operations, entities: a.entities ?? [], nav: a.nav ?? [], adminPage: a.admin ? `apps/${a.app}` : null, devPage: `apps/${a.app}/_dev` })), note: "app_describe reads an app's full served manifest (operations, entities, where rows are seen)." };
    },
  },
  {
    name: "sitemap",
    description: "What the workspace serves on its domain: the public URL, each app's mount, what / serves, and the redirects, plus the admin pages and APIs behind them.",
    inputSchema: { type: "object", properties: {} },
    run: async (ctx) => {
      const ws = await ctx.ws();
      type Sitemap = { mounts: Record<string, string | null>; home: { app: string; path: string } | null; rules: { from: string; to: string; status: number; enabled: boolean }[] };
      const map = await ctx.rpc<Sitemap>("getSitemap").catch(() => null);
      const site = ws.url.replace(/\/$/, "");
      const routes = ws.apps.flatMap((a) => [
        ...(a.public ? [{ app: a.app, kind: "public", path: map?.mounts[a.app] ?? a.public, url: `${site}${map?.mounts[a.app] ?? a.public}` }] : []),
        ...(a.admin ? [{ app: a.app, kind: "admin", path: `/admin/${a.app}`, url: `${site}/admin/${a.app}` }] : []),
        ...(a.api ? [{ app: a.app, kind: "api", path: `/api/${a.app}`, url: `${site}/api/${a.app}` }] : []),
      ]);
      ctx.widget({ type: "rows", title: "Sitemap", columns: ["app", "kind", "path"], rows: routes.map((r) => [r.app, r.kind, r.path]), total: routes.length });
      return { url: site, home: map?.home ?? null, mounts: map?.mounts ?? {}, redirects: map?.rules ?? [], routes, reserved: ["/_ws", "/_app", "/admin", "/api"], note: ws.apps.length ? undefined : "No apps installed, so the site serves nothing yet." };
    },
  },
  {
    name: "suggest_dev_mode",
    description: `Put a card in the chat asking the user to switch this thread to Dev mode, with your reason. Use it when they ask to build an app or change code, or when a Dev-only tool answered that it needs Dev mode. Waits for their answer. ${DEV_MEANS}`,
    inputSchema: { type: "object", required: ["reason"], properties: { reason: { type: "string", description: "One sentence: what you want to do that needs Dev mode." } } },
    run: async (ctx, { reason }) => {
      if (ctx.dev) return "This thread is already in Dev mode.";
      const a = await ctx.ask({ kind: "dev", title: "Switch to Dev mode?", reason: str(reason, "reason", { max: 300 }) });
      if (!a.ok) return "The user stayed in Agent mode. Do what Agent mode allows, and say what would need Dev mode.";
      return "The user switched this thread to Dev mode. Dev tools answer now; go on.";
    },
  },
  {
    name: "docs_list",
    description: "The SuperGrid documentation: how workspaces and apps fit together, how to build an app, and references for contacts, events, hooks, workflows, assets, the sitemap, the UI kit and themes.",
    inputSchema: { type: "object", properties: {} },
    run: async () => docGroups.map((g) => ({ group: g.label, docs: g.docs.map(({ id, title, summary }) => ({ id, title, summary })) })),
  },
  {
    name: "docs_read",
    description: "One documentation page as markdown, by the id docs_list gives.",
    inputSchema: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
    run: async (_ctx, { id }) => {
      const doc = findDoc(str(id, "id"));
      if (!doc) throw new ToolError(`No page "${String(id)}". Call docs_list for the ids.`);
      return doc.body;
    },
  },
];
