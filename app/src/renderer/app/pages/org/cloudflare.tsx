import { CloudIcon, InfoIcon, TriangleAlertIcon } from "lucide-react";
import * as React from "react";
import { SectionPage } from "~/components/section-page";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { AlertDialog, AlertDialogClose, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogPopup, AlertDialogTitle } from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Dialog, DialogDescription, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from "~/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Separator } from "~/components/ui/separator";
import { toastManager } from "~/components/ui/toast";
import { sg } from "~/lib/bridge";
import { cfLive, useCfCli } from "~/lib/cf";
import { updateOrg, type Org } from "~/lib/orgs";
import { useSession } from "~/lib/session";
import { CfToolLine, Code, ConnectCloudflare, Details, ScopeList, SettingsGroup, StatusDot } from "~/pages/org/parts";

// The organization's Cloudflare account: the account setup linked, cf's login as `cf auth whoami`
// reports it right now, what that login can reach, the install prefix, and changing account or
// signing cf in and out. All of it is real; SuperGrid holds no token.

// Electron wraps a main-process error as "Error invoking remote method '…': Error: …"; keep the message.
const clean = (e: unknown) => String((e as Error)?.message ?? e).replace(/^Error invoking remote method '[^']*': (?:Error: )?/, "");

function Linked({ org }: { org: Org & { cloudflare: NonNullable<Org["cloudflare"]> } }): React.ReactElement {
  const { status: cli, refresh } = useCfCli();
  const link = org.cloudflare;
  const [prefix, setPrefix] = React.useState(link.prefix);
  const [changing, setChanging] = React.useState(false);
  const [signingOut, setSigningOut] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const prefixValid = /^[a-z][a-z0-9]{1,7}$/.test(prefix);
  const signedIn = cli?.state === "signed-in" ? cli : null;
  const reachable = signedIn ? signedIn.accounts.some((a) => a.id === link.accountId) : null;
  const healthy = !!signedIn && reachable === true;

  const signIn = async () => {
    if (!sg) return;
    setBusy(true);
    try {
      await sg.cf.login();
      await refresh();
    } catch (e) {
      toastManager.add({ title: clean(e), type: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <Card className="gap-5 p-5">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <CloudIcon className="size-5" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <h3 className="truncate font-heading text-lg font-semibold">{link.accountName}</h3>
              {cli && <StatusDot tone={healthy ? "success" : "warning"} label={healthy ? "Connected" : signedIn ? "Not reachable" : "cf signed out"} />}
            </div>
            <span className="text-xs text-muted-foreground">
              Linked {link.email ? `as ${link.email}` : ""} · {org.createdAt}
            </span>
          </div>
          <Button size="sm" variant="outline" disabled={!cfLive} onClick={() => setChanging(true)}>
            Change account
          </Button>
        </div>
        <Separator />
        <Details
          rows={[
            ["Account ID", <Code key="id">{link.accountId}</Code>],
            ["Install prefix", <Code key="prefix">{`${link.prefix}-ws-*`}</Code>],
          ]}
        />
      </Card>

      {cli?.state === "signed-out" && (
        <Alert variant="warning">
          <TriangleAlertIcon />
          <AlertTitle>cf is signed out</AlertTitle>
          <AlertDescription>SuperGrid works through cf's login. Sign in again to reach this account.</AlertDescription>
          <AlertAction>
            <Button size="sm" variant="outline" loading={busy} onClick={() => void signIn()}>
              Sign in
            </Button>
          </AlertAction>
        </Alert>
      )}
      {signedIn && reachable === false && (
        <Alert variant="warning">
          <TriangleAlertIcon />
          <AlertTitle>cf's login can't see {link.accountName}</AlertTitle>
          <AlertDescription>
            cf is signed in{signedIn.email ? ` as ${signedIn.email}` : ""}, which doesn't reach this account. Sign in with the user that does, or change the account.
          </AlertDescription>
          <AlertAction>
            <Button size="sm" variant="outline" loading={busy} onClick={() => void signIn()}>
              Sign in again
            </Button>
          </AlertAction>
        </Alert>
      )}
      {!cfLive && (
        <Alert variant="info">
          <InfoIcon />
          <AlertTitle>Open SuperGrid to see cf's status</AlertTitle>
          <AlertDescription>This page reads the cf CLI on your Mac, which a browser can't do.</AlertDescription>
        </Alert>
      )}

      {cfLive && (
        <SettingsGroup title="cf on this Mac" description="SuperGrid runs the Cloudflare CLI for you. cf keeps its own login in your keychain.">
          <CfToolLine cf={cli} />
          {signedIn && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" loading={busy} onClick={() => void signIn()}>
                Sign in again
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSigningOut(true)}>
                Sign cf out
              </Button>
            </div>
          )}
        </SettingsGroup>
      )}

      {signedIn && (
        <>
          <Separator />
          <SettingsGroup title="What the login can reach" description="From the scopes cf's login was granted. Each one SuperGrid will need for workspaces and apps.">
            <ScopeList scopes={signedIn.scopes} />
          </SettingsGroup>
        </>
      )}

      <Separator />

      <SettingsGroup title="Install prefix" description="Starts the name of every resource SuperGrid creates in this account. Change it only to run a second SuperGrid in the same account.">
        <Field invalid={!prefixValid}>
          <FieldLabel>Prefix</FieldLabel>
          <Input value={prefix} onChange={(e) => setPrefix(e.target.value.toLowerCase())} className="w-50 font-mono" aria-invalid={prefixValid ? undefined : true} />
          {!prefixValid ? (
            <p className="text-xs text-destructive-foreground">2 to 8 lowercase letters or digits.</p>
          ) : (
            <FieldDescription>
              Workspaces: {prefix || "sg"}-ws-&lt;id&gt; · apps: {prefix || "sg"}-app-&lt;id&gt;-&lt;app&gt;
            </FieldDescription>
          )}
        </Field>
        {prefix !== link.prefix && (
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={!prefixValid}
              onClick={() => {
                updateOrg(org.id, { cloudflare: { ...link, prefix } });
                toastManager.add({ title: `Prefix is now ${prefix}`, type: "success" });
              }}
            >
              Save prefix
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setPrefix(link.prefix)}>
              Cancel
            </Button>
          </div>
        )}
      </SettingsGroup>

      <Dialog open={changing} onOpenChange={setChanging}>
        <DialogPopup className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Change Cloudflare account</DialogTitle>
            <DialogDescription>
              {org.name} uses {link.accountName} now.
            </DialogDescription>
          </DialogHeader>
          <DialogPanel>
            <ConnectCloudflare
              cta="Switch to this account"
              onConnected={(next) => {
                updateOrg(org.id, { cloudflare: next });
                setPrefix(next.prefix);
                setChanging(false);
                toastManager.add({ title: `${org.name} now uses ${next.accountName}`, type: "success" });
              }}
            />
          </DialogPanel>
        </DialogPopup>
      </Dialog>

      <AlertDialog open={signingOut} onOpenChange={setSigningOut}>
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign cf out?</AlertDialogTitle>
            <AlertDialogDescription>Runs cf auth logout. cf in your terminal is signed out too. The organization keeps its account link; sign in again to use it.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="ghost" />}>Cancel</AlertDialogClose>
            <Button
              onClick={async () => {
                setSigningOut(false);
                if (!sg) return;
                try {
                  await sg.cf.logout();
                } catch (e) {
                  toastManager.add({ title: clean(e), type: "error" });
                }
                await refresh();
              }}
            >
              Sign out
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </div>
  );
}

export function Cloudflare(): React.ReactElement {
  const { org } = useSession();
  if (!org) return <></>;
  return (
    <SectionPage title="Cloudflare" description="The account this organization's workspaces and apps run in, through the cf CLI on this Mac." width={960}>
      {org.cloudflare ? (
        <Linked key={org.id} org={{ ...org, cloudflare: org.cloudflare }} />
      ) : (
        <Card className="gap-5 p-6">
          <h3 className="font-heading text-lg font-semibold">Connect Cloudflare</h3>
          <ConnectCloudflare onConnected={(link) => updateOrg(org.id, { cloudflare: link })} />
        </Card>
      )}
    </SectionPage>
  );
}
