// Invitation link shown to the inviter (no mailer yet). The invitee signs in or creates an account with the invited email, then accepts.
import { useState } from "react";
import { Form, redirect, useActionData, useLoaderData } from "react-router";
import { authClient } from "../auth-client";
import { platformContext } from "../../src/context";
import { AuthFrame, Err, Panel, errorMessage } from "../ui";
import type { D1Database } from "@cloudflare/workers-types/experimental";
import type { Route } from "./+types/invite";

type Inv = { id: string; email: string; role: string | null; status: string; expiresAt: string; orgName: string };
const load = (db: D1Database, id: string) => db.prepare('SELECT i.id, i.email, i.role, i.status, i.expiresAt, o.name AS orgName FROM "invitation" i JOIN "organization" o ON o.id = i.organizationId WHERE i.id = ?').bind(id).first<Inv>();

export async function loader({ context, params }: Route.LoaderArgs) {
  const p = context.get(platformContext);
  const inv = await load(p.env.PLATFORM_DB, params.id);
  if (!inv) throw new Response("Invitation not found", { status: 404 });
  const valid = inv.status === "pending" && new Date(inv.expiresAt) > new Date();
  const matches = !!p.actor && p.actor.user.email.toLowerCase() === inv.email.toLowerCase();
  return { inv, valid, signedIn: !!p.actor, matches, branding: p.branding };
}

export async function action({ context, params, request }: Route.ActionArgs) {
  const p = context.get(platformContext);
  if (!p.actor) return redirect(`/invite/${params.id}`);
  try {
    await p.auth.api.acceptInvitation({ body: { invitationId: params.id }, headers: request.headers });
    return redirect("/");
  } catch (e) { return { error: errorMessage(e) }; }
}

export default function Invite() {
  const { inv, valid, signedIn, matches, branding } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const [mode, setMode] = useState<"in" | "up">("up");
  const [error, setError] = useState<string | null>(null);
  const field: React.CSSProperties = { width: "100%", boxSizing: "border-box", marginTop: ".25rem" };
  return (
    <AuthFrame>
      <Panel>
        <h1>Join {inv.orgName}</h1>
        {!valid ? <p className="sg-muted">This invitation is {inv.status === "pending" ? "expired" : inv.status}. Ask for a new one.</p>
        : signedIn && matches ? (
          <Form method="post" style={{ display: "grid", gap: ".75rem" }}>
            <p style={{ margin: 0 }}>You were invited as <strong>{inv.role ?? "member"}</strong> on {branding.name}.</p>
            <Err msg={result?.error} />
            <button className="sg-btn" type="submit">Accept invitation</button>
          </Form>
        ) : signedIn ? (
          <p>This invitation is for <strong>{inv.email}</strong>, but you are signed in with another address. <a href="/logout" onClick={(e) => { e.preventDefault(); authClient.signOut().then(() => location.reload()); }}>Sign out</a> and try again.</p>
        ) : (
          <form style={{ display: "grid", gap: ".75rem" }} onSubmit={async (e) => {
            e.preventDefault(); setError(null);
            const f = new FormData(e.currentTarget);
            const res = mode === "up"
              ? await authClient.signUp.email({ name: String(f.get("name")), email: inv.email, password: String(f.get("password")) })
              : await authClient.signIn.email({ email: inv.email, password: String(f.get("password")) });
            if (res.error) setError(res.error.message ?? "Failed."); else location.reload();
          }}>
            <p style={{ margin: 0 }}>Invited as <strong>{inv.role ?? "member"}</strong>. {mode === "up" ? "Create your account" : "Sign in"} with <strong>{inv.email}</strong>.</p>
            {mode === "up" && <label>Name<input name="name" required style={field} /></label>}
            <label>Password<input name="password" type="password" minLength={mode === "up" ? 10 : undefined} autoComplete={mode === "up" ? "new-password" : "current-password"} required style={field} /></label>
            <Err msg={error} />
            <button className="sg-btn" type="submit">{mode === "up" ? "Create account" : "Sign in"}</button>
            <button type="button" className="sg-muted text-sm underline underline-offset-4" onClick={() => setMode(mode === "up" ? "in" : "up")}>
              {mode === "up" ? "I already have an account" : "I need an account"}
            </button>
          </form>
        )}
      </Panel>
    </AuthFrame>
  );
}
