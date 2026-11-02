import { appContext } from "@supergrid/app-kit/context";
import type { Route } from "./+types/responses";

/** GET /api/forms/<slug>/responses: the app's own API surface, served through the workspace router. */
export async function loader({ context, params }: Route.LoaderArgs) {
  const { db } = context.get(appContext);
  const form = await db.prepare("SELECT id, slug, title FROM app_forms_forms WHERE slug = ?").bind(params.slug).first<{ id: string; slug: string; title: string }>();
  if (!form) return Response.json({ error: "not found" }, { status: 404 });
  const count = await db.prepare("SELECT COUNT(*) AS n FROM app_forms_responses WHERE form_id = ?").bind(form.id).first<{ n: number }>();
  return Response.json({ form: form.slug, title: form.title, responses: count?.n ?? 0 });
}
