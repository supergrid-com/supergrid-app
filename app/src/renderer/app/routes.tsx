import type { RouteObject } from "react-router";
import { Welcome } from "~/pages/auth/welcome";
import { Components } from "~/pages/dev/components";
import { Launch } from "~/pages/launch";
import { AppScreen } from "~/pages/workspace/app";
import { Home } from "~/pages/workspace/home";
import { Database } from "~/pages/workspace/database";
import { Library } from "~/pages/workspace/library";
import { Workflows } from "~/pages/workspace/workflows";
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
              { path: "database/*", Component: Database },
              { path: "workflows/*", Component: Workflows },
              { path: "library/*", Component: Library },
              { path: "apps/:app/*", Component: AppScreen },
              // dev builds only, like its row in the rail (shell/sections.ts)
              ...(import.meta.env.DEV ? [{ path: "components/*", Component: Components }] : []),
            ],
          },
        ],
      },
    ],
  },
];
