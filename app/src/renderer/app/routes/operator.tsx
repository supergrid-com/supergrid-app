import { BanIcon, EllipsisIcon, EyeIcon, ShieldIcon, ShieldOffIcon } from "lucide-react";
import * as React from "react";
import { Link } from "react-router";
import { PageFrame } from "~/components/page-frame";
import { PageHeader, Section, Stat } from "~/components/page-header";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { CardFrame } from "~/components/ui/card";
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "~/components/ui/menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { toastManager } from "~/components/ui/toast";
import { me, orgs, platformUsers, workspaces } from "~/lib/mock";
import { usePlatform } from "~/lib/platform";

export default function Operator() {
  const { mode } = usePlatform();
  const [banTarget, setBanTarget] = React.useState<(typeof platformUsers)[number] | null>(null);

  return (
    <PageFrame crumbs={[{ label: "Home", to: "/" }, { label: "Operator console" }]}>
      <PageHeader title="Operator console" description="Everything above the organizations: who has an account, who runs what, and the levers for support." />

      {mode !== "reseller" && (
        <Alert variant="info">
          <AlertTitle>Shown in reseller mode</AlertTitle>
          <AlertDescription>
            In {mode} mode you reach everything from Workspaces and Organization. This screen stays reachable for the operator so nothing is lost when switching.
          </AlertDescription>
          <AlertAction>
            <Button size="sm" variant="outline" render={<Link to="/settings" />}>
              Change mode
            </Button>
          </AlertAction>
        </Alert>
      )}

      <CardFrame className="grid grid-cols-2 divide-x rounded-2xl before:hidden lg:grid-cols-4">
        <Stat label="Users" value={platformUsers.length} hint={`${platformUsers.filter((u) => u.banned).length} banned`} />
        <Stat label="Organizations" value={orgs.length} hint="self-serve sign-ups" />
        <Stat label="Workspaces" value={workspaces.length} hint="across all organizations" />
        <Stat label="Operators" value={platformUsers.filter((u) => u.operator).length} hint="platform admin role" />
      </CardFrame>

      <Section title="Organizations" description="Each one is a tenant with its own members and workspaces.">
        <CardFrame>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead className="text-right">Members</TableHead>
                <TableHead className="text-right">Workspaces</TableHead>
                <TableHead className="max-md:hidden">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orgs.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">{o.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{o.slug}</TableCell>
                  <TableCell className="text-right">{o.members}</TableCell>
                  <TableCell className="text-right">{o.workspaces}</TableCell>
                  <TableCell className="text-muted-foreground max-md:hidden">{o.createdAt}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardFrame>
      </Section>

      <Section title="Users" description="Impersonation opens a session as that user; it is logged and shows a banner until you stop.">
        <CardFrame>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Platform role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right max-md:hidden">Orgs</TableHead>
                <TableHead className="max-lg:hidden">Last seen</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {platformUsers.map((u) => {
                const isMe = u.id === me.id;
                return (
                  <TableRow key={u.id} className={u.banned ? "opacity-60" : undefined}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="[--avatar-size:--spacing(8)]">
                          <AvatarFallback>{u.initials}</AvatarFallback>
                        </Avatar>
                        <div className="leading-tight">
                          <div className="flex items-center gap-2 font-medium">
                            {u.name}
                            {isMe && <Badge variant="outline" size="sm">you</Badge>}
                          </div>
                          <div className="text-xs text-muted-foreground">{u.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{u.operator ? <Badge variant="info">operator</Badge> : <span className="text-muted-foreground">user</span>}</TableCell>
                    <TableCell>{u.banned ? <Badge variant="error">banned</Badge> : <Badge variant="success">active</Badge>}</TableCell>
                    <TableCell className="text-right max-md:hidden">{u.orgs}</TableCell>
                    <TableCell className="text-muted-foreground max-lg:hidden">{u.lastSeen}</TableCell>
                    <TableCell>
                      <Menu>
                        <MenuTrigger render={<Button size="icon-sm" variant="ghost" aria-label="User actions" disabled={isMe} />}>
                          <EllipsisIcon />
                        </MenuTrigger>
                        <MenuPopup align="end">
                          <MenuItem onClick={() => toastManager.add({ title: `Impersonating ${u.name}`, description: "A banner shows until you stop.", type: "info" })}>
                            <EyeIcon />
                            Impersonate
                          </MenuItem>
                          <MenuItem onClick={() => toastManager.add({ title: u.operator ? `${u.name} is no longer an operator` : `${u.name} is now an operator`, type: "success" })}>
                            {u.operator ? <ShieldOffIcon /> : <ShieldIcon />}
                            {u.operator ? "Remove operator" : "Make operator"}
                          </MenuItem>
                          <MenuSeparator />
                          {u.banned ? (
                            <MenuItem onClick={() => toastManager.add({ title: `${u.name} unbanned`, type: "success" })}>
                              <BanIcon />
                              Unban
                            </MenuItem>
                          ) : (
                            <MenuItem variant="destructive" onClick={() => setBanTarget(u)}>
                              <BanIcon />
                              Ban
                            </MenuItem>
                          )}
                        </MenuPopup>
                      </Menu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardFrame>
      </Section>

      <AlertDialog open={banTarget !== null} onOpenChange={(open) => !open && setBanTarget(null)}>
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>Ban {banTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>They are signed out everywhere and cannot sign in again until unbanned. Their memberships and data stay.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="ghost" />}>Cancel</AlertDialogClose>
            <AlertDialogClose
              render={<Button variant="destructive" />}
              onClick={() => toastManager.add({ title: `${banTarget?.name} banned`, type: "success" })}
            >
              Ban user
            </AlertDialogClose>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </PageFrame>
  );
}
