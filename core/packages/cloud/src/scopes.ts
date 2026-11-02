import type { PermissionNames } from "./resources";

// What a platform needs from a Cloudflare account, in three shapes: the names of permission groups, for the token the
// desktop mints at "Connect Cloudflare" (app/CONNECT.md); the OAuth scope that lets a login mint each group (Cloudflare
// only mints what the session itself was granted, and checks that against these dotted scopes, not the coarse colon
// ones like `workers:write`); and a dashboard link that fills in the token form, for the hand-made fallback. Cloudflare
// has renamed groups from "… Edit" to "… Write"; both spellings are tried, newest first.
export type Permission = PermissionNames & { key: string; type: "read" | "edit"; /** None: no OAuth login can mint this group; only a hand-made token carries it. */ scope?: string };
const perm = (key: string, type: "read" | "edit", label: string, names: string[], scope?: string, required = true): Permission => ({ key, type, label, names, scope, required });

/** Everything the desktop does to an account: Workers, D1, Queues, Workflows, R2, Artifacts, plus media and the right to mint narrower tokens. */
export const APP_PERMISSIONS: Permission[] = [
  perm("workers_scripts", "edit", "Workers Scripts: Edit", ["Workers Scripts Write", "Workers Scripts Edit"], "workers-scripts.write"),
  perm("d1", "edit", "D1: Edit", ["D1 Write", "D1 Edit"], "d1.write"),
  perm("queues", "edit", "Queues: Edit", ["Queues Write", "Queues Edit"], "queues.write"),
  perm("workflows", "edit", "Workflows: Edit", ["Workflows Write", "Workflows Edit"], undefined, false),
  perm("workers_r2", "edit", "Workers R2 Storage: Edit", ["Workers R2 Storage Write", "Workers R2 Storage Edit"], "workers-r2.write", false),
  perm("account_settings", "read", "Account Settings: Read", ["Account Settings Read"], "account-settings.read"),
  perm("artifacts", "edit", "Artifacts: Edit", ["Artifacts Write", "Artifacts Edit", "Cloudflare Artifacts Write", "Workers Artifacts Write"], "artifacts.write", false),
  perm("images", "edit", "Cloudflare Images: Edit", ["Images Write", "Cloudflare Images Write", "Cloudflare Images Edit"], "images.write", false),
  perm("stream", "edit", "Stream: Edit", ["Stream Write", "Stream Edit"], "stream.write", false),
  perm("analytics", "read", "Account Analytics: Read", ["Account Analytics Read"], "account-analytics.read", false),
  perm("api_tokens", "edit", "Account API Tokens: Edit", ["Account API Tokens Write", "Account API Tokens Edit"], undefined, false),
];
/** What a login must ask for so it can mint `APP_PERMISSIONS`: see the accounts and who is signed in, create tokens, and one scope per group. */
export const CONNECT_SCOPES = ["account:read", "user:read", "account_api_tokens:create", ...APP_PERMISSIONS.flatMap((p) => (p.scope ? [p.scope] : []))];
/** The groups a login with `granted` scopes may mint, and the labels of those it cannot. */
export function mintable(granted: string[]): { perms: Permission[]; left: string[] } {
  const perms = APP_PERMISSIONS.filter((p) => p.scope && granted.includes(p.scope));
  return { perms, left: APP_PERMISSIONS.filter((p) => !perms.includes(p)).map((p) => p.label) };
}
/** What a workspace needs to hold images and video and read their playback analytics (workspace/ASSETS.md). */
export const MEDIA_PERMISSIONS: Permission[] = APP_PERMISSIONS.filter((p) => ["images", "stream", "analytics"].includes(p.key)).map((p) => ({ ...p, required: true }));

export const tokenPermissions = APP_PERMISSIONS.map((p) => p.label);
export const mediaTokenPermissions = MEDIA_PERMISSIONS.map((p) => p.label);

const link = (perms: { key: string; type: string }[], name: string) => {
  const keys = encodeURIComponent(JSON.stringify(perms.map(({ key, type }) => ({ key, type }))));
  return `https://dash.cloudflare.com/?to=/:account/api-tokens&permissionGroupKeys=${keys}&name=${encodeURIComponent(name)}`;
};
/** The dashboard's token form, filled in with everything the desktop needs: the fallback when the account cannot mint. */
export const tokenTemplateLink = (name: string) => link(APP_PERMISSIONS, name);
export const mediaTokenTemplateLink = (name: string) => link(MEDIA_PERMISSIONS, name);
