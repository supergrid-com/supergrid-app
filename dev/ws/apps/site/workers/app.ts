import { initialMigration } from "@supergrid/app-kit/data";
import type { Operations } from "@supergrid/app-kit/operations";
import type { JsonSchema } from "@supergrid/app-kit/schema";
import type { AppHook } from "@supergrid/app-kit/worker";
import manifest from "../supergrid.app.json";
import { createItem, deleteItem, getItem, listItems, updateItem, type Item } from "../app/lib/items";

// What the app's Worker side exports: migrations (the first one is written from the manifest's data declaration), the
// operations the app exposes (in process, as REST under /api/blank/ops, as MCP under /api/blank/mcp, and to the
// SuperGrid agent), and hooks for the events it subscribes to. The workspace's Worker composes these with every other
// app's. Add a migration (never edit a shipped one) when the data changes.

const item: JsonSchema = { type: "object", properties: { id: { type: "string" }, title: { type: "string" }, body: { type: ["string", "null"] }, status: { type: "string", enum: ["draft", "published"] }, image: { type: ["string", "null"], description: "An asset reference as JSON, or null" }, contact_id: { type: ["string", "null"] }, created_at: { type: "string" }, updated_at: { type: "string" } } };

const operations: Operations = {
  "items.list": {
    description: "List items, newest first; `status` narrows to drafts or published ones.",
    access: "staff",
    input: { type: "object", properties: { status: { type: "string", enum: ["draft", "published"] }, limit: { type: "integer", minimum: 1, maximum: 500, default: 100 } } },
    output: { type: "object", properties: { items: { type: "array", items: item } } },
    run: async (input: { status?: Item["status"]; limit?: number }, ctx) => ({ items: await listItems(ctx.db, input) }),
  },
  "items.get": {
    description: "One item by id.",
    access: "staff",
    input: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
    output: item,
    run: async (input: { id: string }, ctx) => (await getItem(ctx.db, input.id)) ?? null,
  },
  "items.create": {
    description: "Create an item. Records an `item.created` event.",
    access: ["content:write"],
    input: { type: "object", required: ["title"], properties: { title: { type: "string", minLength: 1, maxLength: 200 }, body: { type: "string" }, status: { type: "string", enum: ["draft", "published"], default: "draft" } } },
    output: item,
    run: async (input: { title: string; body?: string; status?: Item["status"] }, ctx) => {
      const row = await createItem(ctx.db, input);
      await ctx.events.emit("item.created", { id: row.id, title: row.title });
      return row;
    },
  },
  "items.update": {
    description: "Change an item's title, body, status or image.",
    access: ["content:write"],
    input: { type: "object", required: ["id"], properties: { id: { type: "string" }, title: { type: "string", minLength: 1, maxLength: 200 }, body: { type: ["string", "null"] }, status: { type: "string", enum: ["draft", "published"] }, image: { type: ["string", "null"] } } },
    output: item,
    run: async ({ id, ...input }: { id: string; title?: string; body?: string | null; status?: Item["status"]; image?: string | null }, ctx) => updateItem(ctx.db, id, input),
  },
  "items.delete": {
    description: "Delete an item for good.",
    access: ["content:write"],
    confirm: true,
    input: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
    run: async (input: { id: string }, ctx) => ({ deleted: await deleteItem(ctx.db, input.id) }),
  },
};

export const migrations = [initialMigration(manifest)];

export const hooks: Record<string, AppHook> = {
  // "contact.tagged": async (event, env) => { … }   add the event name to `subscribes` in the manifest too
};

export { operations };
