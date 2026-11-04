import { ActivityIcon, ArrowRightIcon, BlocksIcon, ChartLineIcon, CloudIcon, FileIcon, FolderIcon, GitCommitHorizontalIcon, ImagesIcon, LayersIcon, PaletteIcon, PlusIcon, ServerIcon, UsersRoundIcon, WorkflowIcon } from "lucide-react";
import * as React from "react";
import { useNavigate } from "react-router";
import { MetaMark } from "~/components/meta-mark";
import { SuperGridMark } from "~/components/supergrid-logo";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { AuthFrame } from "~/pages/auth/frame";

// The tour before first-run setup: what SuperGrid is and its parts, one screen each, then setup. It's shown once (the
// flag is kept on this Mac); setup's Take the Tour opens it again. The pictures are diagrams of the real parts, not data.
// It looks like the site's hero (launch/site) in any theme: its own dark palette, a colour glow, a dot grid and a
// dashed blueprint frame around each picture.

const SEEN_KEY = "sg.intro.seen";
const META_BLUE = "#0866ff";
const CLOUDFLARE_ORANGE = "#f38020";

export function introSeen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return true;
  }
}

function markSeen(): void {
  try {
    localStorage.setItem(SEEN_KEY, "1");
  } catch {}
}

// ---- the pictures ----

function Tile({ icon, title, detail, className, style }: { icon: React.ReactNode; title: string; detail?: string; className?: string; style?: React.CSSProperties }): React.ReactElement {
  return (
    <div className={cn("flex items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-xs/5", className)} style={style}>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-foreground/6 [&_svg]:size-4.5">{icon}</span>
      <span className="min-w-0">
        <span className="block text-sm font-medium">{title}</span>
        {detail && <span className="block text-sm text-muted-foreground">{detail}</span>}
      </span>
    </div>
  );
}

// the tour is always dark, so Meta's flat light mark, or its blue one where Muse is one colour among others
function Muse({ className, blue }: { className?: string; blue?: boolean }): React.ReactElement {
  return <MetaMark dark={!blue} className={cn("h-3.5 w-5", className)} />;
}

function WelcomePicture(): React.ReactElement {
  return (
    <div className="flex h-[376px] w-full items-center justify-center rounded-3xl border bg-card shadow-xs/5">
      <SuperGridMark className="size-32 text-foreground" />
    </div>
  );
}

function StackPicture(): React.ReactElement {
  const layers = [
    { icon: <Muse blue />, title: "Muse Code", detail: "Runs it all", ring: true },
    { icon: <BlocksIcon style={{ color: "#b46cff" }} />, title: "Apps", detail: "Funnels, pages, a blog, your own" },
    { icon: <LayersIcon style={{ color: "#2ee6e6" }} />, title: "The Core", detail: "Contacts, events, workflows" },
    { icon: <ServerIcon style={{ color: "#ff4fa3" }} />, title: "Workspace", detail: "One repo, one Worker, one database" },
    { icon: <CloudIcon style={{ color: CLOUDFLARE_ORANGE }} />, title: "Your Cloud and AI", detail: "Your Cloudflare, your Muse Code" },
  ];
  return (
    <div className="flex w-full max-w-[420px] gap-3">
      <div className="flex flex-1 flex-col gap-2">
        {layers.map((l, i) => (
          <Tile key={l.title} icon={l.icon} title={l.title} detail={l.detail} className="intro-in" style={{ animationDelay: `${120 + i * 70}ms`, ...(l.ring ? { borderColor: META_BLUE } : {}) }} />
        ))}
      </div>
      <div className="flex w-7 flex-col items-center gap-2 py-1">
        <span className="w-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground [writing-mode:vertical-rl]">All of It Yours</span>
        <span className="w-px flex-1 bg-border" />
      </div>
    </div>
  );
}

