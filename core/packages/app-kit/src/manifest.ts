export type AppManifest = {
  id: string;
  name: string;
  version: string;
  upstream?: string;
  description?: string;
  public?: { mount: string };
  admin?: { nav: { label: string; path: string }[] };
  api?: boolean;
  /** Event names the app handles; the workspace POSTs each to /_app/<id>/hook (see `hooks` in createAppWorker). */
  subscribes?: string[];
  tables?: string[];
  permissions?: string[];
};
export const assetPrefix = (m: AppManifest) => `/_app/${m.id}/assets/`;
export const adminMount = (m: AppManifest) => `/admin/${m.id}`;
export const apiMount = (m: AppManifest) => `/api/${m.id}`;
