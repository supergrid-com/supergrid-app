import { locate, parseManifest } from "@supergrid/app-kit/manifest";
import * as apps from "../apps";
import * as workspaceApi from "../workspace-api";
import { bool, obj, requireDev, str, ToolError, type Tool } from "./index";

// What the agent can do with apps: read what an app is made of (its served manifest: data, operations, screens), run its
// operations, find where a row is seen, see the workspace repo's apps, and in Dev mode add an app folder and deploy the
// workspace (WORKSPACE-REPO.md: one repo and one Worker per workspace, apps as folders under apps/).

const FILES_PAGE = (app: string) => `code/files?app=${app}`;

export const appsTools: Tool[] = [
  {
    name: "app_describe",
    description: "Everything an app says about itself, from its running code (the deployed Worker in Live, the dev server in Dev): its entities (tables and columns, where rows are seen), its operations (name, what it does, who may run it, the input schema), its admin menu, its public mount and its packages. Read this before calling app_call or writing SQL against an app's tables.",
    inputSchema: { type: "object", required: ["app"], properties: { app: { type: "string", description: "The app id, as apps_list gives it." } } },
    run: async (ctx, { app }) => {
      const m = await workspaceApi.appManifest(ctx.wsId, str(app, "app"));
      ctx.widget({ type: "rows", title: `${m.name}: operations`, columns: ["operation", "access", "confirm", "description"], rows: m.operations.map((o) => [o.name, Array.isArray(o.access) ? o.access.join(", ") : o.access, o.confirm ? "yes" : "", o.description]), total: m.operations.length });
      return { id: m.id, name: m.name, version: m.version, description: m.description, public: m.public ?? null, admin: m.admin ?? null, operations: m.operations, entities: m.entities.map((e) => ({ key: e.key, label: e.label, table: e.table, title: e.title, columns: e.columns, admin: e.admin ?? null, public: e.public ?? null })), packages: m.packages ?? null, subscribes: m.subscribes ?? [], adminPage: m.admin ? `apps/${m.id}` : null, files: FILES_PAGE(m.id) };
    },
  },
  {
    name: "app_call",
    description: "Run one of an app's operations (app_describe lists them with their input schemas). The app sees the call as an owner. Operations marked confirm ask the user first. In Dev mode the operation runs on the dev server and its local data.",
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
    description: "The workspace's repo on this Mac and the app folders in it (apps/<id>), each with its manifest, whether the deployed Worker serves it, and any manifest problems. The repo is where the agent's session runs; an app's files are at apps/<id> in it, and the Code section shows them at code/files?app=<id>.",
    inputSchema: { type: "object", properties: {} },
    run: async (ctx) => {
      const { dir, apps: list } = await apps.ensureRepo(ctx.wsId);
      if (!list.length) return { dir, apps: [], note: "No app folders yet. In Dev mode, apps_create makes one from the template." };
      ctx.widget({ type: "rows", title: "Apps in the repo", columns: ["app", "name", "version", "deployed", "problems"], rows: list.map((a) => [a.manifest.id, a.manifest.name, a.manifest.version, a.installed ? "yes" : "no", a.problems.length]), total: list.length });
      return { dir, apps: list.map((a) => ({ id: a.manifest.id, name: a.manifest.name, version: a.manifest.version, dir: a.dir, deployed: a.installed, deployedVersion: a.installedVersion, disabled: a.disabled, public: a.manifest.public ?? null, problems: a.problems, files: FILES_PAGE(a.manifest.id) })) };
    },
  },
  {
    name: "apps_create",
    description: "Dev mode. Add an app to the workspace repo from the SuperGrid template: a folder under apps/<id> with a manifest, a public page, an admin screen, one entity and its operations; `.sg/` is regenerated and the dev server picks it up. Then work in its folder (read its GUIDE.md and the repo's .claude/skills first) and send it live with ws_deploy.",
    dev: true,
    inputSchema: { type: "object", required: ["id", "name"], properties: { id: { type: "string", description: "lowercase letters, digits, dashes" }, name: { type: "string" }, mount: { type: ["string", "null"], description: "The public prefix (/blog); null for an admin-only app; omit for /<id>." }, home: { type: "string", description: "A page under the mount also served as /: this app is the site." }, description: { type: "string" }, color: { type: "string", description: "A hex for the icon tile." }, icon: { type: "string", description: "An inline <svg> (24×24, stroke currentColor), e.g. from icon-sets.iconify.design." } } },
    run: async (ctx, { id, name, mount, home, description, color, icon }) => {
      requireDev(ctx, "Creating an app");
      const made = await apps.create(ctx.wsId, { id: str(id, "id"), name: str(name, "name"), mount: mount === null ? null : typeof mount === "string" ? mount : undefined, home: typeof home === "string" ? home : undefined, description: typeof description === "string" ? description : undefined, color: typeof color === "string" ? color : undefined, icon: typeof icon === "string" ? icon : undefined });
      ctx.navigate(`apps/${made.manifest.id}`);
      ctx.widget({ type: "navigate", to: `apps/${made.manifest.id}`, label: made.manifest.name });
      return { created: made.manifest.id, dir: made.dir, next: `Read ${made.dir}/GUIDE.md and the repo's .claude/skills/supergrid-app/SKILL.md before changing it. Its screens are on the dev server now (apps/${made.manifest.id}); ws_deploy sends the workspace live when it is ready.` };
    },
  },
  {
    name: "ws_deploy",
    description: "Dev mode. Build the workspace repo and upload it as the workspace Worker, every app in it, one version: what Live then serves. Asks the user first.",
    dev: true,
    inputSchema: { type: "object", properties: { quiet: { type: "boolean", description: "Skip the confirmation (the user already asked for this)." } } },
    run: async (ctx, { quiet }) => {
      requireDev(ctx, "Deploying the workspace");
      const { dir, apps: list } = await apps.ensureRepo(ctx.wsId);
      const built = list.filter((a) => !a.disabled);
      if (!bool(quiet)) {
        const a = await ctx.ask({ kind: "confirm", title: "Deploy the workspace?", detail: `Builds ${dir} and replaces the workspace Worker with it: ${built.map((x) => `${x.manifest.name} ${x.manifest.version}`).join(", ") || "no apps"}.`, confirmLabel: "Deploy" });
        if (!a.ok) return "The user declined. Nothing was built or deployed.";
      }
      const { version } = await apps.deploy(ctx.wsId, ctx.sender());
      ctx.widget({ type: "note", text: `Deployed ${version}: ${built.map((x) => x.manifest.name).join(", ") || "no apps"} are live.` });
      return { deployed: version, apps: built.map((x) => x.manifest.id), note: "Live now serves this build. The Deploys page (code/deploys) lists the versions." };
    },
  },
];
