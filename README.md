# SuperGrid

Two folders with two jobs:

| Folder | What it is |
|---|---|
| [core/](core/README.md) | The product, and what gets open sourced: the platform, the workspace Worker, the shared packages and the CLI. |
| [dev/](dev/README.md) | Our workbench: sample apps, signing keys, a test release feed and the smoke tests. Nothing here ships. |

They install and run separately. `dev/` uses `core/` only through its packages and its CLI, the same way any app author would.
