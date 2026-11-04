# Demo Script — Draft 1 (original, unedited)

Meta AI Developer Hackathon — Startup entry, Push the Frontier track.
Kept exactly as written. Edits happen in later drafts.

---

The general idea is to show the problem - SaaSacoply, buy vs build line, about me, the idea of “platform”, and how buy vs build is moving to the consumer level for small businesses and creators, to where its becoming buy or clone and the problems this causes, everyone loses, a solution - a new kind of platform

* Intro
   * SaaS has changed, the last year went from SaaS integrating AI as a feature to being replaced and rebuilt by Agents changing the model completely.
   * Saying that in some way to say AI was a feature, every SaaS would need, assitant, MCP, etc to now the agents just creating their own - the goal is to be punchy, and attention grabbing
* About me - but first… me ( cred ) + introducing “platform”
   * Before I demo SuperGrid, I want to introduce myself.
   * I am a self-taught coder & designer, I started my web design agency after I dropped out of high school in 2003 - first by learning to code flash games, my own band site, and using images for rounded corners and tables for layout ( fun nod ).
   * A few years later I discovered Wordpress - it took care of the hard things, backend, databases, and provided the Platform to build for my clients - I started design themes and plugins. It became the default place to build, I started to sell my own themes and plugins - because Wordpress handled the backend, I could focus on the “product” - what I was selling
   * A few laters, I wanted to build more complicated products, and I built and launched my very first “SaaS” in 2007 - VivaVideo - a flash video player for marketers - built with my flash and design skills and PHP from learning wordpress.
   * After this I wanted to build my own platform tools that let others build on and after years of building many products, I co-founded ClickFunnels in 2014.
   * Clickfunnels was the tools and platform for marketers to build on - build and launch funnels, we took care of all the hard parts, and let builders create.
* SaaS as a platform
   * There are four parts to building a SaaS
   * Code / Engineering
      * Coding and building product has been expensive, requires large teams, and a lot of time.
   * Infra & Scale
      * Dev ops like hosting, servers, databases, load balancing, caching, etc, is all very difficult, expensive, specialized knowledge and scale makes it harder every day
   * Support
      * Supporting users, fixing bugs, and listening. Can have the fastest servers, best looking product, but if its broken, people leave ( reword, make better )
   * Product & Founder vision
      * The part the users touch, the opinions, constraints and tradeoffs into the solution built by the founders vision is the core of any product. This was a process of earned experience, iteration, learning and obsession to solve the problem better than anyone else
   * These pieces made the SaaS easy to buy, a monthly subscription, everything handled, login and build with their tools
* Now with AI and Coding Agents, everything has changed
   * Code - was expensive, now its nearly “free”
   * Infra & Scale - infrasctrure was hard and expensive at scale, but small teams don’t care about scale - their scale is nearly “free” on most platforms like Vercel, Cloudflare, AWS - everybody scale vs. “you scale”
   * Support - was humans answering, now its agents, they read docs, look at code, and can answer, they also fix bugs, track feedback, etc
   * Product & founder vision - this has not been replaced, and is still the core of every product built
* The Buy vs. Build question
   * This question was reserved only for big companies, and entire ecosystem around building point solutions so companies could always choose buy.
   * Now that question is going down to the smallest of teams, even a single creator.
   * Their agents can build “almost anything”
   * It is happening all the time, and price isn’t always the motivating factor.
* What that question is becoming…
   * “Build” meant to build a specialized bespoke solution, because buying meant buying all the features when you only wanted 3 out of 100
   * Now building is increasingly becoming “cloning” - giving a coding agent login details, and cloning it - wholesale
   * This is happening now with my products, video games, and in every possible industry
* The problem with this…
   * Cloning a product misses the founder & product vision, what is visible is the tip of the iceberg, and what is recreated is a less good version
   * The product builder is losing, and the end user is also losing
   * This is causing all sorts of issues
* For the last 8 months I have been trying to fight against this, but decided to try and build with the new normal, what SaaS could become
* There is a few areas I believe is driving this - what they want
   * Ownership - they want to own it, and have control, because they don’t care about everyone scale, they just care about their own scale, and their own scale is nearly free. This means self-hosting and code access
   * Their own Agents & subscription - they already have their own Muse, Claude, ChatGPT, and Gemini account, and don’t like paying more for “token resellers”, most model APIs are more expensive than their own subscription, so they pay more for less. They want want to use what they already pay for.
   * Quality - they do value things that work, they want it to work well, and they value product and founder vision - well designed products
