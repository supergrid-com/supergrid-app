import { Form, Link, useActionData, useLoaderData } from "react-router";
import { can, requireWorkspace } from "../../src/access";
import { platformContext, requireActor } from "../../src/context";
import { listInstalls, listTeams, setWorkspaceTeam } from "../../src/db";
import { workspaceClient } from "../../src/workspace-client";
import { Err, LegacyPage, Ok, Panel } from "../ui";
import type { Route } from "./+types/workspace";

export async function loader({ context, params }: Route.LoaderArgs) {
  const p = requireActor(context.get(platformContext));
  const { ws, grant } = await requireWorkspace(p.env, p.actor, params.id);
  const client = workspaceClient(ws, p.env);
  const [installs, teams] = await Promise.all([listInstalls(p.env, ws.id), ws.organization_id && p.mode !== "creator" ? listTeams(p.env, ws.organization_id) : Promise.resolve([])]);
  const perms = { settings: can(grant, "settings:update"), data: can(grant, "data:read"), team: can(grant, "workspace:update") };
  const base = { ws: { id: ws.id, name: ws.name, url: ws.url, repo: ws.repo, team_id: ws.team_id }, installs, teams, perms, role: grant.role };
  try {
    const [info, theme, contacts] = await Promise.all([client.info(), client.getTheme(), perms.data ? client.listContacts(5) : Promise.resolve([])]);
    return { ...base, info, theme, contacts, error: null };
  } catch (e) {
    return { ...base, info: null, theme: null, contacts: [], error: (e as Error).message };
  }
}

export async function action({ request, context, params }: Route.ActionArgs) {
  const p = requireActor(context.get(platformContext));
  const f = await request.formData();
  if (f.get("intent") === "team") {
    const { ws } = await requireWorkspace(p.env, p.actor, params.id, "workspace:update");
    await setWorkspaceTeam(p.env, ws.id, String(f.get("teamId") || "") || null);
    return { ok: "Team updated." };
  }
  const { ws } = await requireWorkspace(p.env, p.actor, params.id, "settings:update");
  const theme: Record<string, string> = {};
  for (const k of ["color-accent", "color-bg", "color-fg", "font-display"]) { const v = String(f.get(k) ?? "").trim(); if (v) theme[k] = v; }
  await workspaceClient(ws, p.env).setSetting("theme", theme);
  return { ok: "Theme saved." };
}

export default function WorkspacePage() {
  const { ws, installs, teams, perms, role, info, theme, contacts, error } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  return (
    <LegacyPage title={ws.name} crumbs={[{ label: "Workspaces", to: "/" }, { label: ws.name }]}>
      <h1>{ws.name}</h1>
      <p className="sg-muted"><a href={ws.url} target="_blank" rel="noreferrer">{ws.url}</a>{ws.repo ? <> · repo <code>{ws.repo}</code></> : null} · you are <strong>{role}</strong></p>
      {installs.length > 0 && (
        <Panel title="Installs">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th align="left">App</th><th align="left">Version</th><th align="left">Worker</th><th align="left">Repo</th><th align="left">Upstream</th></tr></thead>
            <tbody>{installs.map((i) => <tr key={i.app_id}><td>{i.name}</td><td>{i.version}</td><td><code>{i.worker}</code></td><td><code>{i.repo}</code></td><td className="sg-muted">{i.upstream ?? "—"}</td></tr>)}</tbody>
          </table>
        </Panel>
      )}
      {error && <Panel danger>Can't reach the workspace at {ws.url}: {error}. Is it running?</Panel>}
      {info && (
        <Panel title="Apps">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th align="left">App</th><th align="left">Public</th><th align="left">Admin</th><th align="left">API</th></tr></thead>
            <tbody>{info.apps.map((a) => (
              <tr key={a.app}>
                <td>{a.app}</td>
                <td>{a.public ? <a href={new URL(a.public, ws.url).href} target="_blank" rel="noreferrer">{a.public}</a> : "—"}</td>
                <td>{a.admin ? <Link to={`/w/${ws.id}/apps/${a.app}`}>open</Link> : "—"}</td>
                <td>{a.api ? <code>/api/{a.app}/*</code> : "—"}</td>
              </tr>))}</tbody>
          </table>
        </Panel>
      )}
      {info && perms.data && (
        <Panel title="Contacts (via workspace RPC)">
          <ul style={{ margin: 0 }}>{contacts.map((c) => <li key={c.id}>{c.email}</li>)}{!contacts.length && <li className="sg-muted">none yet</li>}</ul>
        </Panel>
      )}
      {teams.length > 0 && perms.team && (
        <Panel title="Team">
          <p className="sg-muted">A workspace assigned to a team is visible to that team's members plus owners and admins. Unassigned: everyone in the organization.</p>
          <Form method="post" style={{ display: "flex", gap: ".5rem" }}>
            <input type="hidden" name="intent" value="team" />
            <select name="teamId" defaultValue={ws.team_id ?? ""}><option value="">Everyone in the organization</option>{teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
            <button className="sg-btn" type="submit">Save</button>
          </Form>
        </Panel>
      )}
      {info && perms.settings && (
        <Panel title="Site theme">
          <p className="sg-muted">Saved as a workspace setting and served from <code>/_ws/theme.css</code>; every app picks it up on the next request, no rebuild.</p>
          <Form method="post" style={{ display: "grid", gap: ".5rem", gridTemplateColumns: "repeat(auto-fit, minmax(12rem, 1fr))" }}>
            <label>Accent <input name="color-accent" defaultValue={theme?.["color-accent"]} /></label>
            <label>Background <input name="color-bg" defaultValue={theme?.["color-bg"]} /></label>
            <label>Text <input name="color-fg" defaultValue={theme?.["color-fg"]} /></label>
            <label>Display font <input name="font-display" defaultValue={theme?.["font-display"]} /></label>
            <button className="sg-btn" type="submit" style={{ alignSelf: "end" }}>Save theme</button>
          </Form>
          <Err msg={result && "error" in result ? (result as { error: string }).error : null} />
          <Ok msg={result && "ok" in result ? result.ok : null} />
        </Panel>
      )}
    </LegacyPage>
  );
}
