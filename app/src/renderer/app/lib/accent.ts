import * as React from "react";
import { updateOrg } from "~/lib/orgs";
import { useSession } from "~/lib/session";
import { onColor, parseHex } from "~/lib/theme";

// A workspace's accent color: the active row, the badge, focus marks. It is the interface theme's
// Accent in Appearance, kept on the organization (its config file, lib/orgs.ts) by workspace id so
// each workspace keeps its color through any theme. With none picked, the theme's own accent shows.

/** Quick picks, for the dev Components bar. */
export const accents = [
  { id: "blue", name: "Blue", color: "#3b6ff0" },
  { id: "sky", name: "Sky", color: "#4fb3e8" },
  { id: "amber", name: "Amber", color: "#e8a838" },
  { id: "coral", name: "Coral", color: "#e8604a" },
  { id: "pink", name: "Pink", color: "#e85a8f" },
  { id: "purple", name: "Purple", color: "#8b5cf6" },
  { id: "green", name: "Green", color: "#4fcf7f" },
] as const;

/** The accent picked for a workspace as a hex color, or null for the theme's, and a setter that saves it. */
export function useWorkspaceAccent(wsId: string): [string | null, (hex: string | null) => void] {
  const { org } = useSession();
  const picked = org?.accents?.[wsId];
  // accents were ids from the list above before they were any color
  const fromId = accents.find((a) => a.id === picked)?.color;
  const hex = fromId ?? (picked && parseHex(picked) ? picked.toLowerCase() : null);
  const set = React.useCallback(
    (next: string | null) => {
      if (!org) return;
      const { [wsId]: _, ...rest } = org.accents ?? {};
      updateOrg(org.id, { accents: next ? { ...rest, [wsId]: next.toLowerCase() } : rest });
    },
    [org, wsId],
  );
  return [hex, set];
}

/** Paints the workspace's accent over the theme's while its shell is up. */
export function useApplyAccent(hex: string | null): void {
  React.useEffect(() => {
    if (!hex || !parseHex(hex)) return;
    const root = document.documentElement.style;
    root.setProperty("--active", hex);
    root.setProperty("--active-foreground", onColor(hex));
    return () => {
      root.removeProperty("--active");
      root.removeProperty("--active-foreground");
    };
  }, [hex]);
}
