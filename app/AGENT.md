# The agent chat: how it is wired

> A map of the agent panel after 2026-11-02: Muse Code over ACP, the app's tools over MCP, the context each prompt carries, the questions a tool can put to the user, and the cards a result draws. Companion to `DESKTOP.md` §6.

## The pieces

```
renderer                      main                              child processes
──────────────────────────    ────────────────────────────────  ───────────────────────────────
lib/agent/provider.tsx   ◄──► main/agent.ts (ACP relay)    ◄──► muse acp
  threads, prompts,            spawns Muse, pipes JSON-RPC         │ spawns one MCP server per session
  asks, widgets                                                    ▼
lib/agent/context.ts     ───► main/agent-bridge.ts         ◄──── main/mcp.ts (stdio ↔ socket proxy)
  where the user is            socket server; runs the tools;      holds nothing: SG_BRIDGE + SG_CLIENT
                               ask / widget / navigate → window
components/ai-elements/        main/tools/*.ts
  ask.tsx, widgets.tsx,          app, database, library,
  tool.tsx                       themes, analytics
```

- **Muse** is one process for the whole app (`main/agent.ts`). Each thread is one of its sessions, in the workspace's folder.
- **The MCP server** Muse spawns per session is a proxy (`main/mcp.ts`): it connects back to the app over a local socket and forwards `tools/list` and `tools/call`. It never sees a credential.
- **The bridge** (`main/agent-bridge.ts`) owns the socket, knows which session each client id is, and runs the tools with the Cloudflare login and the workspace tokens the app already holds. A tool can `ask` the user (a card in the chat, the turn waits), draw a `widget` beside its call, and `navigate` the app.
- **Client ids.** The renderer makes one per session, passes it when it asks main for the session's MCP config, and binds it to the session id and the thread's Dev flag once the session exists. Every ask, widget and navigation carries it, so the right thread shows it.

## Context

Every prompt carries a resource block (`supergrid://context`, see `shared/agent.ts`): the organization, the workspace and its apps, where the user is (section, page, table or app, any open settings or docs modal), and the thread's mode. The workspace shell keeps it current (`lib/agent/context.ts`) and tells main too, so `app_context` reads the same thing mid-turn. The transcript hides the block on replay.

## Modes

The composer's Agent / Dev switch is per thread. Agent mode works through the workspace: rows, themes, library, skills, analytics, navigation. Dev mode also unlocks the shape of custom tables (`db_create_table`, `db_add_column`, `db_drop_table`), write SQL by hand (`db_execute`), and later the apps' code. A Dev-only tool called in Agent mode answers with how to switch; `suggest_dev_mode` puts the switch in the chat and waits. The instructions tell the agent to suggest it when asked to build an app or change code.

## Human in the loop

Reads are free. Adding rows is free up to twenty at once. Updating and deleting rows, dropping tables, running SQL by hand and deleting themes always ask, with a preview of the rows that change. `events` and the system tables are read only for everyone (`shared/tables.ts` is the one place that says which table is which). Approval cards time out after fifteen minutes; stopping the turn declines them.

## Widgets

A tool's result can draw a card (`components/ai-elements/widgets.tsx`): pictures as thumbnails, media with an inline player, files, theme tiles, a rows table, a metric, a bar or line chart, skills, and a chip for a page the app opened. The card attaches to the tool call by name; cards are kept per session in localStorage so a reopened thread shows them again.

## Tools

| Area | Tools |
|---|---|
| App | `app_context`, `app_navigate`, `apps_list`, `sitemap`, `suggest_dev_mode`, `docs_list`, `docs_read` |
| Apps | `app_describe` (an installed app's served manifest: entities, operations, screens), `app_call` (run an operation; `confirm` ones ask), `app_locate` (where a row is seen), `apps_local` (the folders on this Mac); Dev: `apps_create` (from the template), `apps_install` (build and deploy, asks) |
| Database | `db_tables`, `db_describe`, `db_rows`, `db_query` (SELECT only), `db_insert`, `db_update` (asks), `db_delete` (asks); Dev: `db_execute`, `db_create_table`, `db_add_column`, `db_drop_table` |
| Library | `images_list`, `media_list`, `files_list`, `library_show`, `library_upload` (picker in the chat), `skills_search`, `skills_read`, `skills_save` |
| Themes | `theme_guide`, `themes_list`, `theme_get`, `theme_save`, `theme_create`, `theme_set_default`, `theme_delete` (asks) |
| Analytics | `event_names`, `analytics_query` (metric, line or bar), `analytics_funnel`, `events_recent` |

An installed app's served manifest (`/_app/<id>/manifest.json`) is where its operations, data model and screens come from: `app_describe` reads it, `app_call` runs an operation through `/api/<id>/ops/<name>` with the workspace's token, and `app_locate` fills the manifest's locate templates from the row. See `core/docs/app-system.md`.

## Checking it without the window

A headless run exercises the whole chain: start the bridge under Electron with the app's name and data folder, register a client with a stand-in window that logs asks and widgets, spawn `muse acp` with the real `out/main/mcp.js`, and send a prompt. That is how the tools were verified on 2026-11-02 against workspace `nzw5p8`.
