import { Form, useActionData, useLoaderData } from "react-router";
import { appContext } from "@supergrid/app-kit/context";
import type { Route } from "./+types/index";

export async function loader({ context }: Route.LoaderArgs) {
  const { workspace, db, manifest } = context.get(appContext);
  const [info, contacts, notes] = await Promise.all([
    workspace.info(),                                                        // RPC to the workspace Worker
    workspace.listContacts(5),                                               // core data through RPC
    db.prepare("SELECT COUNT(*) AS n FROM app_hello_notes").first<{ n: number }>(), // the app's own table, direct SQL
  ]);
  return { info, contacts, noteCount: notes?.n ?? 0, app: manifest };
}

export async function action({ request, context }: Route.ActionArgs) {
  const { workspace, manifest } = context.get(appContext);
  const form = await request.formData();
  try {
    const contact = await workspace.upsertContact(manifest.id, { email: String(form.get("email") ?? ""), name: String(form.get("name") ?? "") || undefined });
    return { ok: true as const, contact };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
}

export default function Hello() {
  const { info, contacts, noteCount, app } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  return (
    <main style={{ maxWidth: "40rem", margin: "4rem auto", padding: "0 1rem" }}>
      <h1 style={{ fontFamily: "var(--sg-font-display)" }}>Hello from the <em>{app.name}</em> app</h1>
      <p className="sg-muted">Served by Worker <code>app-{app.id}</code>, mounted at <code>{app.public?.mount}</code> on workspace <strong>{info.name}</strong> ({info.id}).</p>
      <div className="sg-card">
        <p>Workspace has {contacts.length} recent contact(s); this app has {noteCount} note(s) in its own table.</p>
        <ul>{contacts.map((c) => <li key={c.id}>{c.email}{c.name ? ` (${c.name})` : ""}</li>)}</ul>
        <Form method="post" style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
          <input name="email" placeholder="email" required style={{ padding: ".5rem", borderRadius: "var(--sg-radius)", border: "1px solid var(--sg-color-border)" }} />
          <input name="name" placeholder="name" style={{ padding: ".5rem", borderRadius: "var(--sg-radius)", border: "1px solid var(--sg-color-border)" }} />
          <button className="sg-btn" type="submit">Add contact via RPC</button>
        </Form>
        {result && (result.ok ? <p>Saved {result.contact.email}.</p> : <p style={{ color: "crimson" }}>{result.error}</p>)}
      </div>
      <p className="sg-muted" style={{ marginTop: "2rem" }}>Apps installed here: {info.apps.map((a) => a.app).join(", ")}</p>
    </main>
  );
}
