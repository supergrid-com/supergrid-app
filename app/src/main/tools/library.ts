import type { ImagesListing, StreamListing } from "../../shared/bridge";
import { filesList, imagesList, streamList } from "../library";
import { list, num, str, ToolError, type Tool, type ToolCtx } from "./index";

// The Library tools: pictures in Cloudflare Images, video and audio in Stream, files in the
// workspace's own bucket, and the skills the agent reads before it works. Each listing draws a
// card the user can open things from; library_upload puts a picker in the chat and waits.

const SKILLS_TABLE = "CREATE TABLE IF NOT EXISTS skills (id TEXT PRIMARY KEY, title TEXT NOT NULL, content TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')))";
const SKILL_ID = /^[a-z][a-z0-9-]{0,59}$/;

const imageUrl = (base: string | null, flexible: boolean, variant: string) => (base ? `${base}/${flexible ? variant : "public"}` : null);
const fileUrl = (wsUrl: string, key: string) => `${wsUrl.replace(/\/$/, "")}/_ws/files/${key.split("/").map(encodeURIComponent).join("/")}`;
const customerOf = (hls: string | null, thumb: string | null, fallback: string | null) => /^https:\/\/(customer-[a-z0-9]+)\.cloudflarestream\.com\//.exec(hls ?? thumb ?? "")?.[1] ?? fallback;
const matches = (q: string, ...fields: (string | null | undefined)[]) => !q || fields.some((f) => (f ?? "").toLowerCase().includes(q));

function imagesCard(ctx: ToolCtx, listing: ImagesListing, shown: ImagesListing["images"], total: number): void {
  ctx.widget({ type: "images", items: shown.map((i) => ({ id: i.id, title: (typeof i.meta.title === "string" && i.meta.title) || i.filename, thumb: imageUrl(i.base, listing.flexible, "w=400,h=300,fit=cover"), url: imageUrl(i.base, listing.flexible, "w=1600"), uploaded: i.uploaded })), total });
}

function mediaCard(ctx: ToolCtx, listing: StreamListing, shown: StreamListing["videos"], total: number): void {
  ctx.widget({
    type: "media",
    items: shown.map((v) => {
      const customer = customerOf(v.hls, v.thumbnail, listing.customer);
      return { uid: v.uid, name: v.name, thumb: v.readyToStream ? v.thumbnail : null, embed: customer ? `https://${customer}.cloudflarestream.com/${v.uid}/iframe` : null, duration: v.duration, ready: v.readyToStream, created: v.created };
    }),
    total,
  });
}

async function skillsReady(ctx: ToolCtx): Promise<void> {
  await ctx.query(SKILLS_TABLE);
}

const excerpt = (s: string, n = 160) => s.replace(/\s+/g, " ").trim().slice(0, n);

