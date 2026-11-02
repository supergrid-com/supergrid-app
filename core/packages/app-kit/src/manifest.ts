export type AppManifest = {
  id: string;
  name: string;
  version: string;
  upstream?: string;
  description?: string;
  public?: { mount: string };
  admin?: { nav: { label: string; path: string }[] };
  api?: boolean;
  subscribes?: string[];
  tables?: string[];
  permissions?: string[];
};
export const assetPrefix = (m: AppManifest) => `/_app/${m.id}/assets/`;
export const adminMount = (m: AppManifest) => `/admin/${m.id}`;
export const apiMount = (m: AppManifest) => `/api/${m.id}`;
