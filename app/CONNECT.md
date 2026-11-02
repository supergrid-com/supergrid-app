# Connecting Cloudflare

"Connect Cloudflare" on the Home screen is one browser visit, and the last time anyone deals with a token. It signs the
person in with Cloudflare's OAuth, mints an API token for the account the app manages, keeps that token, and forgets the
login. Every workspace made afterwards gets its media token at creation; nothing is pasted later.

## Why not wrangler's login

The earlier design ran `wrangler login` and read its OAuth token for the API calls. That worked for Workers, D1, Queues and
R2, and could never work for Images, Stream or analytics: wrangler's OAuth client has no scope for them, `wrangler login
--scopes` only accepts its fixed list, and no Cloudflare OAuth client has a Stream scope at all. An OAuth access token also
expires within the hour, so it was never a candidate for a Worker secret. That is why the Assets page first shipped with a
paste box for a second, hand-made token.

## What happens now (`app/src/main/cloudflare.ts`, `oauth.ts`)

1. **OAuth, scoped to the mint.** The app runs the PKCE flow itself (`oauth.ts`): the `cf` CLI's OAuth client, which
   wrangler bundles and whose registered scopes include `account_api_tokens:create`, with a callback on `localhost:8877`.
   It asks for `CONNECT_SCOPES`: see the accounts, see who is signed in, create account API tokens, and one dotted scope
   per permission group the token will hold (`workers-scripts.write`, `d1.write`, `queues.write`, `workers-r2.write`,
   `account-settings.read`, `artifacts.write`, `images.write`, `stream.write`, `account-analytics.read`). Cloudflare mints
   only what the login itself was granted, and checks that against these dotted scopes, not the coarse colon ones; the
   first connect, with three scopes, came back `1001 The OAuth session does not include the scopes required for the
   requested permission groups`. The access token stays in memory.
2. **Mint.** With it, `POST /accounts/{id}/tokens` creates an account-owned token named `SuperGrid on <machine>` holding
   `APP_PERMISSIONS` (`packages/cloud/src/scopes.ts`): Workers Scripts, D1, Queues, Workflows, R2, Account Settings read,
   Artifacts, Images, Stream, Account Analytics read, and Account API Tokens write. Permission groups are resolved by name
   at mint time (`mintToken` in `packages/cloud/src/resources.ts`), with both the "Write" and the older "Edit" spellings
   tried; groups the account does not offer are skipped with a warning, and so are groups the login has no scope for
   (`mintable`). Two have no OAuth scope at all, **Workflows** and **Account API Tokens**, so a minted token never carries
   them: workspaces then get the app's own token as their media token rather than one of their own, and whether the
   Workflows API accepts a Workers Scripts permission is still to be seen. The Home card lists what the token is without.
   The token value comes back once and is sealed with the OS keychain (`safeStorage`) into `config.json` under userData,
   one per account.
3. **Use.** `client()` builds the API client from that token. Switching to another account mints one for it too while the
   login is still fresh; later it asks to connect again. "Disconnect" forgets the stored token; the token itself is deleted
   from the dashboard, since the app does not keep enough rights to do that for a pasted one.

## Workspaces and media

`provisionWorkspace` and `updateWorkspace` (`packages/cloud/src/ops.ts`) give each workspace `SG_MEDIA_TOKEN` as a secret
beside `CF_ACCOUNT_ID`: a token of its own, `<worker> media`, minted with only Images, Stream and Account Analytics, so a
leaked workspace secret cannot touch Workers or D1. When the app's token may not create tokens (a pasted one without that
permission), the app's own token is written instead (`MediaCredential.shared`). Workspaces from before get the same through
"Turn on" on the Assets page (`ws.setMediaToken`), which also accepts a pasted token. See `core/workspace/ASSETS.md` for what
the workspace does with it.

## The fallback

A member without token provisioning rights cannot mint. The Home card then shows `needs-token`: the dashboard's token form
opened with every permission filled in (`tokenTemplateLink`) and a paste box; `setToken` checks the token against the account
before keeping it. From there everything is the same.

## Verified on the SuperGrid test account (2026-11-02)

The token endpoint takes the OAuth bearer. The first connect, with three scopes, reached it and was refused only for
scopes (the check described above); the second, with the dotted scopes, minted `SuperGrid on M4-Max` (id `925a9ea1…`)
without Workflows and Account API Tokens, and the app sealed it. Creating tokens also needs the account to allow it: a
member must have API token provisioning turned on (or be the owner), which the fallback above covers when they do not.
One more lesson from that run: the callback server first listened on `localhost`, which Node bound to `::1` while the
browser went to `127.0.0.1`; it now listens on both.
