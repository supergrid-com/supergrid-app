# Shared packages

One app can hand code to another: a form app exports `<FormEmbed slug>` and a blog app puts it under every post; a
design-system app has no public pages at all and exports a whole UI kit plus the admin screens to manage its tokens; an
access app exports `can(user, "thing")` for every other app's loaders. The mechanism is a package inside the exporting
app's repo, listed in its manifest, resolved through the workspace's pnpm workspace on the machine that builds the apps.

## Exporting

```
apps/forms/packages/forms-embed/package.json   { "name": "@sg-apps/forms-embed", "version": "0.4.0", "type": "module", "exports": { ".": "./src/index.ts" } }
apps/forms/packages/forms-embed/src/index.ts   export { FormEmbed } from "./form-embed"; export { formsClient } from "./client";
```

```jsonc
// apps/forms/supergrid.app.json
"packages": { "exports": [{ "name": "@sg-apps/forms-embed", "path": "packages/forms-embed", "description": "<FormEmbed slug> and a client for the forms operations" }] }
```

What belongs in a package: components, hooks, types, and a **thin client over the exporting app's operations**
(`fetch("/api/forms/ops/forms.get")`). What does not: the exporter's tables or SQL. The contract between apps is the
operations, so the exporter can change its schema without breaking consumers.

Bump the exporting app's `version` when the package's surface changes; the package graph uses it.

## Using

```jsonc
// apps/blog/package.json
"dependencies": { "@sg-apps/forms-embed": "workspace:*" }
// apps/blog/supergrid.app.json
"packages": { "uses": [{ "name": "@sg-apps/forms-embed", "app": "forms", "version": "0.4.0" }] }
```

`version` is what the consumer was built against. `pnpm install` in the workspace folder links the package from the
exporter's folder; the consumer's build bundles it, so at run time the two Workers are independent.

## The registry

There is no package server. The desktop keeps every app of a workspace in one folder that is a pnpm workspace
(`workspaces/<id>/pnpm-workspace.yaml`: `apps/*`, `apps/*/packages/*`), so `workspace:*` resolves on disk, and it
computes the graph from the manifests (`packageGraph` in `@supergrid/app-kit/packages`):

| | |
|---|---|
| `exports` | package name, the app, its path, the app's version |
| `uses` | package name, the consumer, the version it built against, the exporter (when installed), `stale` when the exporter moved |
| `rebuild` | the consumers that are behind |

The Dev panel's Overview shows an app's exports, its uses and who is behind; after deploying an exporter, the desktop
lists the consumers to rebuild (`consumersOf`). Rebuilding a consumer is its own Deploy, which records the new version
in `uses`.

## Two other ways to share, for other needs

- **A runtime embed**: the exporter serves `/_app/forms/embed.js` (a web component) or HTML fragments through its
  operations; the consumer includes it at run time and never rebuilds when forms ships a fix. Right for content an
  owner places; wrong for typed composition.
- **npm**: an app published for other workspaces or other people puts its package on npm under its own scope and pins
  it like any dependency. The registry above is for apps that live together in one workspace.
