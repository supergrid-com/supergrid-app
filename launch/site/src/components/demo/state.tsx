"use client";

import { CreditCardIcon, GraduationCapIcon, LayoutTemplateIcon, MailIcon, MegaphoneIcon, NewspaperIcon, TextCursorInputIcon, UsersIcon, type LucideIcon } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

// What the demo remembers while someone clicks around: where they are (a route string, with back
// and forward), Live or Dev, the theme, which apps are installed, the blog's posts and the agent's
// thread. Nothing leaves the page; it all resets on reload.

export type AppId = "blog" | "forms" | "landing" | "ads" | "newsletter" | "courses" | "checkout" | "community";

export const CATALOG: Record<AppId, { name: string; icon: LucideIcon; by: string; kind: "Site" | "Admin"; price: string; blurb: string }> = {
  blog: { name: "Blog", icon: NewspaperIcon, by: "SuperGrid", kind: "Site", price: "Free", blurb: "Posts, categories and comments on your own domain" },
  forms: { name: "Forms", icon: TextCursorInputIcon, by: "SuperGrid", kind: "Site", price: "Free", blurb: "Signups, waitlists and contact forms into your contacts" },
  landing: { name: "Landing Pages", icon: LayoutTemplateIcon, by: "Theo Marsh", kind: "Site", price: "$19", blurb: "Pages from blocks, tested and published in a click" },
  ads: { name: "Ad Designer", icon: MegaphoneIcon, by: "Studio", kind: "Admin", price: "Built here", blurb: "Square ads from a sentence, with Muse Image" },
  newsletter: { name: "Newsletter", icon: MailIcon, by: "Ivy Chen", kind: "Admin", price: "Free", blurb: "Write, schedule and send to your contacts" },
  courses: { name: "Courses", icon: GraduationCapIcon, by: "Lena Ortiz", kind: "Site", price: "$29", blurb: "Lessons, modules and progress for members" },
  checkout: { name: "Checkout", icon: CreditCardIcon, by: "Mara Quinn", kind: "Site", price: "$39", blurb: "Offers, order bumps and Stripe payments" },
  community: { name: "Community", icon: UsersIcon, by: "Ola Berg", kind: "Site", price: "$19", blurb: "Spaces, threads and member profiles" },
};

export type Post = { id: number; title: string; status: "Published" | "Draft" | "Scheduled"; author: string; updated: string; body: string };

const POSTS: Post[] = [
  { id: 1, title: "Why we own our marketing stack", status: "Published", author: "Dylan", updated: "2h ago", body: "For twenty years the answer to every marketing problem was another subscription. A funnel builder here, an email tool there, a course platform on top. Each one kept its own copy of your customers.\n\nWe started over with one workspace that runs in our own Cloudflare account. The blog you're reading is an app in it." },
  { id: 2, title: "Spring launch: what's new", status: "Scheduled", author: "Ivy", updated: "Yesterday", body: "Three new apps, a faster editor and themes for every workspace. Here's what landed this spring and what's coming next." },
  { id: 3, title: "Five landing pages that convert", status: "Published", author: "Theo", updated: "3d ago", body: "We looked at the pages that brought in the most signups last quarter and pulled out what they had in common." },
  { id: 4, title: "How we write with Muse Code", status: "Draft", author: "Dylan", updated: "4d ago", body: "Muse Code drafts, we edit. It knows the blog's tools, so a draft lands as a real post with a slug, a category and an image." },
  { id: 5, title: "Notes from the creator summit", status: "Published", author: "Lena", updated: "1w ago", body: "A few things we heard over and over from creators at the summit, and what they mean for how you build." },
];

export type ToolStep = { label: string; detail?: string; state: "running" | "done" };
export type Msg = { id: number; role: "user" | "agent"; text?: string; tools?: ToolStep[] };

export type Theme = { iface: string; sidebar: string | null; accent: string };

