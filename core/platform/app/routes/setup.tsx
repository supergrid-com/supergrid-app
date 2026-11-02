// First run: the one-time link printed by `sg platform deploy` (or SG_SETUP_TOKEN=dev locally) creates the operator account.
import { Form, redirect, useActionData, useLoaderData } from "react-router";
import { platformContext } from "../../src/context";
import { adoptOrphanWorkspaces, setSetting, userCount } from "../../src/db";
import { AuthFrame, Err, Panel, errorMessage } from "../ui";
import type { Route } from "./+types/setup";

async function tokenOk(expected: string | undefined, given: string | null) {
  if (!expected || !given) return false;
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([crypto.subtle.digest("SHA-256", enc.encode(expected)), crypto.subtle.digest("SHA-256", enc.encode(given))]);
  const x = new Uint8Array(a), y = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const p = context.get(platformContext);
  if ((await userCount(p.env)) > 0) return redirect("/");
  const token = new URL(request.url).searchParams.get("token");
  return { branding: p.branding, mode: p.mode, unlocked: await tokenOk(p.env.SG_SETUP_TOKEN, token), token: token ?? "" };
}

export async function action({ request, context }: Route.ActionArgs) {
  const p = context.get(platformContext);
  if ((await userCount(p.env)) > 0) return redirect("/");
  const f = await request.formData();
  if (!(await tokenOk(p.env.SG_SETUP_TOKEN, String(f.get("token") || "")))) return { error: "Setup token is missing or wrong." };
  const name = String(f.get("name") || "").trim(), email = String(f.get("email") || "").trim(), password = String(f.get("password") || "");
  const orgName = String(f.get("org") || "").trim();
  if (!name || !email || !password) return { error: "Name, email and password are required." };
  try {
    const { headers, response } = await p.auth.api.signUpEmail({ body: { name, email, password }, returnHeaders: true });
    const ctx = await p.auth.$context;
    await ctx.internalAdapter.updateUser(response.user.id, { role: "admin" });
    if (orgName) {
      const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "org";
      const org = await p.auth.api.createOrganization({ body: { name: orgName, slug, userId: response.user.id } });
      if (org) await adoptOrphanWorkspaces(p.env, org.id);
    }
    await setSetting(p.env, "setup_done", new Date().toISOString());
    return redirect("/", { headers });
  } catch (e) {
    return { error: errorMessage(e) };
  }
}

export default function Setup() {
  const { branding, mode, unlocked, token } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  return (
    <AuthFrame>
      <Panel>
        <h1>Set up {branding.name}</h1>
        {!unlocked ? (
          <p className="sg-muted">This platform has no accounts yet. Open the setup link printed by <code>sg platform deploy</code> (locally: <code>/setup?token=dev</code>) to create the first one.</p>
        ) : (
          <Form method="post" style={{ display: "grid", gap: ".75rem" }}>
            <input type="hidden" name="token" value={token} />
            <p className="sg-muted" style={{ margin: 0 }}>This account becomes the operator. Mode: <strong>{mode}</strong> (changeable in Settings).</p>
            <label>Your name<input name="name" required style={{ width: "100%", boxSizing: "border-box", marginTop: ".25rem" }} /></label>
            <label>Email<input name="email" type="email" required style={{ width: "100%", boxSizing: "border-box", marginTop: ".25rem" }} /></label>
            <label>Password <span className="sg-muted">(10+ characters)</span><input name="password" type="password" minLength={10} autoComplete="new-password" required style={{ width: "100%", boxSizing: "border-box", marginTop: ".25rem" }} /></label>
            <label>{mode === "reseller" ? "Your own organization (optional)" : "Organization name"}<input name="org" required={mode !== "reseller"} defaultValue={mode === "creator" ? "Personal" : ""} style={{ width: "100%", boxSizing: "border-box", marginTop: ".25rem" }} /></label>
            <Err msg={result?.error} />
            <button className="sg-btn" type="submit">Create the operator account</button>
          </Form>
        )}
      </Panel>
    </AuthFrame>
  );
}
