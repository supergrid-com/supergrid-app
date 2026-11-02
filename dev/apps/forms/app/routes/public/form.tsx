import { Form, useActionData, useLoaderData } from "react-router";
import { appContext } from "@supergrid/app-kit/context";
import type { Route } from "./+types/form";

type FormRow = { id: string; slug: string; title: string; question: string };

export async function loader({ context, params }: Route.LoaderArgs) {
  const { db } = context.get(appContext);
  const form = await db.prepare("SELECT id, slug, title, question FROM app_forms_forms WHERE slug = ?").bind(params.slug).first<FormRow>();
  if (!form) throw new Response("Not found", { status: 404 });
  return { form };
}

export async function action({ request, context, params }: Route.ActionArgs) {
  const { db, workspace, manifest } = context.get(appContext);
  const form = await db.prepare("SELECT id FROM app_forms_forms WHERE slug = ?").bind(params.slug).first<{ id: string }>();
  if (!form) throw new Response("Not found", { status: 404 });
  const f = await request.formData();
  const answer = String(f.get("answer") ?? "").trim();
  if (!answer) return { ok: false as const, error: "Please answer the question." };
  try {
    // The contact is core data: written through the workspace so validation runs and contact.upserted fires.
    const contact = await workspace.upsertContact(manifest.id, { email: String(f.get("email") ?? ""), name: String(f.get("name") ?? "") || undefined });
    // The response is this app's data: written directly to its own table.
    await db.prepare("INSERT INTO app_forms_responses (id, form_id, contact_id, answer) VALUES (?, ?, ?, ?)").bind(crypto.randomUUID(), form.id, contact.id, answer).run();
    await workspace.emitEvent(manifest.id, "forms.response.created", { formId: form.id, contactId: contact.id });
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
}

export default function PublicForm() {
  const { form } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const input = { padding: ".6rem", borderRadius: "var(--sg-radius)", border: "1px solid var(--sg-color-border)", font: "inherit", width: "100%", boxSizing: "border-box" as const };
  return (
    <main style={{ maxWidth: "32rem", margin: "4rem auto", padding: "0 1rem" }}>
      <h1 style={{ fontFamily: "var(--sg-font-display)" }}>{form.title}</h1>
      {result?.ok ? (
        <div className="sg-card"><p>Thanks, we got your answer.</p></div>
      ) : (
        <Form method="post" className="sg-card" style={{ display: "grid", gap: ".75rem" }}>
          <label>Email<input name="email" type="email" required style={input} /></label>
          <label>Name<input name="name" style={input} /></label>
          <label>{form.question}<textarea name="answer" required rows={4} style={input} /></label>
          {result && !result.ok && <p style={{ color: "crimson", margin: 0 }}>{result.error}</p>}
          <button className="sg-btn" type="submit">Send</button>
        </Form>
      )}
    </main>
  );
}