function HostingPicture(): React.ReactElement {
  return (
    <div className="grid w-full max-w-[420px] gap-3">
      <div className="intro-in rounded-2xl border bg-card p-5 shadow-xs/5" style={{ animationDelay: "120ms" }}>
        <CloudIcon className="size-7" style={{ color: CLOUDFLARE_ORANGE }} />
        <div className="mt-3 text-base font-medium">Your Cloudflare Account</div>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {["Workers", "D1", "Queues", "R2", "Images", "Stream"].map((s) => (
            <span key={s} className="rounded-full border px-2.5 py-0.5 text-sm text-muted-foreground">
              {s}
            </span>
          ))}
        </div>
      </div>
      <div className="intro-in rounded-2xl border bg-card p-5 shadow-xs/5" style={{ animationDelay: "200ms", borderColor: META_BLUE }}>
        <Muse className="h-5 w-7.5" />
        <div className="mt-3 text-base font-medium">Your Muse Code</div>
        <div className="mt-1 text-sm text-muted-foreground">Signed in as you, on this Mac</div>
      </div>
    </div>
  );
}

function RepoPicture(): React.ReactElement {
  const rows: { depth: number; name: string; folder?: boolean; note?: string }[] = [
    { depth: 0, name: "fernwood-ceramics", folder: true },
    { depth: 1, name: "apps", folder: true },
    { depth: 2, name: "funnels", folder: true, note: "an app, its pages and data" },
    { depth: 2, name: "pages", folder: true },
    { depth: 2, name: "blog", folder: true },
    { depth: 1, name: "app", folder: true, note: "the site" },
    { depth: 1, name: "workers", folder: true },
    { depth: 1, name: "supergrid.workspace.json" },
    { depth: 1, name: "wrangler.jsonc" },
  ];
  return (
    <div className="intro-in w-full max-w-[420px] overflow-hidden rounded-2xl border bg-card shadow-xs/5" style={{ animationDelay: "120ms" }}>
      <ul className="flex flex-col gap-1 p-4 font-mono text-[13px]">
        {rows.map((r) => (
          <li key={`${r.depth}${r.name}`} className="flex items-center gap-2" style={{ paddingInlineStart: r.depth * 18 }}>
            {r.folder ? <FolderIcon className="size-4 shrink-0 text-muted-foreground" /> : <FileIcon className="size-4 shrink-0 text-muted-foreground" />}
            <span>{r.name}</span>
            {r.note && <span className="truncate font-sans text-xs text-muted-foreground">{r.note}</span>}
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2 border-t px-4 py-2.5 text-sm text-muted-foreground">
        <GitCommitHorizontalIcon className="size-4 shrink-0" />
        <span className="truncate">Add the Funnels, Pages and Blog apps</span>
      </div>
    </div>
  );
}

function WorkspacePicture(): React.ReactElement {
  const rows = [
    ["Address", "sg-ws-k3x9qz.workers.dev"],
    ["Worker", "sg-ws-k3x9qz"],
    ["Database", "D1, its own"],
    ["Repo", "On this Mac, in git"],
  ];
  return (
    <div className="flex w-full max-w-[420px] flex-col gap-3">
      <div className="intro-in rounded-2xl border bg-card p-5 shadow-xs/5" style={{ animationDelay: "120ms" }}>
        <div className="flex items-center gap-2.5">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-sm font-medium text-primary-foreground">F</span>
          <span className="text-base font-medium">Fernwood Ceramics</span>
        </div>
        <dl className="mt-4 flex flex-col gap-2 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="flex gap-4">
              <dt className="w-20 shrink-0 text-muted-foreground">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="intro-in flex gap-3" style={{ animationDelay: "220ms" }}>
        {["Your Shop", "A Client"].map((n) => (
          <div key={n} className="flex-1 rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
            {n}
          </div>
        ))}
      </div>
    </div>
  );
}

function CorePicture(): React.ReactElement {
  const parts = [
    { icon: <UsersRoundIcon />, title: "Contacts", detail: "and segments" },
    { icon: <ActivityIcon />, title: "Events", detail: "every visit and order" },
    { icon: <ChartLineIcon />, title: "Analytics", detail: "funnels and reports" },
    { icon: <WorkflowIcon />, title: "Workflows", detail: "and hooks" },
    { icon: <PaletteIcon />, title: "Themes", detail: "one look everywhere" },
    { icon: <ImagesIcon />, title: "Media", detail: "images, video, files" },
  ];
  return (
    <div className="grid w-full max-w-[440px] grid-cols-2 gap-2">
      {parts.map((p, i) => (
        <Tile key={p.title} icon={p.icon} title={p.title} detail={p.detail} className="intro-in" style={{ animationDelay: `${120 + i * 60}ms` }} />
      ))}
    </div>
  );
}

function AppsPicture(): React.ReactElement {
  const apps = ["Funnels", "Pages", "Blog"];
  return (
    <div className="flex w-full max-w-[440px] flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        {apps.map((a, i) => (
          <Tile key={a} icon={<BlocksIcon />} title={a} className="intro-in" style={{ animationDelay: `${120 + i * 70}ms` }} />
        ))}
        <div className="intro-in flex items-center gap-3 rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground" style={{ animationDelay: "330ms" }}>
          <span className="flex size-9 items-center justify-center rounded-lg border border-dashed">
            <PlusIcon className="size-4.5" />
          </span>
          Your Own
        </div>
      </div>
      <div className="intro-in flex items-center justify-center gap-2 rounded-xl bg-foreground/6 py-3 text-sm font-medium" style={{ animationDelay: "420ms" }}>
        <LayersIcon className="size-4" />
        The Core
      </div>
    </div>
  );
}

