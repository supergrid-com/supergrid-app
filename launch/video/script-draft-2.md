# Demo Script — Draft 2

The first full draft written out from [beats.md](beats.md). It's spoken wording only. The headings are there to find your place and aren't read out.

---

## Hook

A year ago, AI was a feature. Every SaaS had to ship an assistant and an MCP server.

Now agents don't plug into SaaS anymore. They rebuild it.

## Who I Am

Before I show you what I built, I want to introduce myself.

I'm Dylan. I'm a self-taught coder and designer. I dropped out of high school and started a web design agency in 2003. I learned by coding Flash games and my band's website, back when rounded corners were images and layouts were tables.

A few years later I found WordPress. It took care of the hard parts, the backend and the database, and gave me a platform to build on for my clients. I started designing themes and plugins, then selling my own. Because WordPress handled the backend, I could focus on the product, the thing I was actually selling.

Then I wanted to build something more complicated. In 2007 I launched my first SaaS, VivaVideo, a Flash video player for marketers. I built it with my Flash and design skills and the PHP I'd picked up from WordPress.

After that I wanted to build platforms of my own, tools other people could build on. After years of shipping products, I co-founded ClickFunnels in 2014. ClickFunnels gave marketers a platform to build and launch funnels. We took care of the hard parts so they could create.

That's been the thread the whole way through. Platforms that take the hard parts off a builder's plate, so they can focus on the product.

## What SaaS Is

Every SaaS is built from four parts.

Code. Building software took big teams, a lot of money, and a lot of time.

Infrastructure and scale. Hosting, servers, databases, load balancing, caching. It's specialized, it's expensive, and it gets harder the bigger you grow.

Support. Answering users, fixing bugs, listening. You can have the fastest servers and the best-looking product, but if it's broken, people leave.

And product and founder vision. That's the part users actually touch. The opinions, constraints, and tradeoffs a founder builds into the solution. It comes from experience, iteration, and obsessing over a problem until you can solve it better than anyone else.

Put those four together and you get something easy to buy. A monthly subscription. You log in, everything's handled, and you build with their tools.

## What AI Did

Now look at those four parts with coding agents in the picture.

Code was expensive. Now it's nearly free.

Infrastructure was hard because of scale, everybody's scale. But a small team doesn't need everybody's scale. They need their own, and on Cloudflare, Vercel, or AWS, their own scale is nearly free.

Support used to be people answering tickets. Now agents read the docs, read the code, answer questions, fix bugs, and track feedback.

Product and founder vision hasn't been replaced. It's still the core of every product.

## Buy vs. Clone

Buy versus build used to be a question for big companies. A whole industry of point solutions existed so they could always choose buy.

Now that question reaches the smallest teams, even a single creator, because their agent can build almost anything. It's happening all the time, and price isn't always the reason.

And what "build" means is changing. Building used to mean a custom solution, because buying meant paying for a hundred features when you needed three. Now, more and more, building means cloning. You give a coding agent the login and have it copy the whole product.

I'm seeing it with my own products, with video games, in every industry.

## Everyone Loses

A clone only copies what you can see, and that's the tip of the iceberg. The founder's vision sits underneath, and the clone misses it. What you get back is a worse version.

The builder loses. And the user loses too.

## The Turn

For the last eight months I've been fighting this. Then I decided to build for the new normal instead, and work out what SaaS could become.

## What People Want

I think three things are driving this.

Ownership. People want to own their software and control it. They don't care about everybody's scale, only their own, and their own is nearly free. That means self-hosting and access to the code.

Their own agent and their own subscription. They already pay for Muse, Claude, ChatGPT, or Gemini. They don't want to pay a token reseller on top, especially when most model APIs cost more than the subscription they already have. They want to use what they already pay for.

Quality. They still want things that work, and work well. They value good design and a founder's vision.

## SuperGrid

So I built SuperGrid, the IDE for creators and builders.

SuperGrid is a desktop app. You start by creating an organization, which holds all your workspaces.

