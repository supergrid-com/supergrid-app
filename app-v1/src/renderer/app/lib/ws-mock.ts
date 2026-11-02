import type {
  AnalyticsRow,
  AnalyticsSpec,
  Asset,
  AssetFolder,
  AssetInput,
  AssetPage,
  AssetQuery,
  Contact,
  ContactDetail,
  ContactFull,
  ContactInput,
  ContactPage,
  ContactQuery,
  EventInput,
  EventName,
  EventPage,
  EventQuery,
  EventRow,
  FieldDef,
  FunnelSpec,
  FunnelStep,
  Hook,
  HookCatalog,
  HookInput,
  HookRunRow,
  MediaAnalyticsRow,
  MediaAnalyticsSpec,
  MediaConfig,
  Migration,
  ObjectInput,
  ObjectPage,
  ObjectQuery,
  ObjectRow,
  ObjectType,
  ObjectTypeInput,
  RunQuery,
  SecretInput,
  SecretMeta,
  Segment,
  SegmentInput,
  Sitemap,
  SitemapInput,
  UploadDone,
  UploadInput,
  UploadTicket,
  When,
  Workflow,
  WorkflowInput,
  WorkspaceInfo,
  WorkspaceRpc,
} from "@supergrid/app-kit/rpc";
import { RESERVED_EVENTS } from "@supergrid/app-kit/rpc";
import { darkTheme, defaultTheme, type Theme, type ThemeRecord, type ThemeSummary } from "@supergrid/theme";
import { names, secrets as seedSecrets } from "~/lib/mock";

// The workspace RPC surface in memory, for the renderer in a plain browser. Same methods and
// shapes as the Worker, over seeded data, with a short delay so loading states show. Every
// mutation edits the arrays below, so a session's edits last until the page reloads.

const delay = () => new Promise<void>((r) => setTimeout(r, 120));
const clone = <T>(v: T): T => structuredClone(v);
const now = () => new Date().toISOString();
const ago = (days: number, hours = 0): string => new Date(Date.now() - days * 864e5 - hours * 36e5).toISOString();

// a small deterministic generator, so the seed is the same on every load
let seed = 7;
const rand = (): number => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
};
const pick = <T>(list: readonly T[]): T => list[Math.floor(rand() * list.length)];
let counter = 100;
const nid = (): string => `m${(counter++).toString(36)}${Math.floor(rand() * 1e6).toString(36)}`;

// ---- seed ----

const allNames = [...names, "Noah Williams", "Yuki Tanaka"];
const emails: Record<string, string> = { Lena: "lena@example.com", Marco: "marco@studio.io", Ola: "ola@north.se", Jess: "jess@bluebird.co" };
const sourceList = ["forms", "funnels", "pages", "import", "manual"];
const plans = ["free", "pro", "team"];
const companies = ["Acme Studio", "Northwind", "Bluebird Bakery", "Harbor Dental", "Lumen Labs", "Studio Rossi"];
const tagSets = [["customer", "newsletter"], ["newsletter"], ["lead"], ["customer", "vip"], ["newsletter", "lead"], ["customer"], [], ["lead", "newsletter"]];

type ContactRow = Contact & { tags: string[] };

const contacts: ContactRow[] = allNames.map((name, i) => {
  const first = name.split(" ")[0];
  const created = ago(13 - i, i * 2);
  const plan = plans[i % 3];
  return {
    id: `c_${first.toLowerCase()}`,
    email: emails[first] ?? `${first.toLowerCase()}@example.com`,
    name,
    source: sourceList[i % sourceList.length],
    props: { plan, company: companies[i % companies.length], mrr: plan === "free" ? 0 : plan === "pro" ? 29 : 99, ...(i === 0 ? { notes: "Asked about the agency plan on the first call." } : {}) },
    tags: [...tagSets[i % tagSets.length]],
    created_at: created,
    updated_at: created,
  };
});

const fields: FieldDef[] = [
  { key: "plan", label: "Plan", type: "select", options: plans, indexed: true, app_id: null },
  { key: "company", label: "Company", type: "text", app_id: null },
  { key: "mrr", label: "MRR", type: "number", indexed: true, app_id: null },
];

const paths = ["/", "/pricing", "/blog", "/about", "/f/spring-offer", "/contact"];
const referrers = [null, null, "https://google.com", "https://twitter.com", "https://news.ycombinator.com"];
const utms = [null, null, null, "newsletter", "twitter", "launch"];

const eventRow = (p: Partial<EventRow> & { name: string; ts: string }): EventRow => ({
  id: nid(), app_id: "core", contact_id: null, anonymous_id: null, session_id: null, url: null, path: null, referrer: null,
  utm_source: null, utm_medium: null, utm_campaign: null, utm_term: null, utm_content: null, country: null, region: null, city: null,
  timezone: null, user_agent: null, device: null, props: {}, ...p,
});

const events: EventRow[] = [
  ...contacts.map((c) => eventRow({ name: "contact.created", ts: c.created_at, contact_id: c.id, props: { email: c.email, source: c.source } })),
  ...Array.from({ length: 6 }, (_, i) => {
    const c = contacts[(i * 2) % contacts.length];
    return eventRow({ name: "forms.response.created", app_id: "forms", ts: ago(12 - i * 2, 3), contact_id: c.id, path: "/form/newsletter", props: { form: i % 2 ? "contact" : "newsletter", answer: "Yes please" } });
  }),
  // two weeks of traffic, busier near the end so the series has a shape
  ...Array.from({ length: 180 }, (_, i) => {
    const c = rand() < 0.4 ? pick(contacts) : null;
    const path = pick(paths);
    const utm = pick(utms);
    const referrer = pick(referrers);
    const day = Math.min(13, Math.floor(14 * rand() * rand()));
    const anon = c ? null : `anon_${i % 23}`;
    const base = { ts: ago(day, Math.floor(rand() * 23)), contact_id: c?.id ?? null, anonymous_id: anon, session_id: `s_${Math.floor(i / 2)}`, path, url: `https://acme.studio${path}`, referrer, utm_source: utm, utm_medium: utm ? (utm === "newsletter" ? "email" : "social") : null, device: rand() < 0.7 ? "desktop" : "mobile", country: pick(["US", "DE", "SE", "GB"]) };
    return [eventRow({ name: "page.view", app_id: "site", ...base, props: { path, referrer, utm_source: utm } }), ...(i % 4 === 0 ? [eventRow({ name: "session.start", app_id: "site", ...base, props: {} })] : [])];
  }).flat(),
].sort((a, b) => (a.ts < b.ts ? 1 : -1));

