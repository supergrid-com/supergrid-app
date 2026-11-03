import { mountAppFrame, type MountedFrame } from "@supergrid/admin-sdk/host";
import { CodeIcon, ExternalLinkIcon, LoaderCircleIcon, PackageIcon } from "lucide-react";
import * as React from "react";
import { useNavigate, useParams } from "react-router";
import { Button } from "~/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "~/components/ui/empty";
import { toastManager } from "~/components/ui/toast";
import { AppGlyph } from "~/components/workspace/app-icon";
import { IconButton, WorkspaceFrame } from "~/components/workspace/frame";
import { openExternal } from "~/components/workspace/library/shared";
import { useMediaPicker } from "~/components/workspace/media-picker";
import { useLocalApps } from "~/lib/apps";
import { sg } from "~/lib/bridge";
import { usePlatform } from "~/lib/platform";
import { useSession } from "~/lib/session";
import { clean } from "~/lib/workspaces";
import { AppDev } from "~/pages/workspace/app-dev";
import { useOpenNav, useShell } from "~/shell/context";

// An app inside the workspace. Its admin screens render in an iframe at the workspace's admin URL, signed in through
// the handoff the main process mints, and talk to the shell over the admin SDK: the menu and the address follow the
// app, its title shows up here, it can open the media picker and show toasts. `_dev` after the app id opens its Dev
// panel (app-dev.tsx) instead; an app that only exists as a folder on this Mac has nothing else to show yet.

/** The shell's page tokens, pushed into the iframe so the app's admin layer (admin.css) draws in the same colors. */
function adminTokens(): Record<string, string> {
  const cs = getComputedStyle(document.documentElement);
  const v = (name: string) => cs.getPropertyValue(name).trim();
  const map: Record<string, string> = { "admin-page": "--background", "admin-fg": "--foreground", "admin-card": "--card", "admin-bg": "--app-bg", "admin-hover": "--accent", "admin-muted": "--muted-foreground", "admin-line": "--border", "admin-input": "--input", "admin-accent": "--active", "admin-accent-fg": "--active-foreground", "admin-primary": "--primary", "admin-primary-fg": "--primary-foreground", "admin-radius": "--radius", "admin-font": "--font-sans", "admin-font-mono": "--font-mono" };
  const out: Record<string, string> = {};
  for (const [k, prop] of Object.entries(map)) { const val = v(prop); if (val) out[k] = val; }
  return out;
}

