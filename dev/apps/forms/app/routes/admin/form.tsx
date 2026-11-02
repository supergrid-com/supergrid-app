import { Link, useLoaderData } from "react-router";
import { appContext } from "@supergrid/app-kit/context";
import type { Route } from "./+types/form";

export async function loader({ context, params }: Route.LoaderArgs) {
  const { db, manifest } = context.get(appContext);
  const form = await db.prepare("SELECT id, slug, title, question FROM app_forms_forms WHERE id = ?").bind(params.id).first<{ id: string; slug: string; title: string; question: string }>();
  if (!form) throw new Response("Not found", { status: 404 });
  // App table joined to the shared contacts table in one query.
  const responses = (await db.prepare("SELECT r.id, r.answer, r.created_at, c.email, c.name FROM app_forms_responses r LEFT JOIN contacts c ON c.id = r.contact_id WHERE r.form_id = ? ORDER BY r.created_at DESC LIMIT 200")
    .bind(form.id).all<{ id: string; answer: string; created_at: string; email: string | null; name: string | null }>()).results;
  return { form, responses, mount: manifest.public!.mount, adminBase: `/admin/${manifest.id}` };
}

export default function AdminForm() {
  const { form, responses, mount, adminBase } = useLoaderData<typeof loader>();
  return (
    <section className="sg-card" style={{ background: "var(--sg-admin-panel)" }}>
      <p><Link to={adminBase}>← Forms</Link></p>
      <h2 style={{ marginTop: 0 }}>{form.title}</h2>
      <p className="sg-muted">Asks: “{form.question}” · public at <a href={`${mount}/${form.slug}`} target="_blank" rel="noreferrer">{mount}/{form.slug}</a></p>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr><th align="left">Contact</th><th align="left">Answer</th><th align="left">When</th></tr></thead>
        <tbody>{responses.map((r) => <tr key={r.id}><td>{r.email}{r.name ? ` (${r.name})` : ""}</td><td>{r.answer}</td><td className="sg-muted">{r.created_at}</td></tr>)}
        {responses.length === 0 && <tr><td colSpan={3} className="sg-muted">No responses yet.</td></tr>}</tbody>
      </table>
    </section>
  );
}
