// Static data for the design POC. Shapes follow the real platform (ARCHITECTURE.md §6, §7)
// so screens can be ported later, but nothing here is loaded from a server.

export type Mode = "creator" | "agency" | "reseller";
export type Role = "owner" | "admin" | "editor" | "viewer";

export const modes: Mode[] = ["creator", "agency", "reseller"];

export const me = {
  id: "u_dylan",
  name: "Dylan Jones",
  email: "dylan@supergrid.dev",
  operator: true,
  initials: "DJ",
};

export const branding = { name: "SuperGrid", accent: "#e8604a" };

export type Org = { id: string; name: string; slug: string; role: Role; members: number; workspaces: number; createdAt: string };

export const orgs: Org[] = [
  { id: "acme", name: "Acme Studio", slug: "acme", role: "owner", members: 6, workspaces: 4, createdAt: "2026-03-02" },
  { id: "northwind", name: "Northwind Co", slug: "northwind", role: "editor", members: 3, workspaces: 1, createdAt: "2026-06-18" },
  { id: "lumen", name: "Lumen Labs", slug: "lumen", role: "viewer", members: 2, workspaces: 2, createdAt: "2026-09-27" },
];

export type Team = { id: string; name: string; memberIds: string[] };

export const teams: Team[] = [
  { id: "t_bluebird", name: "Bluebird Bakery", memberIds: ["u_mina"] },
  { id: "t_harbor", name: "Harbor Dental", memberIds: ["u_theo", "u_sam"] },
];

export type Member = { id: string; name: string; email: string; role: Role | string; joinedAt: string; initials: string };

export const members: Member[] = [
  { id: "u_dylan", name: "Dylan Jones", email: "dylan@supergrid.dev", role: "owner", joinedAt: "2026-03-02", initials: "DJ" },
  { id: "u_priya", name: "Priya Natarajan", email: "priya@acme.studio", role: "admin", joinedAt: "2026-03-04", initials: "PN" },
  { id: "u_mina", name: "Mina Okafor", email: "mina@bluebirdbakery.com", role: "editor", joinedAt: "2026-04-11", initials: "MO" },
  { id: "u_theo", name: "Theo Lindqvist", email: "theo@harbordental.co", role: "blog-editor", joinedAt: "2026-05-20", initials: "TL" },
  { id: "u_sam", name: "Sam Reyes", email: "sam@harbordental.co", role: "viewer", joinedAt: "2026-05-20", initials: "SR" },
  { id: "u_june", name: "June Park", email: "june@acme.studio", role: "editor", joinedAt: "2026-08-01", initials: "JP" },
];

export type Invitation = { id: string; email: string; role: Role; teamId?: string; sentAt: string; expiresIn: string };

export const invitations: Invitation[] = [
  { id: "inv_8f2a", email: "ava@bluebirdbakery.com", role: "editor", teamId: "t_bluebird", sentAt: "2026-10-29", expiresIn: "5 days" },
  { id: "inv_c01d", email: "kit@acme.studio", role: "admin", sentAt: "2026-10-30", expiresIn: "6 days" },
];

