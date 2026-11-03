// A small JSON Schema checker for operation inputs: type, required, properties, enum, items, min/max, pattern.
// Enough for the schemas an app declares by hand; an app that wants the full standard can run its own validator
// in the operation and leave this one a plain `{ type: "object" }`.
export type JsonSchema = {
  type?: "object" | "array" | "string" | "number" | "integer" | "boolean" | "null" | string[];
  description?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  additionalProperties?: boolean | JsonSchema;
  items?: JsonSchema;
  enum?: unknown[];
  const?: unknown;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  default?: unknown;
  nullable?: boolean;
  [k: string]: unknown;
};

const typeOf = (v: unknown): string => (v === null ? "null" : Array.isArray(v) ? "array" : Number.isInteger(v) ? "integer" : typeof v);

/** The problems a value has against a schema, as "path: problem" lines; none when it fits. */
export function checkSchema(schema: JsonSchema | undefined, value: unknown, path = "input"): string[] {
  if (!schema) return [];
  const out: string[] = [];
  if (schema.const !== undefined && value !== schema.const) return [`${path}: must be ${JSON.stringify(schema.const)}`];
  if (schema.enum && !schema.enum.some((e) => e === value)) return [`${path}: one of ${schema.enum.map((e) => JSON.stringify(e)).join(", ")}`];
  if (schema.type) {
    const want = Array.isArray(schema.type) ? schema.type : [schema.type];
    const got = typeOf(value);
    const ok = want.some((t) => t === got || (t === "number" && got === "integer") || (t === "null" && value === null)) || (schema.nullable && value === null);
    if (!ok) return [`${path}: expected ${want.join(" or ")}, got ${got}`];
  }
  if (value === null || value === undefined) return out;
  if (typeof value === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength) out.push(`${path}: at least ${schema.minLength} characters`);
    if (schema.maxLength !== undefined && value.length > schema.maxLength) out.push(`${path}: at most ${schema.maxLength} characters`);
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) out.push(`${path}: must match ${schema.pattern}`);
  }
  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) out.push(`${path}: at least ${schema.minimum}`);
    if (schema.maximum !== undefined && value > schema.maximum) out.push(`${path}: at most ${schema.maximum}`);
  }
  if (Array.isArray(value) && schema.items) for (const [i, v] of value.entries()) out.push(...checkSchema(schema.items, v, `${path}[${i}]`));
  if (typeof value === "object" && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    for (const k of schema.required ?? []) if (obj[k] === undefined) out.push(`${path}.${k}: required`);
    for (const [k, sub] of Object.entries(schema.properties ?? {})) if (obj[k] !== undefined) out.push(...checkSchema(sub, obj[k], `${path}.${k}`));
    if (schema.additionalProperties === false) for (const k of Object.keys(obj)) if (!(k in (schema.properties ?? {}))) out.push(`${path}.${k}: not a known field`);
  }
  return out;
}

/** The value with the schema's defaults filled in for missing properties (one level, the usual case). */
export function withDefaults<T>(schema: JsonSchema | undefined, value: T): T {
  if (!schema?.properties || !value || typeof value !== "object" || Array.isArray(value)) return value;
  const out = { ...(value as Record<string, unknown>) };
  for (const [k, sub] of Object.entries(schema.properties)) if (out[k] === undefined && sub.default !== undefined) out[k] = sub.default;
  return out as T;
}
