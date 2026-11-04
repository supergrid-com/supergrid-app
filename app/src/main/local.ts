import type { LocalWorkspace } from "../shared/bridge";
import { readConfig, writeConfig } from "./config";

// Workspaces that live only on this Mac: a repo and its dev server (src/main/apps.ts), with no Worker and no Cloudflare
// account behind them. The demo is one (src/main/demo.ts). They are kept in the config file beside the organizations,
// each under the organization it shows in; everything else about them is the repo. Such a workspace is always in Dev.

export const localWorkspaces = (): LocalWorkspace[] => (Array.isArray(readConfig().localWorkspaces) ? readConfig().localWorkspaces! : []);

export const localWorkspace = (wsId: string): LocalWorkspace | null => localWorkspaces().find((w) => w.id === wsId) ?? null;

/** The Worker name a local workspace's repo carries, so a later deploy has one ready. */
export const localWorker = (wsId: string): string => `sg-ws-${wsId}`;

export function saveLocalWorkspace(ws: LocalWorkspace): void {
  writeConfig({ localWorkspaces: [...localWorkspaces().filter((w) => w.id !== ws.id), ws] });
}

export function forgetLocalWorkspace(wsId: string): void {
  writeConfig({ localWorkspaces: localWorkspaces().filter((w) => w.id !== wsId) });
}
