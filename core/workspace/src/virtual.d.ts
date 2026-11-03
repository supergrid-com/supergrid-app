// React Router's server build, a Vite virtual module the workspace's build provides. A workspace repo gets this
// declaration from `react-router typegen` (.react-router/types/+server-build.d.ts); this one is for typechecking the
// package on its own.
declare module "virtual:react-router/server-build" {
  import type { ServerBuild } from "react-router";
  export const assets: ServerBuild["assets"];
  export const assetsBuildDirectory: ServerBuild["assetsBuildDirectory"];
  export const basename: ServerBuild["basename"];
  export const entry: ServerBuild["entry"];
  export const future: ServerBuild["future"];
  export const isSpaMode: ServerBuild["isSpaMode"];
  export const prerender: ServerBuild["prerender"];
  export const publicPath: ServerBuild["publicPath"];
  export const routeDiscovery: ServerBuild["routeDiscovery"];
  export const routes: ServerBuild["routes"];
  export const ssr: ServerBuild["ssr"];
}
