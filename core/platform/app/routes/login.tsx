import { FingerprintIcon } from "lucide-react";
import * as React from "react";
import { Link, redirect, useLoaderData } from "react-router";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Field, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Separator } from "~/components/ui/separator";
import { authClient } from "../auth-client";
import { platformContext } from "../../src/context";
import { safeNext } from "../ui";
import type { Route } from "./+types/login";

export async function loader({ request, context }: Route.LoaderArgs) {
  const p = context.get(platformContext);
  if (p.actor) return redirect(safeNext(new URL(request.url).searchParams.get("next")));
  return { branding: p.branding, mode: p.mode };
}

export default function Login() {
  const { branding, mode } = useLoaderData<typeof loader>();
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<"passkey" | "password" | null>(null);
  const next = typeof document !== "undefined" ? safeNext(new URLSearchParams(location.search).get("next")) : "/";
  const finish = (res: { error?: { message?: string } | null }) => {
    setBusy(null);
    if (res.error) setError(res.error.message ?? "Sign-in failed.");
    else location.assign(next);
  };
  return (
    <div className="flex flex-1 items-center justify-center bg-muted/40 p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex size-11 items-center justify-center rounded-xl text-lg font-bold text-white shadow-sm" style={{ background: branding.accent }}>
            {branding.name.slice(0, 1)}
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">Sign in to {branding.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "reseller" ? "Welcome back." : "Accounts are by invitation. Ask an owner for a link if you need one."}
            </p>
          </div>
        </div>

        <form
          className="flex flex-col gap-3 rounded-2xl border bg-card p-6 shadow-xs/5"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy("password");
            setError(null);
            const f = new FormData(e.currentTarget);
            finish(await authClient.signIn.email({ email: String(f.get("email")), password: String(f.get("password")) }));
          }}
        >
          <Button
            size="lg"
            type="button"
            loading={busy === "passkey"}
            disabled={busy === "password"}
            onClick={async () => {
              setBusy("passkey");
              setError(null);
              finish(await authClient.signIn.passkey());
            }}
          >
            <FingerprintIcon />
            Continue with a passkey
          </Button>
          <div className="flex items-center gap-3 py-1 text-xs text-muted-foreground">
            <Separator className="flex-1" />
            or
            <Separator className="flex-1" />
          </div>
          <Field>
            <FieldLabel>Email</FieldLabel>
            <Input name="email" type="email" placeholder="you@company.com" autoComplete="username webauthn" autoFocus required />
          </Field>
          <Field>
            <FieldLabel>Password</FieldLabel>
            <Input name="password" type="password" autoComplete="current-password" required />
          </Field>
          {error && (
            <Alert variant="error">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button variant="secondary" type="submit" loading={busy === "password"} disabled={busy === "passkey"}>
            Sign in
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {mode === "reseller" ? (
            <>New here? <Link to="/signup" className="underline underline-offset-4 hover:text-foreground">Create an account</Link>.</>
          ) : (
            <>First time here? The one-time setup link creates the operator account.</>
          )}
        </p>
      </div>
    </div>
  );
}
