# Workflows

A workflow is JSON: a trigger and a flat list of steps. The workspace stores it, versions it, and runs it as a Cloudflare
Workflow (durable, retried, able to wait for days) through the `HookRun` class. The definition is snapshotted into each run,
so editing a workflow never changes a run already in flight.

```json
{
  "name": "Welcome pro signups",
  "definition": {
    "trigger": { "event": "signup.completed", "when": [{ "field": "props.plan", "op": "eq", "value": "pro" }] },
    "steps": [
      { "id": "check", "type": "condition", "input": { "when": [{ "field": "contact.props.plan", "op": "eq", "value": "pro" }] } },
      { "id": "pause", "type": "wait", "input": { "seconds": 3600 } },
      { "id": "tag", "type": "contact.tag", "input": { "tag": "welcomed" } },
      { "id": "notify", "type": "http.request", "input": { "url": "https://hooks.example.com/welcome", "body": "{\"name\":\"{{contact.name}}\",\"plan\":\"{{event.props.plan}}\"}" } },
      { "id": "done", "type": "event.emit", "input": { "name": "welcome.sent", "props": { "via": "workflow" } } }
    ]
  },
  "enabled": true
}
```

`workspace.saveWorkflow(input)` validates it (every step type must exist), bumps `version`, and keeps the `wf:<id>` hook in
step with the trigger: same event, same `when`, same enabled flag. Without a trigger a workflow only runs by hand.

## Steps

Steps run in order. A step that returns `{ stop: true }` ends the run early (completed, not failed). A step that throws is
retried three times with exponential backoff, then fails the run. Each step's output lands in `hook_run_steps`.

| type | input | does |
|---|---|---|
| `wait` | `seconds` | sleeps durably (capped at 25 s when running inline without the Workflow binding) |
| `condition` | `when`: conditions over the event (`props.x`, columns) or the contact (`contact.props.x`, `contact.source`…) | stops unless all hold |
| `contact.tag` | `tag` | adds a tag to the run's contact |
| `contact.untag` | `tag` | removes one |
| `contact.update` | `name`, `source`, `props` (JSON object) | updates the contact; values may be templates |
| `http.request` | `url`, `method`, `headers` (JSON object), `body` | a webhook; body defaults to `{ event, contact }` |
| `event.emit` | `name`, `props` | emits an event (as app `workflow`) carrying the run's contact |
| `object.save` | `type`, `doc` (JSON object) | creates an object linked to the contact |

Text inputs accept `{{event.props.x}}`, `{{event.path}}`, `{{contact.name}}`, `{{contact.props.x}}` templates. Steps that
need a contact fail when the event has none.

Apps will be able to add step types later (the catalog already has room for an `app_id` on each entry).

## Running and watching

- `workspace.runWorkflow(id, { contactId, props })` runs it now against a synthetic `workflow.test` event, for trying a
  workflow out before its trigger fires. The run shows up like any other.
- `workspace.listRuns({ workflowId })` and `getRun(id)` (with `steps`) show what happened.
- `workspace.listWorkflows()` includes `runs` and `last_run`.
