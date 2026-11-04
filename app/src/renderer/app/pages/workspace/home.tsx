import { ArrowUpIcon, ExternalLinkIcon, HomeIcon, PackageIcon } from "lucide-react";
import * as React from "react";
import { Link } from "react-router";
import { Line, type Point } from "~/components/charts";
import { MetaMark } from "~/components/meta-mark";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, WorkspaceFrame } from "~/components/workspace/frame";
import { useAgent } from "~/lib/agent/provider";
import { isDesktop, sg } from "~/lib/bridge";
import { useRemote } from "~/lib/library";
import { usePlatform } from "~/lib/platform";
import { fromFeed, useLatestRelease } from "~/lib/release";
import { clean, type WorkspaceSummary } from "~/lib/workspaces";
import { useOpenNav, useShell } from "~/shell/context";

// Where a workspace opens: the business at a glance, read from its own events and contacts, and a
// way straight into Muse Code with a question about it. Below, what its Worker says about itself:
// where it lives, which release it runs against the newest on the feed, and its apps.

const DAYS = 30;

type Row = { bucket: string | null; key: string | null; value: number };
type Glance = { revenue: Point[]; total: number; orders: number; visitors: number; contacts: number };

async function rpc<T>(wsId: string, method: string, args: unknown[]): Promise<T> {
  if (!sg) throw new Error("The workspace opens inside the SuperGrid app.");
  try {
    return (await sg.ws.rpc(wsId, method, args)) as T;
  } catch (e) {
    throw new Error(clean(e));
  }
}

async function glance(wsId: string): Promise<Glance> {
  const analytics = (spec: object) => rpc<Row[]>(wsId, "queryAnalytics", [{ days: DAYS, ...spec }]);
  const [byDay, orders, visitors, contacts] = await Promise.all([
    analytics({ metric: "sum", prop: "value", events: ["order.placed"], interval: "day" }),
    analytics({ metric: "count", events: ["order.placed"] }),
    analytics({ metric: "unique_visitors", events: ["page.view"] }),
    rpc<{ total: number }>(wsId, "queryContacts", [{ limit: 1 }]),
  ]);
  // every day of the range, so quiet days show as zero rather than a line drawn across them
  const seen = new Map(byDay.map((r) => [r.bucket, Number(r.value) || 0]));
  const revenue: Point[] = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    const day = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    revenue.push({ key: day, value: seen.get(day) ?? 0 });
  }
  return { revenue, total: revenue.reduce((n, p) => n + p.value, 0), orders: Number(orders[0]?.value) || 0, visitors: Number(visitors[0]?.value) || 0, contacts: contacts.total };
}

const money = (n: number) => n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

// What to try first: on the demo, questions its data can answer and one thing to build; on a new workspace, things to build.
const DEMO_PROMPTS = [
  "Who are our ten best customers by lifetime value?",
  "Chart revenue by campaign for the last 30 days",
  "Tag waitlist people who haven't bought yet as follow-up",
  "Build a Wholesale app: an order form for shops and an admin list of their orders",
];
const PROMPTS = [
  "What can you do in this workspace?",
  "Build a waitlist page with a sign-up form that saves people as contacts",
  "Add a contact form to the site and email me when someone fills it in",
];

