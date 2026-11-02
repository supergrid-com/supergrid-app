// The active organization: members and invitations (every mode), teams and custom roles (agency and reseller).
import { Form, Link, useActionData, useLoaderData } from "react-router";
import { can, requireOrg } from "../../src/access";
import { platformContext, requireActor } from "../../src/context";
import { listPendingInvitations, listTeams } from "../../src/db";
import { ROLE_ORDER, statement } from "../../src/roles";
import { Err, LegacyPage, Ok, Panel, btnLink, errorMessage } from "../ui";
import type { Route } from "./+types/org";

export async function loader({ request, context }: Route.LoaderArgs) {
  const p = requireActor(context.get(platformContext));
  if (!p.activeOrg) throw new Response("No organization", { status: 404 });
  const orgId = p.activeOrg.organizationId;
  const grant = await requireOrg(p.env, p.actor, orgId);
  const h = { headers: request.headers };
  const advanced = p.mode !== "creator";
  const [members, invitations, teams, teamMembers, customRoles] = await Promise.all([
    p.auth.api.listMembers({ query: { organizationId: orgId, limit: 200 }, ...h }).then((r) => r.members).catch(() => []),
    listPendingInvitations(p.env, orgId),
    advanced ? listTeams(p.env, orgId) : Promise.resolve([]),
    advanced ? p.env.PLATFORM_DB.prepare('SELECT tm.teamId, tm.userId FROM "teamMember" tm JOIN "team" t ON t.id = tm.teamId WHERE t.organizationId = ?').bind(orgId).all<{ teamId: string; userId: string }>().then((r) => r.results) : Promise.resolve([]),
    advanced ? p.env.PLATFORM_DB.prepare('SELECT id, role, permission FROM "organizationRole" WHERE organizationId = ? ORDER BY createdAt').bind(orgId).all<{ id: string; role: string; permission: string }>().then((r) => r.results) : Promise.resolve([]),
  ]);
  return {
    org: { id: orgId, name: p.activeOrg.name }, mode: p.mode, advanced, me: p.actor.user.id,
    perms: { members: can(grant, "member:update"), invite: can(grant, "invitation:create"), teams: can(grant, "team:create"), roles: can(grant, "ac:create") },
    members: members.map((m) => ({ id: m.id, userId: m.userId, role: m.role, name: m.user.name, email: m.user.email })),
    invitations, teams, teamMembers, customRoles: customRoles.map((r) => ({ ...r, permission: JSON.parse(r.permission) as Record<string, string[]> })),
    roleNames: [...ROLE_ORDER, ...customRoles.map((r) => r.role)], statement, origin: new URL(request.url).origin,
  };
}

export async function action({ request, context }: Route.ActionArgs) {
  const p = requireActor(context.get(platformContext));
  if (!p.activeOrg) throw new Response("No organization", { status: 404 });
  const organizationId = p.activeOrg.organizationId;
  const f = await request.formData();
  const intent = String(f.get("intent"));
  const h = { headers: request.headers };
  const s = (k: string) => String(f.get(k) ?? "").trim();
  try {
    switch (intent) {
      case "invite": {
        const inv = await p.auth.api.createInvitation({ body: { email: s("email"), role: s("role") as "owner", organizationId, teamId: s("teamId") || undefined }, ...h });
        return { ok: `Invitation created. Send this link: ${new URL(request.url).origin}/invite/${inv.id}` };
      }
      case "cancel-invite": await p.auth.api.cancelInvitation({ body: { invitationId: s("id") }, ...h }); return { ok: "Invitation cancelled." };
      case "role": await p.auth.api.updateMemberRole({ body: { memberId: s("memberId"), role: s("role") as "owner", organizationId }, ...h }); return { ok: "Role updated." };
      case "remove": await p.auth.api.removeMember({ body: { memberIdOrEmail: s("memberId"), organizationId }, ...h }); return { ok: "Member removed." };
      case "create-team": await p.auth.api.createTeam({ body: { name: s("name"), organizationId }, ...h }); return { ok: "Team created." };
      case "remove-team": await p.auth.api.removeTeam({ body: { teamId: s("teamId"), organizationId }, ...h }); return { ok: "Team removed." };
      case "add-team-member": await p.auth.api.addTeamMember({ body: { teamId: s("teamId"), userId: s("userId") }, ...h }); return { ok: "Added to team." };
      case "remove-team-member": await p.auth.api.removeTeamMember({ body: { teamId: s("teamId"), userId: s("userId") }, ...h }); return { ok: "Removed from team." };
      case "create-role": {
        const permission: Record<string, string[]> = {};
        for (const [k, v] of f.entries()) { const m = /^perm:(\w+):(\w+)$/.exec(k); if (m && v) (permission[m[1]] ??= []).push(m[2]); }
        await p.auth.api.createOrgRole({ body: { role: s("role").toLowerCase().replace(/[^a-z0-9_-]+/g, "-"), permission, organizationId }, ...h });
        return { ok: "Role created." };
      }
      case "delete-role": await p.auth.api.deleteOrgRole({ body: { roleName: s("role"), organizationId }, ...h }); return { ok: "Role deleted." };
      case "rename": await p.auth.api.updateOrganization({ body: { organizationId, data: { name: s("name") } }, ...h }); return { ok: "Renamed." };
    }
  } catch (e) { return { error: errorMessage(e) }; }
  return null;
}

