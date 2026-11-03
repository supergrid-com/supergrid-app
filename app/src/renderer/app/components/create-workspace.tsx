import { CircleAlertIcon, CircleCheckIcon, CircleMinusIcon, InfoIcon, RotateCwIcon, TriangleAlertIcon } from "lucide-react";
import * as React from "react";
import type { WorkspaceCreated, WorkspaceProgress } from "../../../shared/bridge";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Progress, ProgressIndicator, ProgressTrack } from "~/components/ui/progress";
import { Spinner } from "~/components/ui/spinner";
import { sg } from "~/lib/bridge";
import type { CloudflareLink } from "~/lib/orgs";
import { cn } from "~/lib/utils";
import { clean, refreshWorkspaces } from "~/lib/workspaces";

// Creating a workspace, for real: its repo on this Mac from the workspace template, that repo's
// build, then the account side with provisionWorkspace (src/main/workspaces.ts), on cf's login.
// Used by onboarding and the organization modal. Every step looks up by name before it creates,
// so a failed run can simply be run again.

type Step = WorkspaceProgress["step"];
const STEPS: { step: Exclude<Step, "done">; label: string }[] = [
  { step: "repo", label: "Make the workspace repo on this Mac and install its dependencies" },
  { step: "build", label: "Build the workspace Worker from it" },
  { step: "database", label: "Create the D1 database" },
  { step: "queues", label: "Create the event queues" },
  { step: "files", label: "Create the R2 bucket for files" },
  { step: "media", label: "Set up media access" },
  { step: "worker", label: "Deploy the workspace Worker" },
  { step: "wiring", label: "Connect queues, the hooks workflow and the nightly rollup" },
  { step: "url", label: "Turn on its workers.dev address" },
  { step: "health", label: "Wait for it to answer" },
];

const code = "rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.8125rem]";

