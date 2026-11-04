import { CheckIcon, CircleAlertIcon, CircleCheckIcon, CircleMinusIcon } from "lucide-react";
import type { DemoProgress } from "../../../../shared/bridge";
import * as React from "react";
import { useNavigate, useSearchParams } from "react-router";
import { CreateWorkspace } from "~/components/create-workspace";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Field, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Spinner } from "~/components/ui/spinner";
import { sg } from "~/lib/bridge";
import { addOrg, updateOrg, useOrgs, type Org } from "~/lib/orgs";
import { useSession } from "~/lib/session";
import { cn } from "~/lib/utils";
import { clean, refreshWorkspaces } from "~/lib/workspaces";
import { AuthFrame } from "~/pages/auth/frame";
import { ConnectCloudflare } from "~/pages/org/parts";

// First run, and "New organization" later: name the organization, connect its Cloudflare account
// through cf, then create its first workspace, which then opens. The organization is saved once
// Cloudflare is connected; `?step=workspace` resumes at the workspace for one that has none yet.
// Beside the first step, the demo: an organization with no Cloudflare account and one workspace
// that lives only on this Mac, filled with sample data (src/main/demo.ts).

const STEPS = ["Organization", "Cloudflare", "Workspace"];

/** Where setup is: done steps get a check, the current one is highlighted. */
function Stepper({ active }: { active: number }): React.ReactElement {
  return (
    <ol aria-label="Setup progress" className="flex items-center gap-3">
      {STEPS.map((label, i) => (
        <React.Fragment key={label}>
          {i > 0 && <li aria-hidden className={cn("h-px min-w-6 flex-1", i <= active ? "bg-foreground/40" : "bg-border")} />}
          <li aria-current={i === active ? "step" : undefined} className="flex shrink-0 items-center gap-2 text-sm">
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-full border text-xs font-medium tabular-nums",
                i < active && "border-foreground bg-foreground text-background",
                i === active && "border-foreground text-foreground",
                i > active && "text-muted-foreground",
              )}
            >
              {i < active ? <CheckIcon className="size-3.5" /> : i + 1}
            </span>
            <span className={cn(i === active ? "font-medium text-foreground" : "text-muted-foreground")}>{label}</span>
          </li>
        </React.Fragment>
      ))}
    </ol>
  );
}

function StepHeading({ title, children }: { title: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="font-heading text-lg font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

const DEMO_STEPS: { step: DemoProgress["step"]; label: string }[] = [
  { step: "repo", label: "Make the workspace's repo and install its packages" },
  { step: "apps", label: "Add the Journal app" },
  { step: "server", label: "Start the dev server" },
  { step: "data", label: "Fill the database with sample data" },
];

/** The demo, started from setup: everything on this Mac, on the app's own Node and pnpm, with no Cloudflare account. */
function ExploreDemo(): React.ReactElement {
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
    const org = orgs.find((o) => !o.cloudflare && o.name === "Demo") ?? addOrg("Demo", null);
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
        <StepHeading title="Or Explore a Demo">
          A sample workspace for a small pottery studio, with contacts, 90 days of events, segments, workflows and a Journal app. It runs on this Mac, so it needs no
          Cloudflare account, and Muse Code works on it like on any workspace.
        </StepHeading>
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
          <Button variant="outline" disabled={!sg || phase === "running"} onClick={() => void start()}>
            {phase === "failed" ? "Try Again" : "Explore a Demo"}
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function Welcome(): React.ReactElement {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { org: current, setOrg } = useSession();
  const resume = params.get("step") === "workspace" && !!current?.cloudflare;
  const [step, setStep] = React.useState(resume ? 2 : 0);
  const [name, setName] = React.useState("");
  const [created, setCreated] = React.useState<Org | null>(resume ? current : null);
  const org = created;

  return (
    <AuthFrame
      end={
        current &&
        !resume &&
        !created && (
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            Cancel
          </Button>
        )
      }
    >
      <div className="mx-auto flex w-full max-w-[680px] flex-col gap-6 py-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">Set up SuperGrid</h1>
          <p className="text-sm text-muted-foreground">An organization, the Cloudflare account it runs on, and its first workspace. Everything stays on this Mac.</p>
        </div>
        <Stepper active={step} />

        <Card className="p-6">
          {step === 0 && (
            <div className="flex flex-col gap-5">
              <StepHeading title="Name your organization">
                Usually your company or agency. It groups workspaces on one Cloudflare account; an agency with a client on its own Cloudflare account makes one
                organization per client.
              </StepHeading>
              <Field>
                <FieldLabel>Organization Name</FieldLabel>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Studio"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && name.trim()) setStep(1);
                  }}
                />
              </Field>
              <div className="flex justify-end">
                <Button disabled={!name.trim()} onClick={() => setStep(1)}>
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col gap-5">
              <StepHeading title="Connect Cloudflare">Workspaces and apps run in your own Cloudflare account. Pick the account {name.trim()} uses.</StepHeading>
              <ConnectCloudflare
                cta="Use this account"
                onConnected={(link) => {
                  const made = addOrg(name.trim(), link);
                  setCreated(made);
                  setOrg(made.id);
                  setStep(2);
                }}
              />
              <div>
                <Button variant="ghost" onClick={() => setStep(0)}>
                  Back
                </Button>
              </div>
            </div>
          )}

          {step === 2 && org?.cloudflare && (
            <div className="flex flex-col gap-5">
              <StepHeading title="Create the first workspace">
                A workspace is one site or client: a Worker and a D1 database in {org.cloudflare.accountName}. It's created for real.
              </StepHeading>
              <CreateWorkspace
                link={org.cloudflare}
                onOpen={(ws) => {
                  updateOrg(org.id, { lastWorkspace: ws.id });
                  navigate(`/w/${ws.id}`);
                }}
              />
            </div>
          )}
        </Card>
        {step === 0 && <ExploreDemo />}
      </div>
    </AuthFrame>
  );
}
