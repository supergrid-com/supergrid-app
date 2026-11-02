import { useState } from "react";
import { Link, redirect, useLoaderData } from "react-router";
import { authClient } from "../auth-client";
import { platformContext } from "../../src/context";
import { AuthFrame, Err, Panel } from "../ui";
import type { Route } from "./+types/signup";

export async function loader({ context }: Route.LoaderArgs) {
  const p = context.get(platformContext);
  if (p.actor) return redirect("/");
  if (p.mode !== "reseller") return redirect("/login"); // creator and agency installs are invitation-only
  return { branding: p.branding };
}

export default function Signup() {
  const { branding } = useLoaderData<typeof loader>();
  const [error, setError] = useState<string | null>(null);
  return (
    <AuthFrame>
      <Panel>
        <h1>Create your {branding.name} account</h1>
        <form style={{ display: "grid", gap: ".75rem" }} onSubmit={async (e) => {
          e.preventDefault(); setError(null);
          const f = new FormData(e.currentTarget);
          const res = await authClient.signUp.email({ name: String(f.get("name")), email: String(f.get("email")), password: String(f.get("password")) });
          if (res.error) setError(res.error.message ?? "Sign-up failed."); else location.assign("/org/new");
        }}>
          <label>Name<input name="name" required style={{ width: "100%", boxSizing: "border-box", marginTop: ".25rem" }} /></label>
          <label>Email<input name="email" type="email" required style={{ width: "100%", boxSizing: "border-box", marginTop: ".25rem" }} /></label>
          <label>Password <span className="sg-muted">(10+ characters)</span><input name="password" type="password" minLength={10} autoComplete="new-password" required style={{ width: "100%", boxSizing: "border-box", marginTop: ".25rem" }} /></label>
          <Err msg={error} />
          <button className="sg-btn" type="submit">Create account</button>
        </form>
        <p className="sg-muted">Already have one? <Link to="/login">Sign in</Link></p>
      </Panel>
    </AuthFrame>
  );
}
