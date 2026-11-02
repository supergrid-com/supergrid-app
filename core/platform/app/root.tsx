import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration, useRouteError } from "react-router";
import "./app.css";
import { ToastProvider } from "~/components/ui/toast";
import { TooltipProvider } from "~/components/ui/tooltip";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>SuperGrid</title>
        <Meta />
        <Links />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        {/* applies the stored light/dark choice before paint; see app/lib/platform.tsx */}
        <script src="/theme.js" />
      </head>
      <body className="relative">
        <div className="isolate relative flex min-h-svh flex-col">{children}</div>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function Root() {
  return (
    <TooltipProvider>
      <ToastProvider position="bottom-right">
        <Outlet />
      </ToastProvider>
    </TooltipProvider>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const res = isRouteErrorResponse(error) ? error : null;
  const title = res?.status === 404 ? "Page not found" : res?.status === 403 ? "Not allowed" : res?.status === 401 ? "Sign in required" : "Something went wrong";
  const detail = res ? (typeof res.data === "string" ? res.data : res.statusText) : String((error as Error)?.message ?? error);
  const stack = !res && import.meta.env.DEV && error instanceof Error ? error.stack : undefined;
  return (
    <main className="mx-auto w-full max-w-xl px-5 pt-[20vh]">
      <h1 className="font-heading text-2xl font-bold">{title}</h1>
      {detail && <p className="mt-2 text-muted-foreground">{detail}</p>}
      {stack && <pre className="mt-4 w-full overflow-x-auto rounded-xl border bg-muted p-4 text-xs"><code>{stack}</code></pre>}
      <a href="/" className="mt-6 inline-block underline underline-offset-4">Back</a>
    </main>
  );
}
