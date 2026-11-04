# Demo Script — Structure and Beats

Pulled from [script-draft-1.md](script-draft-1.md). These are the points each part has to land, in order, using the draft's own ideas. No wording yet, no timing, no scenes.

## The Spine

SaaS was four things bundled together. AI made three of them nearly free. The fourth, founder and product vision, is the only one that still matters, and it's the one cloning throws away. SuperGrid is a platform where people can own software without losing that fourth part.

Everything below hangs off that.

## Shape of the Video

- Beats 1–8 set up the problem and lead to the reveal.
- Beat 9 is the demo: one to two thirds of the video. It's meant to be a feature tour, shown on screen and explained out loud at the same time.
- Beat 10 is the frontier claim the demo earns.
- Beat 11 closes.
- The name SuperGrid isn't said until beat 9, where it's revealed as the IDE.

## 1. Hook: SaaS Changed

- A year ago AI was a feature every SaaS had to add: an assistant, an MCP server.
- Now agents don't add to the SaaS. They rebuild it.

## 2. Who I Am: A Platform Builder

- Self-taught, dropped out of high school, started a web design agency in 2003. Flash games, a band site, rounded-corner images, table layouts.
- WordPress took care of the hard parts, so I could focus on the product. First taste of what a platform does.
- 2007: first SaaS, VivaVideo.
- 2014: co-founded ClickFunnels, a platform where we took care of the hard parts so marketers could build.
- Point to land: I've spent 20 years on platforms that take the hard parts away from builders.

## 3. What SaaS Actually Is

- Four parts: Code, Infra and Scale, Support, Product and Founder Vision.
- The first three were expensive and hard. The fourth was earned through experience and obsession.
- Bundled together, they made software easy to buy: a subscription, everything handled.

## 4. What AI Did to the Four Parts

- Code: nearly free.
- Infra: "everybody scale" was hard. "You scale" for a small team is nearly free on Cloudflare, Vercel, AWS.
- Support: agents read the docs and the code, answer, and fix bugs.
- Vision: not replaced. Still the core of every product.

## 5. Buy vs. Build Becomes Buy vs. Clone

One beat, two moves. Each keeps its own point.

**Buy vs. build reaches everyone**
- It used to be a big-company question.
- Now it reaches a team of one, because their agent can build almost anything.
- Price isn't always why they do it.

**Build is becoming clone**
- Build used to mean a bespoke tool, because buying meant paying for 100 features to use 3.
- Now it often means handing an agent the login and cloning the whole product.
- It's happening to my products, to video games, to every industry.

## 6. Everyone Loses

- A clone copies the tip of the iceberg and misses the vision underneath.
- The builder loses, and so does the user, who ends up with a worse version.

## 7. The Turn

- I spent eight months fighting this, then decided to build for the new normal instead.

## 8. What People Actually Want

- Ownership: their own code and hosting, because their own scale is nearly free.
- Their own agent and subscription: they already pay for Muse, Claude, ChatGPT or Gemini and don't want a token reseller.
- Quality: they still want things that work, designed by people who care.

## 9. SuperGrid: The Demo

The reveal: SuperGrid, the IDE for creators and builders. Then the tour, where each part pays off a want from beat 8.

**Setup (ownership + own agent)**
- Desktop app. Create an organization that holds your workspaces.
- Connect Muse over ACP, so you use the subscription you already have.
- Connect your Cloudflare account, so you own the hosting and get "you scale."
- Each workspace is its own repo.

**The workspace (ownership)**
- Three areas: Threads, Apps, Core.
- Core is the opinionated base: database, events, hooks, analytics, workflows, and a library for media, files, themes, skills and the sitemap.
- All of it runs on your Cloudflare account: D1 for the database, Workflows and Queues for automations, Images, Stream for video, R2 for files, Workers for deploys, Artifacts for git.

**Apps (quality, and the vision survives)**
- Apps tie everything together. Build your own or install one from the App Store, free or paid.
- Installed apps go straight into your repo, so you get the whole solution, not the visible part. Nothing gets lost in a clone.
- Builders only build their solution, because the workspace already handles data, events, analytics and hosting. Experts and non-coders can ship niche tools without building a whole SaaS.
- Two kinds:
  - Admin apps live only in the workspace: dashboards and internal tools. Example: the Ad Designer, using Muse Image (mock for the video).
  - Deployed apps ship with the site. Examples: Blog, Forms, Landing Pages (to be built).
- Apps bring their own data, routes, pages, components, admin screens and navigation, and can extend core tables or other apps.
- Apps share code with each other. The Form app's components show up in a Blog post footer or on a Landing Page.
- Apps expose API and MCP tools, so it feels like SaaS while your own agent drives it.

**Dev mode (own agent)**
- Muse opens the repo, git, dev servers and deploys, and builds or extends apps.
- Admin screens are for the rest of the team: editors, agency clients, people who won't touch code.

## 10. Updates: What Only Agents Make Possible

The frontier beat. Its own section, after the demo has shown that users own and edit their apps.

- SaaS's biggest advantage: ship a fix once, everyone gets it.
- Owned code breaks that. Every user has their own copy, and many have changed it.
- Each app update is a git merge from outside the user's repo into it.
- Until now you could get updates or edit the code, not both. Once you make it your own, every update and bug fix from the builder is yours to merge by hand.
- Muse Code knows what changed and why, because it's the one that made the changes. So it merges every update seamlessly, checks it for security issues, and fixes anything that breaks so your custom code just works. You get every update and keep everything you made your own.

## 11. Pushing the Frontier

- Muse Code is the CTO for every creator.
- SuperGrid is a beta that starts to solve ownership, own subscriptions, and quality.
- More IDEs like this will show up for every industry, where expert-built apps get installed instead of cloned, and their builders get paid.
- SaaS isn't dead. Ownership moves to the user, and the value stays in the service: experts who obsess over a problem, so users, creators and agents all benefit.

## Open Notes

- **Things to build for the video:** the Ad Designer mock, plus Blog, Forms and Landing Pages if they're going to show up in the demo. The Form-in-a-Blog-post example depends on Forms and Blog both existing.
- **Beat 10 should be shown, not only told.** An app update merging into a modified copy, with a security check and an approval, would prove the claim on camera.