type SegmentRow = Omit<Segment, "count">;
const segments: SegmentRow[] = [
  { id: "s_customers", name: "Customers", kind: "dynamic", filter: { tags: ["customer"] }, created_at: ago(20), updated_at: ago(20) },
  { id: "s_vip", name: "VIP list", kind: "static", filter: {}, created_at: ago(9), updated_at: ago(2) },
];
const segmentMembers: Record<string, string[]> = { s_vip: [contacts[3].id, contacts[0].id, contacts[5].id] };

const objectTypes: ObjectType[] = [
  {
    id: "deal", label: "Deal", plural: "Deals", title_field: "name", app_id: null, version: 1, created_at: ago(25), updated_at: ago(25),
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "value", label: "Value", type: "number", indexed: true },
      { key: "stage", label: "Stage", type: "select", options: ["lead", "qualified", "won", "lost"], indexed: true },
    ],
  },
];
const objects: Record<string, ObjectRow[]> = {
  deal: [
    { id: "d_1", type: "deal", contact_id: contacts[0].id, rev: 2, doc: { name: "Acme site rebuild", value: 12000, stage: "qualified" }, created_at: ago(8), updated_at: ago(1) },
    { id: "d_2", type: "deal", contact_id: contacts[3].id, rev: 1, doc: { name: "Bakery online orders", value: 4500, stage: "won" }, created_at: ago(6), updated_at: ago(6) },
    { id: "d_3", type: "deal", contact_id: contacts[5].id, rev: 1, doc: { name: "Mendes funnel", value: 2200, stage: "lead" }, created_at: ago(4), updated_at: ago(4) },
    { id: "d_4", type: "deal", contact_id: contacts[1].id, rev: 3, doc: { name: "Studio Rossi retainer", value: 9000, stage: "lost" }, created_at: ago(3), updated_at: ago(0, 5) },
  ],
};

const workflows: Workflow[] = [
  { id: "w1", name: "Welcome email", version: 3, enabled: true, runs: 1284, last_run: ago(0, 1), created_at: ago(40), updated_at: ago(3), definition: { trigger: { event: "contact.created" }, steps: [{ id: "s1", type: "wait", input: { seconds: 60 } }, { id: "s2", type: "contact.tag", input: { tag: "newsletter" } }, { id: "s3", type: "http.request", input: { url: "https://hooks.example.com/welcome", method: "POST", body: "{\"name\":\"{{contact.name}}\"}" } }] } },
  { id: "w2", name: "Abandoned checkout", version: 1, enabled: false, runs: 96, last_run: ago(0, 2), created_at: ago(30), updated_at: ago(30), definition: { trigger: { event: "funnels.step", when: [{ field: "props.step", op: "eq", value: "checkout" }] }, steps: [{ id: "s1", type: "condition", input: { when: [{ field: "contact.source", op: "ne", value: "import" }] } }, { id: "s2", type: "wait", input: { seconds: 3600 } }, { id: "s3", type: "contact.tag", input: { tag: "abandoned" } }] } },
];

const hooks: Hook[] = [
  { id: "wf:w1", name: "Welcome email", event: "contact.created", app_id: null, action: "workflow", config: { workflowId: "w1" }, when: null, enabled: true, created_at: ago(40), updated_at: ago(3) },
  { id: "h_slack", name: "Slack on new form answer", event: "forms.response.created", app_id: null, action: "http", config: { url: "https://hooks.slack.com/services/T000/B000/XXXX", method: "POST", secret: "whsec_demo" }, when: null, enabled: true, created_at: ago(12), updated_at: ago(12) },
];

const runs: HookRunRow[] = [
  { id: "r1", hook_id: "wf:w1", workflow_id: "w1", workflow_version: 3, event_id: events[0].id, event_name: "contact.created", contact_id: contacts[11].id, status: "completed", error: null, started_at: ago(0, 1), finished_at: ago(0, 1), steps: [{ run_id: "r1", idx: 0, step_id: "s1", type: "wait", status: "completed", output: null, finished_at: ago(0, 1) }, { run_id: "r1", idx: 1, step_id: "s2", type: "contact.tag", status: "completed", output: { tag: "newsletter" }, finished_at: ago(0, 1) }, { run_id: "r1", idx: 2, step_id: "s3", type: "http.request", status: "completed", output: { status: 200 }, finished_at: ago(0, 1) }] },
  { id: "r2", hook_id: "h_slack", workflow_id: null, workflow_version: null, event_id: events[12].id, event_name: "forms.response.created", contact_id: contacts[0].id, status: "failed", error: "fetch failed: 502 Bad Gateway", started_at: ago(1, 2), finished_at: ago(1, 2), steps: [] },
];

const themes: ThemeRecord[] = [
  { theme: clone(defaultTheme), isDefault: true, created_at: ago(30), updated_at: ago(2) },
  { theme: clone(darkTheme), isDefault: false, created_at: ago(30), updated_at: ago(12) },
];
const summary = (r: ThemeRecord): ThemeSummary => ({ id: r.theme.id, name: r.theme.name, mode: r.theme.mode, isDefault: r.isDefault, updated_at: r.updated_at, primary: r.theme.colors.primary });

let sitemap: Sitemap = { version: 1, mounts: { pages: "/", funnels: "/f", forms: "/form" }, home: null, rules: [{ id: "r1", from: "/old-pricing", to: "/pricing", status: 301, enabled: true, source: "user", created_at: ago(20) }] };

const assetRow = (p: Partial<Asset> & { id: string; kind: Asset["kind"]; name: string }): Asset => ({
  provider: p.kind === "image" ? "images" : p.kind === "video" || p.kind === "audio" ? "stream" : "r2", provider_id: p.id, title: null, alt: null, mime: null, size: null, width: null, height: null, duration: null,
  status: "ready", error: null, folder: "/", tags: [], meta: {}, urls: { src: `https://assets.example.com/${p.id}`, thumbnail: p.kind === "image" ? `https://assets.example.com/${p.id}` : null }, app_id: null, created_at: ago(5), updated_at: ago(5), ...p,
});
const assets: Asset[] = [
  assetRow({ id: "a_hero", kind: "image", name: "hero.webp", mime: "image/webp", size: 214_000, width: 1600, height: 900, folder: "/", tags: ["site"] }),
  assetRow({ id: "a_pricing", kind: "file", name: "pricing-2026.pdf", mime: "application/pdf", size: 1_100_000, folder: "/docs" }),
  assetRow({ id: "a_intro", kind: "video", name: "intro.mp4", mime: "video/mp4", size: 48_000_000, width: 1920, height: 1080, duration: 94, folder: "/brand", urls: { src: null, thumbnail: "https://assets.example.com/a_intro/thumb.jpg", hls: "https://assets.example.com/a_intro/manifest.m3u8" } }),
  assetRow({ id: "a_logo", kind: "image", name: "logo.svg", mime: "image/svg+xml", size: 4_200, width: 512, height: 512, folder: "/brand/logos", tags: ["brand"] }),
];