function Ask({ ws }: { ws: WorkspaceSummary }): React.ReactElement {
  const agent = useAgent();
  const { openThread } = useShell();
  const { adminDark } = usePlatform();
  const [draft, setDraft] = React.useState("");
  const [starting, setStarting] = React.useState(false);

  // a new thread in the agent panel, with the question already sent; when Muse isn't ready the panel says why
  const ask = async (text: string) => {
    if (!text.trim() || starting) return;
    setStarting(true);
    try {
      const id = await agent.newThread(ws.id);
      openThread(id);
      agent.send(id, text.trim());
      setDraft("");
    } catch {
      openThread(null);
    } finally {
      setStarting(false);
    }
  };

  return (
    <Card padded={false}>
      <form
        className="flex items-end gap-3 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(draft);
        }}
      >
        <MetaMark dark={adminDark} className="mb-2.5 h-4 w-6 shrink-0" />
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void ask(draft);
            }
          }}
          rows={1}
          disabled={!isDesktop}
          placeholder={`Ask Muse Code about ${ws.name}, or tell it what to build`}
          className="field-sizing-content max-h-40 min-h-10 flex-1 resize-none bg-transparent py-2 text-base outline-none placeholder:text-muted-foreground"
        />
        <Button type="submit" size="icon" className="rounded-full" disabled={!draft.trim() || starting} aria-label="Ask Muse Code">
          <ArrowUpIcon />
        </Button>
      </form>
      <div className="flex flex-wrap gap-1.5 border-t px-4 py-3">
        {(ws.demo ? DEMO_PROMPTS : PROMPTS).map((p) => (
          <Button key={p} size="sm" variant="outline" className="h-auto rounded-full py-1 text-left font-normal whitespace-normal" disabled={starting} onClick={() => void ask(p)}>
            {p}
          </Button>
        ))}
      </div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string | null }): React.ReactElement {
  return (
    <Card>
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value ?? "–"}</div>
    </Card>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div className="flex items-baseline gap-4 py-1.5 text-sm">
      <span className="w-24 shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 flex-1 break-words">{children}</span>
    </div>
  );
}

export function Home(): React.ReactElement {
  const { ws } = useShell();
  const onOpenNav = useOpenNav();
  const latest = useLatestRelease();
  const data = useRemote(`home:${ws.id}:${ws.url}`, () => glance(ws.id)).data;
  // only a workspace on a feed release can be behind; one deployed from its repo (or living only on this Mac) runs its own build
  const feed = !ws.local && fromFeed(ws.version);
  const behind = feed && !!latest && ws.version !== latest.version;
  // a workspace with no orders, visits or contacts yet has nothing to glance at
  const quiet = !!data && !data.total && !data.orders && !data.visitors && !data.contacts;
  return (
    <WorkspaceFrame icon={<HomeIcon />} title={ws.name} onOpenNav={onOpenNav}>
      <div className="flex flex-col gap-4">
        <Ask ws={ws} />
        {!quiet && (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Revenue, 30 Days" value={data && money(data.total)} />
            <Stat label="Orders, 30 Days" value={data && data.orders.toLocaleString()} />
            <Stat label="Visitors, 30 Days" value={data && data.visitors.toLocaleString()} />
            <Stat label="Contacts" value={data && data.contacts.toLocaleString()} />
          </div>
        )}
        {!!data?.total && (
          <Card title="Revenue by Day">
            <Line points={data.revenue} />
          </Card>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Workspace">
            <Row label="Address">
              <a href={ws.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline-offset-4 hover:underline">
                {ws.url.replace(/^https?:\/\//, "")}
                <ExternalLinkIcon className="size-3.5 text-muted-foreground" />
              </a>
            </Row>
            <Row label="Worker">
              <span className="font-mono text-[13px]">{ws.worker}</span>
            </Row>
            <Row label="Release">
              <span className="flex flex-wrap items-center gap-2">
                {ws.version ?? "unknown"}
                {latest && feed && (
                  <Badge variant={behind ? "warning" : "success"} size="sm">
                    {behind ? `${latest.version} is out` : "Up to date"}
                  </Badge>
                )}
              </span>
            </Row>
          </Card>
          <Card title="Apps">
            {ws.apps.length ? (
              <ul className="-mx-2 flex flex-col">
                {ws.apps.map((a) => (
                  <li key={a.app}>
                    <Link to={`/w/${ws.id}/apps/${a.app}`} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent">
                      <PackageIcon className="size-4 text-muted-foreground" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{a.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">{a.public ? `Public at ${a.public}` : "Admin only"}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No apps installed yet. Ask Muse Code to build one, or add one from Apps in the sidebar.</p>
            )}
          </Card>
        </div>
      </div>
    </WorkspaceFrame>
  );
}
