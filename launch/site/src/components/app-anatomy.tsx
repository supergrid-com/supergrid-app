"use client";

import { useState } from "react";

// An app taken apart: the Blog app's folder in a dark panel in the middle, its six parts on cards
// either side. One part is lit at a time, its file highlighted and a few lines of it shown under
// the tree. Hovering a card or its file lights that part.

type Part = { id: string; title: string; body: string; file: string; code: string[] };

const PARTS: Part[] = [
  {
    id: "data",
    title: "Data Model",
    body: "Its own tables, extending the core's",
    file: "schema.sql",
    code: ["create table blog_posts (", "  id text primary key,", "  author_id text references contacts", ");"],
  },
  {
    id: "routes",
    title: "Routes & Backend",
    body: "Public routes and server code in the Worker",
    file: "worker/index.ts",
    code: ["export async function publish(id, { db, events }) {", "  await db.blog_posts.update(id, { status: 'published' })", "  await events.emit('post.published', { id })", "}"],
  },
  {
    id: "pages",
    title: "Pages & Components",
    body: "Public pages that render on your site",
    file: "pages/[slug].tsx",
    code: ["export default async function Post({ params, db }) {", "  const post = await db.blog_posts.find({ slug: params.slug })", "  return <Article post={post} />", "}"],
  },
  {
    id: "admin",
    title: "Admin Tools",
    body: "Screens for your team inside the workspace",
    file: "admin/posts.tsx",
    code: ["export default function Posts() {", "  const posts = usePosts()", "  return <Table rows={posts} action='New Post' />", "}"],
  },
  {
    id: "hooks",
    title: "Hooks",
    body: "Runs on the workspace's events and workflows",
    file: "hooks.ts",
    code: ["on('form.submitted', async ({ contact }) => {", "  await tag(contact, 'subscriber')", "})"],
  },
  {
    id: "mcp",
    title: "MCP Tools",
    body: "Everything it does, exposed to your agent",
    file: "mcp/tools.ts",
    code: ["tool('create_post', { title: 'string' }, (input) =>", "  db.blog_posts.insert(input)", ")"],
  },
];

const TREE = ["manifest.json", ...PARTS.map((p) => p.file)];

export function AppAnatomy() {
  const [active, setActive] = useState(0);
  const pick = (i: number) => setActive(i);
  const card = (p: Part, i: number) => {
    const on = i === active;
    return (
      <button
        key={p.id}
        type="button"
        onMouseEnter={() => pick(i)}
        onFocus={() => pick(i)}
        onClick={() => setActive(i)}
        className={`flex h-full w-full cursor-default flex-col justify-center rounded-3xl border bg-gradient-to-b from-softer to-white p-6 text-left transition-[border-color,box-shadow] duration-300 ${
          on ? "border-[#9b3dff]/35 shadow-lg shadow-[#9b3dff]/10" : "border-line shadow-[0_1px_2px_rgb(0_0_0/3%),0_30px_60px_-30px_rgb(0_0_0/12%)]"
        }`}
      >
        <span className="block text-[17px] font-medium text-ink">{p.title}</span>
        <span className="mt-0.5 block text-[15px] leading-snug text-muted">{p.body}</span>
        <span className={`mt-2 inline-block font-mono text-[12.5px] transition-colors duration-300 ${on ? "text-[#7c3aed]" : "text-ink-2"}`}>{p.file}</span>
      </button>
    );
  };

  const now = PARTS[active]!;

  return (
    <div className="relative grid items-center gap-6 lg:grid-cols-[1fr_minmax(0,420px)_1fr] lg:items-stretch lg:gap-x-12">
      <div className="order-2 grid gap-4 sm:grid-cols-2 lg:order-1 lg:grid-cols-1 lg:grid-rows-3">{PARTS.slice(0, 3).map((p, i) => card(p, i))}</div>

      {/* the app's folder */}
      <div className="relative isolate order-1 overflow-hidden rounded-3xl bg-[#1B1D24] text-white shadow-[0_30px_70px_-24px_rgb(27_29_36/55%)] lg:order-2">
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
          <div className="absolute inset-x-[-20%] -bottom-1/2 h-full rounded-full blur-3xl" style={{ background: "radial-gradient(closest-side, rgb(138 18 224 / 45%), transparent)" }} />
          <div className="dots absolute inset-0" />
        </div>
        <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3.5">
          {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
            <span key={c} className="size-2.5 rounded-full opacity-80" style={{ background: c }} />
          ))}
          <span className="ml-3 font-mono text-[12.5px] text-white/60">apps/blog/</span>
        </div>
        <div className="px-3 py-3 font-mono text-[13px]">
          {TREE.map((f, i) => {
            const on = f === now.file;
            const part = PARTS.findIndex((p) => p.file === f);
            return (
              <div
                key={f}
                onMouseEnter={part >= 0 ? () => pick(part) : undefined}
                className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 transition-colors duration-300 ${on ? "bg-white/10 text-white" : part >= 0 ? "text-white/75 hover:bg-white/[0.06] hover:text-white" : "text-white/75"}`}
              >
                <span className="text-white/35">{i === TREE.length - 1 ? "└─" : "├─"}</span>
                <span className="flex-1">{f}</span>
              </div>
            );
          })}
        </div>
        <div className="mx-3 mb-3 rounded-xl border border-white/10 bg-black/30 px-4 py-3.5">
          <div className="mb-2 font-mono text-[11px] tracking-wider text-white/40 uppercase">{now.file}</div>
          <pre key={now.id} className="demo-in min-h-[92px] overflow-hidden [mask-image:linear-gradient(to_right,#000_85%,transparent)] font-mono text-[12px] leading-[1.7] whitespace-pre text-[#e9d5ff]">
            {now.code.join("\n")}
          </pre>
        </div>
      </div>

      <div className="order-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-1 lg:grid-rows-3">{PARTS.slice(3).map((p, i) => card(p, i + 3))}</div>
    </div>
  );
}
