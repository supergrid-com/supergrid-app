import type { Bridge } from "../shared/bridge";

declare global {
  interface Window {
    /** The preload bridge. Absent when the renderer runs in a plain browser. */
    sg?: Bridge;
  }
}

export {};
