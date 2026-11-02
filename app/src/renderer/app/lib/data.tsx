import * as React from "react";
import { type CloudflareStatus, isDesktop, sg, type WorkspaceSummary } from "~/lib/bridge";
import { type AppId, appColors, type Install, type Workspace, workspaces as mockWorkspaces } from "~/lib/mock";
import { usePlatform } from "~/lib/platform";

// What the screens read. Inside the app it comes from the main process: the Cloudflare login and
// the workspaces found in the account. In a browser it is the mock data, unchanged.

type Data = {
  desktop: boolean;
  cloudflare: CloudflareStatus | null;
  workspaces: WorkspaceSummary[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  login: () => Promise<void>;
  select: (opts: { accountId?: string; prefix?: string }) => Promise<void>;
};

const DataContext = React.createContext<Data | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [cloudflare, setCloudflare] = React.useState<CloudflareStatus | null>(null);
  const [workspaces, setWorkspaces] = React.useState<WorkspaceSummary[]>([]);
  const [loading, setLoading] = React.useState(isDesktop);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async (status?: CloudflareStatus) => {
    if (!sg) return;
    setLoading(true);
    setError(null);
    try {
      const s = status ?? (await sg.cloudflare.status());
      setCloudflare(s);
      setWorkspaces(s.state === "connected" && s.accountId ? await sg.workspaces.list() : []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  const value = React.useMemo<Data>(
    () => ({
      desktop: isDesktop, cloudflare, workspaces, loading, error,
      refresh: () => load(),
      login: async () => { if (!sg) return; setLoading(true); try { await load(await sg.cloudflare.login()); } catch (e) { setError((e as Error).message); setLoading(false); } },
      select: async (opts) => { if (!sg) return; setLoading(true); try { await load(await sg.cloudflare.select(opts)); } catch (e) { setError((e as Error).message); setLoading(false); } },
    }),
    [cloudflare, workspaces, loading, error, load],
  );
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): Data {
  const d = React.useContext(DataContext);
  if (!d) throw new Error("useData outside DataProvider");
  return d;
}

const knownApp = (id: string): id is AppId => id in appColors;

// A real workspace in the shape the screens were designed against. Apps the mock catalog does not
// know are left out until app screens load from the workspace itself.
function toWorkspace(w: WorkspaceSummary, orgId: string): Workspace {
  const installs: Install[] = w.apps.filter((a) => knownApp(a.app)).map((a) => ({ app: a.app as AppId, version: w.version ?? "", latest: w.version ?? "", worker: `${w.worker}-${a.app}`, repo: "", status: "ok" }));
  return { id: w.id, name: w.name, url: w.url, provider: "cloudflare", orgId, role: "owner", installs, contacts: 0, lastDeploy: w.version ? `v${w.version}` : "never", theme: { accent: "#6d5dfc", bg: "#ffffff", fg: "#111111", font: "Cal Sans" } };
}

/** The workspaces of the active organization: real ones inside the app, mock ones in a browser. */
export function useWorkspaces(): { workspaces: Workspace[]; live: boolean } {
  const { desktop, cloudflare, workspaces } = useData();
  const { orgId } = usePlatform();
  const live = desktop && cloudflare?.state === "connected";
  return React.useMemo(() => ({ live, workspaces: live ? workspaces.map((w) => toWorkspace(w, orgId)) : mockWorkspaces.filter((w) => w.orgId === orgId) }), [live, workspaces, orgId]);
}

export function useWorkspace(id?: string): { workspace: Workspace | undefined; loading: boolean } {
  const { desktop, loading } = useData();
  const { workspaces, live } = useWorkspaces();
  const all = live ? workspaces : mockWorkspaces;
  return { workspace: all.find((w) => w.id === id), loading: desktop && loading };
}
