import { ActivityIcon, ArrowRightIcon, BarChart3Icon, BookOpenIcon, BuildingIcon, ChartLineIcon, CheckIcon, CloudIcon, CodeIcon, CodeXmlIcon, CreditCardIcon, DatabaseIcon, FileTextIcon, FolderGitIcon, FolderIcon, GiftIcon, GitBranchIcon, GitMergeIcon, GlobeIcon, HistoryIcon, ImageIcon, KeyRoundIcon, LayersIcon, LayoutDashboardIcon, LayoutTemplateIcon, ListOrderedIcon, MailIcon, MapIcon, MessageCircleIcon, MessageSquareIcon, PaletteIcon, PlugIcon, RocketIcon, RouteIcon, ScrollTextIcon, ServerIcon, ShieldCheckIcon, ShoppingCartIcon, SlidersHorizontalIcon, SparklesIcon, SquareTerminalIcon, StoreIcon, SwatchBookIcon, ToggleRightIcon, UsersIcon, VideoIcon, WebhookIcon, WorkflowIcon, TextCursorInputIcon, NewspaperIcon, CalendarCheckIcon, MegaphoneIcon, StarIcon, HandshakeIcon, CircleHelpIcon, ClipboardListIcon, BadgeCheckIcon, MicIcon, CalendarDaysIcon, LinkIcon, ContactRoundIcon, ReceiptIcon, TicketIcon, Share2Icon, MessagesSquareIcon, SearchIcon, AppWindowIcon, FlaskConicalIcon, SendIcon, DownloadIcon, type LucideIcon } from "lucide-react";
import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import { Button, Chip, Container, Mark, Muse, MuseGlyph, Panel } from "@/components/brand";
import { AppAnatomy } from "@/components/app-anatomy";
import { WatchDemoButton } from "@/components/demo-video";
import { Hero } from "@/components/hero";
import { Nav } from "@/components/nav";
import { ScrollFill } from "@/components/scroll-fill";

// The supergrid.com sales page. The hero is dark; the rest is white and clean, after Attio, folk
// and ClickUp: two-tone headlines (the statement in ink, the rest in grey), headline-left and
// text-right section headers, hairline-bordered tile grids, soft tinted panels, and lots of air.
// Dark is used only where it earns it: the SuperGrid reveal, the core "chip", and Muse Code as
// CTO. No product shots below the hero for now. Headlines never end in a full stop.

export default function Home() {
  return (
    <>
      <Nav />
      <main className="flex-1">
        <Hero />
        <Changing />
        <Cloning />
        {/* <Reveal /> hidden for now */}
        <HowItWorks />
        <Workspaces />
        <AppsBuild />
        {/* <AppsConnect /> hidden for now */}
        <Marketplace />
        {/* <AppTypes /> hidden for now */}
        <Cto />
        {/* <Platform /> hidden for now */}
      </main>
    </>
  );
}

// The page's own pieces

function Section({ id, children, className }: { id?: string; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={`scroll-mt-20 py-24 md:py-36 ${className ?? ""}`}>
      {children}
    </section>
  );
}

/** A section headline: the statement in ink, then `rest` in grey, in the same line. The grey fills
 * in to ink word by word as the headline scrolls up the screen. */
function H({ children, rest, restClassName, center, size = "lg", dark, className }: { children: ReactNode; rest?: string; restClassName?: string; center?: boolean; size?: "lg" | "xl"; dark?: boolean; className?: string }) {
  const sz = size === "xl" ? "text-[40px] md:text-6xl" : "text-[34px] md:text-5xl";
  return (
    <h2 className={`${sz} leading-[1.08] font-medium tracking-wide text-balance ${dark ? "text-white" : "text-ink"} ${center ? "mx-auto text-center" : ""} ${className ?? ""}`}>
      {children}
      {rest ? <ScrollFill text={rest} from={dark ? "rgb(255 255 255 / 45%)" : "var(--color-faint)"} className={restClassName} /> : null}
    </h2>
  );
}

/** A folk-style section header: headline on the left, the description on the right. */
function Split({ title, rest, children, dark }: { title: ReactNode; rest?: string; children: ReactNode; dark?: boolean }) {
  return (
    <div className="grid items-end gap-6 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
      <H rest={rest} dark={dark}>
        {title}
      </H>
      <p className={`max-w-xl text-lg leading-relaxed tracking-wide text-pretty md:text-xl ${dark ? "text-white/65" : "text-muted"}`}>{children}</p>
    </div>
  );
}

/** A feature line like Attio's: the point in ink, the explanation in grey, run together. */
function Point({ title, children, icon: Icon, dark }: { title: ReactNode; children: ReactNode; icon?: LucideIcon; dark?: boolean }) {
  return (
    <div>
      {Icon ? <Icon className={`mb-4 size-5 ${dark ? "text-white/80" : "text-ink"}`} /> : null}
      <p className={`text-[17px] leading-relaxed tracking-wide text-pretty ${dark ? "text-white/55" : "text-muted"}`}>
        <span className={`font-medium ${dark ? "text-white" : "text-ink"}`}>{title}</span> {children}
      </p>
    </div>
  );
}

