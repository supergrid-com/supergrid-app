// The documentation, one list for both readers: the Docs modal in the renderer (shell/docs-modal.tsx)
// and the coding agent, through docs_list and docs_read on our MCP server (main/mcp.ts). The pages
// stay beside the code they describe; this file only gathers them, as raw markdown bundled at build.
import buildAnApp from "../../../core/docs/build-an-app.md?raw";
import overview from "../../../core/docs/overview.md?raw";
import contacts from "../../../core/packages/app-kit/docs/contacts.md?raw";
import events from "../../../core/packages/app-kit/docs/events.md?raw";
import hooks from "../../../core/packages/app-kit/docs/hooks.md?raw";
import workflows from "../../../core/packages/app-kit/docs/workflows.md?raw";
import theme from "../../../core/packages/theme/SKILL.md?raw";
import ui from "../../../core/packages/ui/SKILL.md?raw";
import assets from "../../../core/workspace/ASSETS.md?raw";
import sitemap from "../../../core/workspace/SITEMAP.md?raw";

export type Doc = {
  /** Stable slug: the modal's ?docs= value and docs_read's id. */
  id: string;
  title: string;
  summary: string;
  group: string;
  /** Where the page lives in the repo, so links between pages resolve. */
  source: string;
  body: string;
};

type Entry = { id: string; summary: string; source: string; raw: string; title?: string };

const groups: { label: string; docs: Entry[] }[] = [
  {
    label: "Start here",
    docs: [
      { id: "overview", source: "core/docs/overview.md", raw: overview, summary: "Organizations, workspaces and apps, and what each area of the desktop app is for." },
      { id: "build-an-app", source: "core/docs/build-an-app.md", raw: buildAnApp, summary: "The manifest, routes, app context, migrations and hooks: everything an app is made of." },
    ],
  },
  {
    label: "Workspace data",
    docs: [
      { id: "contacts", source: "core/packages/app-kit/docs/contacts.md", raw: contacts, summary: "The shared people table, custom fields, tags and segments." },
      { id: "events", source: "core/packages/app-kit/docs/events.md", raw: events, summary: "One table for everything that happens: shape, reserved names, emitting and querying." },
      { id: "hooks", source: "core/packages/app-kit/docs/hooks.md", raw: hooks, summary: "Running code when an event is recorded, with retries." },
      { id: "workflows", source: "core/packages/app-kit/docs/workflows.md", raw: workflows, summary: "Steps people set up without code: wait, branch, tag, send." },
      { id: "assets", source: "core/workspace/ASSETS.md", raw: assets, summary: "Images, video and files over Cloudflare Images, Stream and R2." },
      { id: "sitemap", source: "core/workspace/SITEMAP.md", raw: sitemap, summary: "Where each app's pages live on the domain, what / serves, and redirects." },
    ],
  },
  {
    label: "Design",
    docs: [
      { id: "ui", title: "UI kit", source: "core/packages/ui/SKILL.md", raw: ui, summary: "Building app screens with the kit components and theme tokens." },
      { id: "themes", title: "Themes", source: "core/packages/theme/SKILL.md", raw: theme, summary: "The theme document and the agent's tools for changing it." },
    ],
  },
];

// Pages are plain markdown; a SKILL.md also carries frontmatter, which neither reader needs.
function parse(e: Entry, group: string): Doc {
  const body = e.raw.replace(/^---\n[\s\S]*?\n---\n+/, "").trim();
  const heading = /^#\s+(.+)$/m.exec(body)?.[1]?.trim();
  return { id: e.id, title: e.title ?? heading ?? e.id, summary: e.summary, group, source: e.source, body };
}

export const docs: Doc[] = groups.flatMap((g) => g.docs.map((d) => parse(d, g.label)));
export const docGroups: { label: string; docs: Doc[] }[] = groups.map((g) => ({ label: g.label, docs: docs.filter((d) => d.group === g.label) }));
export const findDoc = (id: string): Doc | undefined => docs.find((d) => d.id === id);

/** The page a relative link in `from` points at (`../workspace/ASSETS.md`, `hooks.md#retries`), if it is one of ours. */
export function resolveDocLink(from: Doc, href: string): Doc | undefined {
  if (/^[a-z]+:/i.test(href) || href.startsWith("#")) return undefined;
  const path = href.split("#")[0];
  const parts = from.source.split("/").slice(0, -1);
  for (const seg of path.split("/")) {
    if (seg === "..") parts.pop();
    else if (seg && seg !== ".") parts.push(seg);
  }
  const target = parts.join("/");
  return docs.find((d) => d.source === target || d.source.endsWith(`/${path}`));
}
