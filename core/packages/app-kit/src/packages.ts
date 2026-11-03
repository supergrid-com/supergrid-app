// Shared packages between apps (docs/packages.md): an app exports a package from packages/<name> in its repo and
// says so in its manifest; another app lists it under `packages.uses`. The desktop keeps every app of a workspace in
// one pnpm workspace, so a use is `workspace:*` and resolves on disk. The registry is computed, not stored: this
// graph over the installed manifests says who exports what, who uses it, and which consumers are behind.
import type { AppManifest } from "./manifest";

export type PackageNode = { name: string; app: string; path: string; version: string; description?: string };
export type PackageUseEdge = { name: string; app: string; /** The version the consumer was last built against, when it recorded one. */ version?: string; /** The exporter, when it is an installed app. */ from: string | null; /** True when the exporter's version moved past what the consumer built with. */ stale: boolean };
export type PackageGraph = { exports: PackageNode[]; uses: PackageUseEdge[]; /** Apps to rebuild because a package they use changed. */ rebuild: string[] };

export function packageGraph(manifests: AppManifest[]): PackageGraph {
  const exports: PackageNode[] = manifests.flatMap((m) => (m.packages?.exports ?? []).map((p) => ({ name: p.name, app: m.id, path: p.path, version: m.version, description: p.description })));
  const byName = new Map(exports.map((e) => [e.name, e]));
  const uses: PackageUseEdge[] = manifests.flatMap((m) =>
    (m.packages?.uses ?? []).map((u) => {
      const from = byName.get(u.name) ?? null;
      const stale = !!from && !!u.version && u.version !== from.version;
      return { name: u.name, app: m.id, version: u.version, from: from?.app ?? null, stale };
    }),
  );
  return { exports, uses, rebuild: [...new Set(uses.filter((u) => u.stale).map((u) => u.app))] };
}

/** The consumers of an app's packages, for "rebuild these after deploying forms". */
export const consumersOf = (graph: PackageGraph, app: string): string[] => [...new Set(graph.uses.filter((u) => u.from === app).map((u) => u.app))];
