# SuperGrid desktop

The manager as an app: organizations, workspaces, apps and the coding agent, on your Mac. It holds no model account and no
server of ours: the chat runs on the user's own Muse Code login, and everything else lives in their Cloudflare account or
in a repo on this Mac. Why it's a desktop app is in [DESKTOP.md](DESKTOP.md); how the chat is wired is in [AGENT.md](AGENT.md).

```
src/main/        Electron main: the window, Cloudflare, the workspace repos and dev servers, Muse Code and its tools
  cf-cli.ts        the `cf` CLI on this Mac: sign-in, who is signed in, which accounts
  cf-api.ts        the Cloudflare API client, on cf's own login
  workspaces.ts    making a workspace in the account: Worker, D1, secrets
  workspace-api.ts a workspace's summary and data, from the account (Live) or the dev server (Dev)
  apps.ts          the workspace repo: make or find it, add app folders, run its dev server, git, build and deploy
  d1.ts            the Database pages' SQL, against the account's D1 or the local one
  library.ts       Images, Stream and R2 for the Library pages
  local.ts, demo.ts  workspaces that live only on this Mac, and the demo workspace
  agent.ts         runs `muse acp` and relays its JSON-RPC to the renderer
  agent-bridge.ts, mcp.ts, tools/   the tools Muse Code gets, over an MCP proxy and a local socket
src/preload/     the bridge the renderer may call (window.sg), typed in src/shared/bridge.ts
src/renderer/    the UI: a plain React app with a hash router
  app/shell              the workspace shell, ⌘K command palette, the docs and org modals
  app/pages              welcome and setup (auth/), organization settings (org/), a workspace's sections (workspace/), the kit pages (dev/)
  app/components/workspace   the rail, the sub nav, the title bar with Live / Dev, the chat panel, the app frame
  app/components/ai-elements the chat components, ported from AI Elements onto the UI kit
  app/lib/agent          the ACP client and the chat state, held at the app root
  app/components/ui      the coss/ui primitives, copied as they are
src/shared/      types both sides use: the bridge, ACP, the agent's context, which tables are system tables, the docs list
```

## Run

You need Node, pnpm and git. `@supergrid/*` are linked from `../core`, so install there first:

```bash
pnpm -C ../core install
pnpm install
pnpm dev
```

`pnpm typecheck` checks both sides. `pnpm build` writes `out/`, `pnpm package` makes an unsigned macOS build in
`release/`, and `pnpm dist` makes a `.dmg` beside it.

The app icon is drawn once, in `build/icon.svg`. `pnpm icons` renders it into `build/icon.png` and `build/icon.icns`,
which electron-builder puts in the bundle. In development the Electron that `pnpm dev` runs would show up as "Electron"
with its own icon, so `scripts/brand-electron.mjs` renames that local Electron.app to SuperGrid and gives it the icon; it
runs after every install and on `pnpm brand`.

In development the window is open to the DevTools protocol on port 9339 (`SG_DEVTOOLS_PORT` changes it), so scripts can
drive it and take screenshots.

## How it works

- **Cloudflare.** The app holds no Cloudflare token. Settings › Cloudflare runs `cf auth login` in the browser, and every
  account call reads cf's own login for that one job (`cf-api.ts`); `cf auth whoami` lists the accounts it reaches. An
  organization is linked to one account and an install prefix (`sg` by default). Wrangler ships inside the app and runs
  as a Node script through Electron's own binary (`resources/wrangler-shim.cjs`), so no Node on PATH is needed for it.
  The older connect flow, an OAuth login that mints an account token, is still in `cloudflare.ts` and `CONNECT.md` and is
  used only as a fallback.
- **Workspaces.** Listed from the account: every `<prefix>-ws-<id>` Worker, with its name, URL, version and apps. Each
  one has a repo on this Mac at `workspaces/<id>` under the app's data folder, made from `core/templates/workspace`: one
  git repo, one pnpm workspace, every app a folder under `apps/` (`core/WORKSPACE-REPO.md`). Creating a workspace makes
  the Worker and D1, scaffolds the repo, builds it and deploys that build.
- **Live / Dev**, in the title bar (`lib/mode.ts`). Live shows the deployed Worker. Dev starts the repo's one dev server
  (`react-router dev`, every app on one port, a local D1) and adds the **Code** section: files by app, git, the server log
  and deploys. **+** adds an app from `core/templates/app`; **Deploy** builds the repo and uploads it as the workspace
  Worker, one version.
- **App admin screens** render in an iframe, signed in through a handoff the main process mints, and talk to the shell
  over the admin SDK (menu, title, media picker, toasts).
- **Database, Events, Workflows, Library and Settings** read and write the workspace's real data: D1 over the API in
  Live, the local database through the dev-only `/_ws/dev/sql` in Dev.
- **The agent.** The chat talks to Muse Code over ACP. Main runs `muse acp` and relays its lines; the renderer owns the
  protocol in `app/lib/agent`. It needs `muse` installed and signed in with `muse login`. Each thread is a Muse session in
  the workspace's repo. Muse gets the app's tools (apps, database, library, themes, analytics, deploy) through an MCP
  proxy that never sees a credential; writes that change or delete data ask first. Every prompt carries where the user is
  in the app. The full list is in [AGENT.md](AGENT.md).
- **Demo.** **Explore the Demo** in setup, or in New Workspace, makes a workspace that lives only on this Mac, pinned to
  Dev, with the Funnels, Pages and Blog apps and data seeded from `core/demo/seed.ts`. No Cloudflare account needed. See
  [DEMO.md](DEMO.md).
- **Toolchain.** A packaged build carries what it needs from `core/` (the templates, the workspace and the shared packages) in its resources and runs workspace
  repos on its own Node and pnpm (`toolchain.ts`), so a Mac without either can make a workspace. Development uses yours;
  `SG_OWN_NODE=1` tries the bundled pair.

## Not done

- Installing and updating apps from an upstream repo (`core/WORKSPACE-REPO.md` §6).
- The build is ad-hoc signed and not notarized; macOS only.

`pnpm -C ../dev smoke create` provisions a test workspace under the `sgdev` prefix on the SuperGrid account;
`pnpm -C ../dev smoke destroy <id>` removes it.
