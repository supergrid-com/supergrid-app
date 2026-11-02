import { WorkerEntrypoint } from "cloudflare:workers";
import { themeToTokens, type Theme, type ThemeRecord, type ThemeSummary } from "@supergrid/theme";
import { CONTRACT, type Migration, type SitemapInput, type WorkspaceInfo, type WorkspaceRpc } from "@supergrid/app-kit/rpc";
import * as analytics from "./analytics";
import * as assets from "./assets";
import * as contacts from "./contacts";
import { applyMigrations, ensureCore } from "./db";
import * as themes from "./themes";
import * as events from "./events";
import * as hooks from "./hooks";
import * as objects from "./objects";
import * as secrets from "./secrets";
import * as sitemap from "./sitemap";
import type { Env } from "./types";
import { obj, str } from "./validate";
import * as workflows from "./workflows";

const appId = (v: unknown) => str(v, "appId", { max: 40, re: /^[a-z][a-z0-9-]*$/ });

/**
 * What apps (over a service binding) and the platform (over /_ws/rpc) can ask the workspace to do.
 * Each method checks its arguments and hands off to a module. Trusts the appId an app passes for now; a per-install token comes later.
 */
export class WorkspaceApi extends WorkerEntrypoint<Env> implements WorkspaceRpc {
  private get db() { return this.env.DB; }
  private exec() { return typeof this.ctx?.waitUntil === "function" ? this.ctx : undefined; }

