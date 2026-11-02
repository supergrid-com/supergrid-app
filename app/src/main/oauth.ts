import { CONNECT_SCOPES } from "@supergrid/cloud";
import { shell } from "electron";
import { createHash, randomBytes } from "node:crypto";
import { createServer, type Server } from "node:http";

// Cloudflare's OAuth, the way wrangler and cf do it: PKCE in the default browser, a callback on
// localhost, then the code swapped for an access token. The app uses the `cf` CLI's client, whose
// registered scopes include `account_api_tokens:create`: the one wrangler's client lacks, and the
// one "Connect Cloudflare" needs to mint the app's token (app/CONNECT.md). The access token lives in
// memory only, for as long as the connect step needs it.

const AUTH_URL = "https://dash.cloudflare.com/oauth2/auth";
const TOKEN_URL = "https://dash.cloudflare.com/oauth2/token";
const CLIENT_ID = "cbca97e7-c331-4cdd-8fd8-e25a451b98bf";
const REDIRECT = "http://localhost:8877/oauth/callback";
/** See the accounts, who is signed in, create account API tokens, and one scope per permission group the token will
 * hold: Cloudflare mints only what the login itself was granted. The login is still not what does the work. */
export const SCOPES = CONNECT_SCOPES;

export type OAuthSession = { token: string; expiresAt: number; scopes: string[] };

const b64url = (b: Buffer) => b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const page = (title: string, body: string) =>
  `<!doctype html><meta charset="utf-8"><title>${title}</title><body style="font:15px system-ui;margin:0;display:grid;place-items:center;height:100vh;color:#111"><div style="text-align:center;max-width:28rem"><h1 style="font-size:20px;margin:0 0 8px">${title}</h1><p style="margin:0;color:#555">${body}</p></div>`;

/** Opens the browser and resolves with an access token once Cloudflare sends the user back. */
export function authorize(timeoutMs = 5 * 60 * 1000): Promise<OAuthSession> {
  const verifier = b64url(randomBytes(48));
  const challenge = b64url(createHash("sha256").update(verifier).digest());
  const state = b64url(randomBytes(24));
  const url = `${AUTH_URL}?response_type=code&client_id=${encodeURIComponent(CLIENT_ID)}&redirect_uri=${encodeURIComponent(REDIRECT)}&scope=${encodeURIComponent(SCOPES.join(" "))}&state=${state}&code_challenge=${encodeURIComponent(challenge)}&code_challenge_method=S256`;
  const { port, pathname } = new URL(REDIRECT);

  return new Promise<OAuthSession>((resolve, reject) => {
    let server: Server;
    let done = false;
    const finish = (err: Error | null, session?: OAuthSession) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      server.close();
      if (err) reject(err);
      else resolve(session!);
    };
    const timer = setTimeout(() => finish(new Error("Timed out waiting for the Cloudflare login to finish.")), timeoutMs);

    server = createServer(async (req, res) => {
      const u = new URL(req.url ?? "/", REDIRECT);
      if (req.method !== "GET" || u.pathname !== pathname) { res.writeHead(404).end(); return; }
      const q = u.searchParams;
      if (q.get("state") !== state) {
        res.writeHead(400, { "content-type": "text/html; charset=utf-8" }).end(page("That login is not this one", "Go back to the SuperGrid app and connect again."));
        return;
      }
      if (q.get("error")) {
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(page("Not connected", "You can close this tab."));
        finish(new Error(q.get("error") === "access_denied" ? "Consent was declined in the browser." : `Cloudflare said: ${q.get("error_description") ?? q.get("error")}`));
        return;
      }
      const code = q.get("code");
      if (!code) {
        res.writeHead(400, { "content-type": "text/html; charset=utf-8" }).end(page("Something went wrong", "Cloudflare sent no authorization code. Try again from the app."));
        finish(new Error("Cloudflare returned no authorization code."));
        return;
      }
      try {
        const session = await exchange(code, verifier);
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(page("Connected", "SuperGrid is creating its API token. You can close this tab and go back to the app."));
        finish(null, session);
      } catch (e) {
        res.writeHead(500, { "content-type": "text/html; charset=utf-8" }).end(page("Something went wrong", (e as Error).message));
        finish(e as Error);
      }
    });
    // `localhost` is 127.0.0.1 to some browsers and ::1 to others: listen on both, and give up only when neither binds.
    const twin = createServer((req, res) => server.emit("request", req, res));
    const onError = (e: NodeJS.ErrnoException) => {
      finish(new Error(e.code === "EADDRINUSE" ? `Port ${port} is busy (another Cloudflare login may be waiting). Close it and connect again.` : e.message));
    };
    server.once("error", onError);
    twin.once("error", () => undefined);
    const closeAll = server.close.bind(server);
    server.close = ((cb?: (err?: Error) => void) => { twin.close(); return closeAll(cb); }) as typeof server.close;
    server.listen(Number(port), "127.0.0.1", () => {
      twin.listen(Number(port), "::1");
      void shell.openExternal(url).catch((e) => finish(e as Error));
    });
  });
}

async function exchange(code: string, verifier: string): Promise<OAuthSession> {
  const body = new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: REDIRECT, client_id: CLIENT_ID, code_verifier: verifier });
  const res = await fetch(TOKEN_URL, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: body.toString() });
  const json = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; scope?: string; error?: string; error_description?: string };
  if (!res.ok || !json.access_token) throw new Error(`Cloudflare would not issue a token: ${json.error_description ?? json.error ?? res.status}`);
  // what was granted; a response without `scope` means everything asked for
  return { token: json.access_token, expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000, scopes: json.scope ? json.scope.split(" ") : SCOPES };
}
