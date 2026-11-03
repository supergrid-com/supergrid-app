# Creating, running, installing

## Create

```bash
cd core && pnpm sg app new ../my-apps/bookings --id=bookings --name="Bookings" --mount=/book --icon=calendar.svg
```

or **New App** from the rail's Apps section in the desktop. Both copy `core/template`, copy the kits in
(`components/ui`, `components/admin`), write the manifest (id, name, mount or admin-only, description, color, icon),
link the core packages, install dependencies and start a git repo. The desktop puts the app in the workspace's folder
(`~/Library/Application Support/SuperGrid/workspaces/<id>/apps/<app>`), which is a pnpm workspace so shared packages
resolve. `sg app check` reads a manifest back and says what is wrong with it.

## Run

```bash
pnpm dev
```

One Vite server runs the workspace Worker (from `core/workspace/wrangler.jsonc`) with the app as an auxiliary Worker
and the app added to its route table, sharing one local D1. Public pages at `http://localhost:5301<mount>`, the admin
standalone at `/admin/<id>` (through the local workspace's handoff, or straight from the Dev panel's **Open Admin**),
the served manifest at `/_app/<id>/manifest.json`, operations at `/api/<id>/ops`. The desktop's Dev panel runs the
same on a free port and tails the log.

## Install and deploy

The Dev panel's **Deploy** tab builds the folder (`pnpm build`), uploads the Worker (`sg-app-<ws>-<id>`) with the
workspace's bindings (`WORKSPACE` service binding, `DB`), and rewrites the workspace's `ROUTES` with the app's route
summary. The app's migrations run on its first request, through the workspace's ledger. Deploying an installed app is
the same flow; the summary is rewritten, so a menu change shows at once. The agent does the same with `apps_install`
after asking. Maintained apps from a feed install and update through the signed release flow instead (core/README.md).

## The mount, and moving it

`public.mount` in the manifest is where the app's pages live at install. After that the sitemap (Settings › Domain &
Sitemap) owns it: change `/f` to `/funnels` there, and the workspace redirects `/f/*` at once while the app is marked
Needs a build; the next deploy builds the routes at the new prefix (`SG_PUBLIC_MOUNT` at build time). Links written
with `ctx.href` follow without a code change. `/`, `/_ws`, `/_app`, `/admin` and `/api` cannot be mounts for an app's
pages except `/` for the site app.

## The Dev panel

Under an app in the rail (or `apps/<id>/_dev`):

| Tab | What it shows and does |
|---|---|
| Overview | where the app lives (mount, admin, API, operations, Worker, folder), the admin menu, the data as declared and as served, the operations the running code lists, shared packages and who is behind, manifest problems |
| Files | the folder (without node_modules and build output) and any file's text |
| Server | start and stop the dev server, open the admin or the served manifest, the log |
| Git | branch, uncommitted changes, remote, the last commits |
| Deploy | Build & Install or Build & Deploy with progress; Uninstall |

An app that is only a folder on this Mac shows in the rail with a **Dev** mark and opens its Dev panel; an installed app
opens its admin, with the Dev panel one click away in the title bar.

## For the agent

In Dev mode the agent has `apps_local`, `apps_create`, `apps_install` beside `app_describe`, `app_call` and
`app_locate`. Its sessions run in the workspace's folder, so the app folders are in its reach for reading and editing;
`.claude/skills/supergrid-app/SKILL.md` and `GUIDE.md` in each app tell it the rules.
