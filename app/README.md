# SuperGrid desktop

The manager as an app: organizations, workspaces, apps, updates and the coding agent, on your machine. What it is and why is in [DESKTOP.md](DESKTOP.md).

```
src/main/        Electron main: the window, the Cloudflare login, @supergrid/cloud operations, and the coding agent's process
src/preload/     the bridge the renderer may call (window.sg), typed in src/shared/bridge.ts
src/renderer/    the UI: a plain React app with a hash router
  app/components/workspace   a workspace: a rail, a sub nav panel, the chat, and one page at a time on the canvas
  app/components/ai-elements   the chat components, ported from AI Elements onto the UI kit; the chat is a panel only, on the admin theme
  app/lib/agent         the ACP client and the chat state, held at the app root
  app/components/ui     the coss primitives, copied as they are
  app/lib/mock.ts       static data standing in for the control plane and the workspaces, until the bridge serves them
```

The renderer came from `supergrid-dev/mfe-poc/platform-ui-poc`, keeping its sidebar admin. The title bar follows Codex: history and the sidebar toggle by the traffic lights, then a divider on the canvas's left edge and the page's title and actions. The POC's side nav for platform pages is gone: the SG menu on those pages does that job.

## Run

```bash
pnpm install
pnpm dev
```

`pnpm typecheck` checks both sides; `pnpm build` writes `out/`; `pnpm package` makes an unsigned macOS build in `release/`.

## What is real

- **Cloudflare:** the main process runs the bundled wrangler (as a Node script through Electron's own binary, behind `resources/wrangler-shim.cjs`) for the login and its token. The Home card shows the login, lets you pick the account and the install prefix, and runs `wrangler login` when there is none. The choice is kept in `config.json` under the app's userData folder; `SG_ACCOUNT_ID` and `SG_PREFIX` in the environment are the defaults.
- **Workspaces:** listed from the account itself: every `<prefix>-ws-<id>` Worker, with its name, URL, version and installed apps read from the Worker's bindings. No directory yet. Only apps the mock catalog knows (pages, funnels, forms, hello) show until app screens load from the workspace.
- **The agent:** the chat talks to Muse Code over ACP. Main runs `muse acp` (with `MUSE_EXPERIMENTAL_ACP=1`) and relays its lines; the renderer owns the protocol in `app/lib/agent`, and the conversation is a plain AI SDK `useChat` transcript. It needs `muse` installed and logged in with `muse login`, and it uses that login, so the app holds no model account. Sessions run in `workspaces/<id>` under the app's userData folder until apps are cloned locally.
- **Everything else** in a workspace (data, app pages, workflows, secrets, files) is still mock data from `app/lib/mock.ts`.

`pnpm -C ../dev smoke create` provisions a test workspace under the `sgdev` prefix on the SuperGrid account; `pnpm -C ../dev smoke destroy <id>` removes it. The next steps, in order, are in DESKTOP.md §9.