export const libraryTools: Tool[] = [
  {
    name: "images_list",
    description: "Pictures in the organization's Cloudflare Images, newest first, shown as thumbnails in the chat. Each has a delivery URL that resizes on the query string (w=, h=, fit=).",
    inputSchema: { type: "object", properties: { search: { type: "string", description: "Match on the title or file name." }, limit: { type: "integer", minimum: 1, maximum: 60, default: 24 } } },
    run: async (ctx, args) => {
      const listing = await imagesList(await ctx.accountId());
      if (!listing.enabled) return "Cloudflare Images isn't turned on for this account yet. The user can turn it on in the Cloudflare dashboard; the Library's Images page says how.";
      const q = str(args.search, "search", { optional: true }).trim().toLowerCase();
      const all = listing.images.filter((i) => matches(q, i.filename, typeof i.meta.title === "string" ? i.meta.title : null));
      const shown = all.slice(0, num(args.limit, "limit", { min: 1, max: 60, dflt: 24 }));
      imagesCard(ctx, listing, shown, all.length);
      return { total: all.length, flexible: listing.flexible, images: shown.map((i) => ({ id: i.id, title: (typeof i.meta.title === "string" && i.meta.title) || i.filename, filename: i.filename, uploaded: i.uploaded, url: imageUrl(i.base, listing.flexible, "w=1600"), meta: i.meta })) };
    },
  },
  {
    name: "media_list",
    description: "Video and audio in Cloudflare Stream, with a thumbnail, its length, whether it is ready to play, and the embed URL. Shown as a list in the chat.",
    inputSchema: { type: "object", properties: { search: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 60, default: 24 } } },
    run: async (ctx, args) => {
      const listing = await streamList(await ctx.accountId());
      if (!listing.enabled) return "Cloudflare Stream has no storage on this account yet. The user can turn it on in the Cloudflare dashboard; the Library's Media page says how.";
      const q = str(args.search, "search", { optional: true }).trim().toLowerCase();
      const all = listing.videos.filter((v) => matches(q, v.name, v.uid));
      const shown = all.slice(0, num(args.limit, "limit", { min: 1, max: 60, dflt: 24 }));
      mediaCard(ctx, listing, shown, all.length);
      return { total: all.length, videos: shown.map((v) => ({ uid: v.uid, name: v.name, duration: v.duration, state: v.state, ready: v.readyToStream, size: v.size, created: v.created, hls: v.hls, thumbnail: v.thumbnail, width: v.width, height: v.height })) };
    },
  },
  {
    name: "files_list",
    description: "Files in the workspace's own bucket, served from the workspace's address at /_ws/files/<key>. Shown as a list in the chat.",
    inputSchema: { type: "object", properties: { prefix: { type: "string", description: "Only keys under this folder." }, search: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 100, default: 40 } } },
    run: async (ctx, args) => {
      const ws = await ctx.ws();
      if (!ws.worker) throw new ToolError("The local dev workspace has no cloud bucket.");
      const listing = await filesList(await ctx.accountId(), `${ws.worker}-files`, { prefix: str(args.prefix, "prefix", { optional: true }) || undefined });
      const q = str(args.search, "search", { optional: true }).trim().toLowerCase();
      const all = listing.files.filter((f) => matches(q, f.key));
      const shown = all.slice(0, num(args.limit, "limit", { min: 1, max: 100, dflt: 40 }));
      ctx.widget({ type: "files", items: shown.map((f) => ({ key: f.key, name: f.key.split("/").pop() ?? f.key, size: f.size, url: fileUrl(ws.url, f.key), contentType: f.contentType, modified: f.modified })), total: all.length });
      return { total: all.length, more: listing.more, files: shown.map((f) => ({ key: f.key, size: f.size, contentType: f.contentType, modified: f.modified, url: fileUrl(ws.url, f.key) })) };
    },
  },
  {
    name: "library_show",
    description: "Show particular pictures, videos or files in the chat by id (an image id, a Stream uid, a file key), for the user to see or pick from.",
    inputSchema: { type: "object", required: ["kind", "ids"], properties: { kind: { enum: ["image", "media", "file"] }, ids: { type: "array", items: { type: "string" }, maxItems: 24 } } },
    run: async (ctx, args) => {
      const kind = str(args.kind, "kind");
      const ids = list<string>(args.ids, "ids", { max: 24 }).map(String);
      const accountId = await ctx.accountId();
      if (kind === "image") {
        const listing = await imagesList(accountId);
        const shown = listing.images.filter((i) => ids.includes(i.id));
        imagesCard(ctx, listing, shown, shown.length);
        return { shown: shown.map((i) => i.id), missing: ids.filter((id) => !shown.some((i) => i.id === id)) };
      }
      if (kind === "media") {
        const listing = await streamList(accountId);
        const shown = listing.videos.filter((v) => ids.includes(v.uid));
        mediaCard(ctx, listing, shown, shown.length);
        return { shown: shown.map((v) => v.uid), missing: ids.filter((id) => !shown.some((v) => v.uid === id)) };
      }
      const ws = await ctx.ws();
      const listing = await filesList(accountId, `${ws.worker}-files`);
      const shown = listing.files.filter((f) => ids.includes(f.key));
      ctx.widget({ type: "files", items: shown.map((f) => ({ key: f.key, name: f.key.split("/").pop() ?? f.key, size: f.size, url: fileUrl(ws.url, f.key), contentType: f.contentType, modified: f.modified })), total: shown.length });
      return { shown: shown.map((f) => f.key), missing: ids.filter((id) => !shown.some((f) => f.key === id)) };
    },
  },
  {
    name: "library_upload",
    description: "Ask the user to pick files on their Mac and upload them: pictures to Images, video or audio to Stream, anything else to the workspace's bucket. Waits for the upload and returns what landed, with URLs.",
    inputSchema: { type: "object", required: ["kind"], properties: { kind: { enum: ["image", "media", "file"] }, title: { type: "string", description: "What you need, shown on the card: 'A logo for the header'." }, multiple: { type: "boolean", default: true }, folder: { type: "string", description: "Files only: the folder (key prefix) to put them in." } } },
    run: async (ctx, args) => {
      const kind = str(args.kind, "kind") as "image" | "media" | "file";
      const a = await ctx.ask({ kind: "upload", title: str(args.title, "title", { optional: true }) || `Upload ${kind === "image" ? "pictures" : kind === "media" ? "video or audio" : "files"}`, accept: kind, multiple: args.multiple !== false, prefix: str(args.folder, "folder", { optional: true }) || undefined });
      if (!a.ok) return "The user didn't upload anything.";
      return { uploaded: a.uploaded ?? [] };
    },
  },
  {
    name: "skills_search",
    description: "Find skills: short guides the user wrote for how things are done in this workspace ('how we write product pages', 'the booking flow'). Search before doing anything the user may have a way of doing; read the matches with skills_read and follow them.",
    inputSchema: { type: "object", properties: { query: { type: "string", description: "Words to look for in the title or text. Empty lists every skill." } } },
    run: async (ctx, args) => {
      await skillsReady(ctx);
      const q = str(args.query, "query", { optional: true }).trim();
      const words = q.split(/\s+/).filter(Boolean).slice(0, 6);
      const where = words.length ? ` WHERE ${words.map(() => "(title LIKE ? OR content LIKE ?)").join(" OR ")}` : "";
      const params = words.flatMap((w) => [`%${w}%`, `%${w}%`]);
      const rows = (await ctx.query(`SELECT id, title, content, updated_at FROM skills${where} ORDER BY title LIMIT 50`, params)).results as { id: string; title: string; content: string; updated_at: string }[];
      ctx.widget({ type: "skills", items: rows.map((r) => ({ id: r.id, title: r.title, excerpt: excerpt(r.content) })) });
      if (!rows.length) return q ? `No skill matches "${q}". The Library's Skills page is where the user writes them.` : "No skills yet. The Library's Skills page is where the user writes them; skills_save can add one.";
      return rows.map((r) => ({ id: r.id, title: r.title, excerpt: excerpt(r.content, 300), updated_at: r.updated_at }));
    },
  },
  {
    name: "skills_read",
    description: "One skill's full text, by id.",
    inputSchema: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
    run: async (ctx, { id }) => {
      await skillsReady(ctx);
      const row = (await ctx.query("SELECT id, title, content, updated_at FROM skills WHERE id = ?", [str(id, "id")])).results[0] as { id: string; title: string; content: string } | undefined;
      if (!row) throw new ToolError(`No skill ${String(id)}. skills_search lists them.`);
      return `# ${row.title}\n\n${row.content}`;
    },
  },
  {
    name: "skills_save",
    description: "Write or update a skill, when the user asks you to remember how something is done here. Keep it short and specific.",
    inputSchema: { type: "object", required: ["id", "title", "content"], properties: { id: { type: "string", pattern: SKILL_ID.source }, title: { type: "string", maxLength: 80 }, content: { type: "string", maxLength: 65536 } } },
    run: async (ctx, args) => {
      await skillsReady(ctx);
      const id = str(args.id, "id");
      if (!SKILL_ID.test(id)) throw new ToolError("A skill id is lowercase letters, digits and dashes.");
      const title = str(args.title, "title", { max: 80 }).trim();
      const content = str(args.content, "content", { max: 65536 });
      await ctx.query("INSERT INTO skills (id, title, content, updated_at) VALUES (?, ?, ?, datetime('now')) ON CONFLICT(id) DO UPDATE SET title = excluded.title, content = excluded.content, updated_at = excluded.updated_at", [id, title, content]);
      ctx.widget({ type: "skills", items: [{ id, title, excerpt: excerpt(content) }] });
      return { saved: id };
    },
  },
];