  async info(): Promise<WorkspaceInfo> {
    await ensureCore(this.db);
    return { id: this.env.WORKSPACE_ID, name: this.env.WORKSPACE_NAME, url: this.env.WORKSPACE_URL, version: this.env.SG_VERSION, contract: CONTRACT,
      apps: this.env.ROUTES.map(({ app, name, public: pub, home, admin, api, nav, subscribes }) => ({ app, name, public: pub, home, admin, api, nav, subscribes })),
      sitemap: await sitemap.getSitemap(this.env) };
  }
  async getTheme() {
    return themeToTokens(await themes.readTheme(this.env.DB));
  }
  listThemes(): Promise<ThemeSummary[]> { return themes.listThemes(this.env.DB); }
  readTheme(id?: string | null): Promise<Theme> { return themes.readTheme(this.env.DB, id); }
  saveTheme(input: Partial<Theme> & { id: string }): Promise<ThemeRecord> { return themes.saveTheme(this.env.DB, input); }
  removeTheme(id: string): Promise<void> { return themes.removeTheme(this.env.DB, id); }
  setDefaultTheme(id: string): Promise<ThemeSummary[]> { return themes.setDefaultTheme(this.env.DB, id); }
  async getSetting(key: string) {
    await ensureCore(this.db);
    const row = await this.db.prepare("SELECT value FROM settings WHERE key = ?").bind(str(key, "key", { max: 100 })).first<{ value: string }>();
    return row ? JSON.parse(row.value) : null;
  }
  async setSetting(key: string, value: unknown) {
    await ensureCore(this.db);
    await this.db.prepare("INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at")
      .bind(str(key, "key", { max: 100 }), JSON.stringify(value ?? null)).run();
  }
  async getSitemap() { await ensureCore(this.db); return sitemap.getSitemap(this.env); }
  async setSitemap(input: SitemapInput) { await ensureCore(this.db); return sitemap.setSitemap(this.env, obj(input, "sitemap") as SitemapInput); }
  async applyMigrations(app: string, migrations: Migration[]) {
    const applied = await applyMigrations(this.db, appId(app), migrations);
    if (applied.length) {
      const tables = [...new Set(migrations.flatMap((m) => [...m.sql.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/gi)].map((x) => x[1])))];
      await this.db.prepare("INSERT INTO apps (id, tables) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET tables = excluded.tables").bind(app, JSON.stringify(tables)).run();
    }
    return applied;
  }

  // Contacts
  async listContacts(limit = 50) { await ensureCore(this.db); return contacts.legacyList(this.db, limit); }
  async upsertContact(app: string, input: Parameters<WorkspaceRpc["upsertContact"]>[1]) { await ensureCore(this.db); return contacts.upsertContact(this.env, this.exec(), appId(app), obj(input, "input") as typeof input); }
  async queryContacts(query?: unknown) { await ensureCore(this.db); return contacts.queryContacts(this.db, contacts.parseQuery(query ?? {})); }
  async getContact(idOrEmail: string) { await ensureCore(this.db); return contacts.getContact(this.db, idOrEmail); }
  async saveContact(app: string, input: Parameters<WorkspaceRpc["saveContact"]>[1]) { await ensureCore(this.db); return contacts.saveContact(this.env, this.exec(), appId(app), obj(input, "input") as typeof input); }
  async tagContacts(app: string, ids: string[], add?: string[], remove?: string[]) { await ensureCore(this.db); return contacts.tagContacts(this.env, this.exec(), appId(app), ids, add, remove); }
  async deleteContacts(app: string, ids: string[]) { await ensureCore(this.db); return contacts.deleteContacts(this.env, this.exec(), appId(app), ids); }
  async listTags() { await ensureCore(this.db); return contacts.listTags(this.db); }
  async listContactFields() { await ensureCore(this.db); return contacts.listContactFields(this.db); }
  async saveContactField(app: string, field: unknown) { await ensureCore(this.db); return contacts.saveContactField(this.db, appId(app), field); }
  async removeContactField(key: string) { await ensureCore(this.db); return contacts.removeContactField(this.db, key); }
  async listSegments() { await ensureCore(this.db); return contacts.listSegments(this.db); }
  async saveSegment(input: Parameters<WorkspaceRpc["saveSegment"]>[0]) { await ensureCore(this.db); return contacts.saveSegment(this.db, obj(input, "input") as typeof input); }
  async removeSegment(id: string) { await ensureCore(this.db); return contacts.removeSegment(this.db, id); }
  async addToSegment(id: string, contactIds: string[]) { await ensureCore(this.db); return contacts.addToSegment(this.db, id, contactIds); }

  // Objects
  async listObjectTypes() { await ensureCore(this.db); return objects.listObjectTypes(this.db); }
  async saveObjectType(app: string | null, input: Parameters<WorkspaceRpc["saveObjectType"]>[1]) { await ensureCore(this.db); return objects.saveObjectType(this.db, app == null ? null : appId(app), obj(input, "input") as typeof input); }
  async removeObjectType(id: string) { await ensureCore(this.db); return objects.removeObjectType(this.db, id); }
  async listObjects(type: string, query?: unknown) { await ensureCore(this.db); return objects.listObjects(this.db, type, query ?? {}); }
  async getObject(type: string, id: string) { await ensureCore(this.db); return objects.getObject(this.db, type, id); }
  async saveObject(app: string, type: string, input: Parameters<WorkspaceRpc["saveObject"]>[2]) { await ensureCore(this.db); return objects.saveObject(this.env, this.exec(), appId(app), type, obj(input, "input") as typeof input); }
  async removeObjects(app: string, type: string, ids: string[]) { await ensureCore(this.db); return objects.removeObjects(this.env, this.exec(), appId(app), type, ids); }

  // Events and analytics
  async emitEvent(app: string, type: string, payload: unknown) { await this.emit(app, [{ name: type, props: payload && typeof payload === "object" && !Array.isArray(payload) ? (payload as Record<string, unknown>) : { value: payload ?? null } }]); }
  async emit(app: string, list: Parameters<WorkspaceRpc["emit"]>[1]) {
    await ensureCore(this.db);
    if (!Array.isArray(list) || list.length > 100) throw new Error("emit takes a list of up to 100 events");
    return events.publish(this.env, this.exec(), appId(app), list.map((e) => obj(e, "event") as typeof e));
  }
  async listEvents(query?: unknown) { await ensureCore(this.db); return events.listEvents(this.db, query ?? {}); }
  async eventNames() { await ensureCore(this.db); return events.eventNames(this.db); }
  async queryAnalytics(spec: unknown) { await ensureCore(this.db); return analytics.query(this.db, spec); }
  async funnel(spec: unknown) { await ensureCore(this.db); return analytics.funnel(this.db, spec); }

  // Hooks and workflows
  async listHooks() { await ensureCore(this.db); return hooks.listHooks(this.env); }
  async saveHook(app: string | null, input: Parameters<WorkspaceRpc["saveHook"]>[1]) { await ensureCore(this.db); return hooks.saveHook(this.env, app == null ? null : appId(app), input); }
  async removeHook(id: string) { await ensureCore(this.db); return hooks.removeHook(this.db, id); }
  async hookCatalog() { await ensureCore(this.db); return hooks.hookCatalog(this.env); }
  async listWorkflows() { await ensureCore(this.db); return workflows.listWorkflows(this.db); }
  async getWorkflow(id: string) { await ensureCore(this.db); return workflows.getWorkflow(this.db, id); }
  async saveWorkflow(input: Parameters<WorkspaceRpc["saveWorkflow"]>[0]) { await ensureCore(this.db); return workflows.saveWorkflow(this.db, obj(input, "input") as typeof input); }
  async removeWorkflow(id: string) { await ensureCore(this.db); return workflows.removeWorkflow(this.db, id); }
  async runWorkflow(id: string, input?: Parameters<WorkspaceRpc["runWorkflow"]>[1]) { await ensureCore(this.db); return workflows.runWorkflow(this.env, id, input ?? {}); }
  async listRuns(query?: unknown) { await ensureCore(this.db); return hooks.listRuns(this.db, query ?? {}); }
  async getRun(id: string) { await ensureCore(this.db); return hooks.getRun(this.db, id); }

  // Secrets
  async secretsStatus() { await ensureCore(this.db); return secrets.status(this.env); }
  async listSecrets() { await ensureCore(this.db); return secrets.listSecrets(this.db); }
  async setSecret(app: string | null, input: Parameters<WorkspaceRpc["setSecret"]>[1]) { await ensureCore(this.db); return secrets.setSecret(this.env, app == null ? null : appId(app), input); }
  async removeSecret(name: string) { await ensureCore(this.db); return secrets.removeSecret(this.db, name); }
  async getSecret(name: string) { await ensureCore(this.db); return secrets.getSecret(this.env, name); }

  // Assets
  async mediaConfig() { await ensureCore(this.db); return assets.mediaConfig(this.env); }
  async listAssets(query?: unknown) { await ensureCore(this.db); return assets.listAssets(this.env, query ?? {}); }
  async getAsset(id: string) { await ensureCore(this.db); return assets.getAsset(this.env, id); }
  async listAssetFolders() { await ensureCore(this.db); return assets.listAssetFolders(this.db); }
  async createUpload(app: string, input: Parameters<WorkspaceRpc["createUpload"]>[1]) { await ensureCore(this.db); return assets.createUpload(this.env, this.exec(), appId(app), obj(input, "input") as typeof input); }
  async completeUpload(app: string, id: string, done?: Parameters<WorkspaceRpc["completeUpload"]>[2]) { await ensureCore(this.db); return assets.completeUpload(this.env, this.exec(), appId(app), id, done); }
  async refreshAsset(id: string) { await ensureCore(this.db); return assets.refreshAsset(this.env, this.exec(), id); }
  async saveAsset(app: string, input: Parameters<WorkspaceRpc["saveAsset"]>[1]) { await ensureCore(this.db); return assets.saveAsset(this.env, this.exec(), appId(app), obj(input, "input") as typeof input); }
  async removeAssets(app: string, ids: string[]) { await ensureCore(this.db); return assets.removeAssets(this.env, this.exec(), appId(app), ids); }
  async mediaAnalytics(spec?: unknown) { await ensureCore(this.db); return assets.mediaAnalytics(this.env, spec ?? {}); }

  // Fetch is required on a WorkerEntrypoint; the default export handles HTTP.
  async fetch() { return new Response("WorkspaceApi is RPC only", { status: 405 }); }
}
