import { CheckIcon, CloudIcon, InfoIcon, TerminalIcon, TriangleAlertIcon } from "lucide-react";
import * as React from "react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Radio, RadioGroup } from "~/components/ui/radio-group";
import { Spinner } from "~/components/ui/spinner";
import { sg } from "~/lib/bridge";
import { cfLive, useCfCli, type CfCliStatus } from "~/lib/cf";
import type { CloudflareLink } from "~/lib/orgs";
import { cn } from "~/lib/utils";

// Pieces shared by the organization screens and setup: the settings row, the cf CLI line, what a
// cf login can reach, and the Cloudflare connect flow. Everything here is real: it runs the cf CLI
// through the main process, and in a plain browser it says connecting needs the app.

/** A settings group: what it is on the left, the controls on the right (settings template). */
export function SettingsGroup({ title, description, children }: { title: string; description?: React.ReactNode; children: React.ReactNode }): React.ReactElement {
  return (
    <section className="@container">
      <div className="grid gap-4 @2xl:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] @2xl:gap-8">
        <div className="flex flex-col gap-1">
          <h3 className="font-heading text-base font-semibold">{title}</h3>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        <div className="flex min-w-0 flex-col gap-4">{children}</div>
      </div>
    </section>
  );
}

/** A colored dot and its label. */
export function StatusDot({ tone, label }: { tone: "success" | "warning"; label: string }): React.ReactElement {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
      <span className={cn("size-2 rounded-full", tone === "success" ? "bg-success" : "bg-warning")} />
      {label}
    </span>
  );
}

/** Inline code: ids, resource names, commands. */
export function Code({ children }: { children: React.ReactNode }): React.ReactElement {
  return <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.8125rem]">{children}</code>;
}

