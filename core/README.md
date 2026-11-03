# SuperGrid core

The part that runs in a user's own Cloudflare account and that we ship updates for.

```
docs/             the overview and "building an app"; the desktop's Docs modal and the agent's docs_list/docs_read read these and the docs below (app/src/shared/docs.ts)
platform/         the control panel: React Router on a Worker, Better Auth on D1
workspace/        the headless workspace Worker: router, RPC, core schema (sitemap design in workspace/SITEMAP.md, assets in workspace/ASSETS.md)
packages/app-kit  what an app builds on: manifest, routes, RPC contract, resource names; docs/ covers events, contacts, hooks and workflows
packages/admin-sdk  postMessage protocol between the platform and an app's admin iframe
packages/theme    the theme document, its validation and the CSS it compiles to (runtime, not build time)
packages/ui       the base-ui design kit: the desktop app's components, copied into apps and themed by packages/theme
packages/admin-ui the admin layer for an app's admin screens (Page, Card, DataTable, AssetField, the shell tokens), copied in beside the kit
packages/cloud    everything that touches a Cloudflare account or a release feed
templates/        workspace/, the repo a workspace is (one Worker, apps as folders); app/, the folder a new app starts from (WORKSPACE-REPO.md)
cli/              sg: install a platform, cut and sign releases, make workspace repos and app folders, check manifests
```

The platform and the CLI share `packages/cloud`, so an install from the terminal and a click in the UI run the same code.

## Names

A workspace's display name can change and can repeat across clients, so nothing in the account is named after it. Every workspace gets a short id, and that id names its resources:

```
sg-platform             the platform Worker and D1
sg-ws-k3x9qz            a workspace Worker and D1
sg-app-k3x9qz-forms     an app Worker and its Artifacts repo
```

One agency or reseller account can hold any number of client workspaces. The ids are six characters without look-alikes such as `l` and `1`, checked for uniqueness when created. The `sg` prefix is set at install, so a second platform can share an account. All of this lives in `packages/app-kit/src/names.ts`.

## How a user gets it

```bash
pnpm sg install --account=<id> --feed=<url> --pubkey=<key> --mode=creator
```

This uses the signed-in `wrangler` login. It creates the D1, deploys the signed platform release, and prints a one-time setup link. From there the user works in the platform: create their account, connect Cloudflare with an API token, create workspaces, install apps. It refuses to run over an existing platform; use `--prefix` for a second one.

Nothing we run is involved after that. Workspaces reach each other over public URLs, the Cloudflare bill is the user's own, and everything keeps running if the feed disappears.

## How updates work

The platform, the workspace Worker and each app release separately, each with its own version. A release is a compiled bundle plus a small pointer file, and the pointer is signed:

```
<feed>/platform.json            signed pointer: version, contract, hash of the bundle
<feed>/platform-1.6.0.bundle.gz compiled Worker and assets, no account ids, no secrets
<feed>/workspace.json           same, for the workspace Worker
<feed>/app-forms.json           same, for one app; the bundle also carries its source
<feed>/catalog.json             the App Store's list
```

The platform holds the public key, verifies the pointer, then checks the bundle against the hash in it. Forks set `SG_RELEASE_FEED` and `SG_RELEASE_PUBKEY` to their own.

- **Our code** (platform, workspace) is replaced. The platform takes a D1 restore point, uploads a new version, sends traffic to it, and checks its health URL. If that fails it goes back to the previous version.
- **Apps** live in an Artifacts repo in the user's account, because users edit them. `upstream` holds releases, `main` is upstream plus the install commit plus the user's changes. An update moves `upstream` and merges into `main`:

| What the repo looks like | What happens |
|---|---|
| The user changed nothing | The signed build goes live |
| Their changes merge cleanly | `main` is merged, and needs a build of their code to go live |
| Their changes conflict | Nothing changes; the app shows Needs attention and the user merges `upstream` |

`contract` in `packages/app-kit/src/rpc.ts` says what a release speaks. A release can require a workspace contract, and the platform will say "update X first" rather than run a bad combination. Contract changes stay additive, because a platform always manages older workspaces during a rollout.

## Cutting a release

```bash
pnpm sg release platform --version=1.6.0 --key=release.key --out=releases --notes="..."
```

The target is `platform`, `workspace`, or an app folder. Add `--requires-workspace=<n>` if it needs a newer workspace. `pnpm sg keygen --out=<dir>` makes a signing key.

## Run locally

```bash
pnpm install
pnpm dev
```

The platform is on <http://localhost:5300>. Copy `platform/.dev.vars.example` to `.dev.vars` on a fresh clone. `/setup?token=dev` creates the first account. See [dev/README.md](../dev/README.md) to run a workspace beside it or to try the update flow.

After changing plugins or fields in `platform/src/auth-options.ts`, run `pnpm --filter platform auth:schema`.

## Starting a workspace and an app

```bash
pnpm sg ws new ../dev/ws --id=w2nqwt --name="Mono test"
pnpm sg ws add ../dev/ws --id=bookings --name="Bookings" --mount=/book
```

`ws new` copies `templates/workspace/`, copies the kits in and links the packages; `ws add` copies `templates/app/` into
`apps/<id>` and regenerates `.sg/`; `pnpm sg app check <folder>` reads a manifest back. The desktop's New App does the
same into the workspace's repo. See `WORKSPACE-REPO.md`.

## Adding UI components

```bash
pnpm dlx shadcn@latest add @coss/<name> -c platform
```