type Demo = {
  route: string;
  go: (to: string) => void;
  back: () => void;
  forward: () => void;
  canBack: boolean;
  canForward: boolean;
  mode: "live" | "dev";
  setMode: (m: "live" | "dev") => void;
  theme: Theme;
  setTheme: (t: Partial<Theme>) => void;
  installed: AppId[];
  installing: AppId | null;
  install: (id: AppId) => Promise<void>;
  posts: Post[];
  updatePost: (id: number, patch: Partial<Post>) => void;
  addPost: (p: Omit<Post, "id">) => number;
  railOpen: boolean;
  setRailOpen: (v: boolean) => void;
  chatOpen: boolean;
  setChatOpen: (v: boolean) => void;
  settings: boolean;
  setSettings: (v: boolean) => void;
  msgs: Msg[];
  busy: boolean;
  ask: (text: string) => void;
  newThread: () => void;
  toast: string | null;
  say: (text: string) => void;
};

const Ctx = createContext<Demo | null>(null);

export function useDemo(): Demo {
  const d = useContext(Ctx);
  if (!d) throw new Error("useDemo outside DemoProvider");
  return d;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const FIRST_THREAD: Msg[] = [
  { id: 1, role: "user", text: "Add a newsletter signup to the end of every blog post" },
  {
    id: 2,
    role: "agent",
    tools: [
      { label: "Read apps/blog/pages/[slug].tsx", state: "done" },
      { label: "forms.create_form", detail: "Newsletter · email, first name", state: "done" },
      { label: "Edit apps/blog/pages/[slug].tsx", detail: "+12 −1", state: "done" },
    ],
    text: "Done. Every post now ends with the Newsletter form, and new signups land in contacts with the subscriber tag",
  },
];

export const SUGGESTIONS = ["Install the Newsletter app", "Make the sidebar Light", "How did signups do this week?", "Draft a post about the spring sale"];

export function DemoProvider({ children }: { children: ReactNode }) {
  const [hist, setHist] = useState<{ stack: string[]; at: number }>({ stack: ["home"], at: 0 });
  const route = hist.stack[hist.at]!;
  const go = useCallback((to: string) => setHist((h) => (h.stack[h.at] === to ? h : { stack: [...h.stack.slice(0, h.at + 1), to], at: h.at + 1 })), []);
  const back = useCallback(() => setHist((h) => ({ ...h, at: Math.max(0, h.at - 1) })), []);
  const forward = useCallback(() => setHist((h) => ({ ...h, at: Math.min(h.stack.length - 1, h.at + 1) })), []);

  const [mode, setModeRaw] = useState<"live" | "dev">("live");
  const [theme, setThemeRaw] = useState<Theme>({ iface: "midnight", sidebar: null, accent: "#7c8cf8" });
  const setTheme = useCallback((t: Partial<Theme>) => setThemeRaw((x) => ({ ...x, ...t })), []);
  const [installed, setInstalled] = useState<AppId[]>(["blog", "forms", "landing", "ads"]);
  const [installing, setInstalling] = useState<AppId | null>(null);
  const [posts, setPosts] = useState(POSTS);
  const [railOpen, setRailOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(true);
  const [settings, setSettings] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>(FIRST_THREAD);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const nextId = useRef(10);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => void (alive.current = false);
  }, []);

  const say = useCallback((text: string) => {
    setToast(text);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const setMode = useCallback(
    (m: "live" | "dev") => {
      setModeRaw(m);
      if (m === "live" && route.startsWith("code")) go("home");
    },
    [route, go],
  );

  const install = useCallback(async (id: AppId) => {
    setInstalling(id);
    await wait(1400);
    if (!alive.current) return;
    setInstalled((xs) => (xs.includes(id) ? xs : [...xs, id]));
    setInstalling(null);
  }, []);

  const updatePost = useCallback((id: number, patch: Partial<Post>) => setPosts((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p))), []);
  const addPost = useCallback((p: Omit<Post, "id">) => {
    const id = nextId.current++;
    setPosts((ps) => [{ ...p, id }, ...ps]);
    return id;
  }, []);

  // The agent's canned replies: a few prompts it can really act on inside the demo, each a list of
  // tool calls that tick over one by one and do their thing, then a short answer.
  const ask = useCallback(
    async (text: string) => {
      if (busy || !text.trim()) return;
      setBusy(true);
      setChatOpen(true);
      const uid = nextId.current++;
      const aid = nextId.current++;
      setMsgs((m) => [...m, { id: uid, role: "user", text }, { id: aid, role: "agent", tools: [] }]);
      const patch = (fn: (m: Msg) => Msg) => setMsgs((ms) => ms.map((m) => (m.id === aid ? fn(m) : m)));
      const step = async (label: string, detail: string | undefined, ms: number, run?: () => void | Promise<void>) => {
        patch((m) => ({ ...m, tools: [...(m.tools ?? []), { label, detail, state: "running" }] }));
        await wait(ms);
        await run?.();
        patch((m) => ({ ...m, tools: (m.tools ?? []).map((t, i, all) => (i === all.length - 1 ? { ...t, state: "done" } : t)) }));
        await wait(220);
      };
      const reply = (t: string) => patch((m) => ({ ...m, text: t }));
      const q = text.toLowerCase();
      await wait(500);

      if (/newsletter|install/.test(q)) {
        await step("Open the App Store", undefined, 600, () => go("store"));
        await step("Install Newsletter 1.2.0", "from Ivy Chen", 300, () => install("newsletter"));
        await step("Merge into main", "9 files · apps/newsletter", 800);
        go("apps/newsletter");
        reply("Newsletter is installed and merged into your repo. It reads the contacts the Forms app collects, so your 1,284 subscribers are already there");
      } else if (/midnight|theme|dark|light|sidebar|color|colour/.test(q)) {
        const target = /light/.test(q) ? "light" : "midnight";
        await step("Read the appearance settings", undefined, 600);
        await step(`Set the sidebar theme to ${target === "light" ? "Light" : "Midnight"}`, undefined, 700, () => setTheme({ sidebar: target }));
        reply(`Done, the sidebar's on ${target === "light" ? "Light" : "Midnight"}. Pages keep their own theme. Open Settings to try the others`);
      } else if (/signup|week|report|how did/.test(q)) {
        await step("db.query", "form_submissions, last 8 weeks", 900);
        await step("Open the Signups report", undefined, 500, () => go("workflows/reports"));
        reply("128 signups this week, up 24% on last week. Most came from the Spring Sale landing page, and the blog's new newsletter form brought in 31");
      } else if (/post|write|draft|blog/.test(q)) {
        let id = 0;
        await step("Read the skill: Write a Blog Post", undefined, 600);
        await step("blog.create_post", "Spring Sale: 20% off everything", 900, () => {
          id = addPost({ title: "Spring Sale: 20% off everything", status: "Draft", author: "Muse Code", updated: "Just now", body: "Our spring sale starts Friday. Everything in the shop is 20% off for a week, courses included.\n\nIf you've been waiting to start, this is the week. Members get early access on Thursday." });
        });
        await step("Open the draft", undefined, 400, () => go(`apps/blog/post/${id}`));
        reply("The draft's in the Blog as \"Spring Sale: 20% off everything\". Have a read, then publish it from the panel on the right when you're happy");
      } else {
        await wait(500);
        reply("This is a preview, so I can only do a few things here. Try installing the Newsletter app, changing the sidebar theme, asking about signups or drafting a post");
      }
      setBusy(false);
    },
    [busy, go, install, setTheme, addPost],
  );

  const newThread = useCallback(() => setMsgs([]), []);

  const value = useMemo<Demo>(
    () => ({ route, go, back, forward, canBack: hist.at > 0, canForward: hist.at < hist.stack.length - 1, mode, setMode, theme, setTheme, installed, installing, install, posts, updatePost, addPost, railOpen, setRailOpen, chatOpen, setChatOpen, settings, setSettings, msgs, busy, ask, newThread, toast, say }),
    [route, go, back, forward, hist, mode, setMode, theme, setTheme, installed, installing, install, posts, updatePost, addPost, railOpen, chatOpen, settings, msgs, busy, ask, newThread, toast, say],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
