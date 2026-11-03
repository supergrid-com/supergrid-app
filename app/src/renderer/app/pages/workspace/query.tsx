import { ChevronDownIcon, HistoryIcon, Loader2Icon, PlayIcon, SquareTerminalIcon, TrashIcon, XIcon } from "lucide-react";
import * as React from "react";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "~/components/ui/empty";
import type { D1RawResult } from "../../../../shared/bridge";
import { Button } from "~/components/ui/button";
import { Kbd } from "~/components/ui/kbd";
import { Menu, MenuGroup, MenuGroupLabel, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "~/components/ui/menu";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Crumbs, WorkspaceFrame } from "~/components/workspace/frame";
import { sg } from "~/lib/bridge";
import { refreshSchema, useD1Target, useSchema } from "~/lib/db";
import { cn } from "~/lib/utils";
import { clean } from "~/lib/workspaces";
import { useOpenNav, useShell } from "~/shell/context";

// SQL against the workspace's D1, the way the dashboard's console runs it: an editor up top, the
// rows under it with how long D1 took and what it read and wrote. A statement that changes the
// schema refreshes the table list. The last twenty queries are kept per workspace.

const SNIPPETS: { label: string; sql: string }[] = [
  { label: "Tables", sql: "SELECT name, type FROM sqlite_master WHERE type IN ('table', 'view') ORDER BY name;" },
  { label: "Newest contacts", sql: "SELECT id, email, name, source, created_at FROM contacts ORDER BY created_at DESC LIMIT 50;" },
  { label: "Events by name, last 7 days", sql: "SELECT name, count(*) AS n FROM events WHERE ts > datetime('now', '-7 days') GROUP BY name ORDER BY n DESC;" },
  { label: "Settings", sql: "SELECT key, value, updated_at FROM settings ORDER BY key;" },
  { label: "Migrations applied", sql: "SELECT app_id, name, applied_at FROM migrations_ledger ORDER BY applied_at DESC;" },
];

type Run = { sql: string; at: number; result?: D1RawResult; error?: string; ms: number };

function useHistory(key: string): [string[], (sql: string) => void, () => void] {
  const [list, setList] = React.useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(key) ?? "[]") as string[];
    } catch {
      return [];
    }
  });
  const push = React.useCallback(
    (sql: string) =>
      setList((prev) => {
        const next = [sql, ...prev.filter((s) => s !== sql)].slice(0, 20);
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch {}
        return next;
      }),
    [key],
  );
  const clear = React.useCallback(() => {
    setList([]);
    try {
      localStorage.removeItem(key);
    } catch {}
  }, [key]);
  return [list, push, clear];
}

