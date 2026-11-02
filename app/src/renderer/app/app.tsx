import type * as React from "react";
import { isRouteErrorResponse, Outlet, useRouteError } from "react-router";
import { ToastProvider } from "~/components/ui/toast";
import { TooltipProvider } from "~/components/ui/tooltip";
import { DataProvider } from "~/lib/data";
import { PlatformProvider } from "~/lib/platform";

// The root of every screen: the UI state providers around the current route.
export function App(): React.ReactElement {
  return (
    <PlatformProvider>
      <DataProvider>
        <TooltipProvider>
          <ToastProvider position="bottom-right">
            <div className="flex min-h-0 flex-1 flex-col">
              <Outlet />
            </div>
          </ToastProvider>
        </TooltipProvider>
      </DataProvider>
    </PlatformProvider>
  );
}

export function ErrorBoundary(): React.ReactElement {
  const error = useRouteError();
  let message = "Something went wrong";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;
  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "Not found" : "Error";
    details = error.status === 404 ? "There is no such page." : error.statusText || details;
  } else if (error instanceof Error) {
    details = error.message;
    if (import.meta.env.DEV) stack = error.stack;
  }
  return (
    <main className="titlebar mx-auto w-full max-w-3xl p-8 pt-20">
      <h1 className="font-heading text-2xl font-bold">{message}</h1>
      <p className="text-muted-foreground">{details}</p>
      {stack && (
        <pre className="mt-4 w-full overflow-x-auto rounded-xl border bg-muted p-4 text-xs">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
