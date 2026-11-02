import type { Bridge } from "../../../shared/bridge";

// The preload bridge, when the renderer runs inside the app. In a plain browser it is absent and
// every screen falls back to the mock data, which is how the UI is developed on its own.
export const sg: Bridge | undefined = typeof window !== "undefined" ? window.sg : undefined;
export const isDesktop = !!sg;
export type { CloudflareStatus, WorkspaceSummary } from "../../../shared/bridge";
