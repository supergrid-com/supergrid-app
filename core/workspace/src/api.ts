import { WorkerEntrypoint } from "cloudflare:workers";
import { defaultTokens } from "@supergrid/theme";
import { CONTRACT, type Contact, type Migration, type WorkspaceInfo, type WorkspaceRpc } from "@supergrid/app-kit/rpc";
import { applyMigrations, ensureCore } from "./db";
import type { Env } from "./types";

/**
 * What apps (over a service binding) and the platform (over /_ws/rpc) can ask the workspace to do.
 * Trusts the appId an app passes for now; a per-install token comes later.
 */
export class WorkspaceApi extends WorkerEntrypoint<Env> implements WorkspaceRpc {
  async info(): Promise<WorkspaceInfo> {
    return { id: this.env.WORKSPACE_ID, name: this.env.WORKSPACE_NAME, url: this.env.WORKSPACE_URL, version: this.env.SG_VERSION, contract: CONTRACT,
      apps: this.env.ROUTES.map(({ app, name, public: pub, admin, api, nav }) => ({ app, name, public: pub, admin, api, nav })) };
  }
  async getTheme() {
    const custom = (await this.getSetting("theme")) as Record<string, string> | null;
    return { ...defaultTokens, ...(custom ?? {}) };
  }
  async getSetting(key: string) {
    await ensureCore(this.env.DB);
    const row = await this.env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind(key).first<{ value: string }>();
    return row ? JSON.parse(row.value) : null;
  }
  async setSetting(key: string, value: unknown) {
    await ensureCore(this.env.DB);
    await this.env.DB.prepare("INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at")
      .bind(key, JSON.stringify(value)).run();
  }
  async listContacts(limit = 50): Promise<Contact[]> {
    await ensureCore(this.env.DB);
    return (await this.env.DB.prepare("SELECT id, email, name, created_at FROM contacts ORDER BY created_at DESC LIMIT ?").bind(limit).all<Contact>()).results;
  }
  async upsertContact(appId: string, input: { email: string; name?: string }): Promise<Contact> {
    await ensureCore(this.env.DB);
    const email = input.email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Invalid email");
    const id = crypto.randomUUID();
    await this.env.DB.prepare("INSERT INTO contacts (id, email, name) VALUES (?, ?, ?) ON CONFLICT(email) DO UPDATE SET name = COALESCE(excluded.name, contacts.name), updated_at = datetime('now')")
      .bind(id, email, input.name ?? null).run();
    const row = (await this.env.DB.prepare("SELECT id, email, name, created_at FROM contacts WHERE email = ?").bind(email).first<Contact>())!;
    await this.emitEvent(appId, "contact.upserted", { id: row.id, email: row.email });
    return row;
  }
  async emitEvent(appId: string, type: string, payload: unknown) {
    await ensureCore(this.env.DB);
    await this.env.DB.prepare("INSERT INTO events (id, app_id, type, payload) VALUES (?, ?, ?, ?)").bind(crypto.randomUUID(), appId, type, JSON.stringify(payload ?? null)).run();
  }
  async applyMigrations(appId: string, migrations: Migration[]) {
    const applied = await applyMigrations(this.env.DB, appId, migrations);
    if (applied.length) {
      const tables = [...new Set(migrations.flatMap((m) => [...m.sql.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/gi)].map((x) => x[1])))];
      await this.env.DB.prepare("INSERT INTO apps (id, tables) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET tables = excluded.tables").bind(appId, JSON.stringify(tables)).run();
    }
    return applied;
  }
  // Fetch is required on a WorkerEntrypoint; the default export handles HTTP.
  async fetch() { return new Response("WorkspaceApi is RPC only", { status: 405 }); }
}
