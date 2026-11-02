# Events

Every workspace records what happens as events: one table, one shape, whether the source is a visitor's browser, an app's
server code or the workspace itself. Analytics, segments, hooks and workflows all read from it.

## The shape

| column | meaning |
|---|---|
| `id` | 15-character id, set by the workspace |
| `name` | `object.action`, lowercase, dotted: `order.completed`, `form.submitted` |
| `app_id` | the app that emitted it (`site` for the browser tracker without an app, `core` for the workspace, `workflow` for workflow steps) |
| `ts` | ISO-8601 with milliseconds; the caller may set it, else now |
| `contact_id` | the contact who did it, when known |
| `anonymous_id` | the visitor cookie (`sg_aid`), so events before sign-up still belong to someone |
| `session_id` | optional, the caller's |
| `url`, `path`, `referrer` | where it happened |
| `utm_source` … `utm_content` | from the URL's `utm_*` query, or passed explicitly |
| `country`, `region`, `city`, `timezone` | from Cloudflare's request geo (only when the event came in over HTTP) |
| `user_agent`, `device` | `desktop`, `mobile` or `tablet` |
| `props` | a JSON object of your own, up to 8 KB |

Indexes cover `(name, ts)`, `(app_id, ts)`, `(contact_id, ts)` and `(anonymous_id, ts)`. Nothing in `props` is indexed; a hot
prop can get an expression index later (`CREATE INDEX … ON events(json_extract(props, '$.plan'), ts)`).

## Reserved names

The workspace emits these; apps may not: `contact.created`, `contact.updated`, `contact.identified`, `contact.tagged`,
`contact.untagged`, `contact.deleted`, `object.created`, `object.updated`, `object.deleted`, `app.installed`, `app.updated`,
`workflow.test`. Two reserved names are open to anyone because they describe the visitor: `page.view` and `session.start`.

Everything else is yours. Prefix nothing: `app_id` already says which app an event came from, so two apps can both have
`order.completed`.

## Emitting from an app Worker

Loaders and actions get `events` on the app context:

```ts
import { appContext } from "@supergrid/app-kit/context";

export async function action({ request, context }: Route.ActionArgs) {
  const { events, workspace, manifest } = context.get(appContext);
  const contact = await workspace.upsertContact(manifest.id, { email, name, source: "signup-form" });
  await events.emit("signup.completed", { plan }, { contactId: contact.id });
}
```

`events.emit(name, props?, { contactId?, anonymousId?, ts? })` fills in the request's URL, referrer, user agent and the
visitor cookie the workspace forwarded as `x-sg-anon`. `events.emitAll([...])` sends several in one call. Both go through
`workspace.emit(appId, events)` on the RPC surface, which any Worker with the `WORKSPACE` binding can call directly.

## Emitting from the browser

```tsx
// app/root.tsx — public layouts only, never admin screens
import { Analytics } from "@supergrid/app-kit/react";
<Analytics app="hello"><Outlet /></Analytics>
```

`<Analytics/>` sends one `page.view` per navigation. Inside it:

```tsx
import { useTrack, useEvent } from "@supergrid/app-kit/react";

const track = useTrack();
<button onClick={() => track("pricing.cta_clicked", { plan: "pro" })}>Start</button>

useEvent("pricing.viewed", { variant }); // once on mount, again when `variant` changes
```

Without React, `createTracker({ app })` from `@supergrid/app-kit/client` gives `track`, `page`, `identify` and `flush`.

Calls are batched (10 events or 2 seconds) and posted with `sendBeacon` to `POST /_ws/events` on the workspace's own origin,
as `text/plain` so there is no preflight. The first call sets the `sg_aid` cookie (first party, HttpOnly, a year).

`identify({ email, name })` ties the visitor to a contact: the workspace upserts the contact, links the cookie in
`identities`, claims the visitor's earlier events, and emits `contact.identified`. Browsers can lie, so only call it after
your app has validated the email itself (a form the visitor filled in). Anything stronger belongs server-side with
`contactId`.

## What happens next

With a Queue bound (`EVENTS`), the Worker enqueues and a consumer in the same Worker writes batches to D1 and dispatches
hooks; a batch that keeps failing lands in `dead_letters`. Without one (Workers Free, or local dev without the binding),
the same code runs in `waitUntil` after the response. Either way the caller gets the ids back immediately.

Rows older than the `events.retention_days` setting (default 90) are pruned nightly after being rolled up into
`rollups_daily`, which long-range analytics read instead.

## Reading

- `workspace.listEvents({ name, appId, contactId, anonymousId, from, to, search, limit, offset })`
- `workspace.eventNames()`: names seen in 90 days with counts, plus the reserved ones
- `workspace.queryAnalytics(spec)` and `workspace.funnel(spec)`: see [analytics in the contract](../src/rpc.ts)

```ts
await workspace.queryAnalytics({ metric: "count", events: ["order.completed"], days: 30, interval: "day" });
await workspace.queryAnalytics({ metric: "sum", prop: "total", events: ["order.completed"], groupBy: "utm_source", days: 7 });
await workspace.queryAnalytics({ metric: "unique_visitors", events: ["page.view"], groupBy: "path", days: 7, limit: 10 });
await workspace.funnel({ steps: [{ event: "page.view" }, { event: "signup.completed" }, { event: "order.completed" }], days: 30, by: "visitor", windowHours: 72 });
```

`metric` is `count`, `unique_contacts`, `unique_visitors` or `sum` (of a numeric prop). `groupBy` is a column
(`name`, `app_id`, `path`, `referrer`, `utm_*`, `country`, `device`) or `prop:<key>`. `filters` are `{ field, op, value }`
over columns or `props.<key>`, with ops `eq`, `ne`, `in`, `contains`, `exists`, `gt`, `gte`, `lt`, `lte`. A funnel counts
actors who did each step, in order, within `windowHours` of their first step.
