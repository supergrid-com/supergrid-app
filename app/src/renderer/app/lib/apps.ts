import type { LocalApp, PackageGraph, ServedManifest } from "../../../shared/bridge";
import { sg } from "~/lib/bridge";
import { invalidate, useRemote } from "~/lib/library";

// The apps of a workspace beyond what its Worker lists: the app folders on this Mac (src/main/apps.ts), an installed
// app's served manifest (what its running code says about its data and operations), and the package graph. All sit in
// the same store as the Library's listings, so a page that comes back shows what it had while it reads again.

export type { LocalApp, PackageGraph, ServedManifest };

export const localAppsKey = (wsId: string) => `apps:${wsId}`;
export function useLocalApps(wsId: string | null) {
  return useRemote<LocalApp[]>(wsId ? localAppsKey(wsId) : null, () => sg!.apps.list(wsId!));
}
export const refreshLocalApps = (wsId: string): void => invalidate(localAppsKey(wsId));

export function useServedManifest(wsId: string | null, app: string | null) {
  return useRemote<ServedManifest>(wsId && app ? `app-manifest:${wsId}:${app}` : null, () => sg!.ws.appManifest(wsId!, app!));
}
export const refreshServedManifest = (wsId: string, app: string): void => invalidate(`app-manifest:${wsId}:${app}`);

export function usePackages(wsId: string | null) {
  return useRemote<PackageGraph>(wsId ? `packages:${wsId}` : null, () => sg!.apps.packages(wsId!));
}

/** A slug for an app id from a name: lowercase letters, digits and dashes, starting with a letter. */
export const appSlug = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").replace(/^[^a-z]+/, "").slice(0, 40);