// 1. SaaS is changing

/** A sheet on the white page, like a letter: rounded, hairline border, a faint wash and a low shadow. */
const SHEET = "rounded-3xl border border-line bg-gradient-to-b from-softer to-white p-7 shadow-[0_1px_2px_rgb(0_0_0/3%),0_30px_60px_-30px_rgb(0_0_0/12%)]";

// Dylan's LinkedIn, as on loro.sh
const LINKEDIN_ICON = "M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z";

function Changing() {
  return (
    <Section id="changing" className="pb-12 md:pb-16">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.2fr] lg:gap-20">
          <div>
            <div className="mb-6 text-[28px] leading-tight font-medium tracking-wide text-ink md:text-4xl">&ldquo;SaaS is Dead&rdquo;</div>
            <H rest="Now people hand their agent a login and rebuild the whole product" restClassName="mt-3 block text-[26px] leading-[1.15] md:text-[36px]">
              Every SaaS product added an AI assistant.
            </H>
            <p className="mt-8 max-w-md text-lg leading-relaxed tracking-wide text-muted md:text-xl">It&apos;s happening to me, and to everyone else. Enterprise software, business tools, consumer apps, even video games</p>
            <WatchDemoButton className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-soft px-6 text-[17px] text-ink transition-colors hover:bg-[#ebebef]" />
          </div>
          {/* the letter, on its own sheet */}
          <div className={`${SHEET} sm:p-10 md:p-12`}>
            <div className="space-y-5 text-lg leading-relaxed tracking-wide text-ink-2 md:text-xl">
              <p>Hi, I'm Dylan. I've been building SaaS products for more than twenty years, and I'm most known for co-founding ClickFunnels.</p>
              <p>
                Someone gives a coding agent the login to one of my products, and an afternoon later they have a copy of the screens. I spent eight months fighting it, then decided to build for it instead.
              </p>
              <p>
                SaaS was four things sold as one subscription: the code, the servers, the support and the vision. Agents made the first three nearly free. The vision is the part a clone throws away.
              </p>
              <p>
                So I built SuperGrid. Your marketing apps live in your own repo, run on your own Cloudflare account, and get built and changed by the AI you already pay for.
              </p>
            </div>
            {/* on phones the date sits on its own line, so the signature keeps its room */}
            <time dateTime="2026-11-03" className="mt-6 block text-sm text-muted sm:hidden">
              November 3, 2026
            </time>
            <div className="mt-4 flex items-center gap-4 border-t border-line pt-6 sm:mt-8 sm:pt-7">
              <Image src="/dylan.png" alt="Dylan Jones" width={256} height={256} className="size-12 rounded-full" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <a href="https://hidylanjones.com/" target="_blank" rel="noopener" className="text-lg font-medium transition-colors hover:text-ink-2">
                    Dylan Jones
                  </a>
                  <a href="https://www.linkedin.com/in/hidylanjones" target="_blank" rel="noopener" aria-label="Dylan Jones on LinkedIn" className="grid size-7 place-items-center rounded-full text-muted transition-colors hover:bg-soft hover:text-ink">
                    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="size-[15px]">
                      <path d={LINKEDIN_ICON} />
                    </svg>
                  </a>
                </div>
                <div className="text-sm leading-snug text-muted">Co-founder of ClickFunnels</div>
              </div>
              <time dateTime="2026-11-03" className="hidden shrink-0 text-sm text-muted sm:block">
                November 3, 2026
              </time>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}

// 2. Cloning vs buying

function Cloning() {
  const builder = ["Years of work copied from a login in an afternoon", "The customer keeps the screens and cancels the subscription", "No way to get paid for what they figured out"];
  const user = ["A copy of the screens, without the years of decisions underneath", "Every bug is now yours, and nobody knows why it's there", "No updates. Nobody ships the next version"];
  return (
    <Section id="cloning" className="pt-12 pb-12 md:pt-16 md:pb-16">
      <Container>
        <H center size="xl" rest="…and everyone loses" restClassName="block" className="max-w-5xl">
          Buy vs. Build = Buy vs. Clone
        </H>
        <p className="mx-auto mt-6 max-w-2xl text-center text-lg leading-relaxed tracking-wide text-muted md:text-xl">
          Buy vs build used to be a question for big companies. Now one person with an agent asks it, because nobody wants to pay for a hundred features to use three
        </p>
        <div className="mx-auto mt-16 grid max-w-5xl gap-4 md:grid-cols-2 md:gap-5">
          <Losses title="The Builder Loses" items={builder} />
          <Losses title="The User Loses" items={user} />
        </div>
      </Container>
    </Section>
  );
}

/** One side of what cloning costs, on a sheet like the letter: a title, then each loss as its own short line. */
function Losses({ title, items }: { title: string; items: string[] }) {
  return (
    <div className={`${SHEET} sm:p-10`}>
      <h3 className="text-2xl font-medium">{title}</h3>
      <ul className="mt-6 space-y-4">
        {items.map((it) => (
          <li key={it} className="text-lg leading-relaxed text-ink-2">
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

// 3. Introduce SuperGrid

function Reveal() {
  return (
    <section className="p-2 md:p-3">
      <Panel glow="violet" className="py-28 md:py-40">
        <Container className="flex flex-col items-center text-center">
          <h2 className="text-6xl font-medium tracking-wide md:text-8xl">SuperGrid</h2>
          <p className="mt-5 max-w-2xl text-2xl leading-relaxed tracking-wide text-balance text-white/70 md:text-3xl">The platform you can own</p>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed tracking-wide text-balance text-white/55 md:text-xl">
            A desktop IDE where your marketing stack lives in your own repo, runs on your own Cloudflare account, and is edited by the AI you already pay for
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Button href="#beta" primary dark>
              Join the Beta <ArrowRightIcon className="size-4" />
            </Button>
            <Button href="#how" dark>
              See how it works
            </Button>
          </div>
        </Container>
      </Panel>
    </section>
  );
}

// 4. How it works

// The answer to the clone question: each of the three reasons people clone, met without cloning,
// with the workspace right after.
function HowItWorks() {
  const answers: { icon: LucideIcon; title: string; body: string; glow: string }[] = [
    { icon: KeyRoundIcon, title: "You Own It", body: "Every workspace is its own repo, deployed to your own Cloudflare account", glow: "rgb(138 18 224 / 70%)" },
    { icon: SparklesIcon, title: "Your Own AI Subscription", body: "Muse Code connects over ACP and runs on the subscription you already pay for", glow: "rgb(0 130 251 / 70%)" },
    { icon: SlidersHorizontalIcon, title: "Shape It to You", body: "Install an app, change any line of it, and still get the builder's updates", glow: "rgb(255 84 20 / 65%)" },
  ];
  return (
    <div id="how" className="scroll-mt-20 pt-12 md:pt-16">
      <Container className="flex flex-col items-center text-center">
        <H center size="xl" className="max-w-4xl">
          SuperGrid is a <span className="bg-gradient-to-r from-[#9b3dff] via-[#ec1480] to-[#ff5a1f] bg-clip-text text-transparent">new kind of SaaS</span>
        </H>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed tracking-wide text-muted md:text-xl">
          It&apos;s built to explore a new SaaS model. The people who use an app own its code, and the people who build it still ship the updates and get paid for them
        </p>
        <div className="mt-16 grid w-full max-w-5xl gap-10 md:grid-cols-3 md:gap-8">
          {answers.map((a) => (
            <div key={a.title} className="group flex flex-col items-center">
              {/* a small dark tile like the hero's, its colour glowing up from below */}
              <span className="relative isolate grid size-16 place-items-center overflow-hidden rounded-2xl bg-[#1B1D24] text-white shadow-[0_14px_30px_-12px_rgb(27_29_36/55%)] transition-[translate,box-shadow] duration-300 ease-out group-hover:-translate-y-1 group-hover:shadow-[0_18px_40px_-12px_var(--glow)]" style={{ "--glow": a.glow } as CSSProperties}>
                <span className="absolute inset-x-[-30%] -bottom-1/2 -z-10 h-full rounded-full blur-xl transition-[translate] duration-500 group-hover:-translate-y-[15%]" style={{ background: `radial-gradient(closest-side, ${a.glow}, transparent)` }} aria-hidden />
                <span className="dots absolute inset-0 -z-10" aria-hidden />
                <a.icon className="size-6" strokeWidth={1.7} />
              </span>
              <div className="mt-5 text-lg font-medium">{a.title}</div>
              <p className="mt-1.5 max-w-xs text-[16px] leading-relaxed text-muted">{a.body}</p>
            </div>
          ))}
        </div>
      </Container>
    </div>
  );
}

// 5. Workspaces and the core

// The workspace as a grid, after ClickUp's: every part of the core is its own cell, the three
// pieces it all hangs on (your Muse Code, the workspace, your Cloudflare account) are the big
// tiles in the middle, and the grid fades out towards its edges. Cells fill in row by row around
// the tiles, so the list runs: the top row, then the four cells either side of the tiles in each
// of the two middle rows (left two, right two), then the bottom row.
const CELLS: [LucideIcon, string][] = [
  [DatabaseIcon, "Database"],
  [SquareTerminalIcon, "Query"],
  [ListOrderedIcon, "Migrations"],
  [HistoryIcon, "Backups"],
  [ActivityIcon, "Events"],
  [WebhookIcon, "Hooks"],
  [WorkflowIcon, "Workflows"],
  [BarChart3Icon, "Reports"],
  [ChartLineIcon, "Analytics"],
  [ScrollTextIcon, "Logging"],
  [ImageIcon, "Images"],
  [VideoIcon, "Video"],
  [SparklesIcon, "Skills"],
  [MapIcon, "Sitemap"],
  [FolderIcon, "Files"],
  [PaletteIcon, "Themes"],
  [GlobeIcon, "Domains"],
  [LayersIcon, "Queues"],
  [GitBranchIcon, "Git"],
  [RocketIcon, "Deploys"],
  [ServerIcon, "Dev Server"],
  [ToggleRightIcon, "Live & Dev"],
  [StoreIcon, "App Store"],
  [GitMergeIcon, "Updates"],
  [PlugIcon, "MCP Tools"],
  [MessageCircleIcon, "Threads"],
  [ShieldCheckIcon, "Approvals"],
  [BuildingIcon, "Organizations"],
];

function Workspaces() {
  return (
    <Section id="workspaces" className="pb-0 md:pb-0">
      <Container className="text-center">
        <H center size="xl" rest="The core comes built in" restClassName="mt-3 block text-[30px] leading-[1.12] md:text-[44px]" className="max-w-4xl">
          Every workspace is its own repo and its own Worker
        </H>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed tracking-wide text-muted md:text-xl">
          A database, events and hooks, workflows, analytics, media, files, deploys and git, all running in your Cloudflare account. Every app builds on them instead of bringing its own
        </p>
      </Container>

      <div className="relative mx-auto mt-16 w-[min(1440px,calc(100vw-32px))]">
      <div className="core-grid">
        <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4 lg:auto-rows-[136px] lg:grid-cols-10">
          {/* the three tiles share one dark block, so the lines between them stay dark and it can cast one shadow */}
          <div className="tiles relative z-10 col-span-2 grid gap-px bg-[#2c2e38] shadow-[0_30px_70px_-20px_rgb(27_29_36/50%),0_12px_28px_-12px_rgb(27_29_36/35%)] sm:col-span-4 lg:col-span-6 lg:col-start-3 lg:row-span-2 lg:row-start-2 lg:grid-cols-3">
          <BigTile title="Muse Code" logo={<MuseGlyph className="h-7 w-14" />} glow="rgb(0 130 251 / 55%)">
            Build with your own AI subscription
          </BigTile>
          <BigTile title="Core" logo={<Mark size={52} mono className="text-white" />} glow="rgb(138 18 224 / 60%)">
            Your site, apps and data, built in and owned by you
          </BigTile>
          <BigTile title="Cloudflare" logo={<CloudIcon className="size-12 text-cf" strokeWidth={1.6} />} glow="rgb(255 84 20 / 55%)">
            Everything deploys to your own account, at your own scale
          </BigTile>
          </div>
          {CELLS.map(([Icon, label], i) => (
            <div key={label} className={`flex flex-col items-center justify-center gap-3 bg-white px-2 py-6 text-center lg:py-0 ${i >= 8 ? "max-sm:hidden" : ""} ${i >= 12 ? "sm:max-lg:hidden" : ""}`}>
              <Icon className="size-6 text-ink-2" strokeWidth={1.6} />
              <span className="text-[15px] leading-tight text-muted">{label}</span>
            </div>
          ))}
        </div>
      </div>
        {/* the beam out of Core: down the seam through the bottom row, on towards the App card */}
        <div className="beam absolute bottom-0 left-1/2 hidden h-[137px] -translate-x-1/2 lg:block" aria-hidden />
        <span className="absolute bottom-[137px] left-1/2 z-20 hidden size-3.5 -translate-x-1/2 translate-y-1/2 rounded-full border-2 border-[#5b21b6] bg-white ring-4 ring-[#5b21b6]/15 lg:block" aria-hidden />
      </div>

    </Section>
  );
}

/** One of the three big tiles in the middle of the grid, dark like the hero: a glow rising from
 * the bottom, the dot grid, the logo in the middle, its name and one line on what it does for you. */
function BigTile({ title, logo, glow, note, children }: { title: string; logo?: ReactNode; glow: string; note?: string; children: ReactNode }) {
  // the lift on hover lives in globals.css (.tile)
  return (
    <div
      className="tile relative isolate flex flex-col items-center justify-center overflow-hidden bg-[#1B1D24] px-8 py-14 text-center text-white transition-[scale,box-shadow,z-index] duration-300 ease-out lg:py-0"
      style={{ "--glow": glow } as CSSProperties}
    >
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div className="tile-glow absolute inset-x-[-20%] -bottom-1/2 h-full rounded-full blur-3xl transition-[translate,scale] duration-500 ease-out" style={{ background: `radial-gradient(closest-side, ${glow}, transparent)` }} />
        <div className="dots absolute inset-0" />
      </div>
      {logo ? <div className="tile-logo mb-5 grid h-16 place-items-center transition-[scale] duration-300 ease-out">{logo}</div> : null}
      <div className="text-[26px] font-medium tracking-wide">{title}</div>
      <p className="mt-2 max-w-[340px] text-[15px] leading-relaxed text-white/60">{children}</p>
      {note ? <p className="mt-4 text-[13px] tracking-wide text-white/40">{note}</p> : null}
    </div>
  );
}

// 6. Apps: build your own

// The join from the workspace grid down to the apps: a line drops from the grid to a dark "Apps"
// card, with the two ways to get one either side of it, and runs on into the apps headline.
function AppJoin() {
  return (
    <div className="flex flex-col items-center px-4 sm:px-6">
      <div className="beam relative h-20 md:h-28" aria-hidden />
      <div className="grid w-full max-w-5xl items-center gap-6 md:grid-cols-[1fr_auto_1fr] md:gap-0">
        <AppWay side="left" title="Build Your Own">
          A custom-coded solution for exactly how you work, built with <Muse product="Code" className="text-ink" />
        </AppWay>
        <div className="relative isolate mx-auto grid size-40 place-items-center overflow-hidden rounded-3xl bg-[#1B1D24] text-white shadow-[0_24px_60px_-18px_rgb(27_29_36/55%),0_0_0_6px_rgb(27_29_36/6%)] max-md:order-first">
          <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
            {/* the hero's light in small: its four colours drifting under a dark top, then its dots */}
            <div className="app-blob -bottom-[30%] -left-[35%] size-[110%] bg-[radial-gradient(closest-side,rgb(138_18_224/45%)_30%,transparent)] [animation:hero-drift-a_9s_ease-in-out_infinite_alternate]" />
            <div className="app-blob -bottom-[40%] left-[10%] size-[90%] bg-[radial-gradient(closest-side,rgb(226_7_126/38%)_30%,transparent)] [animation:hero-drift-b_7s_ease-in-out_infinite_alternate-reverse]" />
            <div className="app-blob -right-[40%] -bottom-[30%] size-[100%] bg-[radial-gradient(closest-side,rgb(255_84_20/38%)_30%,transparent)] [animation:hero-drift-a_8s_ease-in-out_infinite_alternate-reverse]" />
            <div className="app-blob top-[-10%] -right-[30%] size-[70%] bg-[radial-gradient(closest-side,rgb(38_236_240/28%)_30%,transparent)] [animation:hero-drift-c_10s_ease-in-out_infinite_alternate]" />
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#1b1d24_0%,rgb(27_29_36/80%)_45%,rgb(27_29_36/30%)_100%)]" />
            <div className="hero-dots" />
            <div className="hero-dots hero-dots-lit" />
          </div>
          <div className="flex flex-col items-center gap-2">
            <CodeXmlIcon className="size-7 text-white/80" strokeWidth={1.6} />
            <span className="text-[26px] font-medium tracking-wide">Apps</span>
          </div>
        </div>
        <AppWay side="right" title="Install From the App Store">
          Apps built by experts, free or paid, installed into your repo so you own them
        </AppWay>
      </div>
      <div className="beam beam-fade relative mb-12 h-16 md:mb-16 md:h-24" aria-hidden />
    </div>
  );
}

/** One way to get an app, beside the App card, with a short line running in to the card. */
function AppWay({ side, title, children }: { side: "left" | "right"; title: string; children: ReactNode }) {
  return (
    <div className={`flex items-center justify-center gap-6 md:justify-end ${side === "left" ? "md:flex-row" : "md:flex-row-reverse"}`}>
      <div className={`text-center md:max-w-[18rem] ${side === "left" ? "md:text-right" : "md:text-left"}`}>
        <div className="text-xl font-medium">{title}</div>
        <p className="mt-1.5 text-[16px] leading-relaxed text-muted">{children}</p>
      </div>
      <div className={`hidden h-px w-14 shrink-0 md:block ${side === "left" ? "bg-gradient-to-r" : "bg-gradient-to-l"} from-line to-ink/25`} aria-hidden />
    </div>
  );
}

function AppsBuild() {
  return (
    <Section id="apps" className="pt-0 pb-12 md:pt-0 md:pb-16">
      <AppJoin />
      <Container className="text-center">
        <H center size="xl" className="max-w-4xl">
          Your code, in your repo
        </H>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed tracking-wide text-muted md:text-xl">An app is a folder in your workspace repo with its own tables, routes, pages, admin screens and MCP tools</p>
      </Container>
      <Container>
        <div className="mt-16">
          <AppAnatomy />
        </div>
        <AppGrowth />
      </Container>
    </Section>
  );
}

// What happens to an app after it's installed: the beam branches from the app's folder into the
// two things Muse Code does with it, extend it and merge its updates.
function AppGrowth() {
  return (
    <div className="mx-auto max-w-5xl">
      {/* the branch: out of a node on the panel's bottom edge, then down into the top of each card */}
      <div className="relative hidden md:block">
        <span className="absolute top-0 left-1/2 z-10 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#5b21b6] bg-white ring-4 ring-[#5b21b6]/15" aria-hidden />
      <svg viewBox="0 0 100 80" preserveAspectRatio="none" className="block h-24 w-full" aria-hidden>
        <defs>
          <linearGradient id="branch" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#9b3dff" stopOpacity="0.55" />
            <stop offset="1" stopColor="#ec1480" stopOpacity="0.55" />
          </linearGradient>
        </defs>
        {["M50 0 C50 44, 25 36, 25 80", "M50 0 C50 44, 75 36, 75 80"].map((d) => (
          <g key={d}>
            <path d={d} fill="none" stroke="url(#branch)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
            <path d={d} fill="none" stroke="#ff8a5c" strokeWidth={2} strokeLinecap="round" vectorEffect="non-scaling-stroke" pathLength={100} className="wire-pulse" />
          </g>
        ))}
      </svg>
      </div>
      <div className="mx-auto h-12 w-[2px] bg-gradient-to-b from-[#9b3dff]/55 to-[#ec1480]/55 md:hidden" aria-hidden />

      <div className="grid gap-5 md:grid-cols-2">
        <DarkCard glow="rgb(0 130 251 / 40%)">
          <div className="text-right text-xl font-medium">Extend Any App</div>
          <p className="mt-2 text-right text-[16px] leading-relaxed text-white/60">
            Ask <Muse product="Code" className="text-white" /> to add a feature, change a page or wire it into another app. It&apos;s your code, so nothing is off limits
          </p>
          <div className="mt-6 space-y-2.5">
            <div className="ml-auto w-fit max-w-[85%] rounded-2xl bg-white/10 px-3.5 py-2 text-[14px] text-white/90">Add a newsletter signup to the end of every post</div>
            <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] font-mono text-[12.5px] text-white/75">
              {[
                ["apps/blog/pages/[slug].tsx", "+12", "−1"],
                ["apps/forms/components/signup.tsx", "+34", ""],
              ].map(([f, add, del], i) => (
                <div key={f} className={`flex items-center gap-2.5 px-3.5 py-2.5 ${i ? "border-t border-white/10" : ""}`}>
                  <CodeIcon className="size-3.5 shrink-0 text-white/40" />
                  <span className="min-w-0 flex-1 truncate">{f}</span>
                  <span className="text-[#5ee0a0]">{add}</span>
                  {del ? <span className="text-[#ff8aa8]">{del}</span> : null}
                </div>
              ))}
            </div>
            <p className="text-[14px] leading-snug text-white/50">Done. Every post now ends with the Newsletter form</p>
          </div>
        </DarkCard>
        <DarkCard glow="rgb(138 18 224 / 45%)">
          <div className="text-xl font-medium">Merge Every Update</div>
          <p className="mt-2 text-[16px] leading-relaxed text-white/60">
            When the builder ships a new version, Muse Code merges it around your changes, checks it for security issues and asks before it lands
          </p>
          <div className="mt-6 overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] text-[14px]">
            <div className="flex items-center gap-2.5 border-b border-white/10 px-3.5 py-2.5">
              <GitMergeIcon className="size-4 text-[#c084fc]" />
              <span className="flex-1 text-white">Blog 1.1.0</span>
              <span className="font-mono text-[12px] text-white/45">from the builder</span>
            </div>
            {["Merged around your 3 changes", "Security check passed"].map((t) => (
              <div key={t} className="flex items-center gap-2.5 border-b border-white/10 px-3.5 py-2.5 text-white/80">
                <CheckIcon className="size-4 text-[#5ee0a0]" />
                {t}
              </div>
            ))}
            <div className="flex items-center justify-between px-3.5 py-2.5">
              <span className="text-white/50">Waiting for you</span>
              <span className="rounded-full bg-white px-3 py-1 text-[13px] text-ink">Approve</span>
            </div>
          </div>
        </DarkCard>
      </div>
      <ul className="mt-8 flex flex-wrap justify-center gap-2.5">
        {(
          [
            [PaletteIcon, "Matches Your Brand"],
            [SwatchBookIcon, "Uses Your Style Guide"],
            [GlobeIcon, "Deployed With Your Site"],
          ] as const
        ).map(([Icon, label]) => (
          <li key={label} className="flex items-center gap-2 rounded-full border border-line bg-white px-5 py-2.5 text-[16px] font-medium text-ink shadow-[0_1px_2px_rgb(0_0_0/4%)]">
            <Icon className="size-4 text-muted" />
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A dark card on the white page, like the hero: #1B1D24, the dot grid, a glow rising from below. */
function DarkCard({ glow, children }: { glow: string; children: ReactNode }) {
  return (
    <div className="relative isolate min-w-0 overflow-hidden rounded-3xl bg-[#1B1D24] p-7 text-white shadow-[0_30px_70px_-28px_rgb(27_29_36/55%)] sm:p-9">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div className="absolute inset-x-[-20%] -bottom-2/3 h-full rounded-full blur-3xl" style={{ background: `radial-gradient(closest-side, ${glow}, transparent)` }} />
        <div className="dots absolute inset-0" />
      </div>
      {children}
    </div>
  );
}

// 7. Apps connect to the core, the design system and each other

// The App Store as a grid, like the workspace's: the apps a marketing stack needs in faded cells
// around one dark tile in the middle on where they come from. Cells fill row by row around it.
const STORE_APPS: [LucideIcon, string][] = [
  [FileTextIcon, "Blog"],
  [LayoutTemplateIcon, "Landing Pages"],
  [RouteIcon, "Funnels"],
  [ShoppingCartIcon, "Checkouts"],
  [GiftIcon, "Offers"],
  [KeyRoundIcon, "Entitlements"],
  [CreditCardIcon, "Payments"],
  [TextCursorInputIcon, "Forms"],
  [UsersIcon, "Community"],
  [BookOpenIcon, "Courses"],
  [VideoIcon, "Webinars"],
  [MailIcon, "Email"],
  [NewspaperIcon, "Newsletter"],
  [CalendarCheckIcon, "Bookings"],
  [MegaphoneIcon, "Ad Designer"],
  [StarIcon, "Reviews"],
  [HandshakeIcon, "Affiliates"],
  [CircleHelpIcon, "Quizzes"],
  [ClipboardListIcon, "Surveys"],
  [BadgeCheckIcon, "Memberships"],
  [MicIcon, "Podcasts"],
  [CalendarDaysIcon, "Events"],
  [LinkIcon, "Link in Bio"],
  [ContactRoundIcon, "CRM"],
  [ReceiptIcon, "Invoices"],
  [TicketIcon, "Coupons"],
  [Share2Icon, "Referrals"],
  [MessagesSquareIcon, "Chat"],
  [SearchIcon, "SEO"],
  [AppWindowIcon, "Popups"],
  [FlaskConicalIcon, "A/B Tests"],
  [SendIcon, "Social Posts"],
];

function AppsConnect() {
  return (
    <Section>
      <Container>
        <Split title="A checkout app writes an order." rest="Your email app sends the receipt">
          Apps share the core, your theme and each other&apos;s code, so they work together without an integration in between
        </Split>
        <div className="mt-14 grid gap-10 border-t border-line pt-10 md:grid-cols-3">
          <Point title="The core." icon={DatabaseIcon}>
            Contacts, events, analytics and media live in the workspace, so every app reads the same customers instead of keeping its own copy
          </Point>
          <Point title="Your design system." icon={PaletteIcon}>
            Apps render in your theme with your components, so a form in a blog post looks like it belongs there
          </Point>
          <Point title="Your site." icon={GlobeIcon}>
            Deployed apps add pages and routes to the site you already have, under your domain
          </Point>
        </div>
      </Container>
    </Section>
  );
}

// 8. The marketplace: the apps a marketing stack needs, and the App Store they come from

function Marketplace() {
  return (
    <Section id="marketplace" className="pt-12 md:pt-16">
      <Container>
        <H center size="xl" className="max-w-4xl">
          An App Store built by experts
        </H>
        <p className="mx-auto mt-6 max-w-2xl text-center text-lg leading-relaxed tracking-wide text-muted md:text-xl">
          Apps from people who know one problem better than anyone, installed into your workspace instead of cloned. Free or paid, and when it&apos;s paid, the builder gets paid
        </p>
      </Container>

      <div className="core-grid mx-auto mt-14 w-[min(1440px,calc(100vw-32px))]">
        <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4 lg:auto-rows-[120px] lg:grid-cols-10">
          <div className="relative z-10 col-span-2 grid shadow-[0_30px_70px_-20px_rgb(27_29_36/50%),0_12px_28px_-12px_rgb(27_29_36/35%)] sm:col-span-4 lg:col-span-4 lg:col-start-4 lg:row-span-2 lg:row-start-2">
            <BigTile title="Built by Experts" glow="rgb(226 7 126 / 50%)" note="The App Store is coming soon">
              Point solutions from people who know one problem better than anyone
              <span className="mt-2 block text-white/85">Installed into your repo, not cloned</span>
            </BigTile>
          </div>
          {STORE_APPS.map(([Icon, label], i) => (
            <div key={label} className={`flex flex-col items-center justify-center gap-3 bg-white px-2 py-6 text-center lg:py-0 ${i >= 8 ? "max-sm:hidden" : ""} ${i >= 12 ? "sm:max-lg:hidden" : ""}`}>
              <Icon className="size-6 text-ink-2" strokeWidth={1.6} />
              <span className="text-[15px] leading-tight text-muted">{label}</span>
            </div>
          ))}
        </div>
      </div>

    </Section>
  );
}

// 9. Two kinds of app

function AppTypes() {
  const kinds: { icon: LucideIcon; title: ReactNode; body: string; examples: string[] }[] = [
    { icon: GlobeIcon, title: "Ships with your site", body: "A blog, landing pages, a checkout. Public pages and routes under your domain, sharing components with each other", examples: ["Blog", "Landing Pages", "Checkouts", "Forms"] },
    {
      icon: LayoutDashboardIcon,
      title: (
        <>
          Tools for your team, on <Muse product="Image" className="text-meta" />
        </>
      ),
      body: "Dashboards, an ad designer, an outreach tool. Admin screens for editors, clients and the people who won't touch code",
      examples: ["Ad Designer", "Outreach", "Reports", "Approvals"],
    },
  ];
  return (
    <Section>
      <Container>
        <H center size="xl" rest="or internal to your team" className="max-w-4xl">
          Deployed with your site,
        </H>
        <div className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-line bg-line lg:grid-cols-2">
          {kinds.map((k, i) => (
            <div key={i} className="bg-white p-8 md:p-12">
              <k.icon className="size-6 text-ink" />
              <div className="mt-6 text-2xl font-medium md:text-3xl">{k.title}</div>
              <p className="mt-3 max-w-md text-[17px] leading-relaxed text-muted">{k.body}</p>
              <div className="mt-8 flex flex-wrap gap-2">
                {k.examples.map((a) => (
                  <Chip key={a}>{a}</Chip>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}

// 10. Muse Code as your CTO

// Where the beta download lives. A placeholder until there's a build to share.
const DOWNLOAD_URL = "#beta";

function Cto() {
  return (
    <section id="beta" className="scroll-mt-20 p-2 md:p-3">
      <Panel glow="none" className="pt-28 md:pt-40">
        {/* the hero's light, quieter: its colours drifting low in the card under a dark top */}
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-45" aria-hidden>
          <div className="hero-blob hero-blob-violet" />
          <div className="hero-blob hero-blob-blue" />
          <div className="hero-blob hero-blob-cyan" />
          <div className="hero-blob hero-blob-magenta" />
          <div className="hero-blob hero-blob-orange" />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#1b1d24_0%,rgb(27_29_36/75%)_30%,rgb(27_29_36/20%)_70%,rgb(27_29_36/55%)_100%)]" />
        </div>
        <Container className="flex flex-col items-center">
          <div className="text-2xl md:text-3xl">
            <Muse product="Code" byMeta />
          </div>
          <h2 className="mt-6 max-w-4xl text-center text-[40px] leading-[1.25] font-medium tracking-wide text-balance md:text-6xl">Make Muse Code Your CTO &amp; Build with SuperGrid</h2>
          <p className="mt-6 max-w-2xl text-center text-lg leading-relaxed tracking-wide text-pretty text-white/65 md:text-xl">
            Try the beta. Download the app for macOS, connect Muse Code and your Cloudflare account, and start building apps you own
          </p>
          {/* TODO: point at the real download once there's a build to share */}
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <a href={DOWNLOAD_URL} className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-[17px] text-ink shadow-[0_0_40px_rgb(255_255_255/18%)] transition-colors hover:bg-white/90">
              <DownloadIcon className="size-4" /> Try the Beta App
            </a>
            <WatchDemoButton className="inline-flex h-12 items-center gap-2 rounded-full border border-white/25 bg-white/[0.04] px-6 text-[17px] text-white backdrop-blur-md transition-colors hover:bg-white/10" />
          </div>
        </Container>
        <Footer />
      </Panel>
    </section>
  );
}

// 11. SuperGrid as the platform

function Platform() {
  const wants: { icon: LucideIcon; title: string; body: string }[] = [
    { icon: FolderGitIcon, title: "Ownership.", body: "Your code, your repo, your Cloudflare account" },
    { icon: SparklesIcon, title: "Your own AI.", body: "The subscription you already pay for, not a token reseller" },
    { icon: StoreIcon, title: "Expert-built.", body: "Apps by the people who understand the problem best, installed instead of cloned" },
  ];
  return (
    <Section id="beta" className="pb-28 md:pb-40">
      <Container className="flex flex-col items-center text-center">
        <Mark size={44} />
        <H center size="xl" rest="The code moves to the user" className="mt-8 max-w-4xl">
          SaaS isn&apos;t dead.
        </H>
        <p className="mt-6 max-w-3xl text-lg leading-relaxed tracking-wide text-pretty text-muted md:text-xl">
          Products built by the people who understand the problem best, shaped by the people who use them, and powered by the AI they already pay for
        </p>
        <div className="mt-14 grid w-full gap-10 border-t border-line pt-10 text-left md:grid-cols-3">
          {wants.map((w) => (
            <Point key={w.title} title={w.title} icon={w.icon}>
              {w.body}
            </Point>
          ))}
        </div>
        <form className="mt-16 flex w-full max-w-md flex-col gap-3 sm:flex-row" action="#beta">
          <input type="email" required placeholder="you@example.com" className="h-12 flex-1 rounded-full bg-soft px-5 text-[17px] outline-none placeholder:text-faint focus:ring-2 focus:ring-accent" />
          <button type="submit" className="h-12 rounded-full bg-ink px-6 text-[17px] text-white transition-colors hover:bg-ink-2">
            Join the Beta
          </button>
        </form>
        <p className="mt-4 text-[15px] text-faint">Desktop app for macOS, with your own Cloudflare account and Muse Code</p>
      </Container>
    </Section>
  );
}

function Footer() {
  return (
    <footer className="mt-24 border-t border-white/10 md:mt-32">
      <Container className="py-10">
        <div className="flex flex-col items-center justify-between gap-4 text-[15px] text-white/60 sm:flex-row">
          <div className="flex items-center gap-2.5 font-medium tracking-wide text-white">
            <Mark size={20} mono />
            SuperGrid
            <span className="rounded-full border border-white/15 px-2 py-0.5 text-[11px] font-normal tracking-wider text-white/60 uppercase">Beta</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-2">
            Built by
            <a href="https://hidylanjones.com/" target="_blank" rel="noopener" className="text-white/85 transition-colors hover:text-white">
              Dylan Jones
            </a>
            <span className="text-white/25">·</span>
            <a href="https://cerebralvalley.ai/e/meta-ai-developer-hackathon" target="_blank" rel="noopener" className="text-white/85 transition-colors hover:text-white">
              Meta AI Developer Hackathon
            </a>
          </div>
        </div>
        <p className="mt-8 text-center text-[12.5px] leading-relaxed text-white/35">
          SuperGrid is an independent project and is not affiliated with, endorsed by or sponsored by Meta. Meta, Muse and Muse Code are trademarks of their respective owners
        </p>
      </Container>
    </footer>
  );
}
