// How everything a platform creates in a Cloudflare account is named. A workspace's display name can change and can
// collide across clients, so nothing in the account is named after it: every resource carries the workspace's short id.
// sg-platform                the platform Worker and its D1
// sg-ws-k3x9qz               a workspace Worker and its D1
// sg-app-k3x9qz-forms        an app Worker and its Artifacts repo
// The prefix lets two platforms share an account (a test install beside a real one).

// No i, l, o, 0 or 1: an id gets read off dashboards and typed into terminals.
const LETTERS = "abcdefghjkmnpqrstuvwxyz";
const CHARS = `${LETTERS}23456789`;
export const WORKSPACE_ID_LENGTH = 6;
/** Worker names double as workers.dev hostnames, so 63 characters at most; this leaves room for the prefix and short id. */
export const MAX_APP_ID_LENGTH = 40;

/** A random short id, always starting with a letter. Check it against the platform's table before using it. */
export function newWorkspaceId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(WORKSPACE_ID_LENGTH));
  return [...bytes].map((b, i) => { const set = i === 0 ? LETTERS : CHARS; return set[b % set.length]; }).join("");
}
export const isWorkspaceId = (id: string) => /^[a-z][a-z2-9]{5}$/.test(id);
export const isPrefix = (p: string) => /^[a-z][a-z0-9]{0,7}$/.test(p);
export const isAppId = (id: string) => id.length <= MAX_APP_ID_LENGTH && /^[a-z][a-z0-9-]*$/.test(id);

const binding = (id: string) => id.toUpperCase().replace(/[^A-Z0-9]/g, "_");
/** The workspace Worker's service binding to an app. */
export const appBinding = (app: string) => `APP_${binding(app)}`;

export function resourceNames(prefix = "sg") {
  return {
    /** Platform Worker and D1. */
    platform: `${prefix}-platform`,
    /** Workspace Worker and D1. */
    workspace: (id: string) => `${prefix}-ws-${id}`,
    /** App Worker and Artifacts repo. */
    app: (id: string, app: string) => `${prefix}-app-${id}-${app}`,
    /** A workspace's event queue, its dead-letter queue and its hook Workflow. */
    queue: (id: string) => `${prefix}-ws-${id}-events`,
    deadLetters: (id: string) => `${prefix}-ws-${id}-events-dlq`,
    workflow: (id: string) => `${prefix}-ws-${id}-hooks`,
    /** Artifacts namespace. */
    namespace: prefix,
  };
}
