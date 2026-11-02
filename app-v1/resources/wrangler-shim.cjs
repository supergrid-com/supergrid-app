// Loaded with `-r` before wrangler's CLI when the app runs it through Electron as Node. yargs
// treats a process with `process.versions.electron` and no `defaultApp` as a packaged Electron
// app whose argv has no script path, and then reads the CLI's own path as an argument.
process.defaultApp = true;
