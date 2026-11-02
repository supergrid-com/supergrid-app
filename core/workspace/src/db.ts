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
  // The CRM, events with their context, hooks and workflows. One migration so a workspace older than it upgrades in one step.
  // Each statement must be re-runnable on its own where SQLite allows it; nothing here contains a ';'.
  { name: "0002_crm", sql: `
    ALTER TABLE contacts ADD COLUMN source TEXT;
    ALTER TABLE contacts ADD COLUMN props TEXT NOT NULL DEFAULT '{}';
    CREATE INDEX IF NOT EXISTS contacts_created ON contacts(created_at);
    CREATE TABLE IF NOT EXISTS contact_fields (key TEXT PRIMARY KEY, label TEXT NOT NULL, type TEXT NOT NULL, options TEXT, required INTEGER NOT NULL DEFAULT 0, indexed INTEGER NOT NULL DEFAULT 0, app_id TEXT, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')));
    CREATE TABLE IF NOT EXISTS contact_tags (contact_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE, tag TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')), PRIMARY KEY (contact_id, tag));
    CREATE INDEX IF NOT EXISTS contact_tags_tag ON contact_tags(tag, contact_id);
    CREATE TABLE IF NOT EXISTS identities (anonymous_id TEXT PRIMARY KEY, contact_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')));
    CREATE INDEX IF NOT EXISTS identities_contact ON identities(contact_id);
    CREATE TABLE IF NOT EXISTS segments (id TEXT PRIMARY KEY, name TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'dynamic', filter TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')), updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')));
    CREATE TABLE IF NOT EXISTS segment_members (segment_id TEXT NOT NULL REFERENCES segments(id) ON DELETE CASCADE, contact_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE, added_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')), PRIMARY KEY (segment_id, contact_id));
    CREATE TABLE IF NOT EXISTS object_types (id TEXT PRIMARY KEY, label TEXT NOT NULL, plural TEXT NOT NULL, title_field TEXT NOT NULL DEFAULT 'name', fields TEXT NOT NULL DEFAULT '[]', app_id TEXT, version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')), updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')));
    CREATE TABLE IF NOT EXISTS events_v2 (id TEXT PRIMARY KEY, name TEXT NOT NULL, app_id TEXT NOT NULL, ts TEXT NOT NULL, contact_id TEXT, anonymous_id TEXT, session_id TEXT, url TEXT, path TEXT, referrer TEXT, utm_source TEXT, utm_medium TEXT, utm_campaign TEXT, utm_term TEXT, utm_content TEXT, country TEXT, region TEXT, city TEXT, timezone TEXT, user_agent TEXT, device TEXT, props TEXT NOT NULL DEFAULT '{}');
    INSERT OR IGNORE INTO events_v2 (id, name, app_id, ts, props) SELECT id, type, app_id, replace(created_at, ' ', 'T') || '.000Z', payload FROM events;
    DROP TABLE events;
    ALTER TABLE events_v2 RENAME TO events;
    CREATE INDEX IF NOT EXISTS events_name_ts ON events(name, ts);
    CREATE INDEX IF NOT EXISTS events_app_ts ON events(app_id, ts);
    CREATE INDEX IF NOT EXISTS events_contact_ts ON events(contact_id, ts);
    CREATE INDEX IF NOT EXISTS events_anon_ts ON events(anonymous_id, ts);
    CREATE TABLE IF NOT EXISTS event_deliveries (event_id TEXT NOT NULL, target TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')), PRIMARY KEY (event_id, target));
    CREATE TABLE IF NOT EXISTS dead_letters (id TEXT PRIMARY KEY, body TEXT NOT NULL, attempts INTEGER, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')));
    CREATE TABLE IF NOT EXISTS rollups_daily (day TEXT NOT NULL, name TEXT NOT NULL, app_id TEXT NOT NULL, path TEXT NOT NULL DEFAULT '', count INTEGER NOT NULL, contacts INTEGER NOT NULL, visitors INTEGER NOT NULL, PRIMARY KEY (day, name, app_id, path));
    CREATE TABLE IF NOT EXISTS hooks (id TEXT PRIMARY KEY, name TEXT, event TEXT NOT NULL, app_id TEXT, action TEXT NOT NULL, config TEXT NOT NULL DEFAULT '{}', when_filter TEXT, enabled INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')), updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')));
    CREATE INDEX IF NOT EXISTS hooks_event ON hooks(event, enabled);
    CREATE TABLE IF NOT EXISTS workflows (id TEXT PRIMARY KEY, name TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1, definition TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')), updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')));
    CREATE TABLE IF NOT EXISTS hook_runs (id TEXT PRIMARY KEY, hook_id TEXT NOT NULL, workflow_id TEXT, workflow_version INTEGER, event_id TEXT NOT NULL, event_name TEXT NOT NULL, contact_id TEXT, status TEXT NOT NULL, error TEXT, started_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')), finished_at TEXT);
    CREATE INDEX IF NOT EXISTS hook_runs_hook ON hook_runs(hook_id, started_at);
    CREATE INDEX IF NOT EXISTS hook_runs_workflow ON hook_runs(workflow_id, started_at);
    CREATE TABLE IF NOT EXISTS hook_run_steps (run_id TEXT NOT NULL, idx INTEGER NOT NULL, step_id TEXT, type TEXT NOT NULL, status TEXT NOT NULL, output TEXT, finished_at TEXT, PRIMARY KEY (run_id, idx));
  ` },
  // Design themes: the document per theme (see @supergrid/theme), one row flagged default.
  { name: "0003_themes", sql: `
    CREATE TABLE IF NOT EXISTS themes (id TEXT PRIMARY KEY, name TEXT NOT NULL, doc TEXT NOT NULL CHECK (json_valid(doc)), is_default INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE INDEX IF NOT EXISTS themes_default ON themes(is_default);
  ` },
  { name: "0003_secrets", sql: `
    CREATE TABLE IF NOT EXISTS secrets (name TEXT PRIMARY KEY, value TEXT NOT NULL, hint TEXT NOT NULL, description TEXT, app_id TEXT, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')), updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')));
  ` },
  // Assets: one row per image, video, audio or file, pointing at Images, Stream or the R2 bucket (see ../ASSETS.md).
  { name: "0003_assets", sql: `
    CREATE TABLE IF NOT EXISTS assets (id TEXT PRIMARY KEY, kind TEXT NOT NULL, provider TEXT NOT NULL, provider_id TEXT NOT NULL, name TEXT NOT NULL, title TEXT, alt TEXT, mime TEXT, size INTEGER, width INTEGER, height INTEGER, duration REAL, status TEXT NOT NULL DEFAULT 'pending', error TEXT, folder TEXT NOT NULL DEFAULT '/', tags TEXT NOT NULL DEFAULT '[]', meta TEXT NOT NULL DEFAULT '{}', app_id TEXT, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')), updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')));
    CREATE INDEX IF NOT EXISTS assets_kind_created ON assets(kind, created_at);
    CREATE INDEX IF NOT EXISTS assets_folder ON assets(folder, created_at);
    CREATE INDEX IF NOT EXISTS assets_status ON assets(status, created_at);
    CREATE INDEX IF NOT EXISTS assets_provider ON assets(provider, provider_id);
    CREATE TABLE IF NOT EXISTS asset_tags (asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE, tag TEXT NOT NULL, PRIMARY KEY (asset_id, tag));
    CREATE INDEX IF NOT EXISTS asset_tags_tag ON asset_tags(tag, asset_id);
  ` },
];
// A hot event prop can get its own index later, e.g. CREATE INDEX events_prop_plan ON events(json_extract(props, '$.plan'), ts).

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
