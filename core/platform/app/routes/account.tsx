// The signed-in user's own account: passkeys and API keys for the CLI.
import { useState } from "react";
import { Form, useActionData, useLoaderData, useRevalidator } from "react-router";
import { authClient } from "../auth-client";
import { platformContext, requireActor } from "../../src/context";
import { Err, LegacyPage, Ok, Panel, btnLink, errorMessage } from "../ui";
import type { Route } from "./+types/account";

export async function loader({ request, context }: Route.LoaderArgs) {
  const p = requireActor(context.get(platformContext));
  const [passkeys, keys] = await Promise.all([
    p.auth.api.listPasskeys({ headers: request.headers }).catch(() => []),
    p.auth.api.listApiKeys({ headers: request.headers }).then((r) => r.apiKeys).catch(() => []),
  ]);
  return {
    user: { name: p.actor.user.name, email: p.actor.user.email, operator: p.actor.operator },
    passkeys: passkeys.map((k) => ({ id: k.id, name: k.name ?? "passkey", createdAt: k.createdAt })),
    keys: keys.map((k) => ({ id: k.id, name: k.name ?? "key", start: k.start, createdAt: k.createdAt })),
    memberships: p.memberships,
  };
}

export async function action({ request, context }: Route.ActionArgs) {
  const p = requireActor(context.get(platformContext));
  const f = await request.formData();
  const intent = String(f.get("intent"));
  try {
    if (intent === "create-key") {
      const k = await p.auth.api.createApiKey({ body: { name: String(f.get("name") || "sg cli"), expiresIn: 60 * 60 * 24 * 365 }, headers: request.headers });
      return { key: k.key, ok: "Key created. Copy it now; it is not shown again." };
    }
    if (intent === "delete-key") { await p.auth.api.deleteApiKey({ body: { keyId: String(f.get("id")) }, headers: request.headers }); return { ok: "Key deleted." }; }
    if (intent === "delete-passkey") { await p.auth.api.deletePasskey({ body: { id: String(f.get("id")) }, headers: request.headers }); return { ok: "Passkey removed." }; }
  } catch (e) { return { error: errorMessage(e) }; }
  return null;
}

export default function Account() {
  const { user, passkeys, keys, memberships } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const revalidate = useRevalidator();
  const [pkError, setPkError] = useState<string | null>(null);
  return (
    <LegacyPage title="Account">
      <h1>Account</h1>
      <Panel>
        <p style={{ margin: 0 }}><strong>{user.name}</strong> · {user.email}{user.operator ? " · operator of this platform" : ""}</p>
        {memberships.length > 0 && <p className="sg-muted" style={{ margin: ".5rem 0 0" }}>Member of {memberships.map((m) => `${m.name} (${m.role})`).join(", ")}</p>}
      </Panel>
      <Panel title="Passkeys">
        <p className="sg-muted">Sign in with Touch ID, Face ID or a security key instead of a password.</p>
        <ul style={{ margin: 0 }}>{passkeys.map((k) => (
          <li key={k.id}>{k.name} <span className="sg-muted">added {new Date(k.createdAt!).toLocaleDateString()}</span>{" "}
            <Form method="post" style={{ display: "inline" }}><input type="hidden" name="intent" value="delete-passkey" /><input type="hidden" name="id" value={k.id} /><button type="submit" style={btnLink}>remove</button></Form></li>
        ))}{!passkeys.length && <li className="sg-muted">none yet</li>}</ul>
        <button className="sg-btn" style={{ marginTop: ".75rem" }} onClick={async () => {
          setPkError(null);
          const res = await authClient.passkey.addPasskey({ name: navigator.platform || "passkey" });
          if (res?.error) setPkError(res.error.message ?? "Could not add a passkey."); else revalidate.revalidate();
        }}>Add a passkey</button>
        <Err msg={pkError} />
      </Panel>
      <Panel title="API keys (for the sg CLI)">
        <p className="sg-muted">Create a key, then run <code>pnpm sg login</code> and paste it. Everything the CLI does runs as you, with your roles.</p>
        {result && "key" in result && result.key && <pre style={{ userSelect: "all", background: "var(--sg-admin-bg)", padding: ".75rem", borderRadius: "var(--sg-radius)" }}>{result.key}</pre>}
        <ul style={{ margin: 0 }}>{keys.map((k) => (
          <li key={k.id}>{k.name} <code>{k.start}…</code> <span className="sg-muted">created {new Date(k.createdAt).toLocaleDateString()}</span>{" "}
            <Form method="post" style={{ display: "inline" }}><input type="hidden" name="intent" value="delete-key" /><input type="hidden" name="id" value={k.id} /><button type="submit" style={btnLink}>revoke</button></Form></li>
        ))}{!keys.length && <li className="sg-muted">none yet</li>}</ul>
        <Form method="post" style={{ display: "flex", gap: ".5rem", marginTop: ".75rem" }}>
          <input type="hidden" name="intent" value="create-key" />
          <input name="name" placeholder="name (e.g. laptop)" /><button className="sg-btn" type="submit">Create key</button>
        </Form>
        <Err msg={result && "error" in result ? result.error : null} /><Ok msg={result && "ok" in result ? result.ok : null} />
      </Panel>
    </LegacyPage>
  );
}
