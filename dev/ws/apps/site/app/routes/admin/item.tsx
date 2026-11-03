import { appContext } from "@supergrid/app-kit/context";
import { ArrowLeftIcon, ExternalLinkIcon } from "lucide-react";
import * as React from "react";
import { Form, Link, redirect, useActionData, useLoaderData, useNavigation } from "react-router";
import { AssetField, parseAssetRef } from "~/components/admin/asset-field";
import { Card, Row, Page } from "~/components/admin/page";
import { adminHref, useAdmin } from "~/components/admin/shell";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { getItem } from "../../lib/items";
import manifest from "../../../supergrid.app.json";
import type { Route } from "./+types/item";

// One item: a form over its fields, the image through the shell's media picker, and delete. Saves and deletes go
// through the operations, so the agent and the REST surface behave the same as this screen.
export async function loader({ context, params }: Route.LoaderArgs) {
  const { db, href, mount } = context.get(appContext);
  const item = await getItem(db, params.id);
  if (!item) throw new Response("Not found", { status: 404 });
  return { item: { ...item, image: parseAssetRef(item.image) }, publicHref: mount === null ? null : href(`/${item.id}`) };
}

export async function action({ request, context, params }: Route.ActionArgs) {
  const { call } = context.get(appContext);
  const f = await request.formData();
  try {
    if (f.get("intent") === "delete") {
      await call("items.delete", { id: params.id });
      return redirect(adminHref(manifest, "/"));
    }
    await call("items.update", { id: params.id, title: String(f.get("title") ?? "").trim(), body: String(f.get("body") ?? "") || null, status: String(f.get("status") ?? "draft"), image: String(f.get("image") ?? "") || null });
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
}

export default function AdminItem() {
  const { item, publicHref } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const { host } = useAdmin();
  const busy = useNavigation().state !== "idle";
  const [status, setStatus] = React.useState<string>(item.status);
  React.useEffect(() => { if (result?.ok) host?.toast("Saved", { tone: "success" }); }, [result, host]);
  return (
    <Page
      title={item.title}
      actions={
        <>
          {publicHref && item.status === "published" && (
            <Button size="sm" variant="outline" render={<a href={publicHref} target="_blank" rel="noreferrer" />}>
              <ExternalLinkIcon />
              View
            </Button>
          )}
          <Button size="sm" type="submit" form="item" disabled={busy}>Save</Button>
        </>
      }
    >
      <Link to={adminHref(manifest, "/")} className="-mt-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-3.5" />
        Items
      </Link>
      <Form id="item" method="post">
        <Card>
          <Row label="Title"><Input name="title" defaultValue={item.title} required /></Row>
          <Row label="Status" hint="Published items show on the public side">
            <input type="hidden" name="status" value={status} />
            <Select value={status} onValueChange={(v) => setStatus(String(v))}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectPopup>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectPopup>
            </Select>
          </Row>
          <Row label="Image"><AssetField name="image" value={item.image} kinds={["image"]} /></Row>
          <Row label="Body"><Textarea name="body" rows={8} defaultValue={item.body ?? ""} /></Row>
          {result && !result.ok && <p className="pt-3 text-sm text-destructive-foreground">{result.error}</p>}
        </Card>
      </Form>
      <Card title="Delete" description="Gone for good, with no undo.">
        <Form method="post" onSubmit={(e) => { if (!confirm(`Delete “${item.title}”?`)) e.preventDefault(); }}>
          <input type="hidden" name="intent" value="delete" />
          <Button size="sm" variant="destructive-outline" type="submit" disabled={busy}>Delete Item</Button>
        </Form>
      </Card>
    </Page>
  );
}
