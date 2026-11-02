import { Outlet, useLoaderData } from "react-router";
import { SideNav } from "~/components/shell/side-nav";
import { initials, PlatformProvider, type PlatformData } from "~/lib/platform";
import { can, orgGrant, visibleWorkspaces } from "../../src/access";
import { platformContext, requireActor } from "../../src/context";
import { cachedReleases, isConnected, isNewer } from "../../src/cloud";
import { listAllInstalls, listOrgs, listWorkspaces } from "../../src/db";
import type { Route } from "./+types/shell";

// The chrome for every signed-in page: the side nav (drawer or docked) and the page. The loader
// gathers what the nav and usePlatform() need; pages load their own data on top.
export async function loader({ context }: Route.LoaderArgs) {
  const p = requireActor(context.get(platformContext));
  const [visible, orgs] = await Promise.all([
    visibleWorkspaces(p.env, p.actor, await listWorkspaces(p.env)),
    p.actor.operator ? listOrgs(p.env) : Promise.resolve(p.memberships.map((m) => ({ id: m.organizationId, name: m.name }))),
  ]);
  const org = p.activeOrg ? await orgGrant(p.env, p.actor, p.activeOrg.organizationId) : null;
  // The badge on Updates, from the last daily check. Pages never call the feed just to draw the nav.
  const latest = p.actor.operator ? await cachedReleases(p.env) : null;
  const installs = latest ? await listAllInstalls(p.env) : [];
  const updates = !latest ? 0 : (latest.platform && isNewer(latest.platform.version, p.env.SG_VERSION) ? 1 : 0)
    + visible.filter(({ ws }) => ws.worker && latest.workspace && isNewer(latest.workspace.version, ws.version)).length
    + installs.filter((i) => latest.apps[i.app_id] && isNewer(latest.apps[i.app_id]!.version, i.version)).length;
  const data: PlatformData = {
    branding: p.branding,
    mode: p.mode,
    user: {
      id: p.actor.user.id, name: p.actor.user.name, email: p.actor.user.email, initials: initials(p.actor.user.name),
      operator: p.actor.operator, impersonated: !!p.actor.session?.impersonatedBy,
    },
    orgs: orgs.map((o) => ({ id: o.id, name: o.name })),
    activeOrgId: p.activeOrg?.organizationId ?? null,
    workspaces: visible.map(({ ws }) => ({ id: ws.id, name: ws.name })),
    canOrg: !!org && (can(org, "member:create") || p.mode !== "creator"),
    updates,
    connected: await isConnected(p.env),
  };
  return data;
}

export default function Shell() {
  const data = useLoaderData<typeof loader>();
  return (
    <PlatformProvider data={data}>
      <div className="flex h-svh w-full overflow-hidden bg-sidebar text-foreground">
        <SideNav />
        <div className="flex h-full min-w-0 flex-1 flex-col">
          <Outlet />
        </div>
      </div>
    </PlatformProvider>
  );
}
