# Hooks

A hook is "when this event happens, do that". Every hook is a row in one table, whatever the reaction:

| action | what runs |
|---|---|
| `workflow` | a JSON workflow (see [workflows.md](workflows.md)); saving a workflow with a trigger creates its hook `wf:<id>` |
| `http` | a POST to a URL with the event as JSON |
| `app` | an app's handler, declared in its manifest |

Each hook can carry a `when` filter: a list of `{ field, op, value }` over the event's columns or `props.<key>`; the hook
only fires when every condition holds.

## How they fire

After the events consumer stores a batch, it takes the distinct event names in it, loads the enabled hooks for those
names, and for each event × hook that matches starts one run. The run id is derived from the event and hook ids and recorded
in `event_deliveries`, so a retried batch never starts a second run. Runs go to the `HookRun` Cloudflare Workflow when the
workspace has that binding; otherwise they execute inline.

Every run leaves a row in `hook_runs` (`status`: `queued`, `running`, `completed`, `failed`, with `error`) and its steps in
`hook_run_steps`. `workspace.listRuns({ workflowId | hookId })` and `getRun(id)` read them.

## HTTP hooks

```ts
await workspace.saveHook(manifest.id, {
  name: "Notify billing", event: "order.completed",
  action: "http", config: { url: "https://billing.example.com/hooks/supergrid", secret: "…", headers: { "x-token": "…" } },
  when: [{ field: "props.total", op: "gt", value: 100 }],
});
```

The request is `POST` with body `{ "event": { …EventRow } }`, headers `x-sg-event` (the name), `x-sg-event-id`, and when a
`secret` is set, `x-sg-signature`: hex HMAC-SHA256 of the raw body. A non-2xx response fails the run; the Workflow retries
three times with backoff. `config.bodyTemplate` replaces the default body, with `{{event.props.x}}` and `{{contact.name}}`
templates.

## App hooks

An app names the events it handles in its manifest and provides the handlers:

```json
{ "id": "billing", "subscribes": ["order.completed", "contact.tagged"] }
```

```ts
export default createAppWorker(manifest, {
  hooks: {
    "order.completed": async (event, env) => { await env.WORKSPACE.tagContacts(manifest.id, [event.contact_id!], ["customer"]); },
    "contact.tagged": async (event, env) => { /* event.props.tag */ },
  },
});
```

The workspace delivers each matching event as `POST /_app/<id>/hook` over the app's service binding, with
`x-sg-workspace`, `x-sg-app` and `x-sg-event` headers. These hooks show in the admin as read-only, "defined by <app>".
A handler that throws fails the run; it is retried like any other.

## Catalog

`workspace.hookCatalog()` returns the event names seen (plus the reserved ones), the workflows that can be targeted, and
the step types workflows can use, which is what the admin's pickers show.
