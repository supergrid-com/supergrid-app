// Staff identity on the workspace (ARCHITECTURE.md §6). The platform mints a handoff token signed with this workspace's
// token; /_ws/auth swaps it for the `sg_staff` cookie; /admin/* requires that cookie and forwards the claims to the app.
export type StaffClaims = { sub: string; name: string; email: string; org: string | null; role: string; permissions: string[]; aud: string; exp: number; typ: "handoff" | "staff" };

const COOKIE = "sg_staff";
const STAFF_SECONDS = 60 * 60;
const enc = new TextEncoder();
const b64u = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64u = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
async function sign(secret: string, data: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64u(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}
async function mint(secret: string, claims: StaffClaims) {
  const body = b64u(enc.encode(JSON.stringify(claims)));
  return `${body}.${await sign(secret, body)}`;
}
async function verify(secret: string, token: string | null | undefined, typ: StaffClaims["typ"], aud: string): Promise<StaffClaims | null> {
  if (!secret || !token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = await sign(secret, body);
  if (expected.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  if (diff) return null;
  try {
    const claims = JSON.parse(new TextDecoder().decode(unb64u(body))) as StaffClaims;
    return claims.typ === typ && claims.aud === aud && claims.exp > Date.now() / 1000 ? claims : null;
  } catch { return null; }
}

const cookieValue = (request: Request) => request.headers.get("cookie")?.split(/;\s*/).find((c) => c.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);

/** The staff member on this request, or null. */
export const staffUser = (request: Request, secret: string, workspaceId: string) => verify(secret, cookieValue(request), "staff", workspaceId);

/** GET /_ws/auth?token=…&next=/admin/…: verify the platform's handoff, set the staff cookie, continue. */
export async function handoff(request: Request, secret: string, workspaceId: string): Promise<Response> {
  const url = new URL(request.url);
  const claims = await verify(secret, url.searchParams.get("token"), "handoff", workspaceId);
  if (!claims) return new Response("This link has expired. Open the screen from the platform again.", { status: 401 });
  const next = url.searchParams.get("next") ?? "";
  if (!/^\/admin\/[a-z0-9-]+(\/|$)/.test(next)) return new Response("Bad next path", { status: 400 });
  const cookie = await mint(secret, { ...claims, typ: "staff", exp: Math.floor(Date.now() / 1000) + STAFF_SECONDS });
  // Partitioned + SameSite=None lets the cookie work inside the platform's iframe when the two are different sites
  // (workers.dev). Over plain http (local dev, same site anyway) browsers refuse Secure, so fall back to Lax.
  const attrs = url.protocol === "https:" ? "Secure; SameSite=None; Partitioned" : "SameSite=Lax";
  return new Response(null, {
    status: 302,
    headers: { location: next, "set-cookie": `${COOKIE}=${cookie}; Path=/; HttpOnly; Max-Age=${STAFF_SECONDS}; ${attrs}`, "cache-control": "no-store" },
  });
}

export const notStaffResponse = (workspaceName: string) => new Response(
  `<!doctype html><meta charset="utf-8"><title>Sign in</title><body style="font-family:system-ui;max-width:28rem;margin:4rem auto;padding:0 1rem"><h1 style="font-size:1.25rem">${workspaceName}</h1><p>This screen is opened from the platform, which signs you in. Your session here may have expired; open it from the platform again.</p>`,
  { status: 401, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } },
);
