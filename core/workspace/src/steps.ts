// The built-in workflow steps. Each is a label, the fields the editor shows, and what it does with the event and contact.
import type { ContactFull, EventRow, FieldDef } from "@supergrid/app-kit/rpc";
import { publish } from "./events";
import { saveObject } from "./objects";
import { secretsFor } from "./secrets";
import type { Env } from "./types";
import { invalid, matches, obj, str, tpl, whenList } from "./validate";

export type StepCtx = { env: Env; input: Record<string, unknown>; event: EventRow; contact: ContactFull | null; vars: Record<string, unknown> };
export type StepDef = { label: string; description?: string; fields: FieldDef[]; run(ctx: StepCtx): Promise<unknown> };

/** `{{contact.name}}`, `{{event.props.plan}}` templates over whatever the step saw. */
export const varsFor = (event: EventRow, contact: ContactFull | null) => ({ event, contact, props: event.props });

const needContact = (ctx: StepCtx) => { if (!ctx.contact) invalid("this event has no contact"); return ctx.contact!; };
const parseJson = (text: string): unknown => { try { return JSON.parse(text); } catch { return text; } };

export const STEPS: Record<string, StepDef> = {
  wait: {
    label: "Wait", description: "Pause before the next step.",
    fields: [{ key: "seconds", label: "Seconds", type: "number", required: true }],
    run: async () => null, // handled by the engine: it sleeps durably
  },
  condition: {
    label: "Continue only if", description: "Stop the run unless every condition holds. Fields are `props.<key>` on the event, or `contact.<field>`.",
    fields: [{ key: "when", label: "Conditions (JSON list of {field, op, value})", type: "text", required: true }],
    run: async (ctx) => {
      const when = whenList(typeof ctx.input.when === "string" ? parseJson(ctx.input.when) : ctx.input.when);
      const row = { ...(ctx.event as unknown as Record<string, unknown>), contact: ctx.contact ?? {} };
      const ok = when.every((w) => (w.field.startsWith("contact.") ? matches([{ ...w, field: w.field.slice(8) }], (ctx.contact ?? {}) as unknown as Record<string, unknown>) : matches([w], row)));
      return ok ? { ok: true } : { stop: true, reason: "conditions not met" };
    },
  },
  "contact.tag": {
    label: "Add a tag", fields: [{ key: "tag", label: "Tag", type: "text", required: true }],
    run: async (ctx) => {
      const { tagContacts } = await import("./contacts");
      await tagContacts(ctx.env, undefined, "workflow", [needContact(ctx).id], [str(ctx.input.tag, "tag", { max: 60 })]);
      return { tagged: ctx.input.tag };
    },
  },
  "contact.untag": {
    label: "Remove a tag", fields: [{ key: "tag", label: "Tag", type: "text", required: true }],
    run: async (ctx) => {
      const { tagContacts } = await import("./contacts");
      await tagContacts(ctx.env, undefined, "workflow", [needContact(ctx).id], [], [str(ctx.input.tag, "tag", { max: 60 })]);
      return { untagged: ctx.input.tag };
    },
  },
  "contact.update": {
    label: "Update the contact", description: "Set name, source or custom fields. Values may use {{event.props.x}} templates.",
    fields: [{ key: "name", label: "Name", type: "text" }, { key: "source", label: "Source", type: "text" }, { key: "props", label: "Fields (JSON object)", type: "text" }],
    run: async (ctx) => {
      const { saveContact } = await import("./contacts");
      const c = needContact(ctx);
      const props = typeof ctx.input.props === "string" ? parseJson(tpl(ctx.input.props, ctx.vars)) : ctx.input.props;
      const saved = await saveContact(ctx.env, undefined, "workflow", {
        id: c.id, name: ctx.input.name ? tpl(String(ctx.input.name), ctx.vars) : undefined, source: ctx.input.source ? tpl(String(ctx.input.source), ctx.vars) : undefined,
        props: props && typeof props === "object" ? { ...c.props, ...(props as Record<string, unknown>) } : undefined,
      });
      return { id: saved.id, props: saved.props };
    },
  },
  "http.request": {
    label: "Send an HTTP request", description: "A webhook. The URL, headers and body may use {{event.*}}, {{contact.*}} and {{secrets.NAME}} templates; the body defaults to the event as JSON.",
    fields: [{ key: "url", label: "URL", type: "url", required: true }, { key: "method", label: "Method", type: "select", options: ["POST", "PUT", "PATCH", "GET"] }, { key: "headers", label: "Headers (JSON object)", type: "text" }, { key: "body", label: "Body", type: "text" }],
    run: async (ctx) => {
      const rawUrl = str(ctx.input.url, "url", { max: 2000, re: /^https?:\/\// });
      const method = String(ctx.input.method ?? "POST").toUpperCase();
      const extra = typeof ctx.input.headers === "string" ? parseJson(ctx.input.headers) : ctx.input.headers;
      const headerValues = extra && typeof extra === "object" ? Object.values(extra as Record<string, unknown>).map(String) : [];
      const rawBody = ctx.input.body == null ? undefined : String(ctx.input.body);
      // Secrets are unsealed only for this request and never recorded: errors name the URL as written, not as sent.
      const vars = { ...ctx.vars, secrets: await secretsFor(ctx.env, [rawUrl, ...headerValues, rawBody]) };
      const url = tpl(rawUrl, vars);
      const headers = new Headers({ "content-type": "application/json" });
      if (extra && typeof extra === "object") for (const [k, v] of Object.entries(extra as Record<string, unknown>)) headers.set(k, tpl(String(v), vars));
      const body = method === "GET" ? undefined : rawBody ? tpl(rawBody, vars) : JSON.stringify({ event: ctx.event, contact: ctx.contact });
      const res = await fetch(url, { method, headers, body });
      const text = await res.text().catch(() => "");
      if (!res.ok) throw new Error(`${res.status} from ${rawUrl}: ${text.slice(0, 200)}`);
      return { status: res.status, body: text.slice(0, 2000) };
    },
  },
  "event.emit": {
    label: "Emit an event", description: "Props may use templates; the event keeps this run's contact.",
    fields: [{ key: "name", label: "Event name", type: "text", required: true }, { key: "props", label: "Props (JSON object)", type: "text" }],
    run: async (ctx) => {
      const props = typeof ctx.input.props === "string" ? parseJson(tpl(ctx.input.props, ctx.vars)) : ctx.input.props;
      const [id] = await publish(ctx.env, undefined, "workflow", [{ name: str(ctx.input.name, "name", { max: 100 }), props: obj(props, "props"), contactId: ctx.contact?.id ?? null, anonymousId: ctx.event.anonymous_id }]);
      return { id };
    },
  },
  "object.save": {
    label: "Save an object", description: "Create a record of a type, linked to this run's contact. The doc may use templates.",
    fields: [{ key: "type", label: "Object type", type: "text", required: true }, { key: "doc", label: "Doc (JSON object)", type: "text", required: true }],
    run: async (ctx) => {
      const doc = typeof ctx.input.doc === "string" ? parseJson(tpl(ctx.input.doc, ctx.vars)) : ctx.input.doc;
      const row = await saveObject(ctx.env, undefined, "workflow", str(ctx.input.type, "type", { max: 40 }), { doc: obj(doc, "doc"), contactId: ctx.contact?.id ?? null });
      return { id: row.id };
    },
  },
};
