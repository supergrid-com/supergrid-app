# Demo workspace

> Written 2026-11-03 as a proposal; option A is now built. The goal: anyone, a judge or a new user, opens the
> desktop and sees a workspace that looks lived in. It has contacts, events and charts with real shape, an
> installed app with content, and it's ready to try Muse Code on. They don't need a Cloudflare account; they
> bring their own Muse login.

## Built (2026-11-03)

- **Setup → Explore a Demo** (`pages/auth/welcome.tsx`) makes an org named "Demo" with no Cloudflare link and
  calls `sg.demo.create`.
- **`src/main/local.ts`** keeps workspaces that live only on this Mac in the config file (`localWorkspaces`).
  `workspace-api.workspace()` answers for them from the repo and dev server and starts the server when needed.
  `apps.modeOf()` pins them to Dev, and Live is refused.
- **`src/main/demo.ts`** makes the repo from the template, adds the Journal app (the template app renamed to
  Posts), installs, starts the dev server, and loads `core/demo/seed.ts` through `/_ws/dev/sql`, plus
  workflows through `saveWorkflow`. It seeds once per database (`settings` row `demo.seeded`). Reset Demo Data
  and Remove Demo are in the workspace's Danger Zone.
- **Renderer**: an org's workspace list is its local ones plus its account's. The shell waits for a local
  workspace's dev server. The Build/Work switch stays on Build. Images, Media and Files say they need an
  account. There's a "Demo" badge in the switcher and on the org's Workspaces page.
- **Fixed on the way**: the D1 IPC handler dropped `local` from the target, and the agent tools' D1 target
  always asked for an account. Both now go to the dev server in Dev with no account. The app template's admin
  screens now take their words from the entity's label and plural.
- **Verified headless** under Electron with a scratch userData. Make takes about 16 s with a warm pnpm store.
  After it: 254 contacts, 8.6k events, 6 segments with counts, 3 workflows, 11 posts. The public `/journal`
  page hides drafts, the admin lists Posts, the agent's tool query works, re-opening doesn't re-seed, and reset
  restores the data.
- **Clicked through in the window** (2026-11-03, a scratch instance with its own data folder, driven over DevTools):
  setup → Explore a Demo with progress → the workspace opens. Database with the record sheet, Workflows,
  Events, the seeded Spring Launch and Journal reports, Library (Images shows "Needs a Cloudflare Account"),
  the Journal admin listing Posts, Reset Demo Data from the Danger Zone, and relaunch reopening the demo. A
  live Muse turn ran on it: it answered from the local data and drew a revenue chart card.
- **Fixed during the click-through**: today's events piled up at "just now"; the release badge showed on a
  local workspace; the first open of an app's admin stalled behind its spinner (Vite optimized deps and reloaded
  the frame, so `workspaceViteConfig` now pre-bundles the repo's UI imports); the agent socket path overflowed
  macOS's 104-byte limit under a long data folder (falls back to the temp folder); and a remembered thread Muse no
  longer has left the agent panel stuck (it's now dropped for a fresh one, and New Thread works on a failed one).
- **Left as is**: the Database labels the Journal's table "Item" (from the table name, not the app's "Posts").

- **Apps, 2026-11-04**: the Journal became **Blog** (still app id `blog`, table `app_blog_item`, mounted at `/blog`), and
  **Funnels** (`/funnels`, `app_funnels_item`) and **Pages** (`/pages`, `app_pages_item`) joined it, all three from the
  blank template with their one entity relabelled, seeded from `FUNNELS`, `PAGES` and `POSTS` in `core/demo/seed.ts`. A
  demo made before this keeps its Journal until it is removed and made again (Reset only reseeds the data).

The rest of this file is the original exploration.

---

## 1. The rule this bends, and how

The app's rule is to show only what is real: no mock pages, no fake data paths in `app/` (see the desktop
rebuild notes). A demo needs fake *content*. It does not need a fake *system*.

So: **the demo workspace is a real workspace filled with sample data.** It uses the same repo, dev server,
local D1, apps and Database pages as a real workspace. The rows are invented, but every screen reads them the
way it reads a real workspace's rows. `app/` gains no mock data source. The one exception is recorded chat
threads (§5), which replay real transcripts through the reducer that already replays Muse's history.

## 2. Three ways to do it

| | What it is | Needs on the viewer's Mac | Honest? | Cost |
|---|---|---|---|---|
| **A. Local demo workspace** | A workspace that only exists on this Mac, always in Dev mode: repo + `react-router dev` + local D1, seeded | Node, pnpm, git. No Cloudflare, no Muse | Yes, the real stack | Medium |
| **B. Seed a cloud workspace** | "Fill with sample data" on a workspace in a connected account: D1 over REST, apps deployed with the workspace | A Cloudflare account and cf login | Yes, and it has a public URL | Small once A's seed pack exists |
| **C. Renderer-only mock** | A fake data layer in the renderer, like the site's clickable demo (`launch/site/src/components/demo`) | Nothing | No, it's a second app that drifts from the real one | Medium, and it breaks the rule |

**Recommendation: A, built on a seed pack that B reuses.** A is what a judge without an account can open. B
gives you a seeded workspace with a real URL for the video and live demos, and costs little after A. Skip C;
the site already has one.

## 3. What A changes

Dev mode already runs a whole workspace on this Mac (`src/main/apps.ts`: `ensureRepo`, `devStart`,
`/_ws/dev/sql`). What blocks a local-only workspace today is that every path starts from the account:

- `workspace-api.ts` `workspace()` calls `cloudWorkspace()` first, which throws with no Cloudflare link.
- `ensureRepo()` reads the Worker's facts from the account (`repoFactsFor`) when it isn't given them.
- `RequireSetup` (`root.tsx`) only needs an org, but onboarding forces Cloudflare before the first workspace.

