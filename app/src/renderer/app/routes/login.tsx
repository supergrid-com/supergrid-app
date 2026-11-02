import { FingerprintIcon, MailIcon } from "lucide-react";
import * as React from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "~/components/ui/button";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "~/components/ui/collapsible";
import { Field, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Separator } from "~/components/ui/separator";
import { branding } from "~/lib/mock";

export default function Login() {
  const navigate = useNavigate();
  const [busy, setBusy] = React.useState<"passkey" | "link" | "password" | null>(null);
  const go = (kind: NonNullable<typeof busy>) => {
    setBusy(kind);
    setTimeout(() => navigate("/"), 700);
  };
  return (
    <div className="flex flex-1 items-center justify-center bg-muted/40 p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex size-11 items-center justify-center rounded-xl text-lg font-bold text-white shadow-sm" style={{ background: branding.accent }}>
            S
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">Sign in to {branding.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Accounts are by invitation. Ask an owner for a link if you need one.</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border bg-card p-6 shadow-xs/5">
          <Button size="lg" loading={busy === "passkey"} onClick={() => go("passkey")}>
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
            <Input type="email" placeholder="you@company.com" />
          </Field>
          <Button variant="outline" loading={busy === "link"} onClick={() => go("link")}>
            <MailIcon />
            Email me a sign-in link
          </Button>
          <Collapsible>
            <CollapsibleTrigger render={<Button variant="link" size="sm" className="self-center text-muted-foreground" />}>Use a password instead</CollapsibleTrigger>
            <CollapsiblePanel>
              <div className="flex flex-col gap-3 pt-2">
                <Field>
                  <FieldLabel>Password</FieldLabel>
                  <Input type="password" />
                </Field>
                <Button variant="secondary" loading={busy === "password"} onClick={() => go("password")}>
                  Sign in
                </Button>
              </div>
            </CollapsiblePanel>
          </Collapsible>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          First time here? The one-time <Link to="/" className="underline underline-offset-4 hover:text-foreground">setup link</Link> creates the operator account.
        </p>
      </div>
    </div>
  );
}