export const statement: Record<string, string[]> = {
  organization: ["update", "delete"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
  team: ["create", "update", "delete"],
  workspace: ["create", "update", "delete", "deploy"],
  app: ["install", "uninstall", "update"],
  settings: ["update"],
  secrets: ["update"],
  data: ["read", "export", "write"],
  content: ["read", "write"],
};

export type CustomRole = { role: string; description: string; permission: Record<string, string[]> };

export const customRoles: CustomRole[] = [
  { role: "blog-editor", description: "Writes in the blog app, reads data, touches nothing else.", permission: { content: ["read", "write"], data: ["read"] } },
  { role: "deployer", description: "Can ship app updates without member rights.", permission: { workspace: ["deploy"], app: ["update"], content: ["read"] } },
];

export type AppId = "pages" | "funnels" | "forms" | "hello";

export type CatalogApp = {
  id: AppId;
  name: string;
  tagline: string;
  mount: string;
  version: string;
  admin: boolean;
  nav: AppNavItem[];
};

// An app's admin nav. Items with children open as a dropdown in the app header.
export type AppNavItem = { label: string; path: string; children?: { label: string; path: string }[] };

export const catalog: CatalogApp[] = [
  {
    id: "pages",
    name: "Pages",
    tagline: "The site itself: pages, navigation, the theme.",
    mount: "/",
    version: "1.4.0",
    admin: true,
    nav: [
      { label: "Pages", path: "/" },
      { label: "Navigation", path: "/nav", children: [{ label: "Header", path: "/nav/header" }, { label: "Footer", path: "/nav/footer" }, { label: "Menus", path: "/nav/menus" }] },
      { label: "Media", path: "/media" },
      { label: "Theme", path: "/theme", children: [{ label: "Colors", path: "/theme/colors" }, { label: "Fonts", path: "/theme/fonts" }, { label: "Layout", path: "/theme/layout" }] },
    ],
  },
  {
    id: "funnels",
    name: "Funnels",
    tagline: "Landing pages and checkout steps under one mount.",
    mount: "/f",
    version: "0.9.2",
    admin: true,
    nav: [
      { label: "Funnels", path: "/" },
      { label: "Offers", path: "/offers", children: [{ label: "Products", path: "/offers/products" }, { label: "Coupons", path: "/offers/coupons" }] },
      { label: "Checkout", path: "/checkout" },
    ],
  },
  { id: "forms", name: "Forms", tagline: "One-question forms; answers become contacts.", mount: "/form", version: "0.3.1", admin: true, nav: [{ label: "Forms", path: "/" }, { label: "Answers", path: "/answers" }] },
  { id: "hello", name: "Hello", tagline: "The sample app that ships with the platform.", mount: "/hello", version: "0.1.0", admin: true, nav: [{ label: "Hello", path: "/" }] },
];

export type Install = { app: AppId; version: string; latest: string; worker: string; repo: string; upstream?: string; status: "ok" | "update" | "failed" | "deploying" };

export type Workspace = {
  id: string;
  name: string;
  url: string;
  provider: "cloudflare" | "local";
  orgId: string;
  teamId?: string;
  role: Role;
  installs: Install[];
  contacts: number;
  lastDeploy: string;
  theme: { accent: string; bg: string; fg: string; font: string };
};

export const workspaces: Workspace[] = [
  {
    id: "acme", name: "Acme Studio", url: "https://acme.studio", provider: "cloudflare", orgId: "acme", role: "owner", contacts: 1284, lastDeploy: "2 hours ago",
    theme: { accent: "#6d5dfc", bg: "#ffffff", fg: "#111111", font: "Cal Sans" },
    installs: [
      { app: "pages", version: "1.4.0", latest: "1.4.0", worker: "sg-acme-pages", repo: "sg/acme-pages", upstream: "supergrid/app-pages", status: "ok" },
      { app: "funnels", version: "0.9.0", latest: "0.9.2", worker: "sg-acme-funnels", repo: "sg/acme-funnels", upstream: "supergrid/app-funnels", status: "update" },
      { app: "forms", version: "0.3.1", latest: "0.3.1", worker: "sg-acme-forms", repo: "sg/acme-forms", upstream: "supergrid/app-forms", status: "ok" },
    ],
  },
  {
    id: "bluebird", name: "Bluebird Bakery", url: "https://bluebirdbakery.com", provider: "cloudflare", orgId: "acme", teamId: "t_bluebird", role: "owner", contacts: 312, lastDeploy: "yesterday",
    theme: { accent: "#e0a63b", bg: "#fffaf2", fg: "#2b1d0e", font: "Cal Sans" },
    installs: [
      { app: "pages", version: "1.4.0", latest: "1.4.0", worker: "sg-bluebird-pages", repo: "sg/bluebird-pages", upstream: "supergrid/app-pages", status: "ok" },
      { app: "forms", version: "0.2.8", latest: "0.3.1", worker: "sg-bluebird-forms", repo: "sg/bluebird-forms", upstream: "supergrid/app-forms", status: "update" },
    ],
  },
  {
    id: "harbor", name: "Harbor Dental", url: "https://harbordental.co", provider: "cloudflare", orgId: "acme", teamId: "t_harbor", role: "owner", contacts: 98, lastDeploy: "4 days ago",
    theme: { accent: "#0e7490", bg: "#ffffff", fg: "#0f172a", font: "Inter" },
    installs: [
      { app: "pages", version: "1.3.2", latest: "1.4.0", worker: "sg-harbor-pages", repo: "sg/harbor-pages", upstream: "supergrid/app-pages", status: "deploying" },
      { app: "funnels", version: "0.9.2", latest: "0.9.2", worker: "sg-harbor-funnels", repo: "sg/harbor-funnels", status: "failed" },
    ],
  },
  {
    id: "local", name: "Local dev", url: "http://localhost:5301", provider: "local", orgId: "acme", role: "owner", contacts: 3, lastDeploy: "never",
    theme: { accent: "#6d5dfc", bg: "#ffffff", fg: "#111111", font: "Cal Sans" },
    installs: [{ app: "hello", version: "0.1.0", latest: "0.1.0", worker: "app-hello", repo: "local", status: "ok" }],
  },
];

export const contacts = [
  { id: "c1", email: "lena@example.com", source: "forms · newsletter", when: "12 min ago" },
  { id: "c2", email: "marco@studio.io", source: "funnels · spring-offer", when: "1 hour ago" },
  { id: "c3", email: "ola@north.se", source: "forms · contact", when: "3 hours ago" },
  { id: "c4", email: "jess@bluebird.co", source: "pages · footer", when: "yesterday" },
];

export const activity = [
  { id: "a1", who: "Priya Natarajan", what: "deployed Funnels 0.9.2 to Harbor Dental", when: "10 min ago", kind: "deploy" as const },
  { id: "a2", who: "sg CLI (Dylan)", what: "installed Forms into Bluebird Bakery", when: "2 hours ago", kind: "install" as const },
  { id: "a3", who: "Mina Okafor", what: "changed the Bluebird Bakery theme accent", when: "yesterday", kind: "settings" as const },
  { id: "a4", who: "Dylan Jones", what: "invited ava@bluebirdbakery.com as editor", when: "2 days ago", kind: "member" as const },
];

export type PlatformUser = { id: string; name: string; email: string; operator: boolean; banned: boolean; orgs: number; lastSeen: string; initials: string };

export const platformUsers: PlatformUser[] = [
  { id: "u_dylan", name: "Dylan Jones", email: "dylan@supergrid.dev", operator: true, banned: false, orgs: 3, lastSeen: "now", initials: "DJ" },
  { id: "u_priya", name: "Priya Natarajan", email: "priya@acme.studio", operator: false, banned: false, orgs: 1, lastSeen: "12 min ago", initials: "PN" },
  { id: "u_mina", name: "Mina Okafor", email: "mina@bluebirdbakery.com", operator: false, banned: false, orgs: 1, lastSeen: "yesterday", initials: "MO" },
  { id: "u_theo", name: "Theo Lindqvist", email: "theo@harbordental.co", operator: false, banned: false, orgs: 2, lastSeen: "3 days ago", initials: "TL" },
  { id: "u_spam", name: "Promo Bot", email: "offers@cheap-seo.biz", operator: false, banned: true, orgs: 0, lastSeen: "2 weeks ago", initials: "PB" },
];

export const passkeys = [
  { id: "pk1", name: "MacBook Pro · Touch ID", addedAt: "2026-03-02", lastUsed: "today" },
  { id: "pk2", name: "iPhone", addedAt: "2026-07-14", lastUsed: "last week" },
];

export const apiKeys = [
  { id: "k1", name: "laptop", start: "sg_live_4f9a", createdAt: "2026-03-02", lastUsed: "2 hours ago" },
  { id: "k2", name: "ci", start: "sg_live_b21c", createdAt: "2026-06-01", lastUsed: "never" },
];

export const modeMatrix: { feature: string; creator: string; agency: string; reseller: string }[] = [
  { feature: "Organizations", creator: "one, hidden", agency: "one, named", reseller: "many, self-serve" },
  { feature: "Sign-up", creator: "invitation only", agency: "invitation only", reseller: "public page" },
  { feature: "Teams (clients)", creator: "off", agency: "on", reseller: "on per org" },
  { feature: "Custom roles", creator: "off", agency: "on", reseller: "on per org" },
  { feature: "Operator console", creator: "hidden", agency: "hidden", reseller: "on" },
  { feature: "White-label", creator: "name, logo, accent", agency: "plus emails", reseller: "plus per-org branding" },
];

export function appName(id: AppId): string {
  return catalog.find((a) => a.id === id)?.name ?? id;
}

export function workspaceById(id?: string): Workspace | undefined {
  return workspaces.find((w) => w.id === id);
}

export function teamName(id?: string): string | undefined {
  return teams.find((t) => t.id === id)?.name;
}

// ---- Desk data (chat, tables, chats, secrets, files, connections, audit) ----

export type Column = { name: string; type: "key" | "text" | "number" | "date" | "bool" | "ref" };
export type DataTable = { id: string; name: string; owner: "core" | AppId; columns: Column[]; rows: Record<string, string | number | boolean>[] };

export const names = ["Lena Fischer", "Marco Rossi", "Ola Nilsson", "Jess Park", "Amir Haddad", "Sofia Mendes", "Kwame Asante", "Hannah Brooks", "Rajesh Kumar", "Elena Papadopoulou"];
export const sources = ["forms · newsletter", "funnels · spring-offer", "forms · contact", "pages · footer", "import · csv"];

function rows(n: number, make: (i: number) => Record<string, string | number | boolean>): Record<string, string | number | boolean>[] {
  return Array.from({ length: n }, (_, i) => make(i));
}

export const tables: DataTable[] = [
  {
    id: "contacts", name: "contacts", owner: "core",
    columns: [{ name: "id", type: "key" }, { name: "email", type: "text" }, { name: "name", type: "text" }, { name: "source", type: "text" }, { name: "created_at", type: "date" }],
    rows: rows(10, (i) => ({ id: i + 1, email: `${names[i].split(" ")[0].toLowerCase()}@example.com`, name: names[i], source: sources[i % sources.length], created_at: `2026-10-${String(31 - i).padStart(2, "0")} 09:${String(10 + i).padStart(2, "0")}` })),
  },
  {
    id: "events", name: "events", owner: "core",
    columns: [{ name: "id", type: "key" }, { name: "type", type: "text" }, { name: "contact_id", type: "ref" }, { name: "payload", type: "text" }, { name: "at", type: "date" }],
    rows: rows(8, (i) => ({ id: i + 1, type: ["form.answered", "funnel.step", "page.view", "contact.created"][i % 4], contact_id: (i % 10) + 1, payload: `{"step":${i}}`, at: `2026-10-31 1${i}:04` })),
  },
  {
    id: "settings", name: "settings", owner: "core",
    columns: [{ name: "key", type: "key" }, { name: "value", type: "text" }, { name: "updated_at", type: "date" }],
    rows: [{ key: "theme.color-accent", value: "#6d5dfc", updated_at: "2026-10-29" }, { key: "theme.font-display", value: "Cal Sans", updated_at: "2026-10-29" }, { key: "site.title", value: "Acme Studio", updated_at: "2026-10-01" }],
  },
  {
    id: "pages", name: "pages", owner: "pages",
    columns: [{ name: "id", type: "key" }, { name: "slug", type: "text" }, { name: "title", type: "text" }, { name: "status", type: "text" }, { name: "updated_at", type: "date" }],
    rows: rows(6, (i) => ({ id: i + 1, slug: ["/", "/about", "/pricing", "/blog", "/contact", "/careers"][i], title: ["Home", "About", "Pricing", "Blog", "Contact", "Careers"][i], status: i < 4 ? "published" : "draft", updated_at: `2026-10-${20 + i}` })),
  },
  {
    id: "funnels", name: "funnels", owner: "funnels",
    columns: [{ name: "id", type: "key" }, { name: "name", type: "text" }, { name: "steps", type: "number" }, { name: "conversion", type: "number" }, { name: "status", type: "text" }],
    rows: [{ id: 1, name: "spring-offer", steps: 3, conversion: 4.2, status: "live" }, { id: 2, name: "webinar", steps: 4, conversion: 2.8, status: "live" }, { id: 3, name: "black-friday", steps: 3, conversion: 0, status: "draft" }],
  },
  {
    id: "form_answers", name: "form_answers", owner: "forms",
    columns: [{ name: "id", type: "key" }, { name: "form", type: "text" }, { name: "answer", type: "text" }, { name: "contact_id", type: "ref" }, { name: "at", type: "date" }],
    rows: rows(7, (i) => ({ id: i + 1, form: ["newsletter", "contact"][i % 2], answer: ["Yes please", "Pricing question", "Love the site", "Call me back", "Partnership", "Unsubscribe me", "Hello!"][i], contact_id: (i % 10) + 1, at: `2026-10-${25 + (i % 6)}` })),
  },
];

export function tablesFor(ws: Workspace): DataTable[] {
  const installed = new Set(ws.installs.map((i) => i.app));
  return tables.filter((t) => t.owner === "core" || installed.has(t.owner));
}

export type ChatMessage = { id: string; role: "user" | "agent"; text: string; actions?: string[] };
export type Chat = { id: string; title: string; workspaceId: string; when: string; messages: ChatMessage[] };

export const chats: Chat[] = [
  {
    id: "c_funnel", title: "Spring offer funnel", workspaceId: "acme", when: "22h ago",
    messages: [
      { id: "m1", role: "user", text: "Set up a 3-step funnel for the spring offer and connect it to the newsletter contacts." },
      { id: "m2", role: "agent", text: "Done. I created the funnel with a landing, checkout and thank-you step, and every completed checkout now writes a contact with the spring-offer source.", actions: ["Created funnel spring-offer (3 steps)", "Added event funnel.step → contacts", "Deployed Funnels 0.9.2"] },
      { id: "m3", role: "user", text: "Can you show conversion on the overview?" },
      { id: "m4", role: "agent", text: "Added a conversion stat to the Funnels overview. It reads from events and refreshes on every request." },
    ],
  },
  { id: "c_theme", title: "Theme accent change", workspaceId: "bluebird", when: "yesterday", messages: [{ id: "m1", role: "user", text: "Make the accent warmer." }, { id: "m2", role: "agent", text: "Set theme.color-accent to #e0a63b. Every app picks it up from /_ws/theme.css.", actions: ["Updated settings.theme.color-accent"] }] },
  { id: "c_forms", title: "Contact form answers", workspaceId: "acme", when: "2 days ago", messages: [{ id: "m1", role: "user", text: "Where do contact form answers go?" }, { id: "m2", role: "agent", text: "Into form_answers, and each one creates or updates a row in contacts through the workspace RPC." }] },
  { id: "c_harbor", title: "Fix the failed deploy", workspaceId: "harbor", when: "4 days ago", messages: [{ id: "m1", role: "user", text: "The funnels deploy failed, what happened?" }, { id: "m2", role: "agent", text: "The build hit a missing environment binding. I added it to the generated wrangler.jsonc; redeploy when ready." }] },
];

export function chatsFor(wsId: string): Chat[] {
  return chats.filter((c) => c.workspaceId === wsId);
}

export type Secret = { id: string; name: string; hint: string; updatedAt: string };
export const secrets: Record<string, Secret[]> = {
  acme: [{ id: "s1", name: "STRIPE_SECRET_KEY", hint: "sk_live_…9f2a", updatedAt: "2026-09-12" }, { id: "s2", name: "RESEND_API_KEY", hint: "re_…b7c1", updatedAt: "2026-10-02" }],
  bluebird: [{ id: "s3", name: "RESEND_API_KEY", hint: "re_…04dd", updatedAt: "2026-10-11" }],
};

export type FileItem = { id: string; name: string; size: string; kind: "image" | "pdf" | "csv" };
export const files: Record<string, FileItem[]> = {
  acme: [{ id: "f1", name: "hero.webp", size: "214 KB", kind: "image" }, { id: "f2", name: "pricing-2026.pdf", size: "1.1 MB", kind: "pdf" }, { id: "f3", name: "contacts-import.csv", size: "48 KB", kind: "csv" }],
};

export type Connection = { id: string; name: string; description: string; status: "connected" | "available"; color: string };
export const connections: Connection[] = [
  { id: "resend", name: "Resend", description: "Transactional email from forms and funnels.", status: "connected", color: "#111" },
  { id: "stripe", name: "Stripe", description: "Checkout steps and subscriptions.", status: "connected", color: "#635bff" },
  { id: "sheets", name: "Google Sheets", description: "Sync a table both ways.", status: "available", color: "#0f9d58" },
  { id: "slack", name: "Slack", description: "Post events to a channel.", status: "available", color: "#4a154b" },
  { id: "github", name: "GitHub", description: "Mirror app repos.", status: "available", color: "#24292f" },
];

export type Workflow = { id: string; name: string; trigger: string; runs: number; last: string };
export const workflows: Record<string, Workflow[]> = {
  acme: [{ id: "w1", name: "Welcome email", trigger: "contact.created", runs: 1284, last: "12 min ago" }, { id: "w2", name: "Abandoned checkout", trigger: "funnel.step (checkout, 1h idle)", runs: 96, last: "2 hours ago" }],
};

export const audit = [
  { id: "l1", who: "Priya Natarajan", what: "deployed Funnels 0.9.2", where: "Harbor Dental", when: "10 min ago" },
  { id: "l2", who: "sg CLI (Dylan)", what: "installed Forms", where: "Bluebird Bakery", when: "2 hours ago" },
  { id: "l3", who: "Mina Okafor", what: "changed theme.color-accent", where: "Bluebird Bakery", when: "yesterday" },
  { id: "l4", who: "Dylan Jones", what: "invited ava@bluebirdbakery.com as editor", where: "Acme Studio", when: "2 days ago" },
  { id: "l5", who: "Dylan Jones", what: "created API key ci", where: "Account", when: "4 days ago" },
  { id: "l6", who: "Theo Lindqvist", what: "exported contacts.csv", where: "Harbor Dental", when: "5 days ago" },
];

export const appColors: Record<AppId, string> = { pages: "#3b82f6", funnels: "#8b5cf6", forms: "#14b8a6", hello: "#64748b" };
