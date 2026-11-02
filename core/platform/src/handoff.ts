// The handoff token the platform mints when it opens an app screen on a workspace (ARCHITECTURE.md §6).
// Signed with the workspace's own token, so only the platform that registered the workspace can mint one.
export type StaffClaims = {
  sub: string; name: string; email: string; org: string | null; role: string; permissions: string[];
  aud: string; exp: number; typ: "handoff" | "staff";
};
const enc = new TextEncoder();
const b64u = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64u = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
async function sign(secret: string, data: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64u(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}
export async function mintToken(secret: string, claims: StaffClaims) {
  const body = b64u(enc.encode(JSON.stringify(claims)));
  return `${body}.${await sign(secret, body)}`;
}
export async function verifyToken(secret: string, token: string | null | undefined, typ: StaffClaims["typ"], aud: string): Promise<StaffClaims | null> {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = await sign(secret, body);
  if (expected.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  if (diff) return null;
  try {
    const claims = JSON.parse(new TextDecoder().decode(unb64u(body))) as StaffClaims;
    if (claims.typ !== typ || claims.aud !== aud || claims.exp < Date.now() / 1000) return null;
    return claims;
  } catch { return null; }
}
