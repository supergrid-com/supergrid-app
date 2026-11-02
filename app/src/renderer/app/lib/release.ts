import * as React from "react";
import { sg } from "~/lib/bridge";

// The newest workspace release on the signed feed, read once per window.
type Release = { version: string; notes: string; publishedAt: string };
let pending: Promise<Release | null> | null = null;

export function useLatestRelease(): Release | null {
  const [release, setRelease] = React.useState<Release | null>(null);
  React.useEffect(() => {
    if (!sg) return;
    pending ??= sg.workspaces.release().catch(() => null);
    void pending.then(setRelease);
  }, []);
  return release;
}
