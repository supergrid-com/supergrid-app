// Browser-side Better Auth client. Same access control and roles as the server plugin.
import { apiKeyClient } from "@better-auth/api-key/client";
import { passkeyClient } from "@better-auth/passkey/client";
import { adminClient, organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { ac, roles } from "../src/roles";

export const authClient = createAuthClient({
  basePath: "/api/auth",
  plugins: [organizationClient({ ac, roles, teams: { enabled: true }, dynamicAccessControl: { enabled: true } }), adminClient(), passkeyClient(), apiKeyClient()],
});