* Introducing SuperGrid - the IDE for Creators & Builders
   * It is a Desktop app built with Electron
   * You create an organization, this would hold all your workspaces.
   * You connect Muse through ACP - this is what allows users to use their own subscriptions - avoiding the token reseller objections
   * You connect your Cloudflare account - currently only supporting Cloudflare as a deployment, this is what allows for ownership, and “you-scale” of nearly free. Cloudflare has all the primitives to host sites, apps, databases, etc.
   * A workspace is its own repo
   * SuperGrid is organized into three areas - Threads - where you talk to your Muse Agent, Apps - the parts you install, extend and build - Core - your database, events, workflows, and library
   * The core system - every workspace has its own database provisioned, where everything is stored and owned, events, hooks, analytics and workflows are apart of the core, and a library for media, images, files, themes, skills, and sitemap
   * This is the core infrastructure that is opinionated so the platform can build on these systems without having to invent ways to connect
   * Every part is connected to their own cloudflare account - D1 for database, workflows and queues for the automations system, Images, video with streams, files with R1, workers for deploys, and aritfacts for git
   * Apps are what tie everything together.
   * An app can be created by the user, or installed through the SuperGrid App Store. Builders and founders can create apps where they can sell or give away. The apps are installed directly into the workspace repo.
   * This allows for the vision, and solution for the problem the builder designed to be directly owned by the creator, nothing is lost in a “clone” or “build” step. The user of the app, gets the full solution, not just the “visible part” they can see.
   * Because the workspace handles the core primitives like data, events, analytics, and hosting - the app builder can focus just on their solution, and not have to build an entire “SaaS” just to release it. This also allows non-coders to build, share, and sell their own solutions - allowing experts to build specific niche solutions.
   * When the app is installed, the creator, can extend it, own it, and use it
   * An app can be one of two types
   * An Admin app - this is an app that is only visible in the SuperGrid workspace UI, these can be tools to help the creator build, and run their business. It can connect to the workspace, and its data. Think of these as dashboard, and internal tools - for example an “Ad Designer” using Muse Image
   * The other app is an app that is deployed with the workspace
   * An app can have its own data model, it can extend core tables, or other apps data, it can ship public pages and routes, its own components, and admin screens and navigation.
   * Apps show up in the sidebar, and can have their own navigation. The admin tools it expose are what the creator and their team use day to day. The app can expose API and MCP tools that the Muse Agent can use to interact with the app.
   * Because an app is installed directly into the workspace repo, its components and shared code can be used in other apps. For an example a Form app can have the admin ui for creating, managing and viewing submissions while exposing the form components and backend routes to any other app - for example a blog app - embedding the form in the footer of a blog post, or with a Landing Page app.
   * This approach allows apps to have “SaaS” like feel while everything being controlled by their own Muse Agent through MCP
   * The Muse agent can open Dev mode, and build or extend apps. This opens the workspace repo, its code, git, dev servers, and deploys.
   * It can create a new app, setup its data structure, front end components, routes, and build any admin UI that it needs, or no admin ui, if its all code. The benefits of the admin screens is for other people on the team, like editors, or even agency clients to edit their site without touching the code
   * I have spent most of the hackathon thinking and playing around with infrastructure, and how this can all work - the biggest benefit of traditional SaaS is a fix is deployed once, and everyone benefits.
   * This model, with every consumer of an app, becomes an owner of code, and can change the code, I had to come up with a way for a builder of an app, to be able to push and updates and everyone can get it
   * This would not be possible without coding agents like Muse because every update for an app that is not their own is a git commit and merge from outside their workspace repo. Each app is scoped to a folder, if its untouched, the merge is simple, but if its changed, the conflict is where humans would bail, and this whole thing wouldn’t work
   * But agents can handle this really well, they know what was changed and why - they are the ones who changed it, they know how to merge and handle conflicts.
   * They can also check apps for security issues, ask for approvals before installed, updating, and even modify the app update code to make it work with the users goals
* Pushing the frontier
   * I believe Muse Code is the CTO for every creator, and unlocks new platforms that fit a new model and users expecation of ownership, price, and usage.
   * I believe SuperGrid, the beta as it is, is starting to explore and solve some of these problems - ownership, own AI subscriptions, quality and thoughtful design.
   * I believe more tools will be created for IDE’s in this style for every industry, where apps and systems designed by experts can be installed without the need to “copy” or “clone”, and the builders and founders of these tools can make a business selling their solutions that fit how they are used
   * SaaS is not dead - but it is changing, software will be owned, controlled and updated to fit the buy & build mode, and as a service is the part that will hold the value. Thoughtful solutions designed by experts and founders who obsession over problems and their solutions so that users, creators, and agents all benefit
