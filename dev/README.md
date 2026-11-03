# SuperGrid dev

Everything for trying things out. None of it ships.

```
ws/                      a workspace repo (two apps, notes and site) for building and testing against the core
keys/                    a test signing key (git-ignored)
releases/                test releases (git-ignored)
feed/                    publishes releases/ as a public feed on the test account
serve-feed.mjs           serves releases/ locally on port 5310
smoke.ts                 runs the platform's own code against the real account
```

## The test workspace repo

```bash
pnpm --dir ws install
pnpm dev
```

This runs `dev/ws` (one Worker, both apps) at http://localhost:5301 on a local D1. The same repo is deployed as
`sgdev-ws-w2nqwt` on the test account; `pnpm --dir ws deploy` sends it up again. The desktop makes repos of the same shape
under its data folder (`workspaces/<id>`), one per workspace.

## The real flow on the test account

The test install uses the `sgdev` prefix, so it never touches `sg-platform` from the POC. Run these from `core/`.

Publish a release:

```bash
pnpm -s sg release workspace --version=0.2.0 --key=../dev/keys/release.key --out=../dev/releases --notes="..."
```

```bash
cd ../dev/feed && ../../core/node_modules/.bin/wrangler deploy --config wrangler.jsonc
```

Run the local platform connected to the account. The token comes from your wrangler login and is never written to a file:

```bash
SG_CF_TOKEN="$(node_modules/.bin/wrangler auth token | tail -1)" SG_ACCOUNT_ID=fc84d234400f2316c52025fe91ed5289 SG_RELEASE_FEED=https://sgdev-feed.supergrid-operator.workers.dev SG_RELEASE_PUBKEY="$(cat ../dev/keys/release.pub)" pnpm dev
```

A real platform stores its token through the Cloudflare page instead. That login token lasts about an hour.

## Smoke tests

`pnpm smoke` runs the same code as the platform against the real API. Read the top of `smoke.ts` for the commands: create, update, edit, broken, tamper and destroy.
