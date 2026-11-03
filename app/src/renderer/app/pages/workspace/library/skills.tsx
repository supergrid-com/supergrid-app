import { PlusIcon, SaveIcon, SearchIcon, SparklesIcon, Trash2Icon } from "lucide-react";
import * as React from "react";
import { useNavigate } from "react-router";
import type { D1Target } from "../../../../../shared/bridge";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from "~/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "~/components/ui/empty";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { toastManager } from "~/components/ui/toast";
import { Crumbs, WorkspaceFrame } from "~/components/workspace/frame";
import { ConfirmDialog, ListState, relative, useLibraryTarget } from "~/components/workspace/library/shared";
import { freeSkillId, removeSkill, saveSkill, type Skill, useSkills } from "~/lib/skills";
import { useOpenNav } from "~/shell/context";
import { clean } from "~/lib/workspaces";
import { cn } from "~/lib/utils";

// Skills: the guides the agent can find and follow in this workspace. A list on the left, and the
// open one in a plain text editor: a title and the text. Rows live in the workspace's database
// (lib/skills.ts), so every agent session on this workspace reads the same ones.

const same = (a: Pick<Skill, "title" | "content">, b: Pick<Skill, "title" | "content">) => a.title === b.title && a.content === b.content;

function NewSkillDialog({ open, onOpenChange, taken, onCreate }: { open: boolean; onOpenChange: (o: boolean) => void; taken: string[]; onCreate: (skill: { id: string; title: string; content: string }) => void }): React.ReactElement {
  const [title, setTitle] = React.useState("");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    onCreate({ id: freeSkillId(t, taken), title: t, content: "" });
    setTitle("");
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="max-w-md">
        <form onSubmit={submit} className="contents">
          <DialogHeader>
            <DialogTitle>New Skill</DialogTitle>
            <DialogDescription>Name what it teaches. The text comes next, in the editor.</DialogDescription>
          </DialogHeader>
          <DialogPanel>
            <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Skill title, like Writing product pages" aria-label="Skill Title" />
          </DialogPanel>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim()}>
              Create Skill
            </Button>
          </DialogFooter>
        </form>
      </DialogPopup>
    </Dialog>
  );
}

