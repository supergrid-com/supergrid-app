import { locate, parseManifest } from "@supergrid/app-kit/manifest";
import * as apps from "../apps";
import * as workspaceApi from "../workspace-api";
import { bool, obj, requireDev, str, ToolError, type Tool } from "./index";

// What the agent can do with apps: read what an installed app is made of (its served manifest: data, operations,
// screens), run its operations, find where a row is seen, and in Dev mode make, run and install apps on this Mac.

const DEV_PAGE = (app: string) => `apps/${app}/_dev`;

export const appsTools: Tool[] = [
  {
    name: "app_describe",
    description: "Everything an installed app says about itself, from its running code: its entities (tables and columns, where rows are seen), its operations (name, what it does, who may run it, the input schema), its admin menu, its public mount and its packages. Read this before calling app_call or writing SQL against an app's tables.",
    inputSchema: { type: "object", required: ["app"], properties: { app: { type: "string", description: "The app id, as apps_list gives it." } } },
    run: async (ctx, { app }) => {
      const m = await workspaceApi.appManifest(ctx.wsId, str(app, "app"));
      ctx.widget({ type: "rows", title: `${m.name}: operations`, columns: ["operation", "access", "confirm", "description"], rows: m.operations.map((o) => [o.name, Array.isArray(o.access) ? o.access.join(", ") : o.access, o.confirm ? "yes" : "", o.description]), total: m.operations.length });
      return { id: m.id, name: m.name, version: m.version, description: m.description, public: m.public ?? null, admin: m.admin ?? null, operations: m.operations, entities: m.entities.map((e) => ({ key: e.key, label: e.label, table: e.table, title: e.title, columns: e.columns, admin: e.admin ?? null, public: e.public ?? null })), packages: m.packages ?? null, subscribes: m.subscribes ?? [], adminPage: m.admin ? `apps/${m.id}` : null, devPage: DEV_PAGE(m.id) };
    },
  },
  {
    name: "app_call",
    description: "Run one of an installed app's operations (app_describe lists them with their input schemas). The app sees the call as an owner. Operations marked confirm ask the user first.",
    inputSchema: { type: "object", required: ["app", "operation"], properties: { app: { type: "string" }, operation: { type: "string" }, input: { type: "object", description: "The operation's input, matching its schema." } } },
    run: async (ctx, { app, operation, input }) => {
      const id = str(app, "app"), op = str(operation, "operation");
      const m = await workspaceApi.appManifest(ctx.wsId, id);
      const found = m.operations.find((o) => o.name === op);
      if (!found) throw new ToolError(`${m.name} has no operation "${op}". It has: ${m.operations.map((o) => o.name).join(", ") || "none"}.`);
      const args = input === undefined || input === null ? {} : obj(input, "input");
      if (found.confirm) {
        const a = await ctx.ask({ kind: "confirm", title: `${m.name}: run ${op}?`, detail: `${found.description}\n\nInput: ${JSON.stringify(args)}`, danger: true, confirmLabel: "Run it" });
        if (!a.ok) return "The user declined. Nothing was run.";
      }
      const result = await workspaceApi.appCall(ctx.wsId, id, op, args);
      if (Array.isArray(result) && result.length && typeof result[0] === "object" && result[0]) {
        const rows = result as Record<string, unknown>[];
        const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))].slice(0, 8);
        ctx.widget({ type: "rows", title: `${m.name} · ${op}`, columns: cols, rows: rows.slice(0, 50).map((r) => cols.map((c) => (typeof r[c] === "object" && r[c] !== null ? JSON.stringify(r[c]).slice(0, 80) : r[c]))), total: rows.length });
      }
      return result ?? "Done (no result).";
    },
  },
  {
    name: "app_locate",
    description: "Where a row of an app's entity is seen: the admin page in this app and the public page on the site, from the templates the app declares. Answers with paths app_navigate can open and a URL the user can visit.",
    inputSchema: { type: "object", required: ["app", "entity", "id"], properties: { app: { type: "string" }, entity: { type: "string", description: "The entity key from app_describe." }, id: { type: "string" } } },
    run: async (ctx, { app, entity, id }) => {
      const appId = str(app, "app"), key = str(entity, "entity"), rowId = str(id, "id");
      const served = await workspaceApi.appManifest(ctx.wsId, appId);
      const { served: _s, operations: _o, entities: _e, build: _b, ...raw } = served;
      const m = parseManifest({ ...raw, operations: !!served.operations?.length });
      const e = m.entities[key];
      if (!e) throw new ToolError(`${served.name} has no entity "${key}". It has: ${Object.keys(m.entities).join(", ") || "none"}.`);
      const row = (await ctx.query(`SELECT * FROM ${e.table} WHERE id = ?`, [rowId])).results[0];
      if (!row) throw new ToolError(`No ${e.label} with id ${rowId} in ${e.table}.`);
      const ws = await ctx.ws();
      const mount = ws.apps.find((a) => a.app === appId)?.public ?? m.public?.mount ?? null;
      const where = locate(m, key, row, { mount });
      const site = ws.url.replace(/\/$/, "");
      const adminPage = where.admin.view ? `apps/${appId}${where.admin.view.slice(`/admin/${appId}`.length)}` : null;
      if (adminPage) ctx.widget({ type: "navigate", to: adminPage, label: `${served.name} · ${String(row[e.title] ?? rowId)}` });
      return { title: row[e.title] ?? rowId, admin: adminPage ? { page: adminPage, note: "Open it with app_navigate." } : null, public: where.public.view ? `${site}${where.public.view}` : null, list: { admin: where.admin.list ? `apps/${appId}${where.admin.list.slice(`/admin/${appId}`.length)}` : null, public: where.public.list ? `${site}${where.public.list}` : null } };
    },
  },
  {
    name: "apps_local",
    description: "The app folders on this Mac for the workspace (made from the template or cloned here), each with its manifest, whether it is installed, and any manifest problems. The Dev panel of an app is at apps/<id>/_dev.",
    inputSchema: { type: "object", properties: {} },
    run: async (ctx) => {
      const list = await apps.list(ctx.wsId);
      if (!list.length) return { apps: [], note: "No app folders yet. In Dev mode, apps_create makes one from the template." };
      ctx.widget({ type: "rows", title: "Apps on this Mac", columns: ["app", "name", "version", "installed", "problems"], rows: list.map((a) => [a.manifest.id, a.manifest.name, a.manifest.version, a.installed ? "yes" : "no", a.problems.length]), total: list.length });
      return { dir: apps.appsDir(ctx.wsId), apps: list.map((a) => ({ id: a.manifest.id, name: a.manifest.name, version: a.manifest.version, dir: a.dir, installed: a.installed, installedVersion: a.installedVersion, public: a.manifest.public ?? null, problems: a.problems, devPage: DEV_PAGE(a.manifest.id) })) };
    },
  },
  {
    name: "apps_create",
    description: "Dev mode. Make a new app on this Mac from the SuperGrid template: a manifest, a public page, an admin screen, one entity and its operations, with the kits copied in and dependencies installed. Then work in its folder (read its GUIDE.md and .claude/skills first) and install it with apps_install.",
    dev: true,
    inputSchema: { type: "object", required: ["id", "name"], properties: { id: { type: "string", description: "lowercase letters, digits, dashes" }, name: { type: "string" }, mount: { type: ["string", "null"], description: "The public prefix (/blog); null for an admin-only app; omit for /<id>." }, description: { type: "string" }, color: { type: "string", description: "A hex for the icon tile." }, icon: { type: "string", description: "An inline <svg> (24×24, stroke currentColor), e.g. from icon-sets.iconify.design." } } },
    run: async (ctx, { id, name, mount, description, color, icon }) => {
      requireDev(ctx, "Creating an app");
      const made = await apps.create(ctx.wsId, { id: str(id, "id"), name: str(name, "name"), mount: mount === null ? null : typeof mount === "string" ? mount : undefined, description: typeof description === "string" ? description : undefined, color: typeof color === "string" ? color : undefined, icon: typeof icon === "string" ? icon : undefined });
      ctx.navigate(DEV_PAGE(made.manifest.id));
      ctx.widget({ type: "navigate", to: DEV_PAGE(made.manifest.id), label: `${made.manifest.name} · Dev` });
      return { created: made.manifest.id, dir: made.dir, next: `Read ${made.dir}/GUIDE.md and .claude/skills/supergrid-app/SKILL.md before changing it. Run it from the Dev panel (${DEV_PAGE(made.manifest.id)}); install it with apps_install when it builds.` };
    },
  },
  {
    name: "apps_install",
    description: "Dev mode. Build an app folder on this Mac and install it into the workspace (or redeploy it when it is installed): its Worker goes up and the workspace routes to it. Asks the user first.",
    dev: true,
    inputSchema: { type: "object", required: ["app"], properties: { app: { type: "string" }, quiet: { type: "boolean", description: "Skip the confirmation (the user already asked for this)." } } },
    run: async (ctx, { app, quiet }) => {
      requireDev(ctx, "Installing an app");
      const id = str(app, "app");
      const local = (await apps.list(ctx.wsId)).find((a) => a.manifest.id === id);
      if (!local) throw new ToolError(`No app folder "${id}" on this Mac. apps_local lists them.`);
      if (!bool(quiet)) {
        const a = await ctx.ask({ kind: "confirm", title: `${local.installed ? "Redeploy" : "Install"} ${local.manifest.name} ${local.manifest.version}?`, detail: `Builds the app in ${local.dir} and ${local.installed ? "replaces its Worker" : "creates its Worker"} in the workspace.`, confirmLabel: local.installed ? "Deploy" : "Install" });
        if (!a.ok) return "The user declined. Nothing was built or deployed.";
      }
      const sender = ctx.sender();
      const installed = await apps.install(ctx.wsId, id, sender);
      ctx.widget({ type: "note", text: `${installed.name} ${installed.version ?? ""} is ${local.installed ? "redeployed" : "installed"}${installed.public ? ` at ${installed.public}` : ""}.` });
      return { installed: installed.app, version: installed.version, public: installed.public ?? null, adminPage: installed.admin ? `apps/${installed.app}` : null };
    },
  },
];