You connect Muse over ACP. That's how you use your own subscription, with no token reseller in the middle.

You connect your Cloudflare account. Right now Cloudflare is the only place SuperGrid deploys, and it's what gives you ownership and your own scale, nearly free. Cloudflare has every primitive you need to host sites, apps, and databases.

Every workspace is its own repo.

SuperGrid is organized into three areas. Threads, where you talk to your Muse agent. Apps, the parts you install, extend, and build. And Core, which is your database, events, workflows, and library.

Every workspace gets its own database, and everything is stored there and owned by you. Events, hooks, analytics, and workflows are part of Core, and so is a library for images, media, files, themes, skills, and your sitemap.

Core is opinionated on purpose. Everything built on SuperGrid uses the same systems, so nobody has to invent their own way to connect.

All of it runs on your own Cloudflare account. D1 for the database. Workflows and Queues for automations. Images, and Stream for video. R2 for files. Workers for deploys. Artifacts for git.

Apps tie it all together. You can build an app yourself or install one from the SuperGrid App Store, where builders and founders can sell their apps or give them away.

An app installs directly into your workspace repo. So the builder's vision, the whole solution they designed, is yours. Nothing gets lost in a clone. You get the full product, not only the part you could see.

And because the workspace already handles data, events, analytics, and hosting, an app builder only has to build their solution. They don't have to build an entire SaaS to release it. That means non-coders and experts can build, share, and sell solutions for their own niche.

Once an app is installed, it's yours to use, own, and extend.

There are two kinds of apps.

Admin apps live only inside the SuperGrid workspace. They're dashboards and internal tools that help you build and run your business, connected to your workspace and its data. For example, an Ad Designer built on Muse Image.

The other kind deploys with your workspace, like a Blog, Forms, or Landing Pages.

An app can have its own data model and extend core tables or another app's data. It can ship public pages, routes, components, admin screens, and navigation.

Apps show up in the sidebar with their own navigation. Their admin tools are what you and your team use day to day. And an app can expose API and MCP tools, so your Muse agent can work with it too.

Because apps live in the same repo, they can share code. A Forms app has the admin screens for building forms and viewing submissions, and it also exposes its form components and backend routes. So a Blog app can drop a form into the footer of a post, and so can a Landing Page.

That gives apps the feel of SaaS, while everything stays under the control of your own Muse agent over MCP.

When you want to build, Muse opens Dev mode. That gives it the workspace repo, the code, git, dev servers, and deploys.

It can create a new app, set up its data structure, front-end components, and routes, and build whatever admin screens it needs. Or none, if it's all code. Admin screens are for the other people on your team, like editors, or agency clients who want to edit their site without touching code.

## Updates

I spent most of this hackathon on the infrastructure under all of this, and one problem kept coming back.

The biggest advantage of SaaS is that a fix ships once and everyone gets it. When every user owns the code and can change it, that breaks.

In SuperGrid, every update to an app you didn't build is a git merge from outside your repo into it. Until now, you could get updates or edit the code, not both. Once you made it your own, every update and bug fix from the builder was yours to merge by hand.

Muse Code changes that. It knows what changed and why, because it's the one that made the changes. So it merges every update seamlessly, checks it for security issues, and fixes anything that breaks so your custom code just works. You get every update and keep everything you made your own.

## Pushing the Frontier

I believe Muse Code is the CTO for every creator. It unlocks a new kind of platform, one that fits what people now expect from ownership, price, and how they use software.

SuperGrid is a beta, but it's starting to solve those problems. Ownership, using your own AI subscription, and quality, thoughtful design.

I believe more IDEs like this will show up in every industry. Apps and systems designed by experts will be installed instead of copied or cloned, and the people who build them will be able to make a business selling them.

SaaS isn't dead, but it is changing. Software will be owned, controlled, and updated by the people who use it, and the service is where the value will hold. Thoughtful solutions, built by experts and founders who obsess over a problem, so that users, creators, and agents all benefit.
