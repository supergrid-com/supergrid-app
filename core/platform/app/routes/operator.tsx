// Reseller mode: the operator's view above every organization (Better Auth admin plugin).
import { Form, redirect, useActionData, useLoaderData } from "react-router";
import { platformContext, requireActor } from "../../src/context";
import { listOrgs } from "../../src/db";
import { Err, LegacyPage, Ok, Panel, btnLink, errorMessage } from "../ui";
import type { Route } from "./+types/operator";

export async function loader({ request, context }: Route.LoaderArgs) {
  const p = requireActor(context.get(platformContext));
  if (!p.actor.operator) throw new Response("Operators only", { status: 403 });
  const [users, orgs, members] = await Promise.all([
    p.auth.api.listUsers({ query: { limit: 200, sortBy: "createdAt" }, headers: request.headers }),
    listOrgs(p.env),
    p.env.PLATFORM_DB.prepare('SELECT organizationId, COUNT(*) AS n FROM "member" GROUP BY organizationId').all<{ organizationId: string; n: number }>().then((r) => r.results),
    ]);
  const wsCounts = await p.env.PLATFORM_DB.prepare("SELECT organization_id, COUNT(*) AS n FROM workspaces GROUP BY organization_id").all<{ organization_id: string | null; n: number }>().then((r) => r.results);
  return {
    me: p.actor.user.id, mode: p.mode,
    users: users.users.map((u) => ({ id: u.id, name: u.name, email: u.email, role: (u as { role?: string }).role ?? "user", banned: !!(u as { banned?: boolean }).banned, createdAt: u.createdAt })),
    orgs: orgs.map((o) => ({ ...o, members: members.find((m) => m.organizationId === o.id)?.n ?? 0, workspaces: wsCounts.find((w) => w.organization_id === o.id)?.n ?? 0 })),
    unassigned: wsCounts.find((w) => w.organization_id === null)?.n ?? 0,
  };
}

export async function action({ request, context }: Route.ActionArgs) {
  const p = requireActor(context.get(platformContext));
  if (!p.actor.operator) throw new Response("Operators only", { status: 403 });
  const f = await request.formData();
  const intent = String(f.get("intent")), userId = String(f.get("userId") || "");
  const h = { headers: request.headers };
  try {
    if (intent === "impersonate") {
      const { headers } = await p.auth.api.impersonateUser({ body: { userId }, ...h, returnHeaders: true });
      return redirect("/", { headers });
    }
    if (intent === "ban") { await p.auth.api.banUser({ body: { userId, banReason: String(f.get("reason") || "banned by operator") }, ...h }); return { ok: "User banned; their sessions are revoked." }; }
    if (intent === "unban") { await p.auth.api.unbanUser({ body: { userId }, ...h }); return { ok: "User unbanned." }; }
    if (intent === "make-operator") { await p.auth.api.setRole({ body: { userId, role: "admin" }, ...h }); return { ok: "Now an operator." }; }
    if (intent === "drop-operator") { await p.auth.api.setRole({ body: { userId, role: "user" }, ...h }); return { ok: "No longer an operator." }; }
  } catch (e) { return { error: errorMessage(e) }; }
  return null;
}

export default function Operator() {
  const d = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const H = ({ k, v }: { k: string; v: string }) => <input type="hidden" name={k} value={v} />;
  return (
    <LegacyPage title="Operator console" width="wide">
      <h1>Operator console</h1>
      {d.mode !== "reseller" && <Panel><p className="sg-muted" style={{ margin: 0 }}>Shown in reseller mode. In {d.mode} mode you reach everything from Workspaces and Organization.</p></Panel>}
      <Err msg={result && "error" in result ? result.error : null} /><Ok msg={result && "ok" in result ? result.ok : null} />
      <Panel title="Organizations">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th align="left">Name</th><th align="left">Slug</th><th align="left">Members</th><th align="left">Workspaces</th><th align="left">Created</th></tr></thead>
          <tbody>{d.orgs.map((o) => <tr key={o.id}><td>{o.name}</td><td><code>{o.slug}</code></td><td>{o.members}</td><td>{o.workspaces}</td><td className="sg-muted">{new Date(o.createdAt).toLocaleDateString()}</td></tr>)}</tbody>
        </table>
        {d.unassigned > 0 && <p className="sg-muted">{d.unassigned} workspaces belong to no organization (registered before accounts existed).</p>}
      </Panel>
      <Panel title="Users">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th align="left">Name</th><th align="left">Email</th><th align="left">Platform role</th><th align="left">Status</th><th /></tr></thead>
          <tbody>{d.users.map((u) => (
            <tr key={u.id}>
              <td>{u.name}{u.id === d.me ? " (you)" : ""}</td><td>{u.email}</td><td>{u.role === "admin" ? "operator" : "user"}</td><td>{u.banned ? "banned" : "active"}</td>
              <td align="right" style={{ whiteSpace: "nowrap" }}>{u.id !== d.me && (
                <>
                  <Form method="post" style={{ display: "inline", marginRight: ".5rem" }}><H k="intent" v="impersonate" /><H k="userId" v={u.id} /><button type="submit" style={btnLink}>impersonate</button></Form>
                  <Form method="post" style={{ display: "inline", marginRight: ".5rem" }}><H k="intent" v={u.banned ? "unban" : "ban"} /><H k="userId" v={u.id} /><button type="submit" style={btnLink}>{u.banned ? "unban" : "ban"}</button></Form>
                  <Form method="post" style={{ display: "inline" }}><H k="intent" v={u.role === "admin" ? "drop-operator" : "make-operator"} /><H k="userId" v={u.id} /><button type="submit" style={btnLink}>{u.role === "admin" ? "remove operator" : "make operator"}</button></Form>
                </>
              )}</td>
            </tr>))}</tbody>
        </table>
      </Panel>
    </LegacyPage>
  );
}
