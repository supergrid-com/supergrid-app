// What a platform needs from a Cloudflare account, as a dashboard link that fills in the token form.
const PERMISSIONS = [
  { key: "workers_scripts", type: "edit", label: "Workers Scripts: Edit" },
  { key: "d1", type: "edit", label: "D1: Edit" },
  { key: "account_settings", type: "read", label: "Account Settings: Read" },
  { key: "artifacts", type: "edit", label: "Artifacts: Edit" },
];
export const tokenPermissions = PERMISSIONS.map((p) => p.label);
export function tokenTemplateLink(name: string) {
  const keys = encodeURIComponent(JSON.stringify(PERMISSIONS.map(({ key, type }) => ({ key, type }))));
  return `https://dash.cloudflare.com/?to=/:account/api-tokens&permissionGroupKeys=${keys}&name=${encodeURIComponent(name)}`;
}