function MusePicture(): React.ReactElement {
  const asks = ["Which campaign brought in the most revenue?", "Tag waitlist people who haven't bought yet", "Build a wholesale order form for shops", "Ship it"];
  return (
    <div className="intro-in flex w-full max-w-[440px] flex-col gap-3 rounded-2xl border bg-card p-5 shadow-xs/5" style={{ animationDelay: "120ms", borderColor: META_BLUE }}>
      <div className="flex items-center gap-2 text-base font-medium">
        <Muse />
        Muse Code
      </div>
      <ul className="flex flex-col items-end gap-2">
        {asks.map((a, i) => (
          <li key={a} className="intro-in rounded-2xl rounded-ee-md bg-foreground/6 px-3.5 py-2 text-sm" style={{ animationDelay: `${260 + i * 110}ms` }}>
            {a}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---- the screens ----

type Screen = { title: string; body: React.ReactNode; picture: React.ReactNode; next?: string };

const SCREENS: Screen[] = [
  {
    title: "Welcome to SuperGrid",
    body: (
      <>
        <p>A desktop app for building your site and the tools behind it, with the data they share</p>
        <p>It runs on your own Cloudflare account, and Muse Code does the building</p>
      </>
    ),
    picture: <WelcomePicture />,
    next: "See How It Works",
  },
  {
    title: "How It Works",
    body: (
      <>
        <p>Each workspace runs on your cloud, starts with a core of shared data, and adds apps on top</p>
        <p>Muse Code works across all of it. The next screens take each part in turn</p>
      </>
    ),
    picture: <StackPicture />,
  },
  {
    title: "Your Cloud and AI",
    body: (
      <>
        <p>Workspaces deploy to your own Cloudflare account, so your sites, data and files all live in an account you own</p>
        <p>The AI is Muse Code, signed in with your own account and running on this Mac</p>
      </>
    ),
    picture: <HostingPicture />,
  },
  {
    title: "You Own the Code",
    body: (
      <>
        <p>Every workspace is a git repo on your Mac. Apps are folders in it, so you can read and change any line</p>
      </>
    ),
    picture: <RepoPicture />,
  },
  {
    title: "Workspaces",
    body: (
      <>
        <p>A workspace is one site or business: one repo, one Worker and one database, with its own address</p>
        <p>Make one for each business or client</p>
      </>
    ),
    picture: <WorkspacePicture />,
  },
  {
    title: "The Core",
    body: (
      <>
        <p>Every workspace comes with contacts, events, analytics, workflows, themes and media</p>
        <p>Apps share them, so an order from one app can trigger an email from another</p>
      </>
    ),
    picture: <CorePicture />,
  },
  {
    title: "Apps",
    body: (
      <>
        <p>Apps add features, like funnels, pages or a blog. Each has its own pages, admin screens and data</p>
        <p>Install one, change it, or ask Muse Code to build a new one</p>
      </>
    ),
    picture: <AppsPicture />,
  },
  {
    title: "Muse Code",
    body: (
      <>
        <p>The AI built into every workspace. Ask it about your data, or tell it what to build or change</p>
        <p>It asks before it changes anything, and what it writes goes into your repo</p>
      </>
    ),
    picture: <MusePicture />,
    next: "Get Started",
  },
];

// The tour's own palette, over whatever theme is set: white ink on Midnight, glassy cards, a white main button.
const PALETTE = {
  "--background": "#13151c",
  "--foreground": "#ffffff",
  "--muted-foreground": "rgb(255 255 255 / 72%)",
  "--card": "rgb(255 255 255 / 5%)",
  "--border": "rgb(255 255 255 / 12%)",
  "--accent": "rgb(255 255 255 / 9%)",
  "--accent-foreground": "#ffffff",
  "--primary": "#ffffff",
  "--primary-foreground": "#13151c",
  "--ring": "rgb(255 255 255 / 45%)",
} as React.CSSProperties;

function Backdrop(): React.ReactElement {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
      <div className="intro-blob intro-blob-violet" />
      <div className="intro-blob intro-blob-blue" />
      <div className="intro-blob intro-blob-cyan" />
      <div className="intro-blob intro-blob-magenta" />
      <div className="intro-blob intro-blob-orange" />
      <div className="intro-fade" />
      <div className="intro-dots" />
      <div className="intro-dots intro-dots-lit" />
    </div>
  );
}

// A picture drawn up like a blueprint: a dashed frame in the gutter around it and a soft light behind it.
function Blueprint({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <div className="relative w-full max-w-[460px] p-6">
      <div className="absolute inset-x-[10%] inset-y-[15%] rounded-full bg-white/8 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute inset-0 rounded-[28px] border border-dashed border-white/12" aria-hidden />
      <div className="relative flex justify-center [&>*]:backdrop-blur-md">{children}</div>
    </div>
  );
}

export function Intro(): React.ReactElement {
  const navigate = useNavigate();
  const [at, setAt] = React.useState(0);
  const screen = SCREENS[at]!;
  const last = at === SCREENS.length - 1;

  const finish = React.useCallback(() => {
    markSeen();
    navigate("/welcome");
  }, [navigate]);
  const next = React.useCallback(() => (last ? finish() : setAt((n) => n + 1)), [last, finish]);
  const back = React.useCallback(() => setAt((n) => Math.max(0, n - 1)), []);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, back]);

  return (
    <div className="relative isolate h-full bg-background text-foreground" style={PALETTE}>
      <Backdrop />
      <AuthFrame
        end={
          !last && (
            <Button variant="ghost" size="sm" onClick={finish}>
              Skip Tour
            </Button>
          )
        }
      >
        <div className="mx-auto flex min-h-[calc(100vh-7.5rem)] w-full max-w-[1080px] items-center py-4">
          <div className="grid w-full items-center gap-12 md:grid-cols-[minmax(0,1fr)_minmax(0,460px)] md:gap-16">
            <div className="flex flex-col gap-7">
              <div key={at} className="intro-in flex flex-col gap-5">
                <h1 className="intro-title font-heading text-[44px] leading-[1.08] font-semibold tracking-wide text-pretty text-white">{screen.title}</h1>
                <div className="flex max-w-[480px] flex-col gap-3 text-xl leading-relaxed text-pretty text-white/90">{screen.body}</div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="lg" className="rounded-full px-6 shadow-[0_0_40px_rgb(255_255_255/18%)]" onClick={next} autoFocus>
                  {screen.next ?? "Next"}
                  <ArrowRightIcon />
                </Button>
              </div>
              <div className="flex items-center gap-1.5" role="tablist" aria-label="Tour">
                {SCREENS.map((s, i) => (
                  <button
                    key={s.title}
                    type="button"
                    role="tab"
                    aria-selected={i === at}
                    aria-label={s.title}
                    onClick={() => setAt(i)}
                    className={cn("h-1.5 cursor-pointer rounded-full transition-all", i === at ? "w-8 bg-white" : "w-4 bg-white/25 hover:bg-white/50")}
                  />
                ))}
              </div>
            </div>
            <div key={`p${at}`} className="flex items-center justify-center md:min-h-[440px] md:justify-end">
              <Blueprint>{screen.picture}</Blueprint>
            </div>
          </div>
        </div>
      </AuthFrame>
    </div>
  );
}
