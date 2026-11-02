import type { RouteObject } from "react-router";
import { Welcome } from "~/pages/auth/welcome";
import { Launch } from "~/pages/launch";
import { AppScreen } from "~/pages/workspace/app";
import { Home } from "~/pages/workspace/home";
import { Analytics, Assets, Contacts, Design, Events, Hooks, Secrets, Workflows } from "~/pages/workspace/section";
import { ErrorBoundary, RequireSetup, Root } from "~/root";
import { WorkspaceShell } from "~/shell/workspace-shell";

// Every screen. No sign-in: everything is local to this machine. The workspace is the main UI;
// the organization's pages open as a modal over it (?org=…), and setup stands alone until an
// organization and its first workspace exist.
export const routes: RouteObject[] = [
  {
    path: "/",
    Component: Root,
    ErrorBoundary,
    children: [
      { path: "welcome", Component: Welcome },
      {
        Component: RequireSetup,
        children: [
          { index: true, Component: Launch },
          {
            path: "w/:ws",
            Component: WorkspaceShell,
            children: [
              { index: true, Component: Home },
              { path: "contacts", Component: Contacts },
              { path: "analytics", Component: Analytics },
              { path: "assets", Component: Assets },
              { path: "design", Component: Design },
              { path: "workflows", Component: Workflows },
              { path: "hooks", Component: Hooks },
              { path: "events", Component: Events },
              { path: "secrets", Component: Secrets },
              { path: "apps/:app/*", Component: AppScreen },
            ],
          },
        ],
      },
    ],
  },
];