// ---- helpers ----

const str = (v: unknown): string => (v == null ? "" : String(v));
const lower = (v: unknown): string => str(v).toLowerCase();

/** Reads a `When` field off a row: a column, or a key in its JSON (`props.x`, `doc.x`, or bare). */
function fieldOf(row: Record<string, unknown>, field: string, json: "props" | "doc"): unknown {
  const bag = row[json] as Record<string, unknown> | undefined;
  if (field.startsWith(`${json}.`)) return bag?.[field.slice(json.length + 1)];
  if (field in row) return row[field];
  return bag?.[field];
}

function matches(when: When, row: Record<string, unknown>, json: "props" | "doc"): boolean {
  const v = fieldOf(row, when.field, json);
  const w = when.value;
  const num = (x: unknown) => (typeof x === "number" ? x : Number(x));
  const cmp = (a: unknown, b: unknown): number => {
    if (typeof a === "number" || (!Number.isNaN(num(a)) && !Number.isNaN(num(b)) && str(a) !== "")) return num(a) - num(b);
    return str(a) < str(b) ? -1 : str(a) > str(b) ? 1 : 0;
  };
  switch (when.op) {
    case "eq": return typeof w === "boolean" ? !!v === w : lower(v) === lower(w);
    case "ne": return typeof w === "boolean" ? !!v !== w : lower(v) !== lower(w);
    case "in": return Array.isArray(w) && w.some((x) => lower(x) === lower(v));
    case "contains": return lower(v).includes(lower(w));
    case "exists": return w === false ? v == null || v === "" : v != null && v !== "";
    case "gt": return v != null && cmp(v, w) > 0;
    case "lt": return v != null && cmp(v, w) < 0;
    case "gte": return v != null && cmp(v, w) >= 0;
    case "lte": return v != null && cmp(v, w) <= 0;
  }
}

const contactsIn = (segmentId: string, depth = 0): Set<string> => {
  const s = segments.find((x) => x.id === segmentId);
  if (!s) throw new Error(`Unknown segment ${segmentId}`);
  if (s.kind === "static") return new Set(segmentMembers[s.id] ?? []);
  // a dynamic segment nested in itself would loop; cut it off
  return new Set(depth > 3 ? [] : filterContacts({ ...s.filter, segment: undefined }, depth + 1).map((c) => c.id));
};

function filterContacts(q: ContactQuery, depth = 0): ContactRow[] {
  let list = contacts.slice();
  if (q.search) {
    const s = q.search.toLowerCase();
    list = list.filter((c) => c.email.toLowerCase().includes(s) || (c.name ?? "").toLowerCase().includes(s));
  }
  if (q.tags?.length) list = list.filter((c) => q.tags!.every((t) => c.tags.includes(t)));
  if (q.anyTags?.length) list = list.filter((c) => q.anyTags!.some((t) => c.tags.includes(t)));
  if (q.source) list = list.filter((c) => c.source === q.source);
  if (q.createdFrom) list = list.filter((c) => c.created_at >= q.createdFrom!);
  if (q.createdTo) list = list.filter((c) => c.created_at <= q.createdTo!);
  for (const w of q.props ?? []) list = list.filter((c) => matches(w, c as unknown as Record<string, unknown>, "props"));
  if (q.did) {
    const since = ago(q.did.days ?? 30);
    const min = q.did.min ?? 1;
    const counts = new Map<string, number>();
    for (const e of events) if (e.name === q.did.event && e.ts >= since && e.contact_id) counts.set(e.contact_id, (counts.get(e.contact_id) ?? 0) + 1);
    list = list.filter((c) => (counts.get(c.id) ?? 0) >= min);
  }
  if (q.segment) {
    const ids = contactsIn(q.segment, depth);
    list = list.filter((c) => ids.has(c.id));
  }
  const sort = q.sort ?? "created_at";
  const dir = q.dir ?? (sort === "created_at" || sort === "updated_at" ? "desc" : "asc");
  const key = (c: ContactRow): unknown => (sort.startsWith("prop:") ? c.props[sort.slice(5)] : c[sort as keyof Contact]);
  list.sort((a, b) => {
    const x = key(a);
    const y = key(b);
    const r = typeof x === "number" && typeof y === "number" ? x - y : lower(x) < lower(y) ? -1 : lower(x) > lower(y) ? 1 : 0;
    return dir === "desc" ? -r : r;
  });
  return list;
}

const page = <T>(list: T[], limit = 50, offset = 0): { items: T[]; total: number } => ({ items: clone(list.slice(offset, offset + Math.min(limit, 500))), total: list.length });

const emitRows = (appId: string, inputs: EventInput[]): string[] =>
  inputs.map((e) => {
    const row = eventRow({
      name: e.name, app_id: appId, ts: e.ts ?? now(), contact_id: e.contactId ?? null, anonymous_id: e.anonymousId ?? null, session_id: e.sessionId ?? null,
      url: e.url ?? null, path: e.path ?? null, referrer: e.referrer ?? null, utm_source: e.utm?.source ?? null, utm_medium: e.utm?.medium ?? null,
      utm_campaign: e.utm?.campaign ?? null, utm_term: e.utm?.term ?? null, utm_content: e.utm?.content ?? null, user_agent: e.userAgent ?? null, props: e.props ?? {},
    });
    events.unshift(row);
    return row.id;
  });

const full = (c: ContactRow): ContactFull => clone(c);

const byIdOrEmail = (idOrEmail: string): ContactRow | undefined => contacts.find((c) => c.id === idOrEmail || c.email.toLowerCase() === idOrEmail.toLowerCase());

function validateDoc(type: ObjectType, doc: Record<string, unknown>): void {
  for (const f of type.fields) {
    const v = doc[f.key];
    if (f.required && (v == null || v === "")) throw new Error(`${f.label} is required`);
    if (v == null || v === "") continue;
    if (f.type === "number" && typeof v !== "number") throw new Error(`${f.label} must be a number`);
    if (f.type === "select" && f.options && !f.options.includes(String(v))) throw new Error(`${f.label} must be one of ${f.options.join(", ")}`);
  }
}

const bucketOf = (ts: string, interval: AnalyticsSpec["interval"]): string => {
  const d = new Date(ts);
  if (interval === "month") return ts.slice(0, 7);
  if (interval === "week") {
    const day = (d.getUTCDay() + 6) % 7;
    d.setUTCDate(d.getUTCDate() - day);
  }
  return d.toISOString().slice(0, 10);
};

// ---- the surface ----