Changes:

1. **A local workspace record.** `config.localWorkspaces: { id, name, orgId, demo: true }[]` in main's
   config. `workspace()` answers for one with a summary built from the repo and the dev server (`dev: true`,
   no Worker), and never touches the account. Mode is pinned to Dev. The Live toggle reads "Not deployed".
   It could later turn into "Deploy this workspace", which provisions it for real with the same repo.
2. **Onboarding.** `/welcome` gets a second path, "Explore a Demo", next to the Cloudflare one. It creates an
   org called "Demo" with no Cloudflare link and makes the demo workspace. A real org can be added later from
   the org switcher, and the demo stays as its own org.
3. **Making the demo** (`src/main/demo.ts`, one job with step events like the other flows): scaffold the
   repo from `core/templates/workspace`, copy in the demo apps, `pnpm install`, commit, start the dev server
   (which applies migrations), then load the seed SQL through the existing `localSql` path. Then themes and
   skills go in as rows through the same D1 path the Library pages use.
4. **Reset Demo**, in workspace settings: stop the dev server, delete the repo's `.wrangler/state`, and seed
   again. A judge can break things freely.
5. **A badge.** "Demo" in the rail and the workspace switcher, so nobody takes it for their own data.

## 4. The seed pack

Lives outside `app/`, in `core/demo/`, because it is workspace content, not desktop code:

```
core/demo/
  workspace.json      name, theme, which apps
  apps/               blog, forms, landing-pages, ad-designer: real apps on the app system
  seed.ts             deterministic generator (fixed random seed) → seed.sql, dates relative to today
  themes/             one or two themes besides Default
  skills/             a few workspace skills
  threads/            recorded chats (§5)
```

**One made-up business.** The data should tell a story, not fill tables at random. For example, a small
ceramics brand launching a spring collection: a waitlist form on a landing page, a blog that drives
sign-ups, ads made in Ad Designer, contacts moving from subscriber to customer.

| Table group | What goes in | Why |
|---|---|---|
| contacts, contact_tags | ~250 people with names, emails, sources, tags | the Database grid and record sheet look real |
| segments, segment_members | 5 or 6 (Waitlist, Customers, Wholesale, Lapsed…) | filters and segment pages have content |
| events | ~4,000 over 90 days, with a launch spike and a weekly rhythm | `core/workspace/src/analytics.ts` reads `events`, so charts get real shape |
| app_blog_* | 12 posts, drafts and published | |
| app_forms_* | 3 forms, ~180 submissions | ties to contacts and events |
| app_landing_* | 4 pages, one live | |
| app_ads_* | 8 designs | |
| themes, skills | rows | Library pages are not empty |

Dates are generated relative to the day the demo is made, so "last 30 days" is never empty.

**The apps are the ones you need anyway.** The launch notes list Blog, Forms and Landing Pages as apps
still to build, and Ad Designer as a video mock. Building them as real apps for the demo also builds them for
the product. If time is short, each can start as the blank template with a `data` declaration and an admin
list screen, then grow.

## 5. Chats (superseded: people bring their own Muse, so the demo has no recorded threads)

Threads are Muse's own sessions (`session/list` / `session/load` in `lib/agent/provider.tsx`), stored by
Muse. We shouldn't write into Muse's store, and a judge may not have Muse.

`lib/agent/transcript.ts` already builds a thread from a list of `session/update` notifications, and a
`session/load` replay is exactly that. So:

- **Record** 3 or 4 real turns against the demo workspace with Muse, capturing the notifications plus our
  widgets (`sg.widgets.<id>`), and save each as `core/demo/threads/<id>.json`. These are real transcripts,
  not written by hand.
- **Replay**: the provider lists them as threads of the demo workspace, marked "Example", and opens them
  through `applyUpdate`. They are read only. The composer under one says "Start a new chat"; a new chat
  is a real Muse session when Muse is installed and logged in, and otherwise shows the existing sign-in hint.

Threads worth recording, matched to the video beats:

1. "Which segment converted best last month?" → analytics tool call, chart widget.
2. "Add a waitlist form to the spring landing page" → plan, app_call, navigate.
3. "Build an Ad Designer app" → plan, files, Dev panel, confirm card.
4. "Update Blog and keep my changes" → the either-or merge, then Approve.

## 6. Gaps and risks

- **Prerequisites.** Option A needs Node, pnpm and git, and the first `pnpm install` needs the network and
  about a minute. If judges should be able to just download and run it, that is the weak point. A fix is to
  ship a pre-installed demo repo in the app bundle (large) or run the dev server on Electron's own Node
  (`ELECTRON_RUN_AS_NODE`, as tried in ide-supergrid-poc). Worth a spike before committing to A.
- **Images and Media** are account-wide Cloudflare services and have no local version. In the demo those
  pages show "Connect Cloudflare to use Images". Files could work if the dev server's local R2 is wired in.
- **Agent tools in Dev mode** already target the local D1, so a real Muse chat in the demo works on the
  sample data. Tools that need the account (deploy, secrets, media token) say so.
- **Staleness.** Recorded threads mention dates and numbers from when they were recorded. Record them
  against a freshly seeded workspace, and keep the generator deterministic so the numbers match.

## 7. Order of work

1. Spike: can the dev server run with no Cloudflare and no global pnpm? (decides A's prerequisites)
2. Local workspace record + `workspace()` for it + "Explore a Demo" in onboarding.
3. Seed generator + core tables. The Database and Home pages light up.
4. Demo apps, one at a time, each with its seed rows.
5. Record and replay threads.
6. Option B: "Fill with sample data" for a cloud workspace, from the same pack.
