import { code } from "@streamdown/code";
import { CheckIcon, CopyIcon, SearchIcon } from "lucide-react";
import * as React from "react";
import { Streamdown } from "streamdown";
import { Button } from "~/components/ui/button";
import { Dialog, DialogPopup, DialogTitle } from "~/components/ui/dialog";
import { cn } from "~/lib/utils";
import { useDocsModal } from "~/shell/context";
import { docGroups, findDoc, resolveDocLink, type Doc } from "../../../shared/docs";

// The documentation, as a modal filling the window: the pages down the side, grouped, with a
// filter over their text, and the page on the right. It lives in the URL (?docs=<id>), so back
// closes it. The agent reads the same pages through docs_list and docs_read (shared/docs.ts).

const plugins = { code };
const linkSafety = { enabled: false };

function matches(d: Doc, q: string): boolean {
  return `${d.title}\n${d.summary}\n${d.body}`.toLowerCase().includes(q);
}

export function DocsModal(): React.ReactElement {
  const { page, open, close } = useDocsModal();
  const doc = page ? (findDoc(page) ?? findDoc("overview")) : undefined;
  const [query, setQuery] = React.useState("");
  const q = query.trim().toLowerCase();
  const groups = q ? docGroups.map((g) => ({ ...g, docs: g.docs.filter((d) => matches(d, q)) })).filter((g) => g.docs.length) : docGroups;
  return (
    <Dialog open={!!page} onOpenChange={(o) => !o && close()}>
      {/* the whole window less a 40px margin, so long pages have room */}
      <DialogPopup bottomStickOnMobile={false} className="fixed inset-10 h-auto max-h-none w-auto max-w-none overflow-hidden p-0">
        <DialogTitle className="sr-only">Documentation</DialogTitle>
        <div className="flex min-h-0 flex-1">
          <aside className="flex w-60 shrink-0 flex-col border-e bg-muted/40">
            <div className="px-3 pt-4 pb-2">
              <div className="flex h-8 items-center gap-2 rounded-lg border bg-background px-2.5 focus-within:ring-2 focus-within:ring-ring">
                <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search docs" aria-label="Search Docs" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/72" />
              </div>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-2 pt-2 pb-4">
              {groups.map((g) => (
                <nav key={g.label} aria-label={g.label}>
                  <div className="px-2.5 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{g.label}</div>
                  <ul className="flex flex-col gap-0.5">
                    {g.docs.map((d) => (
                      <li key={d.id}>
                        <button
                          type="button"
                          onClick={() => open(d.id)}
                          aria-current={d.id === doc?.id ? "page" : undefined}
                          className={cn(
                            "flex h-8 w-full cursor-pointer items-center rounded-lg px-2.5 text-left text-sm outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
                            d.id === doc?.id && "bg-accent font-medium",
                          )}
                        >
                          <span className="truncate">{d.title}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </nav>
              ))}
              {!groups.length && <p className="px-2.5 text-sm text-muted-foreground">Nothing matches.</p>}
            </div>
          </aside>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">{doc && <Page key={doc.id} doc={doc} onOpen={open} />}</div>
        </div>
      </DialogPopup>
    </Dialog>
  );
}

function Page({ doc, onOpen }: { doc: Doc; onOpen: (id: string) => void }): React.ReactElement {
  // links to other pages open them here; anything on the web opens in the browser
  const components = React.useMemo(
    () => ({
      a: ({ href = "", children }: { href?: string; children?: React.ReactNode }) => {
        const target = resolveDocLink(doc, href);
        if (target)
          return (
            <button type="button" onClick={() => onOpen(target.id)} className="cursor-pointer font-medium text-primary underline underline-offset-4">
              {children}
            </button>
          );
        if (/^https?:/.test(href))
          return (
            <a href={href} target="_blank" rel="noreferrer" className="font-medium text-primary underline underline-offset-4">
              {children}
            </a>
          );
        return <span className="font-medium">{children}</span>;
      },
    }),
    [doc, onOpen],
  );
  return (
    <>
      <header className="flex h-12 shrink-0 items-center gap-3 border-b px-6 pe-12">
        <span className="text-xs text-muted-foreground">{doc.group}</span>
        <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground/70">{doc.source}</span>
        <CopyPage body={doc.body} />
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <article className="mx-auto max-w-4xl px-10 pt-8 pb-16">
          <p className="mb-6 text-sm text-muted-foreground">{doc.summary}</p>
          <Streamdown plugins={plugins} linkSafety={linkSafety} components={components} className="min-w-0 max-w-full">
            {doc.body}
          </Streamdown>
        </article>
      </div>
    </>
  );
}

// the page's markdown, to paste into a thread or a file
function CopyPage({ body }: { body: string }): React.ReactElement {
  const [copied, setCopied] = React.useState(false);
  const copy = () => {
    void navigator.clipboard.writeText(body).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <Button variant="ghost" size="xs" onClick={copy} className="text-muted-foreground">
      {copied ? <CheckIcon /> : <CopyIcon />}
      {copied ? "Copied" : "Copy markdown"}
    </Button>
  );
}
