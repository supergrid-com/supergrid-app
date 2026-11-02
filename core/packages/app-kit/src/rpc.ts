// The surface an app sees on env.WORKSPACE. Implemented by workspace/src/api.ts (a WorkerEntrypoint).
/**
 * The version of everything between the platform, a workspace and an app: this RPC surface and the manifest. Bump it when
 * one changes. Changes stay additive, because a platform always manages workspaces older than itself during a rollout.
 */
export const CONTRACT = 1;

export type WorkspaceInfo = { id: string; name: string; url: string; version: string; contract: number; apps: { app: string; name?: string; public?: string; admin?: boolean; api?: boolean; nav?: { label: string; path: string }[] }[] };
export type Contact = { id: string; email: string; name: string | null; created_at: string };
export type Migration = { name: string; sql: string };

export interface WorkspaceRpc {
  info(): Promise<WorkspaceInfo>;
  getTheme(): Promise<Record<string, string>>;
  getSetting(key: string): Promise<unknown>;
  setSetting(key: string, value: unknown): Promise<void>;
  listContacts(limit?: number): Promise<Contact[]>;
  upsertContact(appId: string, input: { email: string; name?: string }): Promise<Contact>;
  emitEvent(appId: string, type: string, payload: unknown): Promise<void>;
  applyMigrations(appId: string, migrations: Migration[]): Promise<string[]>;
}
