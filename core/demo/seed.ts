// The demo workspace's sample data: one made-up business, Fernwood Ceramics, a small pottery studio that sells online and
// to a few shops, three weeks after launching its spring collection with a waitlist. The desktop's demo (app/src/main/demo.ts)
// writes it into a fresh local D1, so every screen reads it the way it reads a real workspace's rows.
//
// Deterministic: the same seed gives the same people, orders and visits, so numbers stay comparable between resets. Dates
// are laid out backwards from `now`, so "the last 30 days" is never empty. Rows go in as plain SQL; workflows go through
// the workspace's own `saveWorkflow`, which validates them and keeps their hooks in step.

export const DEMO_NAME = "Fernwood Ceramics";
/** The app folders the demo adds to the repo, made from core/templates/app and renamed (see demo.ts). */
export const DEMO_APPS = [
  { id: "blog", name: "Journal", mount: "/journal", color: "#b4673f", description: "The studio journal: process notes, glaze tests and launch news.", label: "Post", plural: "Posts" },
] as const;

export type DemoSeed = {
  /** Statements for `/_ws/dev/sql`, in order: core rows first, then the apps' rows (their tables exist once the apps have run). */
  core: string[];
  apps: string[];
  /** Workspace RPC calls made after the rows are in. */
  rpc: { method: string; args: unknown[] }[];
  counts: Record<string, number>;
};

// ---- a seeded random source ----

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ALPHABET = "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";

// ---- the business ----

