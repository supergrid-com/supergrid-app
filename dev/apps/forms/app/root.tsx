import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration, useRouteError } from "react-router";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* The workspace's tokens. Same origin in production; the dev proxy keeps it same-origin too. */}
        <link rel="stylesheet" href="/_ws/theme.css" />
        <Meta />
        <Links />
      </head>
      <body style={{ margin: 0 }}>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function Root() { return <Outlet />; }

export function ErrorBoundary() {
  const error = useRouteError();
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  return (
    <main style={{ maxWidth: "32rem", margin: "20vh auto", padding: "0 1.25rem" }}>
      <h1>{notFound ? "Page not found" : "Something went wrong"}</h1>
      <pre className="sg-muted">{notFound ? "" : String((error as Error)?.message ?? error)}</pre>
    </main>
  );
}
