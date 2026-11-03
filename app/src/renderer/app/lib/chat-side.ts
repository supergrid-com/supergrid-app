import * as React from "react";
import { updateOrg } from "~/lib/orgs";
import { useSession } from "~/lib/session";

// Which side of the page the agent's panel sits on. A workspace setting, kept on the organization
// (its config file, lib/orgs.ts) by workspace id like the accent, so each workspace keeps its own
// side across windows. The panel's own pin button and Settings → General both set it.

export type ChatSide = "left" | "right";

/** The side the workspace's agent panel is pinned to (left unless chosen), and a setter that saves it. */
export function useChatSide(wsId: string): [ChatSide, (side: ChatSide) => void] {
  const { org } = useSession();
  const side: ChatSide = org?.chatSides?.[wsId] === "right" ? "right" : "left";
  const set = React.useCallback(
    (next: ChatSide) => {
      if (!org) return;
      const { [wsId]: _, ...rest } = org.chatSides ?? {};
      updateOrg(org.id, { chatSides: next === "right" ? { ...rest, [wsId]: "right" } : rest });
    },
    [org, wsId],
  );
  return [side, set];
}
