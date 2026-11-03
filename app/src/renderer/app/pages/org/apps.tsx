import { BoxIcon } from "lucide-react";
import type * as React from "react";
import { Placeholder } from "~/components/placeholder";

// The organization's apps: what is installed across its workspaces, and the catalog. Not built yet.
export function OrgApps(): React.ReactElement {
  return (
    <Placeholder
      title="Apps"
      icon={BoxIcon}
      what="Apps are folders in a workspace's repo, built into its Worker. This page comes once apps can be installed from elsewhere (WORKSPACE-REPO.md step 3)."
    />
  );
}
