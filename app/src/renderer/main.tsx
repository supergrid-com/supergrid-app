import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createHashRouter, RouterProvider } from "react-router";
import "~/app.css";
import { App, ErrorBoundary } from "~/app";
import Account from "~/routes/account";
import AppStore from "~/routes/app-store";
import Audit from "~/routes/audit";
import Home from "~/routes/home";
import Integrations from "~/routes/integrations";
import Login from "~/routes/login";
import Operator from "~/routes/operator";
import Org from "~/routes/org";
import Settings from "~/routes/settings";
import Workspace from "~/routes/workspace";

// A hash router, because the renderer is served from a file in the packaged app. The desk keeps
// its tabs in the query string (?view=...), which the hash router carries as well.
const router = createHashRouter([
  { path: "/login", Component: Login },
  {
    path: "/",
    Component: App,
    ErrorBoundary,
    children: [
      { index: true, Component: Home },
      { path: "w/:id", Component: Workspace },
      { path: "apps", Component: AppStore },
      { path: "integrations", Component: Integrations },
      { path: "audit", Component: Audit },
      { path: "org", Component: Org },
      { path: "settings", Component: Settings },
      { path: "operator", Component: Operator },
      { path: "account", Component: Account },
    ],
  },
]);

// Lets CSS place the top bar around the macOS traffic lights (see .titlebar in app.css).
document.documentElement.dataset.platform = navigator.userAgent.includes("Macintosh") ? "darwin" : navigator.userAgent.includes("Windows") ? "win32" : "linux";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
