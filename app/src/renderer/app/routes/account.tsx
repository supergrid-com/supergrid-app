import { CheckIcon, CopyIcon, FingerprintIcon, KeyRoundIcon, PlusIcon, Trash2Icon } from "lucide-react";
import * as React from "react";
import { PageFrame } from "~/components/page-frame";
import { PageHeader, Section } from "~/components/page-header";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardFrame, CardFrameDescription, CardFrameHeader, CardFrameTitle } from "~/components/ui/card";
import { Dialog, DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle, DialogTrigger } from "~/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Table, TableBody, TableCell, TableRow } from "~/components/ui/table";
import { toastManager } from "~/components/ui/toast";
import { apiKeys, me, orgs, passkeys } from "~/lib/mock";

function CreateKeyDialog(): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  const [created, setCreated] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setTimeout(() => setCreated(null), 200);
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <PlusIcon />
        Create key
      </DialogTrigger>
      <DialogPopup>
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle>Your new key</DialogTitle>
              <DialogDescription>This is the only time it is shown. Paste it into the CLI now.</DialogDescription>
            </DialogHeader>
            <DialogPanel>
              <div className="flex items-center gap-2 rounded-lg border bg-muted/60 p-3 font-mono text-sm">
                <span className="flex-1 select-all break-all">{created}</span>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Copy"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(created);
                    } catch {}
                    setCopied(true);
                  }}
                >
                  {copied ? <CheckIcon /> : <CopyIcon />}
                </Button>
              </div>
              <pre className="mt-3 overflow-x-auto rounded-lg border p-3 text-xs text-muted-foreground">pnpm sg login</pre>
            </DialogPanel>
            <DialogFooter>
              <DialogClose render={<Button />}>Done</DialogClose>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Create an API key</DialogTitle>
              <DialogDescription>Everything the CLI does with this key runs as you, with your roles, and shows under your name in the audit log.</DialogDescription>
            </DialogHeader>
            <DialogPanel>
              <Field>
                <FieldLabel>Name</FieldLabel>
                <Input placeholder="laptop, ci, …" autoFocus />
                <FieldDescription>Only for telling keys apart.</FieldDescription>
              </Field>
            </DialogPanel>
            <DialogFooter>
              <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
              <Button onClick={() => setCreated("sg_live_" + Math.random().toString(36).slice(2, 14) + Math.random().toString(36).slice(2, 14))}>Create key</Button>
            </DialogFooter>
          </>
        )}
      </DialogPopup>
    </Dialog>
  );
}

export default function Account() {
  return (
    <PageFrame crumbs={[{ label: "Home", to: "/" }, { label: "Account" }]}>
      <PageHeader title="Account" description="How you sign in and what the CLI does on your behalf." />

      <Card className="flex-row items-center gap-4 p-5">
        <Avatar className="[--avatar-size:--spacing(14)]">
          <AvatarFallback>{me.initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-heading text-lg font-semibold">{me.name}</span>
            {me.operator && <Badge variant="info">Operator</Badge>}
          </div>
          <div className="text-sm text-muted-foreground">{me.email}</div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {orgs.map((o) => (
              <Badge key={o.id} variant="outline">
                {o.name} · {o.role}
              </Badge>
            ))}
          </div>
        </div>
        <Button variant="outline">Edit profile</Button>
      </Card>

      <div className="grid gap-8 lg:grid-cols-2">
        <Section title="Passkeys" description="Sign in with Touch ID, Face ID or a security key instead of a password.">
          <CardFrame>
            <CardFrameHeader>
              <CardFrameTitle>{passkeys.length} passkeys</CardFrameTitle>
              <CardFrameDescription>
                <Button size="sm" variant="outline" onClick={() => toastManager.add({ title: "Passkey added", description: "This browser asked the OS for one.", type: "success" })}>
                  <FingerprintIcon />
                  Add a passkey
                </Button>
              </CardFrameDescription>
            </CardFrameHeader>
            <Table>
              <TableBody>
                {passkeys.map((k) => (
                  <TableRow key={k.id}>
                    <TableCell className="whitespace-normal">
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 items-center justify-center rounded-md border bg-muted">
                          <FingerprintIcon className="size-4" />
                        </div>
                        <div className="leading-tight">
                          <div className="font-medium">{k.name}</div>
                          <div className="text-xs text-muted-foreground">
                            added {k.addedAt} · last used {k.lastUsed}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="icon-sm" variant="ghost" aria-label="Remove passkey" onClick={() => toastManager.add({ title: "Passkey removed", type: "success" })}>
                        <Trash2Icon />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardFrame>
        </Section>

        <Section title="API keys" description="For the sg CLI. Create a key, then run pnpm sg login and paste it.">
          <CardFrame>
            <CardFrameHeader>
              <CardFrameTitle>{apiKeys.length} keys</CardFrameTitle>
              <CardFrameDescription>
                <CreateKeyDialog />
              </CardFrameDescription>
            </CardFrameHeader>
            <Table>
              <TableBody>
                {apiKeys.map((k) => (
                  <TableRow key={k.id}>
                    <TableCell className="whitespace-normal">
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 items-center justify-center rounded-md border bg-muted">
                          <KeyRoundIcon className="size-4" />
                        </div>
                        <div className="leading-tight">
                          <div className="flex items-center gap-2 font-medium">
                            {k.name}
                            <span className="font-mono text-xs text-muted-foreground">{k.start}…</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            created {k.createdAt} · last used {k.lastUsed}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => toastManager.add({ title: `Key "${k.name}" revoked`, type: "success" })}>
                        Revoke
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardFrame>
        </Section>
      </div>
    </PageFrame>
  );
}
