// Operator only: the Cloudflare token the platform uses to create workspaces and deploy updates.
import { CheckCircle2Icon, ExternalLinkIcon } from "lucide-react";
import { Form, useActionData, useLoaderData, useNavigation } from "react-router";
import { tokenPermissions, tokenTemplateLink } from "@supergrid/cloud";
import { PageFrame } from "~/components/page-frame";
import { PageHeader } from "~/components/page-header";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "~/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { connect, disconnect, isConnected, prefixOf } from "../../src/cloud";
import { platformContext, requireActor } from "../../src/context";
import { errorMessage } from "../ui";
import type { Route } from "./+types/connect";

const operator = (context: Route.LoaderArgs["context"]) => {
  const p = requireActor(context.get(platformContext));
  if (!p.actor.operator) throw new Response("Operators only", { status: 403 });
  return p;
};

export async function loader({ context }: Route.LoaderArgs) {
  const p = operator(context);
  return { connected: await isConnected(p.env), fromEnv: !!p.env.SG_CF_TOKEN, accountId: p.env.SG_ACCOUNT_ID ?? "", link: tokenTemplateLink(`${prefixOf(p.env)}-platform`), permissions: tokenPermissions };
}

export async function action({ request, context }: Route.ActionArgs) {
  const p = operator(context);
  const f = await request.formData();
  if (f.get("intent") === "disconnect") { await disconnect(p.env); return { ok: "Disconnected." }; }
  const token = String(f.get("token") ?? "").trim();
  const accountId = p.env.SG_ACCOUNT_ID || String(f.get("accountId") ?? "").trim();
  if (!token || !accountId) return { error: "The account id and token are both required." };
  try { await connect(p.env, accountId, token); return { ok: "Connected." }; }
  catch (e) { return { error: `Cloudflare refused that token: ${errorMessage(e)}` }; }
}

export default function Connect() {
  const { connected, fromEnv, accountId, link, permissions } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const nav = useNavigation();
  return (
    <PageFrame crumbs={[{ label: "Platform settings", to: "/settings" }, { label: "Cloudflare" }]} width="narrow">
      <PageHeader title="Cloudflare" description="The platform runs in your own Cloudflare account. This token lets it create workspaces, install apps and deploy updates there." />
      {result && "error" in result && <Alert variant="error"><AlertDescription>{result.error}</AlertDescription></Alert>}
      {connected ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CheckCircle2Icon className="size-5 text-success" />Connected</CardTitle>
            <CardDescription>{fromEnv ? "Using a token from the local environment." : "The token is stored encrypted. Create a new one in Cloudflare to rotate it."}</CardDescription>
          </CardHeader>
          {!fromEnv && (
            <CardPanel>
              <Form method="post">
                <input type="hidden" name="intent" value="disconnect" />
                <Button type="submit" variant="destructive-outline">Disconnect</Button>
              </Form>
            </CardPanel>
          )}
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Connect your account</CardTitle>
            <CardDescription>The link opens Cloudflare with the permissions filled in. Check them, create the token, and paste it here.</CardDescription>
          </CardHeader>
          <CardPanel>
            <Form method="post" className="flex flex-col gap-4">
              <ul className="list-disc ps-5 text-sm text-muted-foreground">{permissions.map((x) => <li key={x}>{x}</li>)}</ul>
              <Button variant="outline" className="self-start" render={<a href={link} target="_blank" rel="noreferrer" />}>
                Create the token in Cloudflare
                <ExternalLinkIcon />
              </Button>
              {!accountId && (
                <Field>
                  <FieldLabel>Account ID</FieldLabel>
                  <Input name="accountId" required />
                </Field>
              )}
              <Field>
                <FieldLabel>API token</FieldLabel>
                <Input name="token" type="password" autoComplete="off" required />
                <FieldDescription>Cloudflare is asked to confirm it before anything is saved.</FieldDescription>
              </Field>
              <Button type="submit" className="self-start" loading={nav.state === "submitting"}>Connect</Button>
            </Form>
          </CardPanel>
        </Card>
      )}
    </PageFrame>
  );
}
