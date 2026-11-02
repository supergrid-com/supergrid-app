import { createAppWorker } from "@supergrid/app-kit/worker";
import manifest from "../supergrid.app.json";

export default createAppWorker(manifest, {
  migrations: [
    { name: "0001_forms", sql: `
      CREATE TABLE IF NOT EXISTS app_forms_forms (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL, question TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')));
      CREATE TABLE IF NOT EXISTS app_forms_responses (id TEXT PRIMARY KEY, form_id TEXT NOT NULL REFERENCES app_forms_forms(id) ON DELETE CASCADE, contact_id TEXT REFERENCES contacts(id) ON DELETE SET NULL, answer TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')));
      CREATE INDEX IF NOT EXISTS app_forms_responses_form ON app_forms_responses(form_id, created_at)
    ` },
  ],
});
