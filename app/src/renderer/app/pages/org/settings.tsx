import * as React from "react";
import { useNavigate } from "react-router";
import { SectionPage } from "~/components/section-page";
import { AlertDialog, AlertDialogClose, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogPopup, AlertDialogTitle } from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import { Field, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Separator } from "~/components/ui/separator";
import { toastManager } from "~/components/ui/toast";
import { removeOrg, updateOrg, useOrgs } from "~/lib/orgs";
import { useSession } from "~/lib/session";
import { Code, Details, SettingsGroup } from "~/pages/org/parts";

// The organization itself: its name, and removing it from this Mac. Organizations are local, so
// removing one only forgets it here; nothing in Cloudflare is touched.
export function OrgSettings(): React.ReactElement {
  const { org, setOrg } = useSession();
  const orgs = useOrgs();
  const navigate = useNavigate();
  const [name, setName] = React.useState(org?.name ?? "");
  const [removing, setRemoving] = React.useState(false);

  React.useEffect(() => setName(org?.name ?? ""), [org?.id, org?.name]);
  if (!org) return <></>;
  const dirty = name.trim() !== org.name;

  return (
    <SectionPage title="Settings" description={`${org.name}, created ${org.createdAt}`} width={960}>
      <div className="flex flex-col gap-8">
        <SettingsGroup title="General" description="How the organization appears in the app.">
          <Field>
            <FieldLabel>Name</FieldLabel>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="max-w-md" />
          </Field>
          <Details labelWidth={120} rows={[["Organization ID", <Code key="id">{org.id}</Code>]]} />
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={!dirty || !name.trim()}
              onClick={() => {
                updateOrg(org.id, { name: name.trim() });
                toastManager.add({ title: "Saved", type: "success" });
              }}
            >
              Save
            </Button>
            {dirty && (
              <Button size="sm" variant="ghost" onClick={() => setName(org.name)}>
                Discard
              </Button>
            )}
          </div>
        </SettingsGroup>

        <Separator />

        <SettingsGroup title="Danger zone" description="Nothing here touches Cloudflare. Anything in the account keeps running.">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border px-4 py-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">Remove organization</span>
              <span className="text-xs text-muted-foreground">Forgets it and its Cloudflare account link on this Mac.</span>
            </div>
            <Button size="sm" variant="destructive-outline" onClick={() => setRemoving(true)}>
              Remove
            </Button>
          </div>
        </SettingsGroup>
      </div>

      <AlertDialog open={removing} onOpenChange={setRemoving}>
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {org.name} from this Mac?</AlertDialogTitle>
            <AlertDialogDescription>{orgs.length > 1 ? "SuperGrid switches to your next organization." : "It's your only organization, so setup starts again."}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="ghost" />}>Cancel</AlertDialogClose>
            <Button
              variant="destructive"
              onClick={() => {
                const next = orgs.find((o) => o.id !== org.id);
                removeOrg(org.id);
                setRemoving(false);
                if (next) {
                  setOrg(next.id);
                  navigate("/");
                } else navigate("/welcome");
              }}
            >
              Remove
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </SectionPage>
  );
}
