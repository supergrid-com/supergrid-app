import { createWorkspaceWorker } from "@supergrid/workspace/worker";
import { apps } from "../.sg/apps";

// The workspace Worker: the workspace's own endpoints and every app in apps/, composed from the generated registry.
export { HookRun, WorkspaceApi } from "@supergrid/workspace/worker";
export default createWorkspaceWorker(apps);
