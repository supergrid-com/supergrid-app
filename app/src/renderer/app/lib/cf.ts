import * as React from "react";
import type { CfCliStatus } from "../../../shared/bridge";
import { sg } from "~/lib/bridge";

// The real cf CLI, when the renderer runs inside the app. In a plain browser there is no main
// process, so `live` is false and screens say connecting needs the app.

export type { CfCliStatus };

export const cfLive = !!sg;

/** cf's status on this Mac, loaded once per mount; `refresh` looks for the binary again. */
export function useCfCli(): { status: CfCliStatus | null; refresh: (findAgain?: boolean) => Promise<CfCliStatus | null> } {
  const [status, setStatus] = React.useState<CfCliStatus | null>(null);
  const refresh = React.useCallback(async (findAgain = false) => {
    if (!sg) return null;
    const next = await sg.cf.status(findAgain);
    setStatus(next);
    return next;
  }, []);
  React.useEffect(() => {
    void refresh();
  }, [refresh]);
  return { status, refresh };
}
