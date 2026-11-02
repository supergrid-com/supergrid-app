import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createHashRouter, RouterProvider } from "react-router";
import "~/app.css";
import { App, ErrorBoundary } from "~/app";
import Home from "~/routes/home";
import Workspace from "~/routes/workspace";

// A hash router, because the renderer is served from a file in the packaged app. Two screens so
// far: the workspaces in the account, and one workspace. Sign-in, the organization, the app
// store and the account pages arrive with the control plane.
const router = createHashRouter([
  {
    path: "/",
    Component: App,
    ErrorBoundary,
    children: [
      { index: true, Component: Home },
      { path: "w/:id", Component: Workspace },
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
