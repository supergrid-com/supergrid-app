import { InfoIcon, TriangleAlertIcon } from "lucide-react";
import type * as React from "react";
import { Navigate } from "react-router";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "~/components/ui/empty";
import { Spinner } from "~/components/ui/spinner";
import { sg } from "~/lib/bridge";
import { useSession } from "~/lib/session";
import { useWorkspaces } from "~/lib/workspaces";
import { AuthFrame } from "~/pages/auth/frame";

// Where the app opens: the workspace you had open last, or the organization's first one. With no
// organization yet, setup; with an organization but no workspace, setup's workspace step (or setup
// itself for an organization with no Cloudflare account, like the demo's once its workspace is gone).
export function Launch(): React.ReactElement | null {
  const { loaded, org } = useSession();
  const { list, error, refresh } = useWorkspaces(org);
  if (!loaded) return null;
  if (!org) return <Navigate to="/welcome" replace />;
  if (list && !list.length) return <Navigate to={org.cloudflare ? "/welcome?step=workspace" : "/welcome"} replace />;
  if (list) {
    const target = list.find((w) => w.id === org.lastWorkspace) ?? list[0];
    return <Navigate to={`/w/${target.id}`} replace />;
  }
  return (
    <AuthFrame>
      <div className="flex h-[70vh] items-center justify-center">
        {!sg ? (
          <Alert variant="info" className="max-w-lg">
            <InfoIcon />
            <AlertTitle>Open SuperGrid to see your workspaces</AlertTitle>
            <AlertDescription>They're read from your Cloudflare account through the cf CLI on your Mac, which a browser can't do.</AlertDescription>
          </Alert>
        ) : error ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <TriangleAlertIcon />
              </EmptyMedia>
              <EmptyTitle>Couldn't read your workspaces</EmptyTitle>
              <EmptyDescription>{error}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button size="sm" onClick={() => void refresh()}>
                Try again
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <Spinner className="size-8 text-muted-foreground" />
        )}
      </div>
    </AuthFrame>
  );
}
