import { list, num, str, tabular, ToolError, type Json, type Tool } from "./index";

// Analytics over the workspace's events, through its own RPC (queryAnalytics, funnel, listEvents,
// eventNames): the same shapes the Workflows pages use. A result draws as a number, a table or a
// chart in the chat, as the agent asks or as the shape suggests.

type Row = { bucket: string | null; key: string | null; value: number };
type Funnel = { event: string; count: number; rate: number };
type EventName = { name: string; app_id: string | null; count: number; reserved: boolean };
type EventRow = { id: string; name: string; app_id: string; ts: string; contact_id: string | null; anonymous_id: string | null; path: string | null; referrer: string | null; country: string | null; device: string | null; props: Record<string, unknown> };

const GROUPS = ["name", "app_id", "path", "referrer", "utm_source", "utm_medium", "utm_campaign", "country", "device"];

export const analyticsTools: Tool[] = [
  {
    name: "event_names",
    description: "Every event name the workspace has recorded, with its count and which app emits it. page.view and session.start are the core's; the rest are the apps'. Start here before analytics_query.",
    inputSchema: { type: "object", properties: {} },
    run: async (ctx) => {
      const names = await ctx.rpc<EventName[]>("eventNames");
      ctx.widget({ type: "rows", title: "Events", columns: ["name", "app", "count"], rows: names.map((n) => [n.name, n.app_id ?? "core", n.count]), total: names.length });
      return names;
    },
  },
  {
    name: "analytics_query",
    description:
      "Count events, unique visitors or contacts, or sum a numeric prop, over a time range: as one number, per day/week/month (a line chart), or grouped by name, app_id, path, referrer, utm_source, utm_medium, utm_campaign, country, device or prop:<key> (a bar chart). 'Page views in the last 7 days' is { events: ['page.view'], days: 7 }; 'by day' adds interval: 'day'; 'top pages' adds groupBy: 'path'.",
    inputSchema: {
      type: "object",
      properties: {
        metric: { enum: ["count", "unique_contacts", "unique_visitors", "sum"], default: "count" },
        prop: { type: "string", description: "For sum: the numeric prop to add up." },
        events: { type: "array", items: { type: "string" }, description: "Event names; all events when empty." },
        appId: { type: "string" },
        days: { type: "integer", minimum: 1, maximum: 3650, default: 30, description: "The last N days up to now, unless from/to are given." },
        from: { type: "string", description: "ISO-8601" },
        to: { type: "string", description: "ISO-8601" },
        interval: { enum: ["day", "week", "month"] },
        groupBy: { type: "string", description: `One of ${GROUPS.join(", ")} or prop:<key>.` },
        filters: { type: "array", items: { type: "object", required: ["field", "op"], properties: { field: { type: "string" }, op: { enum: ["eq", "ne", "in", "contains", "exists", "gt", "lt", "gte", "lte"] }, value: {} } } },
        limit: { type: "integer", minimum: 1, maximum: 1000, default: 50 },
        show: { enum: ["metric", "table", "bar", "line"], description: "How to draw it in the chat; picked from the shape when left out." },
        title: { type: "string", description: "The card's title, like 'Page views, last 7 days'." },
      },
    },
    run: async (ctx, args) => {
      const spec: Json = {};
      for (const k of ["metric", "prop", "events", "appId", "days", "from", "to", "interval", "groupBy", "filters", "limit"]) if (args[k] !== undefined && args[k] !== null && args[k] !== "") spec[k] = args[k];
      if (typeof spec.groupBy === "string" && !GROUPS.includes(spec.groupBy) && !spec.groupBy.startsWith("prop:")) throw new ToolError(`groupBy must be one of ${GROUPS.join(", ")} or prop:<key>.`);
      const rows = await ctx.rpc<Row[]>("queryAnalytics", [spec]);
      const title = str(args.title, "title", { optional: true }) || `${String(spec.metric ?? "count")} of ${Array.isArray(spec.events) && spec.events.length ? (spec.events as string[]).join(", ") : "all events"}`;
      const show = str(args.show, "show", { optional: true }) || (spec.interval ? "line" : spec.groupBy ? "bar" : "metric");
      if (show === "metric" && !spec.interval && !spec.groupBy) ctx.widget({ type: "metric", label: title, value: rows.reduce((s, r) => s + r.value, 0), hint: spec.days ? `last ${String(spec.days)} days` : undefined });
      else if (show === "line" && spec.interval && !spec.groupBy) ctx.widget({ type: "chart", kind: "line", title, points: rows.map((r) => ({ key: r.bucket ?? "", value: r.value })) });
      else if (show === "bar" && spec.groupBy && !spec.interval) ctx.widget({ type: "chart", kind: "bar", title, points: rows.slice(0, 24).map((r) => ({ key: r.key ?? "(none)", value: r.value })) });
      else ctx.widget({ type: "rows", title, columns: ["bucket", "key", "value"], rows: rows.slice(0, 50).map((r) => [r.bucket, r.key, r.value]), total: rows.length });
      return { spec, rows };
    },
  },
  {
    name: "analytics_funnel",
    description: "How many visitors or contacts went through a sequence of events in order, with the drop-off at each step. Shown as a bar chart.",
    inputSchema: { type: "object", required: ["steps"], properties: { steps: { type: "array", minItems: 2, maxItems: 8, items: { type: "object", required: ["event"], properties: { event: { type: "string" }, filters: { type: "array", items: { type: "object" } } } } }, days: { type: "integer", minimum: 1, maximum: 365, default: 30 }, by: { enum: ["contact", "visitor"], default: "visitor" }, windowHours: { type: "integer", minimum: 1, maximum: 720 }, title: { type: "string" } } },
    run: async (ctx, args) => {
      const steps = list<Json>(args.steps, "steps", { max: 8 });
      const spec: Json = { steps, days: num(args.days, "days", { min: 1, max: 365, dflt: 30 }), by: args.by === "contact" ? "contact" : "visitor" };
      if (args.windowHours) spec.windowHours = num(args.windowHours, "windowHours", { min: 1, max: 720, dflt: 24 });
      const out = await ctx.rpc<Funnel[]>("funnel", [spec]);
      ctx.widget({ type: "chart", kind: "bar", title: str(args.title, "title", { optional: true }) || "Funnel", points: out.map((s) => ({ key: s.event, value: s.count })) });
      return out;
    },
  },
  {
    name: "events_recent",
    description: "The latest events as recorded, newest first: name, app, time, who (contact or visitor), path, and the event's own props. Filter by name, app, contact or text.",
    inputSchema: { type: "object", properties: { name: { type: "string" }, appId: { type: "string" }, contactId: { type: "string" }, search: { type: "string" }, from: { type: "string" }, to: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 200, default: 25 }, offset: { type: "integer", minimum: 0, default: 0 } } },
    run: async (ctx, args) => {
      const q: Json = { limit: num(args.limit, "limit", { min: 1, max: 200, dflt: 25 }), offset: num(args.offset, "offset", { min: 0, dflt: 0 }) };
      for (const k of ["name", "appId", "contactId", "search", "from", "to"]) if (typeof args[k] === "string" && args[k]) q[k] = args[k];
      const page = await ctx.rpc<{ items: EventRow[]; total: number }>("listEvents", [q]);
      const cols = ["ts", "name", "app_id", "contact_id", "anonymous_id", "path", "country", "device", "props"];
      ctx.widget({ type: "rows", title: typeof q.name === "string" ? `${q.name} events` : "Recent events", ...tabular(page.items as unknown as Record<string, unknown>[], cols, 50), total: page.total });
      return page;
    },
  },
];
