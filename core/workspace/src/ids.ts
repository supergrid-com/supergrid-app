// Ids. New rows get 15-character url-safe ids (the nanoid alphabet); older rows keep their UUIDs.
const ALPHABET = "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";

export function nid(size = 15): string {
  const bytes = crypto.getRandomValues(new Uint8Array(size));
  let out = "";
  for (const b of bytes) out += ALPHABET[b & 63];
  return out;
}

export const isId = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9_-]{6,64}$/.test(v);

/** Derived, so a retried batch can't start the same run twice. Workflow ids allow only [a-zA-Z0-9_-]. */
export async function runIdFor(eventId: string, hookId: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${eventId}/${hookId}`));
  return `hr-${[...new Uint8Array(digest).slice(0, 16)].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

export const now = () => new Date().toISOString();
