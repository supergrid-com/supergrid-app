import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createHashRouter, RouterProvider } from "react-router";
import "~/app.css";
import { routes } from "~/routes";

// A hash router, because the renderer is served from a file in the packaged app.
const router = createHashRouter(routes);

// Lets CSS clear the macOS traffic lights in the title bar (see app.css).
document.documentElement.dataset.platform = navigator.userAgent.includes("Macintosh") ? "darwin" : navigator.userAgent.includes("Windows") ? "win32" : "linux";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
