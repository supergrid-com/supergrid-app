# How SuperGrid fits together

SuperGrid runs a business's site and tools inside its own Cloudflare account. The desktop app manages it; nothing in the
account depends on us to keep serving traffic.

## The pieces

```
Organization               one Cloudflare account, its members and roles
  └─ Workspace             sg-ws-<id>: one Worker, one D1 database, its own domain
       └─ App              sg-app-<id>-<app>: one Worker and one git repo, installed into the workspace
```

- **Organization.** Who the people are and which Cloudflare account they manage. Settings › Organization and Settings ›
  Cloudflare.
- **Workspace.** The shared core every app builds on: one database, contacts, events, workflows, themes, media and the
  sitemap. A workspace's id is six characters (`k3x9qz`) and names everything it owns, so its display name can change.
- **App.** A React Router app on its own Worker: public pages under a mount (`/shop`), admin screens under
  `/admin/<app>`, an API under `/api/<app>`. Apps share the workspace's database and talk to the workspace over RPC.

## The desktop app

| Area | What it is for |
|---|---|
| **Threads** | Conversations with the coding agent. Each one works in the workspace's folder, can change apps and themes, and keeps its history. |
| **Apps** | The workspace's installed apps; each opens its admin screens in the canvas. **+** adds one. |
| **Database** | Every table and its rows, a SQL console, the migrations apps have applied, and backups. |
| **Workflows** | Steps that run when an event happens: wait, branch, tag a contact, send. |
| **Events** | Everything the workspace records, live: page views, sign-ups, orders, app events. |
| **Library** | Media, templates, blocks and fonts the apps share. |
| **Settings** | The workspace (general, domain and sitemap, updates), then the organization (workspaces, apps, Cloudflare, activity, appearance). Open it from the workspace menu at the top of the rail. |

**⌘K** jumps to any section, workspace or setting. **⌘B** folds the rail.

## Where things live

| You want to… | Go to |
|---|---|
| change the colors, fonts or logo | the workspace theme: ask the agent, it has theme tools (see *Themes*) |
| see who signed up | Database › `contacts`, or Events filtered by `contact.created` |
| react when something happens | Workflows, or a hook in an app (see *Hooks*) |
| move an app's pages to another path | Settings › Domain & sitemap |
| upload pictures or video | Library › Media (see *Assets*) |

## For agents

Read *Building an app* before writing app code, then the reference docs it points to. Use the kit components and theme
tokens for every screen (*UI kit*), change the look through the theme (*Themes*), and record what happens as events
(*Events*). The `supergrid` MCP server has `docs_list` and `docs_read` for these pages and the theme tools.
