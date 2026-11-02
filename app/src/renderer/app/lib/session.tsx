import * as React from "react";
import { setCurrentOrg, useLocalState, type Org } from "~/lib/orgs";

// The current organization. Setup is done once an organization exists; everything is local to
// this machine, with no sign-in. The window's look (theme, panels) is in lib/platform.tsx.

type Session = {
  /** False until the organizations have loaded from the app's config. */
  loaded: boolean;
  /** The current organization, or null before setup. */
  org: Org | null;
  setOrg: (id: string) => void;
};

const Ctx = React.createContext<Session | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const state = useLocalState();
  const value = React.useMemo<Session>(() => {
    const orgs = state?.orgs ?? [];
    return { loaded: !!state, org: orgs.find((o) => o.id === state?.currentOrg) ?? orgs[0] ?? null, setOrg: setCurrentOrg };
  }, [state]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): Session {
  const s = React.useContext(Ctx);
  if (!s) throw new Error("useSession outside SessionProvider");
  return s;
}
