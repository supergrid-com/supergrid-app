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

/** A feed release's version (0.2.2). A workspace deployed from its own repo runs a build of that repo (2026-11-04.1e24ce8), which the feed can't be ahead of. */
export const fromFeed = (version: string | null | undefined): version is string => !!version && /^\d+\.\d+\.\d+$/.test(version);