export function SkillsPage({ id }: { id?: string }): React.ReactElement {
  const { accountId, ws, worker } = useLibraryTarget();
  const onOpenNav = useOpenNav();
  const navigate = useNavigate();
  const target = React.useMemo<D1Target | null>(() => (accountId ? { accountId, worker } : null), [accountId, worker]);
  const skills = useSkills(target);
  const list = skills.data ?? [];
  const [q, setQ] = React.useState("");
  const [draft, setDraft] = React.useState<{ id: string; title: string; content: string } | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [confirm, setConfirm] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const base = `/w/${ws.id}/library/skills`;

  // the open skill: the one in the address, else the first; a fresh skill lives only in the draft until saved
  const saved = list.find((s) => s.id === id) ?? (id && draft?.id === id ? undefined : list[0]);
  const fresh = !!draft && !list.some((s) => s.id === draft.id);
  const dirty = !!draft && (fresh || (!!saved && draft.id === saved.id && !same(draft, saved)));
  React.useEffect(() => {
    if (!saved) return;
    setDraft((d) => (d && (d.id === saved.id || fresh) ? d : { id: saved.id, title: saved.title, content: saved.content }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved?.id, saved?.updated_at]);
  const shown = draft && (fresh || draft.id === saved?.id) ? draft : saved ? { id: saved.id, title: saved.title, content: saved.content } : null;
  const filtered = q.trim() ? list.filter((s) => s.title.toLowerCase().includes(q.trim().toLowerCase()) || s.content.toLowerCase().includes(q.trim().toLowerCase())) : list;

  const open = (next: string) => {
    if (dirty && !window.confirm("Leave the unsaved changes behind?")) return;
    setDraft(null);
    navigate(`${base}/${next}`);
  };
  const save = async () => {
    if (!draft || !target) return;
    setSaving(true);
    try {
      const row = await saveSkill(target, draft);
      toastManager.add({ title: "Skill Saved", type: "success", timeout: 1500 });
      if (fresh) navigate(`${base}/${row.id}`);
    } catch (e) {
      toastManager.add({ title: "Skill Did Not Save", description: clean(e), type: "error" });
    } finally {
      setSaving(false);
    }
  };
  const remove = async () => {
    if (!shown || !target) return;
    try {
      if (!fresh) await removeSkill(target, shown.id);
      setDraft(null);
      setConfirm(false);
      navigate(base);
    } catch (e) {
      toastManager.add({ title: "Skill Was Not Deleted", description: clean(e), type: "error" });
    }
  };

  return (
    <WorkspaceFrame
      icon={<SparklesIcon />}
      title={shown ? <Crumbs items={["Skills", shown.title || "Untitled"]} /> : "Skills"}
      flush
      onOpenNav={onOpenNav}
      actions={
        <Button size="xs" disabled={!dirty} loading={saving} onClick={() => void save()}>
          <SaveIcon />
          Save
        </Button>
      }
    >
      <ListState data={skills.data} error={skills.error} loading={skills.loading} onRetry={() => void skills.refresh()} isEmpty={() => false} empty={null}>
        {() => (
          <div className="flex min-h-0 flex-1">
            <aside className="flex w-72 shrink-0 flex-col border-e">
              <div className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
                <div className="relative flex-1">
                  <SearchIcon className="pointer-events-none absolute start-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input size="sm" type="search" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} className="ps-7" />
                </div>
                <Button size="icon-xs" variant="ghost" aria-label="New Skill" title="New Skill" onClick={() => setCreating(true)}>
                  <PlusIcon />
                </Button>
              </div>
              <ul className="min-h-0 flex-1 overflow-y-auto p-2">
                {fresh && draft && (
                  <li className="flex flex-col gap-0.5 rounded-lg bg-accent px-3 py-2">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <span className="min-w-0 flex-1 truncate">{draft.title || "Untitled"}</span>
                      <Badge variant="info" size="sm">
                        new
                      </Badge>
                    </span>
                    <span className="text-xs text-muted-foreground">Not saved yet</span>
                  </li>
                )}
                {filtered.map((s) => (
                  <li key={s.id}>
                    <button type="button" onClick={() => open(s.id)} className={cn("flex w-full cursor-pointer flex-col gap-0.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-accent", shown?.id === s.id && !fresh && "bg-accent")}>
                      <span className="truncate text-sm font-medium">{s.title}</span>
                      <span className="truncate text-xs text-muted-foreground">{s.content.trim() ? s.content.trim().split("\n")[0].slice(0, 80) : "Empty"} · {relative(s.updated_at)}</span>
                    </button>
                  </li>
                ))}
                {!filtered.length && !fresh && <li className="px-3 py-6 text-center text-sm text-muted-foreground">{q ? "Nothing matches." : "No skills yet."}</li>}
              </ul>
            </aside>
            {shown ? (
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex shrink-0 items-center gap-3 border-b px-6 py-4">
                  <Input size="lg" value={shown.title} onChange={(e) => setDraft((d) => (d ? { ...d, title: e.target.value } : { ...shown, title: e.target.value }))} placeholder="Title" aria-label="Skill Title" className="max-w-xl font-medium" />
                  <span className="flex-1" />
                  <span className="font-mono text-xs text-muted-foreground">{shown.id}</span>
                  <Button size="sm" variant="ghost" className="gap-2 text-destructive-foreground [&_svg]:mx-0" onClick={() => setConfirm(true)}>
                    <Trash2Icon />
                    Delete
                  </Button>
                </div>
                <Textarea
                  value={shown.content}
                  onChange={(e) => setDraft((d) => (d ? { ...d, content: e.target.value } : { ...shown, content: e.target.value }))}
                  placeholder={"What the agent should know and do. Plain text or Markdown, for example:\n\n# Writing product pages\n\nEvery product page has a hero, three benefits and a FAQ. Use the store's voice: short, warm, no exclamation marks."}
                  spellCheck={false}
                  unstyled
                  className="min-h-0 flex-1 resize-none rounded-none border-0 bg-transparent px-6 py-5 font-mono text-sm leading-relaxed outline-none focus-visible:ring-0"
                />
                <div className="flex h-10 shrink-0 items-center gap-3 border-t px-6 text-xs text-muted-foreground">
                  <span>{shown.content.length.toLocaleString()} characters</span>
                  {saved && !fresh && <span>· Updated {relative(saved.updated_at)}</span>}
                  <span className="flex-1" />
                  {dirty && <span>Unsaved changes</span>}
                </div>
              </div>
            ) : (
              <Empty className="flex-1 py-16">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <SparklesIcon />
                  </EmptyMedia>
                  <EmptyTitle>No Skills Yet</EmptyTitle>
                  <EmptyDescription>A skill is a short guide the agent reads before it works here: how pages are written, what a booking needs, what never to change.</EmptyDescription>
                </EmptyHeader>
                <Button size="sm" onClick={() => setCreating(true)}>
                  <PlusIcon />
                  New Skill
                </Button>
              </Empty>
            )}
          </div>
        )}
      </ListState>
      <NewSkillDialog
        open={creating}
        onOpenChange={setCreating}
        taken={list.map((s) => s.id)}
        onCreate={(s) => {
          setDraft(s);
          navigate(`${base}/${s.id}`);
        }}
      />
      <ConfirmDialog open={confirm} onOpenChange={setConfirm} title={`Delete ${shown?.title || "this skill"}?`} description={fresh ? "It was never saved; nothing else changes." : "The agent will no longer find it."} onConfirm={() => void remove()} />
    </WorkspaceFrame>
  );
}
