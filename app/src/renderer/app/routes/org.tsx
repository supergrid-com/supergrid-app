import { CheckIcon, CopyIcon, EllipsisIcon, MailPlusIcon, PlusIcon, ShieldCheckIcon, Trash2Icon, UserMinusIcon, UsersIcon } from "lucide-react";
import * as React from "react";
import { PageFrame } from "~/components/page-frame";
import { PageHeader, Section } from "~/components/page-header";
import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardDescription, CardFrame, CardHeader, CardPanel, CardTitle } from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import { Dialog, DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle, DialogTrigger } from "~/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "~/components/ui/menu";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Tabs, TabsList, TabsPanel, TabsTab } from "~/components/ui/tabs";
import { toastManager } from "~/components/ui/toast";
import { customRoles, invitations, me, members, orgs, statement, teams } from "~/lib/mock";
import { usePlatform } from "~/lib/platform";

const fixedRoles: { role: string; summary: string }[] = [
  { role: "owner", summary: "Everything, including deleting the organization, transferring ownership and the secrets." },
  { role: "admin", summary: "An owner who cannot delete the organization, change its owner or touch secrets." },
  { role: "editor", summary: "Works inside apps and reads data." },
  { role: "viewer", summary: "Looks." },
];

function roleItems(advanced: boolean) {
  const base = fixedRoles.map((r) => ({ value: r.role, label: r.role }));
  return advanced ? [...base, ...customRoles.map((r) => ({ value: r.role, label: r.role }))] : base;
}

function RoleSelect({ value, advanced, disabled }: { value: string; advanced: boolean; disabled?: boolean }): React.ReactElement {
  const items = roleItems(advanced);
  return (
    <Select items={items} defaultValue={value} disabled={disabled} onValueChange={(v) => toastManager.add({ title: `Role changed to ${v}`, type: "success" })}>
      <SelectTrigger size="sm" className="w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectPopup>
        {items.map((r) => (
          <SelectItem key={r.value} value={r.value}>
            {r.label}
          </SelectItem>
        ))}
      </SelectPopup>
    </Select>
  );
}

