import type { LucideIcon } from "lucide-react";
import type * as React from "react";
import { SectionPage } from "~/components/section-page";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "~/components/ui/empty";

// An organization section that isn't built yet: its header, then an honest empty state saying
// what will be here.
export function Placeholder({ title, icon: Icon, what }: { title: string; icon: LucideIcon; what: string }): React.ReactElement {
  return (
    <SectionPage title={title}>
      <Empty className="rounded-2xl border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Icon />
          </EmptyMedia>
          <EmptyTitle>Not Built Yet</EmptyTitle>
          <EmptyDescription>{what}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </SectionPage>
  );
}
