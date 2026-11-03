# Shared packages

A folder here is a package another app in the workspace can import (`docs/packages.md` in SuperGrid core).

```
packages/<name>/package.json     "name": "@sg-apps/<name>", "exports": { ".": "./src/index.ts" }
packages/<name>/src/index.ts     what it exports: components, hooks, a client for this app's operations
```

List it in `supergrid.app.json` under `packages.exports` so the workspace knows it exists, and bump this app's
version when the package's public surface changes; consumers that pin an older version show as behind.
