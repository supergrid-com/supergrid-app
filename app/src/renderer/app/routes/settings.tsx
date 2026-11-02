import { CheckIcon } from "lucide-react";
import { PageFrame } from "~/components/page-frame";
import { PageHeader, Section } from "~/components/page-header";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardFrame } from "~/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { SegmentedControl, SegmentedControlItem } from "~/components/ui/segmented-control";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { toastManager } from "~/components/ui/toast";
import { branding, customRoles, modeMatrix, modes, orgs, teams, type Mode } from "~/lib/mock";
import { usePlatform } from "~/lib/platform";
import { cn } from "~/lib/utils";

const blurb: Record<Mode, string> = {
  creator: "One organization, hidden. Sign-up by invitation. No teams or custom roles.",
  agency: "One named organization. Teams are clients and can be assigned workspaces. Custom roles on.",
  reseller: "Many organizations with public sign-up. Adds the operator console: users, impersonation, bans.",
};

export default function Settings() {
  const { mode, setMode } = usePlatform();
  const blocked: Partial<Record<Mode, string>> = {
    creator: `${orgs.length} organizations and ${teams.length} teams exist; creator mode would hide them.`,
    agency: orgs.length > 1 ? `${orgs.length} organizations exist; agency mode shows one.` : undefined,
  };

  return (
    <PageFrame crumbs={[{ label: "Home", to: "/" }, { label: "Platform settings" }]}>
      <PageHeader title="Platform settings" description="Operator-only. Branding is what every signed-in user sees; the mode decides which screens exist and who may sign up." />

      <div className="grid gap-8 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <Section title="Branding" description="Shown in the sidebar, the login page and invitation emails.">
          <Card className="p-6">
            <div className="flex flex-col gap-4">
              <Field>
                <FieldLabel>Platform name</FieldLabel>
                <Input defaultValue={branding.name} />
              </Field>
              <Field>
                <FieldLabel>Accent</FieldLabel>
                <div className="flex w-full items-center gap-2">
                  <span className="size-8 shrink-0 rounded-md border" style={{ background: branding.accent }} />
                  <Input defaultValue={branding.accent} className="font-mono" />
                </div>
                <FieldDescription>Used for the organization mark and primary actions in app admin screens.</FieldDescription>
              </Field>
              <Field>
                <FieldLabel>Logo</FieldLabel>
                <Input type="file" />
              </Field>
            </div>
            <div className="mt-6 flex justify-end border-t pt-4">
              <Button onClick={() => toastManager.add({ title: "Branding saved", type: "success" })}>Save</Button>
            </div>
          </Card>
        </Section>

        <Section title="Mode" description="The data model is the same in every mode (organization → workspace). Moving up never migrates anything; moving down only hides screens, and is refused while it would hide something that exists.">
          <Card className="gap-0 p-0">
            <div className="flex flex-col gap-4 p-6">
              <SegmentedControl className="w-fit" role="radiogroup" aria-label="Mode">
                {modes.map((m) => (
                  <SegmentedControlItem key={m} type="button" role="radio" aria-checked={m === mode} data-checked={m === mode ? "" : undefined} className="capitalize" onClick={() => setMode(m)}>
                    {m}
                  </SegmentedControlItem>
                ))}
              </SegmentedControl>
              <p className="text-sm text-muted-foreground">{blurb[mode]}</p>
              {blocked[mode] && (
                <Alert variant="warning">
                  <AlertTitle>Some screens are now hidden</AlertTitle>
                  <AlertDescription>{blocked[mode]} The real platform refuses this change and says what is in the way; the POC lets you look.</AlertDescription>
                </Alert>
              )}
            </div>
            <CardFrame className="-mx-px -mb-px rounded-t-none before:hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead />
                    {modes.map((m) => (
                      <TableHead key={m} className={cn("capitalize", m === mode && "text-foreground")}>
                        <span className="inline-flex items-center gap-1.5">
                          {m}
                          {m === mode && <CheckIcon className="size-3.5 text-success-foreground" />}
                        </span>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modeMatrix.map((row) => (
                    <TableRow key={row.feature}>
                      <TableCell className="font-medium">{row.feature}</TableCell>
                      {modes.map((m) => (
                        <TableCell key={m} className={cn(m === mode ? "text-foreground" : "text-muted-foreground")}>
                          {row[m]}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardFrame>
          </Card>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            Now: <Badge variant="secondary">{orgs.length} organizations</Badge>
            <Badge variant="secondary">{teams.length} teams</Badge>
            <Badge variant="secondary">{customRoles.length} custom roles</Badge>
            <span>
              · default from <span className="font-mono">SG_MODE</span>: agency
            </span>
          </div>
        </Section>
      </div>
    </PageFrame>
  );
}
