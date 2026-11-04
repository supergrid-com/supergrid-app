import { CircleAlertIcon, CircleCheckIcon, CircleMinusIcon } from "lucide-react";
import * as React from "react";
import { useNavigate } from "react-router";
import type { DemoProgress } from "../../../shared/bridge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Spinner } from "~/components/ui/spinner";
import { sg } from "~/lib/bridge";
import { addOrg, updateOrg, useOrgs, type Org } from "~/lib/orgs";
import { useSession } from "~/lib/session";
import { cn } from "~/lib/utils";
import { clean, refreshWorkspaces } from "~/lib/workspaces";

// The demo workspace, made from setup or from New Workspace: everything on this Mac, on the app's own Node and pnpm,
// with no Cloudflare account (src/main/demo.ts). There is one demo per Mac; making it for an organization brings it
// there, already seeded if it was made before.

const DEMO_STEPS: { step: DemoProgress["step"]; label: string }[] = [
  { step: "repo", label: "Make the workspace's repo and install its packages" },
  { step: "apps", label: "Add the Funnels, Pages and Blog apps" },
  { step: "server", label: "Start the dev server" },
  { step: "data", label: "Fill the database with sample data" },
];

export function ExploreDemo({
  org: into,
  title = "Explore the Demo",
  action = "Explore the Demo",
}: {
  /** The organization to make it in; without one it gets a "Demo" organization of its own, as in first-run setup. */
  org?: Org;
  title?: string;
  action?: string;
}): React.ReactElement {
  const navigate = useNavigate();
  const { setOrg } = useSession();
  const orgs = useOrgs();
  const [phase, setPhase] = React.useState<"idle" | "running" | "failed">("idle");
  const [at, setAt] = React.useState<DemoProgress | null>(null);
  const [error, setError] = React.useState<string>();
  React.useEffect(() => sg?.demo.onProgress(setAt), []);

  const start = async () => {
    if (!sg) return;
    setPhase("running");
    setError(undefined);
    setAt({ id: "demo", step: "repo" });
    // one demo organization, reused if setup is opened again
    const org = into ?? orgs.find((o) => !o.cloudflare && o.name === "Demo") ?? addOrg("Demo", null);
    setOrg(org.id);
    try {
      const ws = await sg.demo.create(org.id);
      updateOrg(org.id, { lastWorkspace: ws.id });
      await refreshWorkspaces(org);
      navigate(`/w/${ws.id}`);
    } catch (e) {
      setError(clean(e));
      setPhase("failed");
    }
  };

  const index = DEMO_STEPS.findIndex((s) => s.step === at?.step);
  return (
    <Card className="p-6">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h2 className="font-heading text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">
            Fernwood Ceramics, a small pottery studio, with contacts, 90 days of events, segments, workflows, and Funnels, Pages and Blog apps. It runs on this
            Mac, so it needs no Cloudflare account, and Muse Code works on it like on any workspace.
          </p>
        </div>
        {phase !== "idle" && (
          <ol className="flex flex-col gap-2 text-sm">
            {DEMO_STEPS.map((s, i) => {
              const done = i < index;
              const current = i === index;
              return (
                <li key={s.step} className="flex items-center gap-2.5">
                  {done ? (
                    <CircleCheckIcon className="size-4 shrink-0 text-success" aria-label="Done" />
                  ) : current && phase === "failed" ? (
                    <CircleAlertIcon className="size-4 shrink-0 text-destructive" aria-label="Failed" />
                  ) : current ? (
                    <Spinner className="size-4" />
                  ) : (
                    <CircleMinusIcon className="size-4 shrink-0 text-muted-foreground/50" />
                  )}
                  <span className={cn(!done && !current && "text-muted-foreground")}>{s.label}</span>
                  {current && at?.detail && <span className="text-muted-foreground">{at.detail}</span>}
                </li>
              );
            })}
          </ol>
        )}
        {error && <p className="whitespace-pre-wrap rounded-lg bg-destructive/8 p-3 font-mono text-xs text-destructive-foreground">{error}</p>}
        <div className="flex items-center justify-end gap-3">
          {phase === "running" && <span className="text-xs text-muted-foreground">The first start installs packages and can take a minute.</span>}
          <Button disabled={!sg || phase === "running"} onClick={() => void start()}>
            {phase === "failed" ? "Try Again" : action}
          </Button>
        </div>
      </div>
    </Card>
  );
}
