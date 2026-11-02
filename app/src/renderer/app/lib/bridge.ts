import type { Bridge } from "../../../shared/bridge";

// The preload bridge, when the renderer runs inside the app. In a plain browser it is absent, and
// anything that needs the machine (the cf CLI) says it needs the app.
export const sg: Bridge | undefined = typeof window !== "undefined" ? window.sg : undefined;
export const isDesktop = !!sg;
export type { CloudflareStatus, WorkspaceSummary } from "../../../shared/bridge";
