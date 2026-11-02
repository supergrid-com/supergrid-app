import { ClockIcon } from "lucide-react";
import type * as React from "react";
import { Placeholder } from "~/components/placeholder";

// Changes made in the organization: deploys, installs, settings. Not built yet.
export function Activity(): React.ReactElement {
  return (
    <Placeholder
      title="Activity"
      description="Every change in this organization, from the app, the sg CLI and the agent."
      icon={ClockIcon}
      what="Deploys, installs and settings changes will show up here once SuperGrid makes them."
    />
  );
}