/** Label and value rows. */
export function Details({ rows, labelWidth = 140 }: { rows: [label: string, value: React.ReactNode][]; labelWidth?: number }): React.ReactElement {
  return (
    <dl className="grid items-baseline gap-x-4 gap-y-2 text-sm" style={{ gridTemplateColumns: `${labelWidth}px minmax(0,1fr)` }}>
      {rows.map(([label, value]) => (
        <React.Fragment key={label}>
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="min-w-0 break-words">{value}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}

/** The cf CLI as `cf --version` and `cf auth whoami` reported it. */
export function CfToolLine({ cf }: { cf: CfCliStatus | null }): React.ReactElement {
  const missing = cf?.state === "no-cli";
  return (
    <div className="flex items-center gap-3 rounded-xl border px-4 py-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <TerminalIcon className="size-4" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">cf</span>
          <span className="text-xs tabular-nums text-muted-foreground">{!cf ? "checking…" : cf.state === "no-cli" ? "not found" : cf.version ? `v${cf.version}` : ""}</span>
        </div>
        <div className="truncate text-xs text-muted-foreground">{!cf ? "The Cloudflare CLI" : cf.state === "no-cli" ? "The Cloudflare CLI isn't installed on this Mac" : cf.path}</div>
      </div>
      {cf && (
        <StatusDot tone={cf.state === "signed-in" ? "success" : "warning"} label={missing ? "Missing" : cf.state === "signed-in" ? `Signed in${cf.email ? ` as ${cf.email}` : ""}` : "Signed out"} />
      )}
    </div>
  );
}

/** What SuperGrid needs from the account, and the cf login scope that grants it. */
const capabilities: { name: string; why: string; scope: RegExp }[] = [
  { name: "Workers", why: "Deploy the workspace and app Workers", scope: /^(workers_scripts:write|workers:write)$/ },
  { name: "D1", why: "Each workspace's database", scope: /^d1:write$/ },
  { name: "Queues", why: "Event delivery between apps and the workspace", scope: /^queues:write$/ },
  { name: "R2", why: "Large files and exports", scope: /^workers-r2\.write$/ },
  { name: "Artifacts", why: "The git repo behind every app", scope: /^artifacts\.write$/ },
  { name: "Images", why: "Image uploads", scope: /^images[:.]write$/ },
  { name: "Stream", why: "Video uploads and playback", scope: /^stream\.write$/ },
  { name: "Analytics", why: "Traffic and media analytics", scope: /^account-analytics\.read$/ },
];

/** Each capability and whether cf's current login has the scope for it. */
export function ScopeList({ scopes }: { scopes: string[] | null }): React.ReactElement {
  if (!scopes) return <p className="text-sm text-muted-foreground">cf is signed in with an API token, so its permissions aren't listed.</p>;
  return (
    <ul className="divide-y rounded-xl border">
      {capabilities.map((c) => {
        const ok = scopes.some((s) => c.scope.test(s));
        return (
          <li key={c.name} className="flex items-center gap-3 px-4 py-2.5">
            {ok ? <CheckIcon className="size-4 shrink-0 text-success" aria-label="Granted" /> : <TriangleAlertIcon className="size-4 shrink-0 text-warning" aria-label="Not granted" />}
            <div className="flex min-w-0 flex-1 flex-col">
              <span className={cn("text-sm", !ok && "text-muted-foreground")}>{c.name}</span>
              <span className="text-xs text-muted-foreground">{c.why}</span>
            </div>
            {!ok && <span className="shrink-0 text-xs text-muted-foreground">Not granted</span>}
          </li>
        );
      })}
    </ul>
  );
}

type Phase = "check" | "no-cli" | "signing-in" | "pick";

const PREFIX = /^[a-z][a-z0-9]{1,7}$/;

// Electron wraps a main-process error as "Error invoking remote method '…': Error: …"; keep the message.
const clean = (e: unknown) => String((e as Error)?.message ?? e).replace(/^Error invoking remote method '[^']*': (?:Error: )?/, "");

/**
 * "Connect Cloudflare" through the cf CLI: find cf, sign in with `cf auth login` (one browser
 * visit), then pick one of the accounts that login reaches and the install prefix. Resolves with the
 * link setup saves on the organization. SuperGrid stores no token; cf keeps its own login.
 */
export function ConnectCloudflare({ onConnected, cta = "Use this account" }: { onConnected: (link: CloudflareLink) => void; cta?: string }): React.ReactElement {
  const { status: cli, refresh } = useCfCli();
  const [phase, setPhase] = React.useState<Phase>("check");
  const [prefix, setPrefix] = React.useState("sg");
  const [accountId, setAccountId] = React.useState<string>();
  const [error, setError] = React.useState<string>();
  const [looking, setLooking] = React.useState(false);
  const [checked, setChecked] = React.useState(false);
  const accountsLabel = React.useId();
  const signedIn = cli?.state === "signed-in" ? cli : null;
  const accounts = signedIn?.accounts ?? [];
  const account = accounts.find((a) => a.id === accountId) ?? accounts[0];

  // What cf reports decides where the flow is: install it, sign in, or straight to the account.
  React.useEffect(() => {
    if (!cli) return;
    if (cli.state === "no-cli") setPhase("no-cli");
    else if (cli.state === "signed-in" && phase !== "signing-in") setPhase("pick");
    else if (cli.state === "signed-out" && phase === "no-cli") setPhase("check");
  }, [cli]);

  if (!cfLive) {
    return (
      <Alert variant="info">
        <InfoIcon />
        <AlertTitle>Connecting Cloudflare needs the SuperGrid app</AlertTitle>
        <AlertDescription>It runs the cf CLI on your Mac, which a browser can't do. Open SuperGrid to connect.</AlertDescription>
      </Alert>
    );
  }

  const signIn = async () => {
    if (!sg) return;
    setError(undefined);
    setPhase("signing-in");
    try {
      const after = await sg.cf.login();
      await refresh();
      if (after.state === "signed-in") setPhase("pick");
      else {
        setError("cf didn't finish signing in. Try again.");
        setPhase("check");
      }
    } catch (e) {
      setError(clean(e));
      setPhase("check");
    }
  };

  if (phase === "no-cli") {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-3">
          <TriangleAlertIcon className="mt-0.5 size-5 shrink-0 text-warning" />
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">Install the Cloudflare CLI</span>
            <span className="text-sm text-muted-foreground">SuperGrid signs in to Cloudflare through cf. Install it, then check again.</span>
          </div>
        </div>
        <pre className="overflow-x-auto rounded-xl border bg-muted px-4 py-3 font-mono text-sm">
          <code>npm install -g cf</code>
        </pre>
        {checked && cli?.state === "no-cli" && (
          <div className="flex flex-col gap-1 text-xs">
            <span>Still not found. SuperGrid looked on your PATH, in these folders, then asked your shell:</span>
            <span className="break-words text-muted-foreground">{cli.searched.join(" · ")}</span>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 text-xs">
            <TriangleAlertIcon className="size-3.5 shrink-0 text-warning" />
            {error}
          </div>
        )}
        <div>
          <Button
            loading={looking}
            onClick={async () => {
              setLooking(true);
              try {
                await refresh(true);
              } catch (e) {
                setError(clean(e));
              } finally {
                setLooking(false);
                setChecked(true);
              }
            }}
          >
            Check again
          </Button>
        </div>
      </div>
    );
  }

  if (phase === "signing-in") {
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <Spinner className="size-8 text-muted-foreground" />
        <div className="flex flex-col items-center gap-2">
          <h3 className="font-heading text-base font-semibold">Sign in to Cloudflare in your browser</h3>
          <Code>cf auth login</Code>
          <p className="text-sm text-muted-foreground">cf opened Cloudflare in your browser. Sign in and approve, then come back here.</p>
        </div>
      </div>
    );
  }

  if (phase === "pick" && signedIn) {
    const prefixError = PREFIX.test(prefix) ? undefined : "2 to 8 lowercase letters or digits, starting with a letter.";
    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <CheckIcon className="size-4 text-success" />
          <span>
            cf is signed in{signedIn.email ? " as " : ""}
            {signedIn.email && <span className="font-medium">{signedIn.email}</span>}
          </span>
          <Button variant="ghost" size="sm" onClick={() => void signIn()}>
            Use a different login
          </Button>
        </div>
        {accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">This login can't see any Cloudflare accounts. Sign in with a different Cloudflare user, or ask to be added to an account.</p>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1">
              <span id={accountsLabel} className="text-sm font-medium">
                Cloudflare account
              </span>
              <span className="text-xs text-muted-foreground">The Cloudflare accounts this login can reach. This organization's workspaces will be deployed into the one you pick; nothing new is created.</span>
            </div>
            <RadioGroup aria-labelledby={accountsLabel} value={account?.id ?? ""} onValueChange={(v) => setAccountId(v as string)} className="gap-2">
              {accounts.map((a) => (
                <Label key={a.id} className="flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 font-normal transition-colors hover:bg-accent/40 has-data-checked:border-ring/50 has-data-checked:bg-accent/40">
                  <Radio value={a.id} className="mt-0.5" />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="font-medium">{a.name}</span>
                    <span className="text-xs text-muted-foreground">Account ID {a.id}</span>
                  </span>
                </Label>
              ))}
            </RadioGroup>
          </div>
        )}
        <Field invalid={!!prefixError}>
          <FieldLabel>Install prefix</FieldLabel>
          <Input value={prefix} onChange={(e) => setPrefix(e.target.value.toLowerCase())} className="w-60 font-mono" aria-invalid={prefixError ? true : undefined} />
          {prefixError ? (
            <p className="text-xs text-destructive-foreground">{prefixError}</p>
          ) : (
            <FieldDescription>Starts every resource name, like {prefix || "sg"}-ws-k3x9qz. Keep sg unless another SuperGrid already uses this account.</FieldDescription>
          )}
        </Field>
        <div>
          <Button disabled={!!prefixError || !account} onClick={() => account && onConnected({ accountId: account.id, accountName: account.name, email: signedIn.email, prefix })}>
            {cta}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <CloudIcon className="size-4" />
        </span>
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">Your Cloudflare login, through the cf CLI on this Mac</span>
          <span className="text-sm text-muted-foreground">SuperGrid runs cf for you. cf keeps its own login in your keychain; SuperGrid never sees or stores a token.</span>
        </div>
      </div>
      <CfToolLine cf={cli} />
      {error && (
        <div className="flex items-center gap-2 text-xs">
          <TriangleAlertIcon className="size-3.5 shrink-0 text-warning" />
          {error}
        </div>
      )}
      <div>
        <Button disabled={!cli} onClick={() => void signIn()}>
          <CloudIcon />
          Sign in with Cloudflare
        </Button>
      </div>
    </div>
  );
}
