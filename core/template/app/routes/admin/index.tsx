import { appContext } from "@supergrid/app-kit/context";
import { can } from "@supergrid/app-kit/user";
import { PlusIcon } from "lucide-react";
import { Form, redirect, useActionData, useLoaderData, useNavigate, useNavigation, useSearchParams } from "react-router";
import { DataTable } from "~/components/admin/data-table";
import { Card, EmptyState, Page } from "~/components/admin/page";
import { adminHref } from "~/components/admin/shell";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Dialog, DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from "~/components/ui/dialog";
import { Field, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { listItems } from "~/lib/items";
import manifest from "../../../supergrid.app.json";
import type { Route } from "./+types/index";

// The list screen: every item in a table, and a dialog to add one (opened by ?new=1, which is what the shell's
// "+ New Item" entry links to). Writes go through the app's own operation so the rule lives in one place.
export async function loader({ context }: Route.LoaderArgs) {
  const { db, user } = context.get(appContext);
  return { items: await listItems(db), canWrite: !user || can(user, "content:write") };
}

export async function action({ request, context }: Route.ActionArgs) {
  const { call } = context.get(appContext);
  const f = await request.formData();
  try {
    const created = await call<{ id: string }>("items.create", { title: String(f.get("title") ?? "").trim(), body: String(f.get("body") ?? "").trim() || undefined });
    return redirect(adminHref(manifest, `/${created.id}`));
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export default function AdminIndex() {
  const { items, canWrite } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const busy = useNavigation().state !== "idle";
  const open = params.get("new") === "1";
  const setOpen = (o: boolean) => setParams((p) => { if (o) p.set("new", "1"); else p.delete("new"); return p; });
  return (
    <Page
      title="Items"
      description="Everything this app keeps. Published items show on the public side."
      actions={canWrite && (
        <Button size="sm" onClick={() => setOpen(true)}>
          <PlusIcon />
          New Item
        </Button>
      )}
    >
      <Card padded={false}>
        <DataTable
          columns={[
            { key: "title", label: "Title", render: (i) => <span className="font-medium">{i.title}</span> },
            { key: "status", label: "Status", width: "8rem", render: (i) => <Badge size="sm" variant={i.status === "published" ? "success" : "outline"}>{i.status}</Badge> },
            { key: "created_at", label: "Created", width: "10rem", align: "end", className: "text-muted-foreground", render: (i) => new Date(`${i.created_at}Z`).toLocaleDateString() },
          ]}
          rows={items}
          rowKey={(i) => i.id}
          onRowClick={(i) => navigate(adminHref(manifest, `/${i.id}`))}
          empty={<EmptyState title="No items yet" description="Add the first one; it starts as a draft." action={canWrite ? "New Item" : undefined} onAction={() => setOpen(true)} />}
        />
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogPopup>
          <Form method="post" className="flex min-h-0 flex-1 flex-col">
            <DialogHeader>
              <DialogTitle>New Item</DialogTitle>
              <DialogDescription>A title now; the rest on its page.</DialogDescription>
            </DialogHeader>
            <DialogPanel className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
              <Field>
                <FieldLabel>Title</FieldLabel>
                <Input name="title" required autoFocus />
              </Field>
              <Field>
                <FieldLabel>Body</FieldLabel>
                <Textarea name="body" rows={4} />
              </Field>
              {result?.error && <p className="text-sm text-destructive-foreground">{result.error}</p>}
            </DialogPanel>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
              <Button type="submit" disabled={busy}>Create</Button>
            </DialogFooter>
          </Form>
        </DialogPopup>
      </Dialog>
    </Page>
  );
}
