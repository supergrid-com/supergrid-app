// Operator-only: platform branding and the mode (ARCHITECTURE.md §6).
import { Form, useActionData, useLoaderData } from "react-router";
import { platformContext, requireActor } from "../../src/context";
import { orgCounts, setSetting } from "../../src/db";
import type { Mode } from "../../src/types";
import { Err, LegacyPage, Ok, Panel } from "../ui";
import type { Route } from "./+types/settings";

const MODES: Mode[] = ["creator", "agency", "reseller"];
const ROWS: [string, string, string, string][] = [
  ["Organizations", "one, created on setup, hidden", "one, named, visible", "many; users create their own"],
  ["Sign-up", "setup link, then invitation only", "invitation only", "public sign-up page"],
  ["Teams (clients)", "off", "on; workspaces assignable", "on, per organization"],
  ["Custom roles", "off", "on", "on, per organization"],
  ["Operator console", "hidden", "hidden", "users, organizations, impersonate, ban"],
  ["White-label", "name, logo, accent", "plus login and invitation emails (later)", "plus per-organization branding, plans (stage 6)"],
  ["Workers", "plain, static bindings", "plain, static bindings", "dispatch namespace (stage 6)"],
];

export async function loader({ context }: Route.LoaderArgs) {
  const p = requireActor(context.get(platformContext));
  if (!p.actor.operator) throw new Response("Operators only", { status: 403 });
  return { mode: p.mode, branding: p.branding, counts: await orcCountsSafe(p.env), envDefault: p.env.SG_MODE ?? "creator" };
}
const orcCountsSafe = (env: Parameters<typeof orgCounts>[0]) => orgCounts(env).then((c) => c ?? { orgs: 0, teams: 0, customRoles: 0 });

export async function action({ request, context }: Route.ActionArgs) {
  const p = requireActor(context.get(platformContext));
  if (!p.actor.operator) throw new Response("Operators only", { status: 403 });
  const f = await request.formData();
  if (f.get("intent") === "branding") {
    await setSetting(p.env, "branding", { name: String(f.get("name") || "SuperGrid"), accent: String(f.get("accent") || "#3b5bdb") });
    return { ok: "Branding saved." };
  }
  if (f.get("intent") === "mode") {
    const mode = String(f.get("mode")) as Mode;
    if (!MODES.includes(mode)) return { error: "Unknown mode." };
    // Moving down must not hide anything that exists.
    const c = await orcCountsSafe(p.env);
    if (mode === "creator" && (c.orgs > 1 || c.teams > 0 || c.customRoles > 0)) return { error: `Creator mode would hide ${c.orgs > 1 ? `${c.orgs} organizations` : ""}${c.teams ? ` ${c.teams} teams` : ""}${c.customRoles ? ` ${c.customRoles} custom roles` : ""}. Remove them first.` };
    if (mode === "agency" && c.orgs > 1) return { error: `Agency mode has one organization; this platform has ${c.orgs}. Remove the others first.` };
    await setSetting(p.env, "mode", mode);
    return { ok: `Mode is now ${mode}.` };
  }
  return null;
}

export default function Settings() {
  const { mode, branding, counts, envDefault } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  return (
    <LegacyPage title="Platform settings">
      <h1>Platform settings</h1>
      <Panel title="Branding">
        <Form method="post" style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
          <input type="hidden" name="intent" value="branding" />
          <label>Name <input name="name" defaultValue={branding.name} /></label>
          <label>Accent <input name="accent" defaultValue={branding.accent} /></label>
          <button className="sg-btn" type="submit" style={{ alignSelf: "end" }}>Save</button>
        </Form>
      </Panel>
      <Panel title={`Mode: ${mode}`}>
        <p className="sg-muted">The data model is the same in every mode (organization → workspace). The mode decides what the UI shows and who may sign up. Moving up never migrates anything; moving down only hides screens, and is refused while it would hide something that exists. Default from <code>SG_MODE</code>: {envDefault}. Now: {counts.orgs} organizations, {counts.teams} teams, {counts.customRoles} custom roles.</p>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".9rem" }}>
          <thead><tr><th align="left"></th>{MODES.map((m) => <th key={m} align="left" style={{ color: m === mode ? "var(--sg-admin-accent)" : undefined }}>{m}</th>)}</tr></thead>
          <tbody>{ROWS.map(([k, ...vals]) => <tr key={k}><td style={{ padding: ".25rem 0" }}>{k}</td>{vals.map((v, i) => <td key={i} className={MODES[i] === mode ? "" : "sg-muted"}>{v}</td>)}</tr>)}</tbody>
        </table>
        <Form method="post" style={{ display: "flex", gap: ".5rem", marginTop: "1rem" }}>
          <input type="hidden" name="intent" value="mode" />
          <select name="mode" defaultValue={mode}>{MODES.map((m) => <option key={m} value={m}>{m}</option>)}</select>
          <button className="sg-btn" type="submit">Change mode</button>
        </Form>
        <Err msg={result && "error" in result ? result.error : null} /><Ok msg={result && "ok" in result ? result.ok : null} />
      </Panel>
    </LegacyPage>
  );
}
