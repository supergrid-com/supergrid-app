import { index, layout, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  // Public (the worker lets these through without a session)
  route("login", "routes/login.tsx"),
  route("signup", "routes/signup.tsx"),
  route("setup", "routes/setup.tsx"),
  route("invite/:id", "routes/invite.tsx"),
  route("logout", "routes/logout.ts"),
  route("session", "routes/session.ts"),
  route("run", "routes/run.ts"),
  // Handoff: mints the staff token and redirects the iframe to the workspace (ARCHITECTURE.md §6)
  route("w/:id/apps/:app/frame", "routes/frame.ts"),
  layout("routes/shell.tsx", [
    index("routes/home.tsx"),
    route("account", "routes/account.tsx"),
    route("org", "routes/org.tsx"),
    route("org/new", "routes/org-new.tsx"),
    route("settings", "routes/settings.tsx"),
    route("operator", "routes/operator.tsx"),
    route("connect", "routes/connect.tsx"),
    route("updates", "routes/updates.tsx"),
    route("apps", "routes/app-store.tsx"),
    route("w/:id", "routes/workspace.tsx"),
    route("w/:id/apps/:app/*", "routes/app-frame.tsx"),
  ]),
  // Registry API used by the sg CLI with a per-user API key (x-api-key). Permission-checked per organization.
  route("api/me", "routes/api.me.ts"),
  route("api/workspaces", "routes/api.workspaces.ts"),
  route("api/workspaces/:id/installs", "routes/api.installs.ts"),
  route("api/workspaces/:id/installs/:app", "routes/api.install.ts"),
] satisfies RouteConfig;
