# Contacts and objects

The CRM is one `contacts` table kept deliberately small, with the ways to grow it beside it: custom fields, tags, segments
and custom objects.

## A contact

`id` (15 characters), `email` (unique, lowercased), `name`, `source` (where they came from: `signup-form`, `import`…),
`props` (custom fields as JSON), `created_at`, `updated_at`, plus `tags` when read.

```ts
// Apps: create or update by email. Props merge into what is stored.
const c = await workspace.upsertContact(manifest.id, { email, name, source: "newsletter", props: { plan: "pro" }, anonymousId: events.anonymousId });
await workspace.tagContacts(manifest.id, [c.id], ["newsletter"]);

// Reading
const page = await workspace.queryContacts({ search: "ada", tags: ["customer"], props: [{ field: "plan", op: "eq", value: "pro" }], sort: "created_at", limit: 50 });
const detail = await workspace.getContact(idOrEmail); // { contact, timeline: EventRow[], objects: { [type]: ObjectRow[] }, segments }
```

`queryContacts` takes `search` (email or name), `tags` (all of), `anyTags`, `source`, `createdFrom`/`createdTo`, `props`
conditions, `did: { event, min, days }` (contacts who did an event N times recently), `segment`, `sort`
(`created_at`, `updated_at`, `email`, `name` or `prop:<key>`), `dir`, `limit`, `offset`. It returns `{ items, total }`.

Changes emit `contact.created`, `contact.updated`, `contact.tagged`, `contact.untagged` and `contact.deleted`, each with
`contact_id` set, so hooks and workflows can react.

## Custom fields

A prop must be declared before it is stored, so the admin can always render and filter what is there:

```ts
await workspace.saveContactField(manifest.id, { key: "plan", label: "Plan", type: "select", options: ["free", "pro"], indexed: true });
```

Types: `text`, `number`, `bool`, `date`, `select`, `url`. Values are coerced to the type on write. `notes` is the one
undeclared prop, for the admin's free-text notes. Fields an app declares carry its `app_id`; the admin can add its own.

## Tags and segments

Tags are plain lowercase strings on `contact_tags`. Segments are saved queries:

```ts
await workspace.saveSegment({ name: "Pro customers", filter: { tags: ["customer"], props: [{ field: "plan", op: "eq", value: "pro" }] } });
await workspace.saveSegment({ name: "Launch list", kind: "static" }); // then addToSegment(id, contactIds)
```

A dynamic segment is evaluated when read (`queryContacts({ segment: id })` or `listSegments()` for counts); a static one
holds members.

## Custom objects

Anything that isn't a contact but belongs to one: deals, orders, bookings. A type is a field list; the workspace gives it
its own table `obj_<type>` with a JSON document and an index on each field marked `indexed`.

```ts
// Declare from an app Worker once (createAppWorker registers these at start):
export default createAppWorker(manifest, {
  objects: [{ id: "deal", label: "Deal", fields: [
    { key: "name", label: "Name", type: "text", required: true },
    { key: "value", label: "Value", type: "number", indexed: true },
    { key: "stage", label: "Stage", type: "select", options: ["open", "won", "lost"], indexed: true },
  ] }],
});

// Then
const deal = await workspace.saveObject(manifest.id, "deal", { doc: { name: "Acme renewal", value: 5000, stage: "open" }, contactId: c.id });
await workspace.saveObject(manifest.id, "deal", { id: deal.id, rev: deal.rev, doc: { ...deal.doc, stage: "won" } }); // rev guards lost updates
const open = await workspace.listObjects("deal", { where: [{ field: "stage", op: "eq", value: "open" }], sort: "doc:value", dir: "desc" });
```

The admin can define types too (`saveObjectType(null, …)`); a type an app owns can only be changed by that app. Saving and
removing emit `object.created`, `object.updated` and `object.deleted` with `{ type, id }` in `props`.
