import { CheckIcon, ChevronDownIcon, CloudIcon, ExternalLinkIcon, GlobeIcon, PlusIcon, RefreshCwIcon } from "lucide-react";
import * as React from "react";
import { Link } from "react-router";
import { AppIcon } from "~/components/app-icon";
import { PageFrame } from "~/components/page-frame";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "~/components/ui/menu";
import { toastManager } from "~/components/ui/toast";
import { useData, useWorkspaces } from "~/lib/data";

// Where the app stands with Cloudflare (app/CONNECT.md): connecting is one browser visit that
// mints the app's API token for the account; the card then shows the account it manages and the
// install prefix. An account that will not let the app mint gets the template link and a paste
// box instead. Shown only inside the app; a browser has no main process to ask.
function CloudflareCard(): React.ReactElement | null {
  const { desktop, cloudflare, loading, error, login, select, setToken, refresh } = useData();
  const [prefix, setPrefix] = React.useState("");
  const [pasted, setPasted] = React.useState("");
  React.useEffect(() => { if (cloudflare?.state === "connected") setPrefix(cloudflare.prefix); }, [cloudflare]);
  if (!desktop) return null;

  const body = (() => {
    if (!cloudflare && loading) return <span className="text-sm text-muted-foreground">Checking the Cloudflare login…</span>;
    if (!cloudflare) return <span className="text-sm text-destructive-foreground">{error ?? "Could not reach the main process."}</span>;
    if (cloudflare.state === "logged-out") {
      return (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-muted-foreground">{cloudflare.detail ?? "Not connected. Connecting opens Cloudflare in your browser once and creates the app's API token."}</span>
          <Button size="sm" onClick={() => void login()} disabled={loading}>
            <CloudIcon />
            Connect Cloudflare
          </Button>
        </div>
      );
    }
    if (cloudflare.state === "needs-token") {
      const account = cloudflare.accounts.find((a) => a.id === cloudflare.accountId);
      return (
        <div className="flex flex-col gap-2">
          <span className="text-sm text-muted-foreground">
            {cloudflare.email ? `${cloudflare.email}, ` : ""}{account?.name ?? "this account"}: {cloudflare.detail}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" render={<a href={cloudflare.link} target="_blank" rel="noreferrer" />}>
              <ExternalLinkIcon />
              Create the token
            </Button>
            <span className="text-xs text-muted-foreground">{cloudflare.permissions.join(", ")}.</span>
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (pasted.trim()) void setToken(pasted.trim()).then(() => setPasted(""));
            }}
          >
            <Input size="sm" type="password" placeholder="Paste the token" value={pasted} onChange={(e) => setPasted(e.target.value)} className="max-w-md font-mono" aria-label="API token" />
            <Button size="sm" type="submit" disabled={!pasted.trim() || loading}>
              Use token
            </Button>
            <Button size="sm" variant="ghost" onClick={() => void login()} disabled={loading}>
              Try connecting again
            </Button>
          </form>
          {error && <span className="text-sm text-destructive-foreground">{error}</span>}
        </div>
      );
    }
    const account = cloudflare.accounts.find((a) => a.id === cloudflare.accountId);
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="me-1 text-sm text-muted-foreground" title={`Using ${cloudflare.token.name}${cloudflare.token.minted ? ", created when you connected" : ""}${cloudflare.token.without.length ? `. Without: ${cloudflare.token.without.join(", ")}` : ""}`}>{cloudflare.email ?? "Connected"}</span>
        <Menu>
          <MenuTrigger render={<Button size="sm" variant="outline" />}>
            {account?.name ?? "Pick an account"}
            <ChevronDownIcon className="size-3.5 opacity-60" />
          </MenuTrigger>
          <MenuPopup align="start">
            {cloudflare.accounts.map((a) => (
              <MenuItem key={a.id} onClick={() => void select({ accountId: a.id })}>
                <span className="flex-1 truncate">{a.name}</span>
                {a.id === cloudflare.accountId && <CheckIcon className="size-4 opacity-70" />}
              </MenuItem>
            ))}
          </MenuPopup>
        </Menu>
        <form
          className="flex items-center gap-1"
          onSubmit={(e) => {
            e.preventDefault();
            if (prefix && prefix !== cloudflare.prefix) void select({ prefix });
          }}
        >
          <span className="text-xs text-muted-foreground">prefix</span>
          <Input size="sm" value={prefix} onChange={(e) => setPrefix(e.target.value)} className="w-24 font-mono" aria-label="Install prefix" />
          {prefix !== cloudflare.prefix && (
            <Button size="sm" variant="outline" type="submit">
              Use
            </Button>
          )}
        </form>
        <Button size="icon-sm" variant="ghost" aria-label="Refresh" onClick={() => void refresh()} disabled={loading} className="text-muted-foreground">
          <RefreshCwIcon className={loading ? "animate-spin" : undefined} />
        </Button>
        {error && <span className="basis-full text-sm text-destructive-foreground">{error}</span>}
      </div>
    );
  })();

  return (
    <section className="flex flex-wrap items-center gap-3 rounded-2xl border bg-background px-4 py-3 shadow-xs/5">
      <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <CloudIcon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">{body}</div>
    </section>
  );
}

// The home: every workspace found in the account, one card each.
export default function Home(): React.ReactElement {
  const { workspaces: list, live } = useWorkspaces();
  const { cloudflare, loading } = useData();
  const prefix = cloudflare?.state === "connected" ? cloudflare.prefix : null;
  return (
    <PageFrame
      crumbs={[{ label: "SuperGrid" }]}
      width="wide"
      actions={
        <Button size="sm" onClick={() => toastManager.add({ title: "Creating a workspace runs in the main process soon", type: "info" })}>
          <PlusIcon />
          New workspace
        </Button>
      }
    >
      <CloudflareCard />
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-bold">Workspaces</h1>
        <p className="text-sm text-muted-foreground">
          {live ? (
            <>
              {list.length} found under <span className="font-mono">{prefix}-ws-*</span> in the account. Each one is a Worker and a database.
            </>
          ) : (
            <>{list.length} workspaces. Each one is a Worker and a database in your Cloudflare account.</>
          )}
        </p>
      </div>
      {list.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-12 text-center text-sm text-muted-foreground">
          <div>{live && loading ? "Looking for workspaces…" : "No workspaces in this account yet."}</div>
          <Button variant="outline" size="sm">
            <PlusIcon />
            New workspace
          </Button>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((ws) => {
            const updates = ws.installs.filter((i) => i.status === "update").length;
            return (
              <li key={ws.id}>
                <Link to={`/w/${ws.id}`} className="group flex h-full flex-col gap-4 rounded-2xl border bg-background p-5 shadow-xs/5 transition-colors hover:border-ring/40 hover:bg-accent/40">
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-active font-heading text-base font-bold text-active-foreground">
                      {ws.name.slice(0, 1)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-heading font-semibold">{ws.name}</div>
                      <div className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                        <GlobeIcon className="size-3" />
                        {ws.url.replace(/^https?:\/\//, "")}
                      </div>
                    </div>
                    {updates > 0 && (
                      <Badge variant="warning" size="sm">
                        {updates} update{updates > 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {ws.installs.map((i) => (
                      <AppIcon key={i.app} app={i.app} size="sm" />
                    ))}
                    {ws.installs.length === 0 && <span className="text-xs text-muted-foreground">No apps yet</span>}
                  </div>
                  <div className="mt-auto flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="ms-auto">{live ? `Workspace ${ws.lastDeploy}` : `Deployed ${ws.lastDeploy}`}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </PageFrame>
  );
}