function Details({ rows }: { rows: [label: string, value: React.ReactNode][] }): React.ReactElement {
  return (
    <dl className="grid grid-cols-[120px_minmax(0,1fr)] items-baseline gap-x-4 gap-y-2 text-sm">
      {rows.map(([label, value]) => (
        <React.Fragment key={label}>
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="min-w-0 break-words">{value}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}

function Steps({ at, failed }: { at: Step | null; failed: boolean }): React.ReactElement {
  const index = at === "done" ? STEPS.length : at ? STEPS.findIndex((s) => s.step === at) : -1;
  return (
    <div className="flex flex-col gap-4">
      <Progress aria-label="Progress" value={Math.max(index, 0)} max={STEPS.length}>
        <ProgressTrack>
          <ProgressIndicator className={failed ? "bg-destructive" : at === "done" ? "bg-success" : undefined} />
        </ProgressTrack>
      </Progress>
      <ol className="flex flex-col gap-2.5">
        {STEPS.map((s, i) => (
          <li key={s.step} className="flex items-center gap-2.5 text-sm">
            {i < index ? (
              <CircleCheckIcon className="size-4.5 shrink-0 text-success" aria-label="Done" />
            ) : i === index ? (
              failed ? (
                <CircleAlertIcon className="size-4.5 shrink-0 text-destructive" aria-label="Failed" />
              ) : (
                <Spinner className="size-4.5 shrink-0 text-muted-foreground" aria-label="Working" />
              )
            ) : (
              <CircleMinusIcon className="size-4.5 shrink-0 text-muted-foreground/50" />
            )}
            <span className={cn(i > index && "text-muted-foreground", i === index && !failed && "font-medium")}>{s.label}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function CreateWorkspace({
  link,
  onOpen,
  onCancel,
  doneLabel = "Open workspace",
}: {
  link: CloudflareLink;
  /** Called with the new workspace when the user moves on from the done screen. */
  onOpen: (created: WorkspaceCreated) => void;
  onCancel?: () => void;
  doneLabel?: string;
}): React.ReactElement {
  const [name, setName] = React.useState("");
  const [id, setId] = React.useState<string>();
  const [prepError, setPrepError] = React.useState<string>();
  const [phase, setPhase] = React.useState<"form" | "running" | "failed" | "done">("form");
  const [at, setAt] = React.useState<Step | null>(null);
  const [error, setError] = React.useState<string>();
  const [created, setCreated] = React.useState<WorkspaceCreated>();

  const newId = React.useCallback(async () => {
    if (!sg) return;
    try {
      setId(await sg.workspaces.freshId(link.accountId, link.prefix));
    } catch (e) {
      setPrepError(clean(e));
    }
  }, [link.accountId, link.prefix]);

  React.useEffect(() => {
    if (!sg) return;
    void newId();
  }, [newId]);

  React.useEffect(() => (sg ? sg.workspaces.onProgress((p) => p.id === id && setAt(p.step)) : undefined), [id]);

  if (!sg)
    return (
      <Alert variant="info">
        <InfoIcon />
        <AlertTitle>Creating a workspace needs the SuperGrid app</AlertTitle>
        <AlertDescription>It deploys to your Cloudflare account through the cf CLI on your Mac, which a browser can't do.</AlertDescription>
      </Alert>
    );

  const worker = id ? `${link.prefix}-ws-${id}` : "…";
  const create = async () => {
    if (!sg || !id || !name.trim()) return;
    setPhase("running");
    setError(undefined);
    setAt("repo");
    try {
      const made = await sg.workspaces.create({ accountId: link.accountId, prefix: link.prefix, id, name: name.trim() });
      setCreated(made);
      setPhase("done");
      void refreshWorkspaces(link);
    } catch (e) {
      setError(clean(e));
      setPhase("failed");
    }
  };

  if (phase !== "form") {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h2 className="font-heading text-lg font-semibold">{phase === "done" ? `${created?.name} is live` : `Creating ${name.trim()}`}</h2>
          <p className="text-sm text-muted-foreground">
            In {link.accountName}, as <code className={code}>{worker}</code>.
          </p>
        </div>
        <Steps at={at} failed={phase === "failed"} />
        {phase === "failed" && (
          <Alert variant="error">
            <TriangleAlertIcon />
            <AlertTitle>That Step Failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
            <AlertAction>
              <Button size="sm" variant="outline" onClick={() => void create()}>
                <RotateCwIcon />
                Try again
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setPhase("form")}>
                Back
              </Button>
            </AlertAction>
          </Alert>
        )}
        {phase === "done" && created && (
          <div className="flex flex-col gap-4">
            <Details
              rows={[
                [
                  "Address",
                  <a key="url" href={created.url} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-foreground/80">
                    {created.url}
                  </a>,
                ],
                ["Worker", <code key="worker" className={code}>{created.worker}</code>],
                ["Version", created.version],
                ["Repo", <code key="dir" className={cn(code, "break-all")}>{created.dir}</code>],
              ]}
            />
            {(!created.queues || !created.files || !created.media) && (
              <p className="text-xs text-muted-foreground">
                {[
                  !created.queues && "Queues need Workers Paid, so events are written directly.",
                  !created.files && "R2 isn't enabled on the account, so there's no file storage yet.",
                  !created.media && "No media token yet: Images and Stream wait until one is set.",
                ]
                  .filter(Boolean)
                  .join(" ")}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button onClick={() => onOpen(created)}>{doneLabel}</Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {prepError && (
        <Alert variant="error">
          <TriangleAlertIcon />
          <AlertTitle>Can't create a workspace right now</AlertTitle>
          <AlertDescription>{prepError}</AlertDescription>
        </Alert>
      )}
      <Field>
        <FieldLabel>Name</FieldLabel>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Bluebird Bakery"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") void create();
          }}
        />
        <FieldDescription>Usually the site or client it's for.</FieldDescription>
      </Field>
      <div className="flex flex-col gap-3 rounded-2xl border bg-muted/40 p-4">
        <span className="text-sm font-medium">Created in {link.accountName}</span>
        <Details
          rows={[
            [
              "Workspace id",
              <span key="id" className="inline-flex items-center gap-2">
                <code className={code}>{id ?? "…"}</code>
                <Button size="icon-xs" variant="ghost" aria-label="New id" className="text-muted-foreground" onClick={() => void newId()}>
                  <RotateCwIcon />
                </Button>
              </span>,
            ],
            ["Worker and D1", <code key="worker" className={code}>{worker}</code>],
            ["Queues, files", <code key="queues" className={code}>{`${worker}-events, ${worker}-files`}</code>],
            ["Repo", "a git repo on this Mac, one Worker, apps as folders"],
          ]}
        />
        <p className="text-xs text-muted-foreground">Queues need Workers Paid and R2 must be enabled on the account; without them the workspace still works and skips those parts.</p>
      </div>
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button disabled={!name.trim() || !id} onClick={() => void create()}>
          Create workspace
        </Button>
      </div>
    </div>
  );
}
