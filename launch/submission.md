# SuperGrid: hackathon submission

## Name

SuperGrid

## Tagline

The IDE for creators and marketers. Own your SaaS instead of cloning it, with Muse Code as your CTO.

## Short description

SuperGrid is a new kind of SaaS. Every workspace ships with the parts all apps need (database, contacts, events,
workflows, assets, themes and hosting) and runs in the customer's own Cloudflare account. Apps are copied into their repo
as code they own, and Muse Code builds on them and merges in each app's updates.

## Project description

### The problem

I've been building SaaS products for over 20 years. Lately people find my products and get their agents to clone them.
You can see it all over social media: people "vibe cloning" apps, giving them away for free, or trying to resell them.
It's lose-lose. The builder loses revenue, and the customer gets a worse copy, without the years of choices behind why the
product was built that way.

I don't think people clone because they want to steal. They want to own their software and self-host it. They want to use
their own AI subscription, like Muse Code, instead of paying a token reseller a premium. And they don't want to pay for
100 features to use 3. So instead of fighting that, SuperGrid makes it easier.

### What SuperGrid is

About 80% of a SaaS product is the same for every product: database, auth, events, analytics and so on. SuperGrid is that
80%. A builder ships the core of their product, the 20% that's actually theirs, and it plugs into the customer's own
workspace and business. The customer isn't cloning it. They get the code, and they can extend it and make it their own.

- **A workspace is one git repo, one Cloudflare Worker and one D1 database**, in the customer's own Cloudflare account.
  The bill is theirs, and nothing depends on us to keep serving traffic.
- **Apps are folders copied into that repo**, the way shadcn/ui copies components in. Each app has public pages, admin
  screens and an API, and its operations show up both as an API and as tools for the agent. Apps share the database,
  contacts, sign-in, theme and events through plain imports.
- **The desktop app is the IDE.** It manages organizations, workspaces and apps: threads with the agent, installed apps,
  the database with a SQL console, workflows, live events, a media library, and Live / Dev mode with the dev server, git
  and one-click deploys.
- **Muse Code runs the chat over ACP (the Agent Client Protocol), on the user's own login.** SuperGrid holds no model
  account. Muse Code gets tools for the workspace through MCP: query the database, call an app's operations, find the
  files behind a screen, make a new app, change the theme and deploy. Writes that change or delete data ask first.

### Why this needs an agent

The hard part of "copy the app into your repo" is updates. Once a customer changes an app, merging the next upstream
version into it used to be too expensive and broke things. In SuperGrid an update is a three-way merge of that one app
folder on a branch. When the customer's changes conflict, Muse Code resolves them, explains what changed and what it kept,
and asks for approval. Checks run before the branch merges: new permissions need consent, migrations can only be added,
and the build has to pass.

This wouldn't have been possible a few years ago. Muse Code gives every user a CTO who helps with updates and code, and
that's what makes this new kind of SaaS possible.

### What I built this week

I spent most of the week prototyping how this model could work. I explored a hosted version, a registry and
microfrontends, and settled on a workspace as a monorepo, apps copied in, and updates as merges Muse Code resolves.

Working today:

- The macOS desktop app, signing in to Cloudflare through the `cf` CLI with no token to paste
- Creating a workspace: the repo is scaffolded, built and deployed as one Worker with its D1 database
- Live / Dev mode, with the dev server, the Code section and deploys
- New apps from the template, with their admin screens inside the desktop app
- Database, Events, Workflows and Library pages on the workspace's real data
- Muse Code in the chat over ACP, with the workspace tools
- A local demo workspace you can explore without a Cloudflare account

Not finished yet:

- Installing and updating apps from someone else's repo. The update path is tested on a test account (signed releases,
  merging a new version into an app the owner changed), but it isn't polished for real third-party updates yet
- The app store, and real example apps to install (Blog, Forms, Landing Pages)
- Accounts for a workspace's own customers (staff sign-in only so far)
- Builds for Intel Macs, Windows and Linux

### Try it

Download SuperGrid for macOS (Apple Silicon), or run it from source. Setup opens with **Explore the Demo**: a workspace
that lives only on your Mac for Fernwood Ceramics, a made-up pottery studio three weeks after a spring launch. It has 254
contacts, 213 orders, about 8,500 events, workflows, reports and three apps (Funnels, Pages and Blog). Ask Muse Code about
the business or have it change the code. You need Muse Code installed and signed in.

### What's next

Port all my own apps and open an app store, where people pay to copy an app into their own repo. Build the core apps that
let people self-host their own ClickFunnels, and let other builders make apps and list them for sale.

I think more of these "IDEs" will show up for other industries, like productivity and small business: operated by agents,
with an opinionated core the customer owns, and specialized apps installed into it by the people who can solve each problem
best. Mine is for creators and marketers.

## Built with

Muse Code over ACP · Cloudflare Workers, D1, Queues, R2, Images and Stream · React Router · Electron · base-ui and coss/ui

## Links

- Site and demo video: https://supergrid.com
- Code: https://github.com/supergrid-com/supergrid-app
- Download: https://github.com/supergrid-com/supergrid-app/releases/latest
