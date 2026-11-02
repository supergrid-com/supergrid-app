import { createAppWorker } from "@supergrid/app-kit/worker";
import manifest from "../supergrid.app.json";

export default createAppWorker(manifest, {
  migrations: [
    { name: "0001_notes", sql: `CREATE TABLE IF NOT EXISTS app_hello_notes (id TEXT PRIMARY KEY, contact_id TEXT REFERENCES contacts(id) ON DELETE SET NULL, body TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')))` },
  ],
  // The workspace delivers events named in the manifest's `subscribes` here.
  hooks: {
    "contact.tagged": async (event, env) => {
      await env.DB.prepare("INSERT INTO app_hello_notes (id, contact_id, body) VALUES (?, ?, ?)").bind(crypto.randomUUID(), event.contact_id, `Tagged ${String(event.props.tag)} by the workspace`).run();
    },
  },
});