const FIRST = ["Ava", "Noah", "Maya", "Leo", "Isla", "Ezra", "Nora", "Theo", "Ruby", "Felix", "Hazel", "Jonah", "Iris", "Milo", "June", "Silas", "Clara", "Otis", "Willa", "Arlo", "Elena", "Kai", "Lucia", "Remy", "Priya", "Tomas", "Amara", "Hugo", "Sana", "Elliot", "Freya", "Mateo", "Ines", "Rowan", "Yara", "Caleb", "Nina", "Idris", "Greta", "Omar", "Lena", "Jasper", "Mina", "Bruno", "Ada", "Wren", "Rafael", "Esme", "Kofi", "Talia"];
const LAST = ["Alvarez", "Brennan", "Chen", "Dubois", "Eriksen", "Fischer", "Garcia", "Haddad", "Ito", "Jensen", "Kowalski", "Larsen", "Moreau", "Nakamura", "Okafor", "Patel", "Quinn", "Rossi", "Silva", "Tanaka", "Underwood", "Varga", "Whitlock", "Yilmaz", "Zimmer", "Abbott", "Bishop", "Castillo", "Delgado", "Ellison", "Farouk", "Gallagher", "Holm", "Ibarra", "Keller", "Lindqvist", "Marsh", "Novak", "Osei", "Price"];
const DOMAINS = ["gmail.com", "icloud.com", "outlook.com", "proton.me", "fastmail.com", "yahoo.com", "hey.com"];
const CITIES: [string, string, string, string][] = [
  ["Portland", "OR", "US", "America/Los_Angeles"], ["Seattle", "WA", "US", "America/Los_Angeles"], ["Brooklyn", "NY", "US", "America/New_York"], ["Austin", "TX", "US", "America/Chicago"],
  ["Oakland", "CA", "US", "America/Los_Angeles"], ["Chicago", "IL", "US", "America/Chicago"], ["Denver", "CO", "US", "America/Denver"], ["Toronto", "ON", "CA", "America/Toronto"],
  ["Vancouver", "BC", "CA", "America/Vancouver"], ["London", "ENG", "GB", "Europe/London"], ["Melbourne", "VIC", "AU", "Australia/Melbourne"], ["Asheville", "NC", "US", "America/New_York"],
];
const SHOPS = ["Kiln & Co.", "The Good Table", "Saltbox Goods", "Marlow Home", "North Field Market", "Ember Supply"];
const GLAZES = ["Tide", "Moss", "Bone", "Ember", "Ink"];
const PRODUCTS: [string, number, string][] = [
  ["Tide Mug", 38, "spring"], ["Moss Mug", 38, "spring"], ["Bone Dinner Plate", 46, "core"], ["Ember Serving Bowl", 92, "spring"], ["Ink Bud Vase", 54, "spring"],
  ["Tide Pasta Bowl", 44, "spring"], ["Bone Espresso Cup", 28, "core"], ["Moss Planter", 68, "core"], ["Seconds Box", 60, "core"], ["Glaze Sampler Set", 120, "spring"],
];
const PATHS: [string, number][] = [
  ["/", 30], ["/shop", 18], ["/shop/spring", 14], ["/journal", 8], ["/journal/glaze-tests-for-tide", 5], ["/journal/how-we-fire", 4], ["/journal/spring-collection-is-here", 7],
  ["/waitlist", 6], ["/about", 3], ["/wholesale", 2], ["/shop/tide-mug", 6], ["/shop/ember-serving-bowl", 4], ["/shop/seconds-box", 3],
];
const REFERRERS: [string | null, string | null, string | null, string | null, number][] = [
  // referrer, utm_source, utm_medium, utm_campaign, weight
  [null, null, null, null, 30], ["https://www.instagram.com/", "instagram", "social", "spring-launch", 24], ["https://www.google.com/", null, null, null, 18],
  ["https://www.pinterest.com/", "pinterest", "social", null, 9], [null, "newsletter", "email", "spring-launch", 11], [null, "newsletter", "email", "journal-digest", 5],
  ["https://www.tiktok.com/", "tiktok", "social", "studio-tour", 6], ["https://news.ycombinator.com/", null, null, null, 1],
];
const DEVICES: [string, string, number][] = [
  ["mobile", "Mozilla/5.0 (iPhone; CPU iPhone OS 19_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.1 Mobile/15E148 Safari/604.1", 58],
  ["desktop", "Mozilla/5.0 (Macintosh; Intel Mac OS X 15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.1 Safari/605.1.15", 30],
  ["desktop", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36", 9],
  ["tablet", "Mozilla/5.0 (iPad; CPU OS 19_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.1 Mobile/15E148 Safari/604.1", 3],
];

const POSTS: { slug: string; title: string; status: "draft" | "published"; daysAgo: number; body: string }[] = [
  { slug: "spring-collection-is-here", title: "The Spring Collection Is Here", status: "published", daysAgo: 21, body: "Five glazes, eleven pieces, and a lot of test tiles. The spring collection opens today for everyone on the waitlist first, then the rest of the shop at noon.\n\nTide is the one we kept coming back to: a pale blue-green that pools dark where the clay curves. Moss and Ember sit beside it, with Bone and Ink carried over from last year." },
  { slug: "glaze-tests-for-tide", title: "Forty Test Tiles for One Blue", status: "published", daysAgo: 34, body: "Tide took forty tiles and three firings to land. The first versions ran off the pots entirely; the last ones break just enough over the rims. Here is every tile, in order, and what we changed each time." },
  { slug: "how-we-fire", title: "How We Fire", status: "published", daysAgo: 48, body: "Everything we make goes through two firings: a bisque to 1000°C, then a glaze firing to cone 6. A full kiln is about sixty pieces and takes a day and a half from loading to unloading." },
  { slug: "waitlist-opens", title: "The Waitlist Is Open", status: "published", daysAgo: 30, body: "The spring collection is small, so the waitlist gets a day's head start. Join and you get a note the morning it opens, plus a code for free shipping on your first order." },
  { slug: "studio-tour", title: "A Tour of the Studio", status: "published", daysAgo: 62, body: "Two wheels, one slab roller, a kiln named Gus, and a wall of shelves that is never quite big enough. A short tour, with a lot of drying pots." },
  { slug: "seconds-box", title: "Why We Sell Seconds", status: "published", daysAgo: 75, body: "A second is a piece with a flaw you would notice: a glaze crawl, a small warp, a dark spot. They work as well as anything we make. The seconds box is how they find a table instead of the bin." },
  { slug: "wholesale", title: "Now Stocking Six Shops", status: "published", daysAgo: 12, body: "Our pieces are now on shelves in six shops, from Portland to Asheville. If you run a shop and want to carry the spring collection, the wholesale page has the details." },
  { slug: "caring-for-stoneware", title: "Caring for Stoneware", status: "published", daysAgo: 88, body: "Dishwasher safe, microwave safe, oven safe up to 200°C. Avoid going straight from the fridge to a hot oven. That is the whole guide." },
  { slug: "summer-glazes", title: "Summer Glazes: First Tests", status: "draft", daysAgo: 3, body: "Two new glazes in testing: a warm yellow we are calling Straw and a deep red that keeps coming out brown. Notes so far." },
  { slug: "packaging", title: "New Packaging, Less Plastic", status: "draft", daysAgo: 6, body: "We moved to molded paper inserts. Breakage is down, plastic is gone, and the boxes stack better in the studio." },
  { slug: "market-days", title: "Market Days This Summer", status: "draft", daysAgo: 1, body: "Where to find us in person this summer. Dates to confirm." },
];

const SKILLS = [
  { id: "brand-voice", title: "Brand Voice", content: "Write like the studio talks: plain, warm, specific. Short sentences. Name the clay, the glaze and the firing instead of using adjectives like 'stunning' or 'artisanal'. No exclamation marks. Prices in USD with no cents when they are whole." },
  { id: "product-alt-text", title: "Product Photo Alt Text", content: "Alt text for product photos: the piece, its glaze and what is around it, in under 120 characters. Example: 'Tide mug with pale blue-green glaze pooling dark at the base, on a linen cloth.'" },
  { id: "wholesale-replies", title: "Wholesale Replies", content: "When a shop asks about wholesale: thank them, link /wholesale, say the minimum order is $400 and lead time is three weeks, and offer a call. Tag the contact 'wholesale' and set wholesale_company." },
];

// ---- SQL ----

const lit = (v: unknown): string => {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "NULL";
  if (typeof v === "boolean") return v ? "1" : "0";
  const s = typeof v === "string" ? v : JSON.stringify(v);
  return `'${s.replace(/'/g, "''")}'`;
};

/** Multi-row INSERTs of at most `per` rows, so each statement stays well under D1's size limit. */
function inserts(table: string, cols: string[], rows: unknown[][], per = 150, verb = "INSERT"): string[] {
  const out: string[] = [];
  for (let i = 0; i < rows.length; i += per) {
    const values = rows.slice(i, i + per).map((r) => `(${r.map(lit).join(", ")})`).join(",\n");
    out.push(`${verb} INTO ${table} (${cols.join(", ")}) VALUES\n${values}`);
  }
  return out;
}

const DAY = 86_400_000;

export function demoSeed(now: Date = new Date(), seed = 20261103): DemoSeed {
  const r = rng(seed);
  const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(r() * xs.length)]!;
  const weighted = <T extends readonly unknown[]>(xs: readonly T[]): T => {
    const total = xs.reduce((s, x) => s + (x[x.length - 1] as number), 0);
    let n = r() * total;
    for (const x of xs) if ((n -= x[x.length - 1] as number) <= 0) return x;
    return xs[xs.length - 1]!;
  };
  const id = (size = 15) => Array.from({ length: size }, () => ALPHABET[Math.floor(r() * 64)]).join("");
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).getTime();
  /** A moment `days` back from now, at a plausible hour of the day (studio customers browse in the evening). */
  const at = (days: number, hourBias = 0): number => {
    const day = today - Math.floor(days) * DAY;
    const hour = Math.min(23, Math.max(6, Math.round(8 + r() * 12 + hourBias + (r() < 0.35 ? 3 : 0))));
    const t = day + hour * 3_600_000 + Math.floor(r() * 3_600_000);
    // today only has the hours that have passed: spread over those rather than piling up at "just now"
    return t < now.getTime() - 60_000 ? t : day + Math.floor(r() * Math.max(60_000, now.getTime() - 60_000 - day));
  };
  const iso = (ms: number) => new Date(ms).toISOString();
  const LAUNCH = 21;

  // ---- contacts ----
  type C = { id: string; email: string; name: string; source: string; created: number; tags: string[]; props: Record<string, unknown>; city: (typeof CITIES)[number] };
  const contacts: C[] = [];
  const emails = new Set<string>();
  for (let i = 0; i < 248; i++) {
    const first = pick(FIRST), last = pick(LAST);
    let email = `${first}.${last}`.toLowerCase().replace(/[^a-z.]/g, "");
    if (r() < 0.3) email = `${first[0]}${last}`.toLowerCase();
    if (r() < 0.2) email += Math.floor(r() * 90 + 10);
    email = `${email}@${pick(DOMAINS)}`;
    if (emails.has(email)) { i--; continue; }
    emails.add(email);
    // a third came before the launch, half around it (the waitlist), the rest since
    const phase = r();
    const days = phase < 0.32 ? 30 + r() * 90 : phase < 0.78 ? LAUNCH + 9 - r() * 12 : r() * (LAUNCH - 2);
    const source = days > 30 ? weighted([["instagram", 4], ["shop", 3], ["market", 2], ["referral", 1]] as const)[0] : days > LAUNCH - 3 ? "waitlist" : weighted([["shop", 4], ["instagram", 3], ["journal", 2], ["referral", 1]] as const)[0];
    const city = pick(CITIES);
    contacts.push({ id: id(), email, name: `${first} ${last}`, source, created: at(days), tags: [], props: { city: city[0] }, city });
  }
  // a few shops, on wholesale
  for (const shop of SHOPS) {
    const first = pick(FIRST), last = pick(LAST);
    const city = pick(CITIES);
    const email = `${first.toLowerCase()}@${shop.toLowerCase().replace(/[^a-z]+/g, "")}.com`;
    contacts.push({ id: id(), email, name: `${first} ${last}`, source: "wholesale", created: at(14 + r() * 50), tags: ["wholesale"], props: { city: city[0], wholesale_company: shop }, city });
  }
  contacts.sort((a, b) => a.created - b.created);

  // ---- orders, from the people who bought ----
  type O = { contact: C; ts: number; items: [string, number][]; total: number };
  const orders: O[] = [];
  for (const c of contacts) {
    const buyer = c.tags.includes("wholesale") ? 1 : c.source === "waitlist" ? 0.62 : c.source === "shop" ? 0.7 : 0.38;
    if (r() > buyer) continue;
    const n = c.tags.includes("wholesale") ? 2 + Math.floor(r() * 3) : 1 + (r() < 0.3 ? 1 : 0) + (r() < 0.1 ? 1 : 0);
    const age = (now.getTime() - c.created) / DAY;
    for (let k = 0; k < n; k++) {
      // waitlist buyers bunch up on launch day
      const daysAgo = c.source === "waitlist" && k === 0 && r() < 0.6 ? LAUNCH - r() * 1.5 : Math.max(0.1, age - r() * age);
      const lines = c.tags.includes("wholesale") ? 3 + Math.floor(r() * 4) : 1 + Math.floor(r() * 2.4);
      const items: [string, number][] = [];
      for (let l = 0; l < lines; l++) {
        const p = daysAgo <= LAUNCH ? pick(PRODUCTS) : pick(PRODUCTS.filter((x) => x[2] === "core"));
        items.push([p[0], c.tags.includes("wholesale") ? 6 + Math.floor(r() * 10) : 1]);
      }
      const total = items.reduce((s, [name, q]) => s + PRODUCTS.find((p) => p[0] === name)![1] * q * (c.tags.includes("wholesale") ? 0.5 : 1), 0);
      orders.push({ contact: c, ts: at(daysAgo, 2), items, total: Math.round(total) });
    }
  }
  for (const c of contacts) {
    const mine = orders.filter((o) => o.contact === c);
    c.props.orders = mine.length;
    c.props.lifetime_value = mine.reduce((s, o) => s + o.total, 0);
    if (mine.length) c.tags.push("customer");
    if (c.source === "waitlist") c.tags.push("waitlist");
    if (r() < 0.55) c.tags.push("newsletter");
    if ((c.props.lifetime_value as number) >= 250 && !c.tags.includes("wholesale")) c.tags.push("vip");
    if (mine.length && r() < 0.7) c.props.favorite_glaze = pick(GLAZES);
    if (!mine.length && c.created < today - 60 * DAY && r() < 0.5) c.tags.push("lapsed");
  }

  // ---- events: visits, sign-ups, orders ----
  const E_COLS = ["id", "name", "app_id", "ts", "contact_id", "anonymous_id", "session_id", "url", "path", "referrer", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "country", "region", "city", "timezone", "user_agent", "device", "props"];
  const events: unknown[][] = [];
  const site = "https://fernwood.example";
  type Visit = { anon: string; session: string; ref: (typeof REFERRERS)[number]; device: (typeof DEVICES)[number]; city: (typeof CITIES)[number] };
  const visit = (city = pick(CITIES)): Visit => ({ anon: id(21), session: id(12), ref: weighted(REFERRERS), device: weighted(DEVICES), city });
  const event = (name: string, app: string, ts: number, v: Visit, path: string | null, props: Record<string, unknown>, contact: string | null = null) =>
    events.push([id(), name, app, iso(ts), contact, v.anon, v.session, path ? `${site}${path}` : null, path, v.ref[0], v.ref[1], v.ref[2], v.ref[3], null, null, v.city[2], v.city[1], v.city[0], v.city[3], v.device[1], v.device[0], props]);
  const appOf = (path: string) => (path.startsWith("/journal") ? "blog" : "site");
  for (let d = 89; d >= 0; d--) {
    const date = new Date(today - d * DAY);
    const weekend = date.getUTCDay() === 0 || date.getUTCDay() === 6;
    const launch = d <= LAUNCH ? 1 + 3.2 * Math.exp(-(LAUNCH - d) / 3.5) : 1;
    const preLaunch = d > LAUNCH && d <= LAUNCH + 9 ? 1.5 : 1;
    const visits = Math.round((14 + (89 - d) * 0.16) * (weekend ? 1.3 : 1) * launch * preLaunch * (0.8 + r() * 0.4));
    for (let k = 0; k < visits; k++) {
      const v = visit();
      let ts = at(d);
      event("session.start", appOf("/"), ts, v, null, {});
      const pages = 1 + Math.floor(r() * r() * 5);
      for (let p = 0; p < pages; p++) {
        const path = d > LAUNCH && r() < 0.5 ? pick(["/", "/waitlist", "/journal/glaze-tests-for-tide", "/shop", "/about"]) : weighted(PATHS)[0];
        event("page.view", appOf(path), ts, v, path, { title: path === "/" ? "Fernwood Ceramics" : path.split("/").pop()!.replace(/-/g, " ") });
        ts += 20_000 + Math.floor(r() * 120_000);
      }
    }
  }
  for (const c of contacts) {
    if (c.created < today - 89 * DAY) continue;
    const v = visit(c.city);
    v.ref = c.source === "instagram" ? REFERRERS[1]! : c.source === "waitlist" ? weighted(REFERRERS.slice(0, 5)) : v.ref;
    const path = c.source === "waitlist" ? "/waitlist" : c.source === "journal" ? "/journal/spring-collection-is-here" : c.source === "wholesale" ? "/wholesale" : "/shop";
    event("page.view", appOf(path), c.created - 90_000, v, path, { title: path.slice(1) });
    if (c.source === "waitlist") event("waitlist.joined", "site", c.created - 5_000, v, path, { collection: "spring" }, c.id);
    event("contact.created", "core", c.created, v, null, { email: c.email, source: c.source }, c.id);
  }
  for (const o of orders) {
    if (o.ts < today - 89 * DAY) continue;
    const v = visit(o.contact.city);
    event("page.view", "site", o.ts - 240_000, v, "/shop/spring", { title: "spring" }, o.contact.id);
    event("checkout.started", "site", o.ts - 60_000, v, "/checkout", { value: o.total }, o.contact.id);
    event("order.placed", "site", o.ts, v, "/checkout/thanks", { order: `FW-${1000 + orders.indexOf(o)}`, value: o.total, currency: "USD", items: o.items.map(([n, q]) => ({ name: n, qty: q })), wholesale: o.contact.tags.includes("wholesale") }, o.contact.id);
  }
  // abandoned checkouts, so a funnel has a drop
  for (let k = 0; k < 70; k++) {
    const v = visit();
    const ts = at(r() * 60);
    event("page.view", "site", ts - 120_000, v, "/shop/spring", { title: "spring" });
    event("checkout.started", "site", ts, v, "/checkout", { value: pick(PRODUCTS)[1] });
  }
  events.sort((a, b) => String(a[3]).localeCompare(String(b[3])));

  // ---- statements ----
  const core: string[] = [];
  core.push(...inserts("contact_fields", ["key", "label", "type", "options", "indexed"], [
    ["city", "City", "text", null, 0],
    ["orders", "Orders", "number", null, 1],
    ["lifetime_value", "Lifetime Value", "number", null, 1],
    ["favorite_glaze", "Favorite Glaze", "select", JSON.stringify(GLAZES), 0],
    ["wholesale_company", "Shop", "text", null, 0],
  ], 150, "INSERT OR REPLACE"));
  core.push(...inserts("contacts", ["id", "email", "name", "source", "props", "created_at", "updated_at"], contacts.map((c) => [c.id, c.email, c.name, c.source, c.props, iso(c.created), iso(Math.max(c.created, ...orders.filter((o) => o.contact === c).map((o) => o.ts)))])));
  core.push(...inserts("contact_tags", ["contact_id", "tag", "created_at"], contacts.flatMap((c) => c.tags.map((t) => [c.id, t, iso(c.created)]))));
  const seg = (sid: string, name: string, kind: "dynamic" | "static", filter: unknown, days: number) => [sid, name, kind, filter, iso(today - days * DAY), iso(today - days * DAY)];
  const springWaitlist = contacts.filter((c) => c.source === "waitlist");
  core.push(...inserts("segments", ["id", "name", "kind", "filter", "created_at", "updated_at"], [
    seg("customers", "Customers", "dynamic", { tags: ["customer"] }, 80),
    seg("vip", "VIP", "dynamic", { tags: ["vip"] }, 40),
    seg("wholesale", "Wholesale Shops", "dynamic", { tags: ["wholesale"] }, 50),
    seg("waitlist-not-bought", "Waitlist, Not Bought Yet", "dynamic", { tags: ["waitlist"], props: [{ field: "orders", op: "eq", value: 0 }] }, 18),
    seg("lapsed", "Lapsed Subscribers", "dynamic", { tags: ["lapsed"] }, 30),
    seg("spring-launch", "Spring Launch Waitlist", "static", {}, LAUNCH + 9),
  ]));
  core.push(...inserts("segment_members", ["segment_id", "contact_id", "added_at"], springWaitlist.map((c) => ["spring-launch", c.id, iso(c.created)])));
  core.push(...inserts("events", E_COLS, events, 120));
  core.push(...inserts("settings", ["key", "value"], [["site.name", JSON.stringify(DEMO_NAME)], ["site.currency", JSON.stringify("USD")]], 10, "INSERT OR REPLACE"));
  // the same shape the Skills page makes (app/src/renderer/app/lib/skills.ts)
  // two reports, kept the way the Reports pages keep them (app/src/renderer/app/lib/reports.ts): a settings row each
  const rule = (field: string, value: string) => ({ field, operator: "=", value });
  const q = (...rules: ReturnType<typeof rule>[]) => ({ combinator: "and", rules });
  const block = (id: string, title: string, kind: string, table: string, query: unknown, extra: Record<string, unknown> = {}) => ({ id, title, kind, table, query, metric: "count", limit: 10, span: kind === "number" ? 1 : 2, ...extra });
  const report = (id: string, name: string, description: string, blocks: unknown[]) => [`report:${id}`, JSON.stringify({ id, name, description, blocks, created_at: iso(today - 18 * DAY), updated_at: iso(today - 2 * DAY) })];
  core.push(...inserts("settings", ["key", "value"], [
    report("spring-launch", "Spring Launch", "Visits, sign-ups and orders since the waitlist opened.", [
      block("contacts", "Contacts", "number", "contacts", q()),
      block("orders", "Orders", "number", "events", q(rule("name", "order.placed"))),
      block("visits", "Visits per Day", "line", "events", q(rule("name", "session.start")), { groupBy: "ts" }),
      block("orders-day", "Orders per Day", "line", "events", q(rule("name", "order.placed")), { groupBy: "ts" }),
      block("sources", "Where Contacts Came From", "bar", "contacts", q(), { groupBy: "source", span: 1 }),
      block("devices", "Visits by Device", "bar", "events", q(rule("name", "session.start")), { groupBy: "device", span: 1 }),
    ]),
    report("journal", "Journal", "What people read in the studio journal.", [
      block("published", "Published Posts", "number", "app_blog_item", q(rule("status", "published"))),
      block("drafts", "Drafts", "number", "app_blog_item", q(rule("status", "draft"))),
      block("top", "Most Read Pages", "bar", "events", q(rule("name", "page.view"), rule("app_id", "blog")), { groupBy: "path", limit: 8 }),
    ]),
  ], 10, "INSERT OR REPLACE"));
  core.push("CREATE TABLE IF NOT EXISTS skills (id TEXT PRIMARY KEY, title TEXT NOT NULL, content TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')))");
  core.push(...inserts("skills", ["id", "title", "content"], SKILLS.map((s) => [s.id, s.title, s.content]), 50, "INSERT OR REPLACE"));

  const apps: string[] = [];
  apps.push(...inserts("app_blog_item", ["id", "title", "body", "status", "contact_id", "created_at", "updated_at"], POSTS.map((p) => [p.slug, p.title, p.body, p.status, null, iso(at(p.daysAgo)).replace("T", " ").slice(0, 19), iso(at(Math.max(0, p.daysAgo - 1))).replace("T", " ").slice(0, 19)])));

  const rpc: DemoSeed["rpc"] = [
    { method: "saveWorkflow", args: [{ id: "welcome-waitlist", name: "Welcome the Waitlist", enabled: true, definition: {
      trigger: { event: "waitlist.joined" },
      steps: [
        { id: "tag", type: "contact.tag", input: { tag: "waitlist" } },
        { id: "wait", type: "wait", input: { seconds: 3600 } },
        { id: "news", type: "contact.tag", input: { tag: "newsletter" } },
      ] } }] },
    { method: "saveWorkflow", args: [{ id: "big-order-vip", name: "Big Orders Become VIP", enabled: true, definition: {
      trigger: { event: "order.placed", when: [{ field: "props.value", op: "gte", value: 250 }] },
      steps: [{ id: "vip", type: "contact.tag", input: { tag: "vip" } }] } }] },
    { method: "saveWorkflow", args: [{ id: "wholesale-intake", name: "Wholesale Intake", enabled: false, definition: {
      trigger: { event: "contact.created", when: [{ field: "props.source", op: "eq", value: "wholesale" }] },
      steps: [
        { id: "tag", type: "contact.tag", input: { tag: "wholesale" } },
        { id: "only-shops", type: "condition", input: { when: JSON.stringify([{ field: "contact.source", op: "eq", value: "wholesale" }]) } },
      ] } }] },
  ];

  return {
    core,
    apps,
    rpc,
    counts: { contacts: contacts.length, orders: orders.length, events: events.length, posts: POSTS.length, segments: 6, workflows: rpc.length },
  };
}
