import { matchRule } from "@supergrid/app-kit/sitemap";
import { rollupDaily } from "./analytics";
import { WorkspaceApi } from "./api";
import { ensureCore } from "./db";
import { handleQueue } from "./events";
import { routes } from "./registry";
import { bearerOf, DESKTOP_USER, forward, handleWs, isOpsPath, match, noAppPage } from "./router";
import { notStaffResponse, staffUser } from "./staff";
import { activeRules } from "./sitemap";
import type { Env } from "./types";

export { WorkspaceApi };
export { HookRun } from "./workflows";

// The workspace as a router in front of one Worker per app (the shape before WORKSPACE-REPO.md). Apps are reached over
// service bindings named in the ROUTES binding. compose.ts is the other shape: every app built into this Worker.
export default {
  async fetch(request: Request, env: Env, exec: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    await ensureCore(env.DB);
    if (url.pathname.startsWith("/_ws/")) return handleWs(request, env, exec, url.pathname.slice(5));
    // Redirect rules first: a renamed prefix keeps working before the app is rebuilt at the new one.
    const hit = matchRule(await activeRules(env), url.pathname, url.search);
    if (hit) return Response.redirect(new URL(hit.to, url).toString(), hit.status);
    const entries = routes(env);
    const route = match(entries, url.pathname);
    if (route) {
      // Admin screens need the staff cookie the platform's handoff set; the app gets the user as x-sg-user. Everything else is public.
      if (url.pathname.startsWith("/admin/")) {
        const staff = await staffUser(request, env.SG_WORKSPACE_TOKEN, env.WORKSPACE_ID);
        if (!staff) return notStaffResponse(env.WORKSPACE_NAME);
        const { sub, name, email, org, role, permissions } = staff;
        return forward(request, env, route, { id: sub, name, email, org, role, permissions });
      }
      if (isOpsPath(url.pathname)) {
        const token = bearerOf(request);
        if (token && env.SG_WORKSPACE_TOKEN && token === env.SG_WORKSPACE_TOKEN) return forward(request, env, route, DESKTOP_USER);
        // a staff member's own browser session (the admin UI calling its app's operations) counts too
        const staff = await staffUser(request, env.SG_WORKSPACE_TOKEN, env.WORKSPACE_ID);
        if (staff) { const { sub, name, email, org, role, permissions } = staff; return forward(request, env, route, { id: sub, name, email, org, role, permissions }); }
      }
      return forward(request, env, route);
    }
    return noAppPage(env, entries);
  },
  async queue(batch: MessageBatch<import("@supergrid/app-kit/rpc").EventRow>, env: Env): Promise<void> {
    await ensureCore(env.DB);
    await handleQueue(batch, env);
  },
  async scheduled(_controller: ScheduledController, env: Env): Promise<void> {
    await ensureCore(env.DB);
    await rollupDaily(env);
  },
};
