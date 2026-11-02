import { createAppWorker } from "@supergrid/app-kit/worker";
import manifest from "../supergrid.app.json";

export default createAppWorker(manifest, {
  migrations: [
    { name: "0001_notes", sql: `CREATE TABLE IF NOT EXISTS app_hello_notes (id TEXT PRIMARY KEY, contact_id TEXT REFERENCES contacts(id) ON DELETE SET NULL, body TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')))` },
  ],
});
