// A small client for the Cloudflare REST API. Unwraps `result` and throws CfApiError with the API's error list.
export const CF_API = "https://api.cloudflare.com/client/v4";

export type CfError = { code: number; message: string };

export class CfApiError extends Error {
  constructor(public readonly status: number, public readonly errors: CfError[], public readonly path: string) {
    super(`Cloudflare API ${status} on ${path}: ${errors.map((e) => `${e.code} ${e.message}`).join("; ") || "unknown error"}`);
    this.name = "CfApiError";
  }
  has(code: number) { return this.errors.some((e) => e.code === code); }
  get notFound() { return this.status === 404 || this.has(10007) || this.has(7003) || this.has(1000); }
}

export type Cf = {
  accountId: string;
  request<T = unknown>(method: string, path: string, body?: unknown): Promise<T>;
  get<T = unknown>(path: string): Promise<T>;
  post<T = unknown>(path: string, body?: unknown): Promise<T>;
  put<T = unknown>(path: string, body?: unknown): Promise<T>;
  /** `/accounts/{id}` + path */
  acct(path: string): string;
  /** Upload files with an assets-session JWT instead of the API token. */
  uploadAssets(jwt: string, form: FormData): Promise<{ jwt?: string }>;
};

export function createCf(token: string, accountId: string, api = CF_API): Cf {
  async function send<T>(method: string, path: string, auth: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = { authorization: `Bearer ${auth}` };
    let payload: FormData | string | undefined;
    if (body instanceof FormData) payload = body;
    else if (body !== undefined) { headers["content-type"] = "application/json"; payload = JSON.stringify(body); }
    const res = await fetch(`${api}${path}`, { method, headers, body: payload });
    const text = await res.text();
    if (!text) { if (res.ok) return undefined as T; throw new CfApiError(res.status, [{ code: res.status, message: "empty response" }], path); }
    let json: { success?: boolean; result: T; errors?: CfError[] };
    try { json = JSON.parse(text); } catch { throw new CfApiError(res.status, [{ code: res.status, message: `non-JSON response: ${text.slice(0, 200)}` }], path); }
    if (!res.ok || json.success === false) throw new CfApiError(res.status, json.errors ?? [{ code: res.status, message: "request failed" }], path);
    return json.result;
  }
  return {
    accountId,
    request: (m, p, b) => send(m, p, token, b),
    get: (p) => send("GET", p, token),
    post: (p, b) => send("POST", p, token, b ?? {}),
    put: (p, b) => send("PUT", p, token, b ?? {}),
    acct: (p) => `/accounts/${accountId}${p}`,
    uploadAssets: (jwt, form) => send("POST", `/accounts/${accountId}/workers/assets/upload?base64=true`, jwt, form),
  };
}

/** Throws unless the token is alive and can see this account. */
export async function checkToken(cf: Cf): Promise<void> {
  await cf.get(cf.acct("/workers/subdomain")).catch((e) => {
    if (e instanceof CfApiError && e.has(10007)) return; // no subdomain yet: the token worked
    throw e;
  });
}