export function AppScreen(): React.ReactElement {
  const { ws } = useShell();
  const params = useParams();
  const appId = params.app ?? "";
  const rest = params["*"] ?? "";
  const installed = ws.apps.find((a) => a.app === appId);
  const local = useLocalApps(ws.id);
  const folder = local.data?.find((a) => a.manifest.id === appId) ?? null;
  const onOpenNav = useOpenNav();
  const navigate = useNavigate();
  if (rest === "_dev" || rest.startsWith("_dev/")) return <AppDev ws={ws} appId={appId} installed={installed ?? null} folder={folder} tab={rest.slice(5).replace(/^\//, "")} />;
  if (installed?.admin) return <AdminFrame appId={appId} sub={`/${rest}`} />;
  const name = installed?.name ?? folder?.manifest.name ?? appId;
  return (
    <WorkspaceFrame icon={<AppGlyph app={{ name, icon: installed?.icon ?? null }} />} title={name} onOpenNav={onOpenNav} actions={<IconButton label="Dev Panel" onClick={() => navigate(`/w/${ws.id}/apps/${appId}/_dev`)}><CodeIcon /></IconButton>}>
      <Empty className="py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon"><PackageIcon /></EmptyMedia>
          <EmptyTitle>{!installed ? (folder ? "Not Installed Yet" : "Not Installed") : "No Admin Screens"}</EmptyTitle>
          <EmptyDescription>
            {!installed
              ? folder
                ? `${name} is a folder on this Mac. Run it, change it and install it from its Dev panel.`
                : `${ws.name} has no app called ${appId}.`
              : `${name} adds public pages and an API to the workspace, and has no screens of its own.`}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="flex-row justify-center gap-2">
          {(folder || installed) && (
            <Button size="sm" variant="outline" onClick={() => navigate(`/w/${ws.id}/apps/${appId}/_dev`)}>
              <CodeIcon />
              Dev Panel
            </Button>
          )}
          {installed?.public && (
            <Button size="sm" variant="outline" onClick={() => openExternal(`${ws.url.replace(/\/$/, "")}${installed.public === "/" ? "" : installed.public}`)}>
              <ExternalLinkIcon />
              Open in Site
            </Button>
          )}
        </EmptyContent>
      </Empty>
    </WorkspaceFrame>
  );
}

function AdminFrame({ appId, sub }: { appId: string; sub: string }): React.ReactElement {
  const { ws } = useShell();
  const { org } = useSession();
  const onOpenNav = useOpenNav();
  const navigate = useNavigate();
  const { pageDark } = usePlatform();
  const app = ws.apps.find((a) => a.app === appId)!;
  const [src, setSrc] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [title, setTitle] = React.useState<string | null>(null);
  const [ready, setReady] = React.useState(false);
  const iframe = React.useRef<HTMLIFrameElement | null>(null);
  const frame = React.useRef<MountedFrame | null>(null);
  const lastPath = React.useRef(sub);
  // a path the shell asked for before the app was listening; sent on ready, and the app's own moves wait for it
  const pending = React.useRef<string | null>(null);
  const picker = useMediaPicker(ws, org?.cloudflare?.accountId ?? "");
  // the first address comes with a fresh handoff; after that the app moves itself and tells us
  React.useEffect(() => {
    let live = true;
    setSrc(null);
    setReady(false);
    setError(null);
    lastPath.current = sub;
    pending.current = null;
    void sg?.ws.adminUrl(ws.id, appId, sub).then((u) => { if (live) setSrc(u); }, (e) => { if (live) setError(clean(e)); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ws.id, appId]);
  // the menu in the shell: a click changes the route here, and the app follows. The iframe exists before the app in
  // it listens, so a click during the spinner would be lost; it waits for the app's ready instead.
  React.useEffect(() => {
    if (sub === lastPath.current) return;
    lastPath.current = sub;
    if (ready && frame.current) frame.current.go(sub);
    else pending.current = sub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sub]);
  React.useEffect(() => { frame.current?.setScheme(pageDark ? "dark" : "light"); }, [pageDark]);
  const onFrame = React.useCallback((el: HTMLIFrameElement | null) => {
    frame.current?.unmount();
    frame.current = null;
    iframe.current = el;
    if (!el || !src) return;
    frame.current = mountAppFrame(
      el,
      { session: { user: { id: "desktop", name: "SuperGrid", email: "", role: "owner", permissions: ["*"] }, workspace: { id: ws.id, name: ws.name, url: ws.url } }, tokens: adminTokens(), basePath: `/admin/${appId}`, scheme: pageDark ? "dark" : "light", nav: app.nav ?? [] },
      {
        ready: () => {
          setReady(true);
          if (pending.current) frame.current?.go(pending.current);
        },
        title: (t) => setTitle(t),
        navigate: (path) => {
          const clean = path.replace(/^\/+/, "").replace(/\/$/, "");
          if (pending.current) {
            // the app is still catching up with the shell; its moves count once it has arrived
            if (`/${clean}` !== pending.current) return;
            pending.current = null;
          }
          if (`/${clean}` === lastPath.current || clean === lastPath.current.replace(/^\//, "")) return;
          lastPath.current = `/${clean}`;
          navigate(`/w/${ws.id}/apps/${appId}${clean ? `/${clean}` : ""}`, { replace: true });
        },
        pick: (req) => picker.pick({ kinds: req.kinds, multiple: req.multiple, title: req.title }),
        toast: (t) => toastManager.add({ title: t.title, description: t.description, type: t.tone === "error" ? "error" : t.tone === "success" ? "success" : undefined }),
        open: (to) => navigate(`/w/${ws.id}/${to.replace(/^\/+/, "")}`),
        resize: () => {},
      },
      { origin: new URL(ws.url).origin, autoHeight: false },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, ws.id, appId]);
  React.useEffect(() => () => frame.current?.unmount(), []);
  const page = app.nav?.find((n) => (n.path === "/" ? sub === "/" : sub === n.path || sub.startsWith(`${n.path}/`)));
  const crumb = title && title !== app.name ? `${app.name} · ${title}` : page && page.path !== "/" ? `${app.name} · ${page.label}` : app.name;
  return (
    <WorkspaceFrame
      flush
      icon={<AppGlyph app={app} />}
      title={crumb}
      onOpenNav={onOpenNav}
      actions={
        <>
          {app.public && <IconButton label="Open in Site" onClick={() => openExternal(`${ws.url.replace(/\/$/, "")}${app.public === "/" ? "" : app.public}`)}><ExternalLinkIcon /></IconButton>}
          <IconButton label="Dev Panel" onClick={() => navigate(`/w/${ws.id}/apps/${appId}/_dev`)}><CodeIcon /></IconButton>
        </>
      }
    >
      <div className="relative min-h-0 flex-1">
        {error ? (
          <Empty className="py-16">
            <EmptyHeader>
              <EmptyTitle>Could Not Open {app.name}</EmptyTitle>
              <EmptyDescription>{error}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            {src && <iframe ref={onFrame} src={src} title={app.name} className="absolute inset-0 size-full border-0 bg-background" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads" />}
            {!ready && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background">
                <LoaderCircleIcon className="size-5 animate-spin text-muted-foreground" />
              </div>
            )}
          </>
        )}
      </div>
      {picker.element}
    </WorkspaceFrame>
  );
}
