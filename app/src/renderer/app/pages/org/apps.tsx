import { BoxIcon } from "lucide-react";
import type * as React from "react";
import { Placeholder } from "~/components/placeholder";

// The organization's apps: what is installed across its workspaces, and the catalog. Not built yet.
export function OrgApps(): React.ReactElement {
  return (
    <Placeholder
      title="Apps"
      description="What's installed across this organization's workspaces, and apps to add."
      icon={BoxIcon}
      what="Apps are separate Workers installed into a workspace, each with its own repo. This page comes once apps can be installed from SuperGrid."
    />
  );
}
