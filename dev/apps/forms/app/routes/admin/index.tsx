import { Form, Link, redirect, useActionData, useLoaderData, useOutletContext } from "react-router";
import { appContext } from "@supergrid/app-kit/context";
import { can, requirePermission } from "@supergrid/app-kit/user";
import type { AdminHost } from "@supergrid/admin-sdk/app";
import type { Route } from "./+types/index";

export async function loader({ context }: Route.LoaderArgs) {
  const { db, manifest, user } = context.get(appContext);
  const forms = (await db.prepare("SELECT f.id, f.slug, f.title, f.created_at, COUNT(r.id) AS responses FROM app_forms_forms f LEFT JOIN app_forms_responses r ON r.form_id = f.id GROUP BY f.id ORDER BY f.created_at DESC")
    .all<{ id: string; slug: string; title: string; created_at: string; responses: number }>()).results;
  // `user` is the staff member the workspace verified (null when the app runs standalone in dev).
  return { forms, mount: manifest.public!.mount, adminBase: `/admin/${manifest.id}`, user: user && { name: user.name, role: user.role }, canWrite: !user || can(user, "content:write") };
}

export async function action({ request, context }: Route.ActionArgs) {
  const { db, manifest, user } = context.get(appContext);
  if (user) requirePermission(user, "content:write"); // viewers can look, not create
  const f = await request.formData();
  const title = String(f.get("title") ?? "").trim();
  const question = String(f.get("question") ?? "").trim();
  const slug = (String(f.get("slug") ?? "") || title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!title || !question || !slug) return { error: "Title, slug and question are required." };
  const id = crypto.randomUUID();
  try {
    await db.prepare("INSERT INTO app_forms_forms (id, slug, title, question) VALUES (?, ?, ?, ?)").bind(id, slug, title, question).run();
  } catch (e) {
    return { error: /UNIQUE/.test(String(e)) ? `A form with slug "${slug}" already exists.` : (e as Error).message };
  }
  return redirect(`/admin/${manifest.id}/${id}`);
}

export default function AdminForms() {
  const { forms, mount, adminBase, user, canWrite } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const { host } = useOutletContext<{ host: AdminHost | null }>();
  const input = { padding: ".5rem", borderRadius: "var(--sg-radius)", border: "1px solid var(--sg-color-border)", font: "inherit" };
  return (
    <>
      <section className="sg-card" style={{ background: "var(--sg-admin-panel)", marginBottom: "1rem" }}>
        <h2 style={{ marginTop: 0 }}>Forms</h2>
        <p className="sg-muted">{host?.embedded ? `Workspace ${host.session?.workspace.name}.` : "Standalone."}{user ? ` You are ${user.name} (${user.role}).` : ""} Each form is one question; answers become contacts plus a response row.</p>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th align="left">Title</th><th align="left">Public URL</th><th align="left">Responses</th></tr></thead>
          <tbody>{forms.map((f) => (
            <tr key={f.id}><td><Link to={`${adminBase}/${f.id}`}>{f.title}</Link></td><td><a href={`${mount}/${f.slug}`} target="_blank" rel="noreferrer">{mount}/{f.slug}</a></td><td>{f.responses}</td></tr>
          ))}{forms.length === 0 && <tr><td colSpan={3} className="sg-muted">No forms yet.</td></tr>}</tbody>
        </table>
      </section>
      {canWrite && <section className="sg-card" style={{ background: "var(--sg-admin-panel)" }}>
        <h3 style={{ marginTop: 0 }}>New form</h3>
        <Form method="post" style={{ display: "grid", gap: ".5rem", maxWidth: "32rem" }}>
          <input name="title" placeholder="Title" required style={input} />
          <input name="slug" placeholder="slug (optional)" style={input} />
          <input name="question" placeholder="The one question to ask" required style={input} />
          {result?.error && <p style={{ color: "crimson", margin: 0 }}>{result.error}</p>}
          <button className="sg-btn" type="submit" style={{ justifySelf: "start" }}>Create form</button>
        </Form>
      </section>}
    </>
  );
}