// secrets: the metadata rows, with the values in a map that nothing lists
const SECRET_NAME = /^[A-Z][A-Z0-9_]{0,63}$/;
const hintOf = (value: string): string => (value.length >= 12 ? `…${value.slice(-4)}` : "••••");
const secretRows: SecretMeta[] = (seedSecrets.acme ?? []).map((s) => ({ name: s.name, hint: s.hint.slice(s.hint.indexOf("…")), description: null, app_id: null, created_at: `${s.updatedAt}T09:00:00.000Z`, updated_at: `${s.updatedAt}T09:00:00.000Z` }));
const secretValues = new Map<string, string>();

export const mock: WorkspaceRpc = {
  async info(): Promise<WorkspaceInfo> {
    await delay();
    return { id: "mock", name: "Mock workspace", url: "http://localhost:5301", version: "0.0.0", contract: 3, apps: [], sitemap: clone(sitemap) };
  },
  async getTheme() {
    await delay();
    const t = (themes.find((r) => r.isDefault) ?? themes[0]).theme;
    return { primary: t.colors.primary, radius: t.radius };
  },
  async listThemes() {
    await delay();
    return themes.map(summary);
  },
  async readTheme(id) {
    await delay();
    const r = id ? themes.find((x) => x.theme.id === id) : (themes.find((x) => x.isDefault) ?? themes[0]);
    if (!r) throw new Error(`No theme ${id}`);
    return clone(r.theme);
  },
  async saveTheme(input) {
    await delay();
    const r = themes.find((x) => x.theme.id === input.id);
    if (r) {
      r.theme = { ...r.theme, ...(input as Partial<Theme>), colors: { ...r.theme.colors, ...(input.colors ?? {}) } } as Theme;
      r.updated_at = now();
      return clone(r);
    }
    const created: ThemeRecord = { theme: { ...clone(defaultTheme), ...(input as Partial<Theme>) } as Theme, isDefault: themes.length === 0, created_at: now(), updated_at: now() };
    themes.push(created);
    return clone(created);
  },
  async removeTheme(id) {
    await delay();
    const i = themes.findIndex((x) => x.theme.id === id);
    if (i < 0) return;
    if (themes[i].isDefault) throw new Error("The default theme stays; make another one the default first.");
    themes.splice(i, 1);
  },
  async setDefaultTheme(id) {
    await delay();
    if (!themes.some((x) => x.theme.id === id)) throw new Error(`No theme ${id}`);
    for (const r of themes) r.isDefault = r.theme.id === id;
    return themes.map(summary);
  },
  async getSitemap() {
    await delay();
    return clone(sitemap);
  },
  async setSitemap(input: SitemapInput) {
    await delay();
    sitemap = {
      version: 1,
      mounts: input.mounts ?? sitemap.mounts,
      home: input.home === undefined ? sitemap.home : input.home,
      rules: input.rules ? input.rules.map((r) => ({ id: r.id ?? `r_${nid()}`, from: r.from, to: r.to, status: r.status ?? 302, enabled: r.enabled ?? true, note: r.note, source: r.source ?? "user", created_at: r.created_at ?? now() })) : sitemap.rules,
    };
    return clone(sitemap);
  },
  async getSetting() {
    await delay();
    return null;
  },
  async setSetting() {
    await delay();
  },
  async applyMigrations(_appId: string, migrations: Migration[]) {
    await delay();
    return migrations.map((m) => m.name);
  },

  async listContacts(limit = 50) {
    await delay();
    return clone(contacts.slice(0, limit).map(({ tags: _t, ...c }) => c));
  },
  async upsertContact(appId, input) {
    await delay();
    let c = byIdOrEmail(input.email);
    if (c) {
      Object.assign(c, { name: input.name ?? c.name, source: input.source ?? c.source, props: { ...c.props, ...input.props }, updated_at: now() });
      emitRows("core", [{ name: "contact.updated", contactId: c.id, props: { app: appId } }]);
    } else {
      c = { id: nid(), email: input.email, name: input.name ?? null, source: input.source ?? appId, props: input.props ?? {}, tags: [], created_at: now(), updated_at: now() };
      contacts.unshift(c);
      emitRows("core", [{ name: "contact.created", contactId: c.id, props: { email: c.email, source: c.source } }]);
    }
    const { tags: _t, ...plain } = c;
    return clone(plain);
  },
  async queryContacts(query = {}): Promise<ContactPage> {
    await delay();
    return page(filterContacts(query), query.limit, query.offset);
  },
  async getContact(idOrEmail): Promise<ContactDetail | null> {
    await delay();
    const c = byIdOrEmail(idOrEmail);
    if (!c) return null;
    const timeline = events.filter((e) => e.contact_id === c.id).slice(0, 50);
    const related: Record<string, ObjectRow[]> = {};
    for (const [type, rows] of Object.entries(objects)) {
      const mine = rows.filter((r) => r.contact_id === c.id);
      if (mine.length) related[type] = mine;
    }
    const inSegments = segments.filter((s) => contactsIn(s.id).has(c.id)).map((s) => ({ id: s.id, name: s.name }));
    return clone({ contact: full(c), timeline, objects: related, segments: inSegments });
  },
  async saveContact(appId, input: ContactInput) {
    await delay();
    const c = input.id ? contacts.find((x) => x.id === input.id) : undefined;
    if (input.id && !c) throw new Error(`No contact ${input.id}`);
    const email = (input.email ?? c?.email ?? "").trim().toLowerCase();
    if (!email || !email.includes("@")) throw new Error("A contact needs an email address.");
    const other = contacts.find((x) => x.email === email && x !== c);
    if (other) throw new Error(`${email} is already a contact.`);
    if (c) {
      c.email = email;
      if (input.name !== undefined) c.name = input.name;
      if (input.source !== undefined) c.source = input.source;
      if (input.props) c.props = { ...c.props, ...input.props };
      if (input.tags) c.tags = [...new Set(input.tags)];
      c.updated_at = now();
      emitRows("core", [{ name: "contact.updated", contactId: c.id, props: { app: appId } }]);
      return full(c);
    }
    const created: ContactRow = { id: nid(), email, name: input.name ?? null, source: input.source ?? appId, props: input.props ?? {}, tags: [...new Set(input.tags ?? [])], created_at: now(), updated_at: now() };
    contacts.unshift(created);
    emitRows("core", [{ name: "contact.created", contactId: created.id, props: { email, source: created.source } }]);
    return full(created);
  },
  async tagContacts(_appId, ids, add = [], remove = []) {
    await delay();
    for (const c of contacts) {
      if (!ids.includes(c.id)) continue;
      const before = c.tags.slice();
      c.tags = [...new Set([...c.tags.filter((t) => !remove.includes(t)), ...add])];
      if (before.join() !== c.tags.join()) c.updated_at = now();
      for (const t of add) if (!before.includes(t)) emitRows("core", [{ name: "contact.tagged", contactId: c.id, props: { tag: t } }]);
      for (const t of remove) if (before.includes(t)) emitRows("core", [{ name: "contact.untagged", contactId: c.id, props: { tag: t } }]);
    }
  },
  async deleteContacts(_appId, ids) {
    await delay();
    for (const id of ids) {
      const i = contacts.findIndex((c) => c.id === id);
      if (i < 0) continue;
      contacts.splice(i, 1);
      for (const rows of Object.values(objects)) for (const r of rows) if (r.contact_id === id) r.contact_id = null;
      for (const m of Object.values(segmentMembers)) { const j = m.indexOf(id); if (j >= 0) m.splice(j, 1); }
      emitRows("core", [{ name: "contact.deleted", props: { id } }]);
    }
  },
  async listTags() {
    await delay();
    const counts = new Map<string, number>();
    for (const c of contacts) for (const t of c.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    return [...counts].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  },
  async listContactFields() {
    await delay();
    return clone(fields);
  },
  async saveContactField(appId, field) {
    await delay();
    if (!/^[a-z][a-z0-9_]*$/.test(field.key)) throw new Error("A field key is lowercase letters, digits and underscores.");
    const next: FieldDef = { ...field, app_id: appId === "desktop" ? null : appId };
    const i = fields.findIndex((f) => f.key === field.key);
    if (i >= 0) fields[i] = next;
    else fields.push(next);
    return clone(next);
  },
  async removeContactField(key) {
    await delay();
    const i = fields.findIndex((f) => f.key === key);
    if (i >= 0) fields.splice(i, 1);
  },
  async listSegments() {
    await delay();
    return segments.map((s) => ({ ...clone(s), count: contactsIn(s.id).size }));
  },
  async saveSegment(input: SegmentInput) {
    await delay();
    if (!input.name.trim()) throw new Error("A segment needs a name.");
    const s = input.id ? segments.find((x) => x.id === input.id) : undefined;
    if (s) {
      s.name = input.name.trim();
      if (input.kind) s.kind = input.kind;
      if (input.filter) s.filter = input.filter;
      s.updated_at = now();
      return { ...clone(s), count: contactsIn(s.id).size };
    }
    const created: SegmentRow = { id: nid(), name: input.name.trim(), kind: input.kind ?? "dynamic", filter: input.filter ?? {}, created_at: now(), updated_at: now() };
    segments.push(created);
    return { ...clone(created), count: contactsIn(created.id).size };
  },
  async removeSegment(id) {
    await delay();
    const i = segments.findIndex((s) => s.id === id);
    if (i >= 0) segments.splice(i, 1);
    delete segmentMembers[id];
  },
  async addToSegment(id, contactIds) {
    await delay();
    const s = segments.find((x) => x.id === id);
    if (!s) throw new Error(`Unknown segment ${id}`);
    if (s.kind !== "static") throw new Error("Only a static segment takes members.");
    segmentMembers[id] = [...new Set([...(segmentMembers[id] ?? []), ...contactIds])];
  },

  async listObjectTypes() {
    await delay();
    return clone(objectTypes);
  },
  async saveObjectType(appId, input: ObjectTypeInput) {
    await delay();
    if (!/^[a-z][a-z0-9_]*$/.test(input.id)) throw new Error("A type id is lowercase letters, digits and underscores.");
    const t = objectTypes.find((x) => x.id === input.id);
    if (t) {
      Object.assign(t, { label: input.label, plural: input.plural ?? t.plural, title_field: input.title_field ?? t.title_field, fields: input.fields, version: t.version + 1, updated_at: now() });
      return clone(t);
    }
    const created: ObjectType = { id: input.id, label: input.label, plural: input.plural ?? `${input.label}s`, title_field: input.title_field ?? input.fields[0]?.key ?? "name", fields: input.fields, app_id: appId === "desktop" ? null : appId, version: 1, created_at: now(), updated_at: now() };
    objectTypes.push(created);
    objects[created.id] = [];
    return clone(created);
  },
  async removeObjectType(id) {
    await delay();
    const i = objectTypes.findIndex((t) => t.id === id);
    if (i >= 0) objectTypes.splice(i, 1);
    delete objects[id];
  },
  async listObjects(type, query: ObjectQuery = {}): Promise<ObjectPage> {
    await delay();
    const t = objectTypes.find((x) => x.id === type);
    if (!t) throw new Error(`Unknown object type ${type}`);
    let list = (objects[type] ?? []).slice();
    if (query.contactId !== undefined) list = list.filter((r) => r.contact_id === query.contactId);
    if (query.search) {
      const s = query.search.toLowerCase();
      list = list.filter((r) => lower(r.doc[t.title_field]).includes(s) || Object.values(r.doc).some((v) => lower(v).includes(s)));
    }
    for (const w of query.where ?? []) list = list.filter((r) => matches(w, r as unknown as Record<string, unknown>, "doc"));
    const sort = query.sort ?? "updated_at";
    const dir = query.dir ?? "desc";
    const key = (r: ObjectRow): unknown => (sort.startsWith("doc:") ? r.doc[sort.slice(4)] : r[sort as "created_at" | "updated_at"]);
    list.sort((a, b) => {
      const x = key(a);
      const y = key(b);
      const r = typeof x === "number" && typeof y === "number" ? x - y : lower(x) < lower(y) ? -1 : lower(x) > lower(y) ? 1 : 0;
      return dir === "desc" ? -r : r;
    });
    return page(list, query.limit, query.offset);
  },
  async getObject(type, id) {
    await delay();
    const r = (objects[type] ?? []).find((x) => x.id === id);
    return r ? clone(r) : null;
  },
  async saveObject(_appId, type, input: ObjectInput) {
    await delay();
    const t = objectTypes.find((x) => x.id === type);
    if (!t) throw new Error(`Unknown object type ${type}`);
    validateDoc(t, input.doc);
    const rows = (objects[type] ??= []);
    const r = input.id ? rows.find((x) => x.id === input.id) : undefined;
    if (input.id && !r) throw new Error(`No ${t.label} ${input.id}`);
    if (r) {
      if (input.rev !== undefined && input.rev !== r.rev) throw new Error(`${t.label} changed since you opened it (rev ${r.rev}). Reload and try again.`);
      r.doc = { ...input.doc };
      if (input.contactId !== undefined) r.contact_id = input.contactId;
      r.rev += 1;
      r.updated_at = now();
      emitRows("core", [{ name: "object.updated", contactId: r.contact_id, props: { type, id: r.id } }]);
      return clone(r);
    }
    const created: ObjectRow = { id: nid(), type, contact_id: input.contactId ?? null, rev: 1, doc: { ...input.doc }, created_at: now(), updated_at: now() };
    rows.unshift(created);
    emitRows("core", [{ name: "object.created", contactId: created.contact_id, props: { type, id: created.id } }]);
    return clone(created);
  },
  async removeObjects(_appId, type, ids) {
    await delay();
    const rows = objects[type] ?? [];
    for (const id of ids) {
      const i = rows.findIndex((r) => r.id === id);
      if (i >= 0) {
        emitRows("core", [{ name: "object.deleted", contactId: rows[i].contact_id, props: { type, id } }]);
        rows.splice(i, 1);
      }
    }
  },

  async emitEvent(appId, type, payload) {
    await delay();
    emitRows(appId, [{ name: type, props: (payload ?? {}) as Record<string, unknown> }]);
  },
  async emit(appId, inputs) {
    await delay();
    return emitRows(appId, inputs);
  },
  async listEvents(query: EventQuery = {}): Promise<EventPage> {
    await delay();
    let list = events.slice();
    const names = query.name ? (Array.isArray(query.name) ? query.name : [query.name]) : null;
    if (names?.length) list = list.filter((e) => names.includes(e.name));
    if (query.appId) list = list.filter((e) => e.app_id === query.appId);
    if (query.contactId) list = list.filter((e) => e.contact_id === query.contactId);
    if (query.anonymousId) list = list.filter((e) => e.anonymous_id === query.anonymousId);
    if (query.from) list = list.filter((e) => e.ts >= query.from!);
    if (query.to) list = list.filter((e) => e.ts <= query.to!);
    if (query.search) {
      const s = query.search.toLowerCase();
      list = list.filter((e) => e.name.includes(s) || lower(e.path).includes(s) || JSON.stringify(e.props).toLowerCase().includes(s));
    }
    return page(list, query.limit, query.offset);
  },
  async eventNames(): Promise<EventName[]> {
    await delay();
    const counts = new Map<string, { app_id: string | null; count: number }>();
    for (const e of events) {
      const cur = counts.get(e.name) ?? { app_id: e.app_id, count: 0 };
      cur.count += 1;
      counts.set(e.name, cur);
    }
    const reserved = new Set<string>(RESERVED_EVENTS);
    for (const r of RESERVED_EVENTS) if (!counts.has(r)) counts.set(r, { app_id: null, count: 0 });
    return [...counts].map(([name, c]) => ({ name, app_id: reserved.has(name) ? null : c.app_id, count: c.count, reserved: reserved.has(name) })).sort((a, b) => a.name.localeCompare(b.name));
  },
  async queryAnalytics(spec: AnalyticsSpec): Promise<AnalyticsRow[]> {
    await delay();
    const from = spec.from ?? ago(spec.days ?? 30);
    const to = spec.to ?? now();
    let list = events.filter((e) => e.ts >= from && e.ts <= to);
    if (spec.events?.length) list = list.filter((e) => spec.events!.includes(e.name));
    if (spec.appId) list = list.filter((e) => e.app_id === spec.appId);
    for (const w of spec.filters ?? []) list = list.filter((e) => matches(w, e as unknown as Record<string, unknown>, "props"));
    const groupKey = (e: EventRow): string | null => {
      if (!spec.groupBy) return null;
      if (spec.groupBy.startsWith("prop:")) return str(e.props[spec.groupBy.slice(5)]) || null;
      return (e[spec.groupBy as keyof EventRow] as string | null) ?? null;
    };
    const cells = new Map<string, { bucket: string | null; key: string | null; rows: EventRow[] }>();
    for (const e of list) {
      const bucket = spec.interval ? bucketOf(e.ts, spec.interval) : null;
      const key = groupKey(e);
      const id = `${bucket}|${key}`;
      const cell = cells.get(id) ?? { bucket, key, rows: [] };
      cell.rows.push(e);
      cells.set(id, cell);
    }
    const value = (rows: EventRow[]): number => {
      switch (spec.metric) {
        case "count": return rows.length;
        case "unique_contacts": return new Set(rows.map((r) => r.contact_id).filter(Boolean)).size;
        case "unique_visitors": return new Set(rows.map((r) => r.contact_id ?? r.anonymous_id).filter(Boolean)).size;
        case "sum": return rows.reduce((n, r) => n + (Number(r.props[spec.prop ?? ""]) || 0), 0);
      }
    };
    return [...cells.values()].map((c) => ({ bucket: c.bucket, key: c.key, value: value(c.rows) })).sort((a, b) => str(a.bucket).localeCompare(str(b.bucket)) || b.value - a.value).slice(0, spec.limit ?? 1000);
  },
  async funnel(spec: FunnelSpec): Promise<FunnelStep[]> {
    await delay();
    const from = spec.from ?? ago(spec.days ?? 30);
    const to = spec.to ?? now();
    const actor = (e: EventRow): string | null => (spec.by === "visitor" ? (e.contact_id ?? e.anonymous_id) : e.contact_id);
    const window = (spec.windowHours ?? 24 * 7) * 36e5;
    let cohort = new Map<string, string>();
    const out: FunnelStep[] = [];
    spec.steps.forEach((step, i) => {
      const next = new Map<string, string>();
      for (const e of events) {
        if (e.name !== step.event || e.ts < from || e.ts > to) continue;
        if (!(step.filters ?? []).every((w) => matches(w, e as unknown as Record<string, unknown>, "props"))) continue;
        const a = actor(e);
        if (!a) continue;
        if (i === 0) { if (!next.has(a) || e.ts < next.get(a)!) next.set(a, e.ts); continue; }
        const prev = cohort.get(a);
        if (prev && e.ts >= prev && new Date(e.ts).getTime() - new Date(prev).getTime() <= window && (!next.has(a) || e.ts < next.get(a)!)) next.set(a, e.ts);
      }
      out.push({ event: step.event, count: next.size, rate: i === 0 ? 1 : cohort.size ? next.size / cohort.size : 0 });
      cohort = next;
    });
    return out;
  },

  async listHooks() {
    await delay();
    return clone(hooks);
  },
  async saveHook(appId, input: HookInput) {
    await delay();
    const h = input.id ? hooks.find((x) => x.id === input.id) : undefined;
    if (h) {
      Object.assign(h, { name: input.name ?? h.name, event: input.event, action: input.action, config: input.config, when: input.when ?? null, enabled: input.enabled ?? h.enabled, updated_at: now() });
      return clone(h);
    }
    const created: Hook = { id: nid(), name: input.name ?? null, event: input.event, app_id: appId, action: input.action, config: input.config, when: input.when ?? null, enabled: input.enabled ?? true, created_at: now(), updated_at: now() };
    hooks.push(created);
    return clone(created);
  },
  async removeHook(id) {
    await delay();
    const i = hooks.findIndex((h) => h.id === id);
    if (i >= 0) hooks.splice(i, 1);
  },
  async hookCatalog(): Promise<HookCatalog> {
    const names = await mock.eventNames();
    return {
      events: names,
      workflows: workflows.map((w) => ({ id: w.id, name: w.name })),
      steps: [
        { type: "wait", label: "Wait", description: "Sleeps durably before the next step.", fields: [{ key: "seconds", label: "Seconds", type: "number", required: true }] },
        { type: "condition", label: "Condition", description: "Stops the run unless every condition holds.", fields: [{ key: "when", label: "Conditions (JSON)", type: "text", required: true }] },
        { type: "contact.tag", label: "Tag contact", description: "Adds a tag to the run's contact.", fields: [{ key: "tag", label: "Tag", type: "text", required: true }] },
        { type: "contact.untag", label: "Untag contact", description: "Removes a tag from the run's contact.", fields: [{ key: "tag", label: "Tag", type: "text", required: true }] },
        { type: "contact.update", label: "Update contact", description: "Sets name, source or props; values may be templates.", fields: [{ key: "name", label: "Name", type: "text" }, { key: "source", label: "Source", type: "text" }, { key: "props", label: "Props (JSON)", type: "text" }] },
        { type: "http.request", label: "HTTP request", description: "A webhook; the body defaults to { event, contact }.", fields: [{ key: "url", label: "URL", type: "url", required: true }, { key: "method", label: "Method", type: "select", options: ["POST", "GET", "PUT", "PATCH", "DELETE"] }, { key: "headers", label: "Headers (JSON)", type: "text" }, { key: "body", label: "Body", type: "text" }] },
        { type: "event.emit", label: "Emit event", description: "Emits an event carrying the run's contact.", fields: [{ key: "name", label: "Event", type: "text", required: true }, { key: "props", label: "Props (JSON)", type: "text" }] },
        { type: "object.save", label: "Save object", description: "Creates an object linked to the contact.", fields: [{ key: "type", label: "Type", type: "text", required: true }, { key: "doc", label: "Document (JSON)", type: "text" }] },
      ],
    };
  },
  async listWorkflows() {
    await delay();
    return clone(workflows);
  },
  async getWorkflow(id) {
    await delay();
    const w = workflows.find((x) => x.id === id);
    return w ? clone(w) : null;
  },
  async saveWorkflow(input: WorkflowInput) {
    await delay();
    if (!input.name.trim()) throw new Error("A workflow needs a name.");
    const w = input.id ? workflows.find((x) => x.id === input.id) : undefined;
    const upsertHook = (wf: Workflow) => {
      const i = hooks.findIndex((h) => h.id === `wf:${wf.id}`);
      if (!wf.definition.trigger) { if (i >= 0) hooks.splice(i, 1); return; }
      const hook: Hook = { id: `wf:${wf.id}`, name: wf.name, event: wf.definition.trigger.event, app_id: null, action: "workflow", config: { workflowId: wf.id }, when: wf.definition.trigger.when ?? null, enabled: wf.enabled, created_at: i >= 0 ? hooks[i].created_at : now(), updated_at: now() };
      if (i >= 0) hooks[i] = hook;
      else hooks.push(hook);
    };
    if (w) {
      Object.assign(w, { name: input.name.trim(), definition: input.definition, enabled: input.enabled ?? w.enabled, version: w.version + 1, updated_at: now() });
      upsertHook(w);
      return clone(w);
    }
    const created: Workflow = { id: nid(), name: input.name.trim(), version: 1, definition: input.definition, enabled: input.enabled ?? true, runs: 0, last_run: null, created_at: now(), updated_at: now() };
    workflows.push(created);
    upsertHook(created);
    return clone(created);
  },
  async removeWorkflow(id) {
    await delay();
    const i = workflows.findIndex((w) => w.id === id);
    if (i >= 0) workflows.splice(i, 1);
    const h = hooks.findIndex((x) => x.id === `wf:${id}`);
    if (h >= 0) hooks.splice(h, 1);
  },
  async runWorkflow(id, input = {}) {
    await delay();
    const w = workflows.find((x) => x.id === id);
    if (!w) throw new Error(`No workflow ${id}`);
    const [eventId] = emitRows("core", [{ name: "workflow.test", contactId: input.contactId ?? null, props: input.props ?? {} }]);
    const run: HookRunRow = {
      id: nid(), hook_id: `wf:${w.id}`, workflow_id: w.id, workflow_version: w.version, event_id: eventId, event_name: "workflow.test", contact_id: input.contactId ?? null,
      status: "queued", error: null, started_at: now(), finished_at: null,
      steps: w.definition.steps.map((s, idx) => ({ run_id: "", idx, step_id: s.id, type: s.type, status: "queued", output: null, finished_at: null })),
    };
    run.steps!.forEach((s) => { s.run_id = run.id; });
    runs.unshift(run);
    w.runs += 1;
    w.last_run = run.started_at;
    // steps finish one by one, so a poller sees them move; one without a contact fails like the Worker's would
    const needsContact = new Set(["contact.tag", "contact.untag", "contact.update", "object.save"]);
    let t = 400;
    setTimeout(() => { run.status = "running"; }, t);
    for (const step of run.steps!) {
      t += 600;
      setTimeout(() => {
        if (run.status !== "running") return;
        step.status = "running";
        if (needsContact.has(step.type) && !run.contact_id) {
          step.status = "failed";
          step.output = { error: "The event has no contact" };
          step.finished_at = now();
          run.status = "failed";
          run.error = `${step.type}: the event has no contact`;
          run.finished_at = now();
          return;
        }
        step.status = "completed";
        step.output = step.type === "http.request" ? { status: 200 } : step.type === "condition" ? { matched: true } : step.type === "wait" ? { seconds: Number(w.definition.steps[step.idx].input.seconds) || 0 } : w.definition.steps[step.idx].input;
        step.finished_at = now();
      }, t);
    }
    t += 300;
    setTimeout(() => { if (run.status === "running") { run.status = "completed"; run.finished_at = now(); } }, t);
    return clone(run);
  },
  async listRuns(query: RunQuery = {}) {
    await delay();
    let list = runs.slice();
    if (query.workflowId) list = list.filter((r) => r.workflow_id === query.workflowId);
    if (query.hookId) list = list.filter((r) => r.hook_id === query.hookId);
    list.sort((a, b) => (a.started_at < b.started_at ? 1 : -1));
    return clone(list.slice(0, query.limit ?? 50).map(({ steps: _s, ...r }) => r));
  },
  async getRun(id) {
    await delay();
    const r = runs.find((x) => x.id === id);
    return r ? clone(r) : null;
  },

  // ---- secrets ----
  async secretsStatus() {
    await delay();
    return { ready: true, count: secretRows.length };
  },
  async listSecrets() {
    await delay();
    return clone(secretRows);
  },
  async setSecret(appId: string | null, input: SecretInput) {
    await delay();
    const name = input.name.trim();
    if (!SECRET_NAME.test(name)) throw new Error("A secret's name is upper case letters, digits and underscores, like STRIPE_SECRET_KEY.");
    if (!input.value) throw new Error("A secret needs a value.");
    secretValues.set(name, input.value);
    const cur = secretRows.find((s) => s.name === name);
    if (cur) {
      Object.assign(cur, { hint: hintOf(input.value), description: input.description === undefined ? cur.description : input.description || null, app_id: appId, updated_at: now() });
      return clone(cur);
    }
    const row: SecretMeta = { name, hint: hintOf(input.value), description: input.description || null, app_id: appId, created_at: now(), updated_at: now() };
    secretRows.push(row);
    secretRows.sort((a, b) => a.name.localeCompare(b.name));
    return clone(row);
  },
  async removeSecret(name) {
    await delay();
    const i = secretRows.findIndex((s) => s.name === name);
    if (i >= 0) secretRows.splice(i, 1);
    secretValues.delete(name);
  },
  async getSecret(name) {
    await delay();
    return secretValues.get(name) ?? null;
  },

  // ---- assets ----
  async mediaConfig(): Promise<MediaConfig> {
    await delay();
    return { images: true, stream: true, files: true, imagesHash: "mockhash", streamCustomer: "customer-mock", streamBasicLimit: 200 * 1024 * 1024, imageLimit: 10 * 1024 * 1024 };
  },
  async listAssets(query: AssetQuery = {}): Promise<AssetPage> {
    await delay();
    let list = assets.slice();
    const kinds = query.kind ? (Array.isArray(query.kind) ? query.kind : [query.kind]) : null;
    if (kinds?.length) list = list.filter((a) => kinds.includes(a.kind));
    if (query.status) list = list.filter((a) => a.status === query.status);
    if (query.folder !== undefined) list = list.filter((a) => a.folder === query.folder);
    if (query.folderPrefix) list = list.filter((a) => a.folder === query.folderPrefix || a.folder.startsWith(query.folderPrefix === "/" ? "/" : `${query.folderPrefix}/`));
    if (query.tags?.length) list = list.filter((a) => query.tags!.every((t) => a.tags.includes(t)));
    if (query.appId) list = list.filter((a) => a.app_id === query.appId);
    if (query.search) {
      const s = query.search.toLowerCase();
      list = list.filter((a) => a.name.toLowerCase().includes(s) || lower(a.title).includes(s) || lower(a.alt).includes(s));
    }
    const sort = query.sort ?? "created_at";
    const dir = query.dir ?? "desc";
    list.sort((a, b) => {
      const x = a[sort];
      const y = b[sort];
      const r = typeof x === "number" && typeof y === "number" ? x - y : lower(x) < lower(y) ? -1 : lower(x) > lower(y) ? 1 : 0;
      return dir === "desc" ? -r : r;
    });
    return page(list, query.limit, query.offset);
  },
  async getAsset(id) {
    await delay();
    const a = assets.find((x) => x.id === id);
    return a ? clone(a) : null;
  },
  async listAssetFolders(): Promise<AssetFolder[]> {
    await delay();
    const counts = new Map<string, number>();
    for (const a of assets) counts.set(a.folder, (counts.get(a.folder) ?? 0) + 1);
    return [...counts].map(([path, count]) => ({ path, count })).sort((a, b) => a.path.localeCompare(b.path));
  },
  async createUpload(appId, input: UploadInput): Promise<UploadTicket> {
    await delay();
    const mime = input.mime ?? "";
    const kind = input.kind ?? (mime.startsWith("image/") ? "image" : mime.startsWith("video/") ? "video" : mime.startsWith("audio/") ? "audio" : "file");
    const asset = assetRow({ id: nid(), kind, name: input.name, mime: input.mime ?? null, size: input.size ?? null, folder: input.folder ?? "/", tags: input.tags ?? [], title: input.title ?? null, alt: input.alt ?? null, meta: input.meta ?? {}, status: "pending", app_id: appId === "desktop" ? null : appId, created_at: now(), updated_at: now() });
    assets.unshift(asset);
    return { asset: clone(asset), upload: kind === "file" ? { method: "put", url: `https://uploads.example.com/${asset.id}` } : { method: "form", url: `https://uploads.example.com/${asset.id}`, field: "file" }, expires_at: new Date(Date.now() + 36e5).toISOString() };
  },
  async completeUpload(_appId, id, done: UploadDone = {}) {
    await delay();
    const a = assets.find((x) => x.id === id);
    if (!a) throw new Error(`No asset ${id}`);
    Object.assign(a, { status: "ready", width: done.width ?? a.width, height: done.height ?? a.height, duration: done.duration ?? a.duration, size: done.size ?? a.size, mime: done.mime ?? a.mime, updated_at: now() });
    return clone(a);
  },
  async refreshAsset(id) {
    await delay();
    const a = assets.find((x) => x.id === id);
    if (!a) throw new Error(`No asset ${id}`);
    if (a.status === "processing") a.status = "ready";
    return clone(a);
  },
  async saveAsset(_appId, input: AssetInput) {
    await delay();
    const a = assets.find((x) => x.id === input.id);
    if (!a) throw new Error(`No asset ${input.id}`);
    Object.assign(a, { name: input.name ?? a.name, title: input.title === undefined ? a.title : input.title, alt: input.alt === undefined ? a.alt : input.alt, folder: input.folder ?? a.folder, tags: input.tags ?? a.tags, meta: input.meta ?? a.meta, updated_at: now() });
    return clone(a);
  },
  async removeAssets(_appId, ids) {
    await delay();
    for (const id of ids) {
      const i = assets.findIndex((x) => x.id === id);
      if (i >= 0) assets.splice(i, 1);
    }
  },
  async mediaAnalytics(spec: MediaAnalyticsSpec = {}): Promise<MediaAnalyticsRow[]> {
    await delay();
    const videos = assets.filter((a) => a.kind === "video" && (!spec.assetId || a.id === spec.assetId));
    const by = spec.groupBy ?? "asset";
    if (by === "asset") return videos.map((a) => ({ key: a.id, asset: { id: a.id, name: a.name, title: a.title, kind: a.kind, urls: a.urls }, minutes: 128, views: 41 })).slice(0, spec.limit ?? 50);
    if (by === "country") return [{ key: "US", minutes: 80, views: 25 }, { key: "DE", minutes: 30, views: 10 }, { key: "SE", minutes: 18, views: 6 }].slice(0, spec.limit ?? 50);
    return Array.from({ length: spec.days ?? 7 }, (_, i) => ({ key: ago(i).slice(0, 10), minutes: 10 + Math.floor(rand() * 20), views: 3 + Math.floor(rand() * 6) })).reverse().slice(0, spec.limit ?? 50);
  },
};
