import { appContext } from "@supergrid/app-kit/context";
import { requirePermission } from "@supergrid/app-kit/user";
import { Form, useActionData, useLoaderData, useNavigation } from "react-router";
import { Card, Row, Page } from "~/components/admin/page";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Switch } from "~/components/ui/switch";
import manifest from "../../../supergrid.app.json";
import type { Route } from "./+types/settings";

// The app's settings, kept in the workspace's settings table under the app's own key, so the agent and other apps
// can read them through `getSetting`. The manifest places this screen under the workspace's settings (place: "settings").
const KEY = `app:${manifest.id}:settings`;
type Settings = { heading: string; showDrafts: boolean };
const DEFAULTS: Settings = { heading: manifest.name, showDrafts: false };

export async function loader({ context }: Route.LoaderArgs) {
  const { workspace } = context.get(appContext);
  return { settings: { ...DEFAULTS, ...((await workspace.getSetting(KEY)) as Partial<Settings> | null) } };
}

export async function action({ request, context }: Route.ActionArgs) {
  const { workspace, user } = context.get(appContext);
  if (user) requirePermission(user, "settings:update");
  const f = await request.formData();
  await workspace.setSetting(KEY, { heading: String(f.get("heading") ?? "").trim() || DEFAULTS.heading, showDrafts: f.get("showDrafts") === "on" } satisfies Settings);
  return { ok: true };
}

export default function AdminSettings() {
  const { settings } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const busy = useNavigation().state !== "idle";
  return (
    <Page title="Settings" actions={<Button size="sm" type="submit" form="settings" disabled={busy}>Save</Button>}>
      <Form id="settings" method="post">
        <Card>
          <Row label="Heading" hint="Shown on the public index"><Input name="heading" defaultValue={settings.heading} /></Row>
          <Row label="Show drafts" hint="On the public side, for previewing"><Switch name="showDrafts" defaultChecked={settings.showDrafts} /></Row>
          {result?.ok && <p className="pt-3 text-sm text-success-foreground">Saved.</p>}
        </Card>
      </Form>
    </Page>
  );
}