function InviteDialog({ advanced }: { advanced: boolean }): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  const roles = roleItems(advanced);
  const teamItems = [{ value: "", label: "No team" }, ...teams.map((t) => ({ value: t.id, label: t.name }))];
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <MailPlusIcon />
        Invite
      </DialogTrigger>
      <DialogPopup>
        <DialogHeader>
          <DialogTitle>Invite someone</DialogTitle>
          <DialogDescription>No mailer is configured yet, so you get a link to send yourself. It expires in 7 days.</DialogDescription>
        </DialogHeader>
        <DialogPanel>
          <div className="flex flex-col gap-4">
            <Field>
              <FieldLabel>Email</FieldLabel>
              <Input type="email" placeholder="name@company.com" autoFocus />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>Role</FieldLabel>
                <Select items={roles} defaultValue="editor">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectPopup>
                    {roles.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
              </Field>
              {advanced && (
                <Field>
                  <FieldLabel>Team</FieldLabel>
                  <Select items={teamItems} defaultValue="">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectPopup>
                      {teamItems.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectPopup>
                  </Select>
                  <FieldDescription>A client contact in a team sees only that team's workspaces.</FieldDescription>
                </Field>
              )}
            </div>
          </div>
        </DialogPanel>
        <DialogFooter>
          <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
          <Button
            onClick={() => {
              setOpen(false);
              toastManager.add({ title: "Invitation created", description: "Copy the link from the Invitations tab.", type: "success" });
            }}
          >
            Create invitation
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}

function CreateRoleDialog(): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        <PlusIcon />
        Custom role
      </DialogTrigger>
      <DialogPopup className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>New custom role</DialogTitle>
          <DialogDescription>A set of permissions for this organization only. Assign it like any other role.</DialogDescription>
        </DialogHeader>
        <DialogPanel>
          <div className="flex flex-col gap-5">
            <Field>
              <FieldLabel>Name</FieldLabel>
              <Input placeholder="blog-editor" className="sm:max-w-xs" />
            </Field>
            <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              {Object.entries(statement).map(([resource, actions]) => (
                <div key={resource} className="flex flex-col gap-2">
                  <div className="font-mono text-xs font-medium text-muted-foreground">{resource}</div>
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {actions.map((a) => (
                      <Label key={a} className="flex items-center gap-2 text-sm font-normal">
                        <Checkbox />
                        {a}
                      </Label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogPanel>
        <DialogFooter>
          <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
          <Button
            onClick={() => {
              setOpen(false);
              toastManager.add({ title: "Role created", type: "success" });
            }}
          >
            Create role
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}

function CopyLink({ id }: { id: string }): React.ReactElement {
  const [copied, setCopied] = React.useState(false);
  const link = `https://admin.supergrid.dev/invite/${id}`;
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(link);
        } catch {}
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
      {copied ? "Copied" : "Copy link"}
    </Button>
  );
}

export default function Org() {
  const { mode, orgId } = usePlatform();
  const org = orgs.find((o) => o.id === orgId) ?? orgs[0];
  const advanced = mode !== "creator";

  return (
    <PageFrame crumbs={[{ label: "Home", to: "/" }, { label: mode === "creator" ? "Members" : org.name }]}>
      <PageHeader
        title={mode === "creator" ? "Members" : org.name}
        description={
          mode === "creator"
            ? "People who can sign in to this platform. Invite a collaborator and they become an editor."
            : `${members.length} members · ${teams.length} teams · ${customRoles.length} custom roles`
        }
        actions={<InviteDialog advanced={advanced} />}
      />

      <Tabs defaultValue="members">
        <TabsList variant="underline" className="w-full justify-start border-b">
          <TabsTab value="members">Members</TabsTab>
          <TabsTab value="invitations">
            Invitations
            <Badge variant="secondary" size="sm">
              {invitations.length}
            </Badge>
          </TabsTab>
          {advanced && <TabsTab value="teams">Teams</TabsTab>}
          {advanced && <TabsTab value="roles">Roles</TabsTab>}
          {advanced && <TabsTab value="settings">Settings</TabsTab>}
        </TabsList>

        <TabsPanel value="members" className="pt-4">
          <CardFrame>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  {advanced && <TableHead className="max-md:hidden">Teams</TableHead>}
                  <TableHead className="max-lg:hidden">Joined</TableHead>
                  <TableHead className="w-0" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => {
                  const isMe = m.id === me.id;
                  const memberTeams = teams.filter((t) => t.memberIds.includes(m.id));
                  return (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="[--avatar-size:--spacing(8)]">
                            <AvatarFallback>{m.initials}</AvatarFallback>
                          </Avatar>
                          <div className="leading-tight">
                            <div className="flex items-center gap-2 font-medium">
                              {m.name}
                              {isMe && <Badge variant="outline" size="sm">you</Badge>}
                            </div>
                            <div className="text-xs text-muted-foreground">{m.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <RoleSelect value={String(m.role)} advanced={advanced} disabled={isMe} />
                      </TableCell>
                      {advanced && (
                        <TableCell className="max-md:hidden">
                          <div className="flex flex-wrap gap-1">
                            {memberTeams.length === 0 && <span className="text-xs text-muted-foreground">agency staff</span>}
                            {memberTeams.map((t) => (
                              <Badge key={t.id} variant="secondary">
                                {t.name}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                      )}
                      <TableCell className="text-muted-foreground max-lg:hidden">{m.joinedAt}</TableCell>
                      <TableCell>
                        <Menu>
                          <MenuTrigger render={<Button size="icon-sm" variant="ghost" aria-label="Member actions" disabled={isMe} />}>
                            <EllipsisIcon />
                          </MenuTrigger>
                          <MenuPopup align="end">
                            {advanced && (
                              <>
                                <MenuItem>
                                  <UsersIcon />
                                  Add to a team
                                </MenuItem>
                                <MenuSeparator />
                              </>
                            )}
                            <MenuItem variant="destructive" onClick={() => toastManager.add({ title: `${m.name} removed`, description: "Their sessions end within the hour.", type: "success" })}>
                              <UserMinusIcon />
                              Remove from organization
                            </MenuItem>
                          </MenuPopup>
                        </Menu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardFrame>
        </TabsPanel>

        <TabsPanel value="invitations" className="pt-4">
          <Section title="Pending invitations" description="No mailer is configured yet: copy the link and send it yourself.">
            <CardFrame>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    {advanced && <TableHead className="max-md:hidden">Team</TableHead>}
                    <TableHead className="max-md:hidden">Expires</TableHead>
                    <TableHead className="w-0" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="font-medium">{i.email}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{i.role}</Badge>
                      </TableCell>
                      {advanced && <TableCell className="text-muted-foreground max-md:hidden">{teams.find((t) => t.id === i.teamId)?.name ?? "—"}</TableCell>}
                      <TableCell className="text-muted-foreground max-md:hidden">in {i.expiresIn}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <CopyLink id={i.id} />
                          <Button size="icon-sm" variant="ghost" aria-label="Cancel invitation" onClick={() => toastManager.add({ title: "Invitation cancelled", type: "success" })}>
                            <Trash2Icon />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardFrame>
          </Section>
        </TabsPanel>

        {advanced && (
          <TabsPanel value="teams" className="pt-4">
            <Section
              title="Teams"
              description="A team is a client, or any grouping of members. Assign a workspace to a team on its Access tab and only that team (plus owners and admins) sees it."
              actions={
                <Button variant="outline" onClick={() => toastManager.add({ title: "Not in the POC", description: "Creating teams is a dialog like Invite.", type: "info" })}>
                  <PlusIcon />
                  New team
                </Button>
              }
            >
              <div className="grid gap-4 md:grid-cols-2">
                {teams.map((t) => {
                  const inTeam = members.filter((m) => t.memberIds.includes(m.id));
                  return (
                    <Card key={t.id}>
                      <CardHeader>
                        <CardTitle>{t.name}</CardTitle>
                        <CardDescription>
                          {inTeam.length} member{inTeam.length === 1 ? "" : "s"} · 1 workspace
                        </CardDescription>
                      </CardHeader>
                      <CardPanel>
                        <ul className="flex flex-col divide-y">
                          {inTeam.map((m) => (
                            <li key={m.id} className="flex items-center gap-3 py-2 text-sm">
                              <Avatar className="[--avatar-size:--spacing(6)]">
                                <AvatarFallback>{m.initials}</AvatarFallback>
                              </Avatar>
                              <span className="flex-1 truncate">{m.name}</span>
                              <Badge variant="secondary">{m.role}</Badge>
                            </li>
                          ))}
                        </ul>
                        <Button variant="ghost" size="sm" className="mt-2 -ms-2">
                          <PlusIcon />
                          Add member
                        </Button>
                      </CardPanel>
                    </Card>
                  );
                })}
              </div>
            </Section>
          </TabsPanel>
        )}

        {advanced && (
          <TabsPanel value="roles" className="pt-4">
            <div className="flex flex-col gap-8">
              <Section title="Fixed roles" description="Four roles cover most cases. They are the same in every organization.">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {fixedRoles.map((r) => (
                    <Card key={r.role} className="p-5">
                      <div className="flex items-center gap-2">
                        <ShieldCheckIcon className="size-4 text-muted-foreground" />
                        <span className="font-heading font-semibold">{r.role}</span>
                        <span className="ms-auto text-xs text-muted-foreground">{members.filter((m) => m.role === r.role).length}</span>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{r.summary}</p>
                    </Card>
                  ))}
                </div>
              </Section>
              <Section title="Custom roles" description="Built from the same permission statement, scoped to this organization." actions={<CreateRoleDialog />}>
                <div className="grid gap-4 md:grid-cols-2">
                  {customRoles.map((r) => (
                    <Card key={r.role}>
                      <CardHeader>
                        <CardTitle className="font-mono text-base">{r.role}</CardTitle>
                        <CardDescription>{r.description}</CardDescription>
                      </CardHeader>
                      <CardPanel>
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(r.permission).flatMap(([res, actions]) =>
                            actions.map((a) => (
                              <Badge key={`${res}:${a}`} variant="outline" className="font-mono">
                                {res}:{a}
                              </Badge>
                            )),
                          )}
                        </div>
                        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                          <AvatarGroup className="[--avatar-size:--spacing(5)]">
                            {members
                              .filter((m) => m.role === r.role)
                              .map((m) => (
                                <Avatar key={m.id}>
                                  <AvatarFallback>{m.initials}</AvatarFallback>
                                </Avatar>
                              ))}
                            {members.filter((m) => m.role === r.role).length === 0 && <AvatarGroupCount>0</AvatarGroupCount>}
                          </AvatarGroup>
                          assigned
                        </div>
                      </CardPanel>
                    </Card>
                  ))}
                </div>
              </Section>
            </div>
          </TabsPanel>
        )}

        {advanced && (
          <TabsPanel value="settings" className="pt-4">
            <div className="grid gap-6 lg:grid-cols-2">
              <Section title="Organization">
                <Card className="p-6">
                  <div className="flex flex-col gap-4">
                    <Field>
                      <FieldLabel>Name</FieldLabel>
                      <Input defaultValue={org.name} />
                    </Field>
                    <Field>
                      <FieldLabel>Slug</FieldLabel>
                      <Input defaultValue={org.slug} className="font-mono" />
                      <FieldDescription>Used in invitation links and the CLI.</FieldDescription>
                    </Field>
                  </div>
                  <div className="mt-6 flex justify-end border-t pt-4">
                    <Button onClick={() => toastManager.add({ title: "Organization saved", type: "success" })}>Save</Button>
                  </div>
                </Card>
              </Section>
              <Section title="Danger zone">
                <Card className="border-destructive/30 p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-medium">Delete this organization</div>
                      <p className="text-sm text-muted-foreground">Removes every workspace and membership. Only an owner can do this.</p>
                    </div>
                    <Button variant="destructive-outline">Delete</Button>
                  </div>
                </Card>
              </Section>
            </div>
          </TabsPanel>
        )}
      </Tabs>
    </PageFrame>
  );
}
