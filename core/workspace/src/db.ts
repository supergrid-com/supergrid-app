import type { Migration } from "@supergrid/app-kit/rpc";

// Core tables. Forward-only, recorded in migrations_ledger under app_id "core".
export const CORE_MIGRATIONS: Migration[] = [
  { name: "0001_core", sql: `
    CREATE TABLE IF NOT EXISTS migrations_ledger (app_id TEXT NOT NULL, name TEXT NOT NULL, applied_at TEXT NOT NULL DEFAULT (datetime('now')), PRIMARY KEY (app_id, name));
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS contacts (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, app_id TEXT NOT NULL, type TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE INDEX IF NOT EXISTS events_type ON events(type, created_at);
    CREATE TABLE IF NOT EXISTS apps (id TEXT PRIMARY KEY, version TEXT, tables TEXT NOT NULL DEFAULT '[]', installed_at TEXT NOT NULL DEFAULT (datetime('now')));
  ` },
];

let ready: Promise<void> | null = null;
export function ensureCore(db: D1Database) {
  ready ??= applyMigrations(db, "core", CORE_MIGRATIONS).then(() => {}).catch((e) => { ready = null; throw e; });
  return ready;
}

/** Runs the steps an app hasn't had applied yet. App tables must be named app_<id>_*. */
export async function applyMigrations(db: D1Database, appId: string, migrations: Migration[]): Promise<string[]> {
  if (appId !== "core") {
    await ensureCore(db);
    const bad = migrations.flatMap((m) => [...m.sql.matchAll(/CREATE\s+(?:TABLE|INDEX)\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/gi)].map((x) => x[1]))
      .filter((t) => !t.startsWith(`app_${appId}_`));
    if (bad.length) throw new Error(`App "${appId}" may only create app_${appId}_* tables and indexes; saw: ${bad.join(", ")}`);
  }
  const done = new Set(appId === "core"
    ? await db.prepare("SELECT name FROM migrations_ledger WHERE app_id = ?").bind(appId).all<{ name: string }>().then((r) => r.results.map((x) => x.name)).catch(() => [] as string[])
    : (await db.prepare("SELECT name FROM migrations_ledger WHERE app_id = ?").bind(appId).all<{ name: string }>()).results.map((x) => x.name));
  const applied: string[] = [];
  for (const m of migrations) {
    if (done.has(m.name)) continue;
    for (const stmt of m.sql.split(";").map((s) => s.trim()).filter(Boolean)) await db.prepare(stmt).run();
    await db.prepare("INSERT INTO migrations_ledger (app_id, name) VALUES (?, ?)").bind(appId, m.name).run();
    applied.push(m.name);
  }
  return applied;
}