export function Query(): React.ReactElement {
  const { ws } = useShell();
  const onOpenNav = useOpenNav();
  const target = useD1Target();
  const { tables } = useSchema(target);
  const [sql, setSql] = React.useState(() => localStorage.getItem(`sg.query.draft.${ws.id}`) ?? "");
  const [run, setRun] = React.useState<Run | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [history, push, clearHistory] = useHistory(`sg.query.history.${ws.id}`);
  const editor = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    try {
      localStorage.setItem(`sg.query.draft.${ws.id}`, sql);
    } catch {}
  }, [sql, ws.id]);

  const execute = React.useCallback(async () => {
    const text = sql.trim();
    if (!text || !target || !sg) return;
    setBusy(true);
    const started = performance.now();
    try {
      const result = await sg.d1.raw(target, text);
      setRun({ sql: text, at: Date.now(), result, ms: performance.now() - started });
      push(text);
      // anything that may have changed the shape or the counts
      if (/\b(CREATE|DROP|ALTER|INSERT|UPDATE|DELETE|REPLACE)\b/i.test(text)) void refreshSchema(target);
    } catch (e) {
      setRun({ sql: text, at: Date.now(), error: clean(e), ms: performance.now() - started });
    } finally {
      setBusy(false);
    }
  }, [sql, target, push]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void execute();
    } else if (e.key === "Tab") {
      e.preventDefault();
      const el = e.currentTarget;
      const { selectionStart: s, selectionEnd: en } = el;
      setSql(sql.slice(0, s) + "  " + sql.slice(en));
      requestAnimationFrame(() => el.setSelectionRange(s + 2, s + 2));
    }
  };

  const title = <Crumbs items={["Database", "Query"]} />;
  if (!target) {
    return (
      <WorkspaceFrame icon={<SquareTerminalIcon />} title={title} onOpenNav={onOpenNav}>
        <Empty className="py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SquareTerminalIcon />
            </EmptyMedia>
            <EmptyTitle>No Cloud Database</EmptyTitle>
            <EmptyDescription>The local dev workspace keeps its database on disk. Cloud workspaces take queries here.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </WorkspaceFrame>
    );
  }

  return (
    <WorkspaceFrame icon={<SquareTerminalIcon />} title={title} flush onOpenNav={onOpenNav}>
      {/* the editor */}
      <div className="flex shrink-0 flex-col border-b">
        <div className="flex h-12 items-center gap-1.5 px-3">
          <Menu>
            <MenuTrigger render={<Button size="xs" variant="ghost" className="text-foreground/80 hover:text-foreground" />}>
              Snippets
              <ChevronDownIcon className="opacity-60" />
            </MenuTrigger>
            <MenuPopup align="start" className="min-w-64">
              <MenuGroup>
                <MenuGroupLabel>Start From</MenuGroupLabel>
                {SNIPPETS.map((s) => (
                  <MenuItem key={s.label} onClick={() => setSql(s.sql)}>
                    {s.label}
                  </MenuItem>
                ))}
              </MenuGroup>
              {tables && tables.length > 0 && (
                <>
                  <MenuSeparator />
                  <MenuGroup>
                    <MenuGroupLabel>Select From</MenuGroupLabel>
                    {tables.map((t) => (
                      <MenuItem key={t.name} onClick={() => setSql(`SELECT * FROM "${t.name}" LIMIT 100;`)}>
                        <span className="font-mono text-xs">{t.name}</span>
                      </MenuItem>
                    ))}
                  </MenuGroup>
                </>
              )}
            </MenuPopup>
          </Menu>
          <Menu>
            <MenuTrigger render={<Button size="xs" variant="ghost" className="text-foreground/80 hover:text-foreground" disabled={!history.length} />}>
              <HistoryIcon />
              History
            </MenuTrigger>
            <MenuPopup align="start" className="min-w-72 max-w-md">
              <MenuGroup>
                <MenuGroupLabel>Last Run</MenuGroupLabel>
                {history.map((h, i) => (
                  <MenuItem key={i} onClick={() => setSql(h)}>
                    <span className="truncate font-mono text-xs">{h.replace(/\s+/g, " ")}</span>
                  </MenuItem>
                ))}
              </MenuGroup>
              <MenuSeparator />
              <MenuItem onClick={clearHistory}>
                <TrashIcon />
                Clear history
              </MenuItem>
            </MenuPopup>
          </Menu>
          <div className="flex-1" />
          {sql && (
            <Button size="xs" variant="ghost" onClick={() => setSql("")} className="text-muted-foreground">
              <XIcon />
              Clear
            </Button>
          )}
          <Button size="xs" onClick={() => void execute()} disabled={busy || !sql.trim()}>
            {busy ? <Loader2Icon className="animate-spin" /> : <PlayIcon />}
            Run
            <Kbd className="ms-1 bg-white/15 text-primary-foreground">⌘↵</Kbd>
          </Button>
        </div>
        <textarea
          ref={editor}
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          onKeyDown={onKeyDown}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          placeholder="SELECT * FROM contacts LIMIT 100;"
          rows={Math.min(14, Math.max(4, sql.split("\n").length + 1))}
          className="w-full resize-none bg-muted/30 px-4 py-3 font-mono text-[13px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/50"
        />
      </div>

      {/* the answer */}
      {run ? <Result run={run} /> : (
        <div className="flex flex-1 items-center justify-center px-6 text-center text-[13px] text-muted-foreground">
          <p className="max-w-md">
            Runs against {ws.worker}'s D1 as it is, writes included. Several statements run in order; the last one's rows show.
          </p>
        </div>
      )}
    </WorkspaceFrame>
  );
}

function Result({ run }: { run: Run }): React.ReactElement {
  const r = run.result;
  const meta = r?.meta;
  const summary = r
    ? [
        `${r.rows.length.toLocaleString()} ${r.rows.length === 1 ? "row" : "rows"}`,
        meta && meta.changes ? `${meta.changes.toLocaleString()} changed` : null,
        meta ? `${meta.rows_read.toLocaleString()} read, ${meta.rows_written.toLocaleString()} written` : null,
        meta ? `${meta.duration.toFixed(1)} ms in D1, ${Math.round(run.ms)} ms in all` : null,
        r.statements > 1 ? `${r.statements} statements` : null,
      ].filter(Boolean)
    : [];
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className={cn("flex h-9 shrink-0 items-center gap-3 border-b px-3 text-xs", run.error ? "bg-destructive/6 text-destructive-foreground" : "text-muted-foreground")}>
        {run.error ? <span className="min-w-0 flex-1 truncate font-mono">{run.error}</span> : summary.map((s, i) => <span key={i} className="tabular-nums">{s}</span>)}
      </div>
      {r && (
        <ScrollArea className="min-h-0 flex-1" clampContentMinWidth={false}>
          {r.columns.length ? (
            <table className="min-w-full border-collapse text-[13px]">
              <thead className="sticky top-0 z-10 bg-background">
                <tr>
                  <th className="w-10 border-b border-e px-2 py-1.5 text-end text-[11px] font-normal text-muted-foreground/60">#</th>
                  {r.columns.map((c, i) => (
                    <th key={i} className="border-b border-e px-2.5 py-1.5 text-start font-medium whitespace-nowrap text-foreground/80">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {r.rows.map((row, i) => (
                  <tr key={i} className="hover:bg-(--grid-hover,color-mix(in_oklab,var(--foreground)_3%,var(--background)))">
                    <td className="border-b border-e px-2 py-1.5 text-end text-[11px] tabular-nums text-muted-foreground/60">{i + 1}</td>
                    {row.map((v, j) => (
                      <td key={j} className="max-w-96 truncate border-b border-e px-2.5 py-1.5 font-mono text-xs whitespace-nowrap" title={v == null ? undefined : String(v)}>
                        {v === null ? <span className="text-muted-foreground/50">NULL</span> : typeof v === "object" ? JSON.stringify(v) : String(v)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex h-28 items-center justify-center text-[13px] text-muted-foreground">{meta?.changes ? "Done." : "No rows came back."}</div>
          )}
        </ScrollArea>
      )}
    </div>
  );
}
