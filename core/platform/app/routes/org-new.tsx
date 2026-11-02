import { Form, redirect, useActionData, useLoaderData } from "react-router";
import { platformContext, requireActor } from "../../src/context";
import { Err, LegacyPage, Panel, errorMessage } from "../ui";
import type { Route } from "./+types/org-new";

export async function loader({ context }: Route.LoaderArgs) {
  const p = requireActor(context.get(platformContext));
  const allowed = p.mode === "reseller" || p.actor.operator || p.memberships.length === 0;
  if (!allowed) return redirect("/");
  return { mode: p.mode };
}

export async function action({ request, context }: Route.ActionArgs) {
  const p = requireActor(context.get(platformContext));
  const f = await request.formData();
  const name = String(f.get("name") || "").trim();
  if (!name) return { error: "Name required." };
  const slug = String(f.get("slug") || name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  try {
    const org = await p.auth.api.createOrganization({ body: { name, slug }, headers: request.headers });
    if (org) await p.auth.api.setActiveOrganization({ body: { organizationId: org.id }, headers: request.headers });
    return redirect("/");
  } catch (e) { return { error: errorMessage(e) }; }
}

export default function OrgNew() {
  const { mode } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  return (
    <LegacyPage title="New organization" width="narrow">
      <h1>New organization</h1>
      <Panel>
        <p className="sg-muted">{mode === "reseller" ? "Your organization owns your workspaces and the people you invite." : "The organization that owns this platform's workspaces."}</p>
        <Form method="post" style={{ display: "grid", gap: ".75rem", maxWidth: "24rem" }}>
          <label>Name<input name="name" required style={{ width: "100%", boxSizing: "border-box", marginTop: ".25rem" }} /></label>
          <label>Slug <span className="sg-muted">(optional)</span><input name="slug" style={{ width: "100%", boxSizing: "border-box", marginTop: ".25rem" }} /></label>
          <Err msg={result?.error} />
          <button className="sg-btn" type="submit">Create</button>
        </Form>
      </Panel>
    </LegacyPage>
  );
}
