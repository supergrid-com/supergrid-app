import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration, useLocation, useRouteError } from "react-router";
import "./app.css";

// Public pages load the workspace's theme (colors, fonts, radius) at runtime; admin screens take the shell's tokens
// instead (components/admin/admin.css), so the stylesheet link stays off /admin/*.
export function Layout({ children }: { children: React.ReactNode }) {
  const admin = useLocation().pathname.startsWith("/admin/");
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {!admin && <link rel="stylesheet" href="/_ws/theme.css" />}
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function Root() {
  return <Outlet />;
}

export function ErrorBoundary() {
  const error = useRouteError();
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  return (
    <main className="mx-auto my-[20vh] max-w-lg px-5">
      <h1 className="font-heading text-2xl font-semibold">{notFound ? "Page not found" : "Something went wrong"}</h1>
      {!notFound && <pre className="mt-4 whitespace-pre-wrap text-sm text-muted-foreground">{String((error as Error)?.message ?? error)}</pre>}
    </main>
  );
}