export default function Org() {
  const d = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const Hidden = ({ k, v }: { k: string; v: string }) => <input type="hidden" name={k} value={v} />;
  const title = d.mode === "creator" ? "Members" : d.org.name;
  return (
    <LegacyPage title={title}>
      <h1>{title}</h1>
      {result && "error" in result && <Err msg={result.error} />}
      {result && "ok" in result && <Ok msg={result.ok} />}
      <Panel title="Members">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th align="left">Name</th><th align="left">Email</th><th align="left">Role</th>{d.advanced && <th align="left">Teams</th>}<th /></tr></thead>
          <tbody>{d.members.map((m) => (
            <tr key={m.id}>
              <td>{m.name}{m.userId === d.me ? " (you)" : ""}</td><td>{m.email}</td>
              <td>{d.perms.members && m.userId !== d.me ? (
                <Form method="post" style={{ display: "inline" }} onChange={(e) => e.currentTarget.requestSubmit()}>
                  <Hidden k="intent" v="role" /><Hidden k="memberId" v={m.id} />
                  <select name="role" defaultValue={m.role}>{d.roleNames.map((r) => <option key={r} value={r}>{r}</option>)}</select>
                </Form>) : m.role}</td>
              {d.advanced && <td>{d.teams.filter((t) => d.teamMembers.some((tm) => tm.teamId === t.id && tm.userId === m.userId)).map((t) => t.name).join(", ") || <span className="sg-muted">—</span>}</td>}
              <td align="right">{d.perms.members && m.userId !== d.me && <Form method="post" style={{ display: "inline" }}><Hidden k="intent" v="remove" /><Hidden k="memberId" v={m.id} /><button type="submit" style={btnLink}>remove</button></Form>}</td>
            </tr>))}</tbody>
        </table>
        {d.perms.invite && (
          <Form method="post" style={{ display: "flex", gap: ".5rem", flexWrap: "wrap", marginTop: "1rem" }}>
            <Hidden k="intent" v="invite" />
            <input name="email" type="email" placeholder="email" required />
            <select name="role" defaultValue="editor">{d.roleNames.map((r) => <option key={r} value={r}>{r}</option>)}</select>
            {d.advanced && d.teams.length > 0 && <select name="teamId" defaultValue=""><option value="">no team</option>{d.teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>}
            <button className="sg-btn" type="submit">Invite</button>
          </Form>
        )}
        {d.invitations.length > 0 && (
          <>
            <h4 style={{ marginBottom: ".25rem" }}>Pending invitations</h4>
            <p className="sg-muted" style={{ marginTop: 0 }}>No mailer is configured yet: copy the link and send it yourself.</p>
            <ul style={{ margin: 0 }}>{d.invitations.map((i) => (
              <li key={i.id}>{i.email} as {i.role ?? "member"} · <code style={{ userSelect: "all" }}>{d.origin}/invite/{i.id}</code>{" "}
                {d.perms.invite && <Form method="post" style={{ display: "inline" }}><Hidden k="intent" v="cancel-invite" /><Hidden k="id" v={i.id} /><button type="submit" style={btnLink}>cancel</button></Form>}</li>
            ))}</ul>
          </>
        )}
      </Panel>
      {d.advanced && (
        <Panel title="Teams">
          <p className="sg-muted">A team is a client or any group of members. Assign a workspace to a team on its overview page and only that team (plus owners and admins) sees it.</p>
          {d.teams.map((t) => {
            const inTeam = d.members.filter((m) => d.teamMembers.some((tm) => tm.teamId === t.id && tm.userId === m.userId));
            const notIn = d.members.filter((m) => !inTeam.includes(m));
            return (
              <div key={t.id} style={{ marginBottom: ".75rem" }}>
                <strong>{t.name}</strong>{" "}
                {d.perms.teams && <Form method="post" style={{ display: "inline" }}><Hidden k="intent" v="remove-team" /><Hidden k="teamId" v={t.id} /><button type="submit" style={btnLink}>remove team</button></Form>}
                <ul style={{ margin: ".25rem 0" }}>{inTeam.map((m) => (
                  <li key={m.id}>{m.name} {d.perms.teams && <Form method="post" style={{ display: "inline" }}><Hidden k="intent" v="remove-team-member" /><Hidden k="teamId" v={t.id} /><Hidden k="userId" v={m.userId} /><button type="submit" style={btnLink}>remove</button></Form>}</li>
                ))}{!inTeam.length && <li className="sg-muted">no members</li>}</ul>
                {d.perms.teams && notIn.length > 0 && (
                  <Form method="post" style={{ display: "flex", gap: ".5rem" }}>
                    <Hidden k="intent" v="add-team-member" /><Hidden k="teamId" v={t.id} />
                    <select name="userId">{notIn.map((m) => <option key={m.userId} value={m.userId}>{m.name}</option>)}</select>
                    <button className="sg-btn" type="submit">Add to team</button>
                  </Form>
                )}
              </div>
            );
          })}
          {d.perms.teams && <Form method="post" style={{ display: "flex", gap: ".5rem" }}><Hidden k="intent" v="create-team" /><input name="name" placeholder="team name (e.g. a client)" required /><button className="sg-btn" type="submit">Create team</button></Form>}
        </Panel>
      )}
      {d.advanced && (
        <Panel title="Custom roles">
          <p className="sg-muted">The four fixed roles cover most cases. A custom role is a set of permissions for this organization only; assign it like any other role.</p>
          {d.customRoles.map((r) => (
            <div key={r.id} style={{ marginBottom: ".5rem" }}>
              <strong>{r.role}</strong> <span className="sg-muted">{Object.entries(r.permission).map(([k, v]) => `${k}: ${v.join(", ")}`).join(" · ")}</span>{" "}
              {d.perms.roles && <Form method="post" style={{ display: "inline" }}><Hidden k="intent" v="delete-role" /><Hidden k="role" v={r.role} /><button type="submit" style={btnLink}>delete</button></Form>}
            </div>
          ))}
          {d.perms.roles && (
            <Form method="post" style={{ display: "grid", gap: ".5rem", marginTop: ".75rem" }}>
              <Hidden k="intent" v="create-role" />
              <input name="role" placeholder="role name" required style={{ maxWidth: "16rem" }} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(14rem, 1fr))", gap: ".25rem .75rem" }}>
                {Object.entries(d.statement).map(([res, actions]) => (
                  <div key={res}><strong style={{ fontSize: ".85rem" }}>{res}</strong><div>{(actions as readonly string[]).map((a) => <label key={a} style={{ marginRight: ".5rem", fontSize: ".85rem" }}><input type="checkbox" name={`perm:${res}:${a}`} value="1" /> {a}</label>)}</div></div>
                ))}
              </div>
              <button className="sg-btn" type="submit" style={{ justifySelf: "start" }}>Create role</button>
            </Form>
          )}
        </Panel>
      )}
      {d.perms.members && d.mode !== "creator" && (
        <Panel title="Organization">
          <Form method="post" style={{ display: "flex", gap: ".5rem" }}><Hidden k="intent" v="rename" /><input name="name" defaultValue={d.org.name} /><button className="sg-btn" type="submit">Rename</button></Form>
          {d.mode === "reseller" && <p className="sg-muted" style={{ marginBottom: 0 }}><Link to="/org/new">Create another organization</Link></p>}
        </Panel>
      )}
    </LegacyPage>
  );
}
