import { Form, useLoaderData } from "react-router";
import { appContext } from "@supergrid/app-kit/context";
import type { Route } from "./+types/notes";

export async function loader({ context }: Route.LoaderArgs) {
  const { db } = context.get(appContext);
  const notes = (await db.prepare("SELECT n.id, n.body, n.created_at, c.email FROM app_hello_notes n LEFT JOIN contacts c ON c.id = n.contact_id ORDER BY n.created_at DESC LIMIT 50").all<{ id: string; body: string; created_at: string; email: string | null }>()).results;
  const contacts = (await db.prepare("SELECT id, email FROM contacts ORDER BY email").all<{ id: string; email: string }>()).results;
  return { notes, contacts };
}

export async function action({ request, context }: Route.ActionArgs) {
  const { db, workspace, manifest } = context.get(appContext);
  const form = await request.formData();
  const body = String(form.get("body") ?? "").trim();
  const contactId = String(form.get("contact_id") ?? "") || null;
  if (!body) return { error: "Note is empty" };
  await db.prepare("INSERT INTO app_hello_notes (id, contact_id, body) VALUES (?, ?, ?)").bind(crypto.randomUUID(), contactId, body).run();
  await workspace.emitEvent(manifest.id, "hello.note.created", { contactId });
  return { ok: true };
}

export default function Notes() {
  const { notes, contacts } = useLoaderData<typeof loader>();
  return (
    <section className="sg-card" style={{ background: "var(--sg-admin-panel)" }}>
      <h2 style={{ marginTop: 0 }}>Notes</h2>
      <p className="sg-muted">An app-owned table (<code>app_hello_notes</code>) joined to the shared <code>contacts</code> table in one query.</p>
      <Form method="post" style={{ display: "flex", gap: ".5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <select name="contact_id" style={{ padding: ".5rem" }}><option value="">(no contact)</option>{contacts.map((c) => <option key={c.id} value={c.id}>{c.email}</option>)}</select>
        <input name="body" placeholder="note" required style={{ padding: ".5rem", flex: 1 }} />
        <button className="sg-btn" type="submit">Add note</button>
      </Form>
      <ul>{notes.map((n) => <li key={n.id}>{n.body} <span className="sg-muted">{n.email ? `— ${n.email}` : ""} · {n.created_at}</span></li>)}</ul>
    </section>
  );
}
