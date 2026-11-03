import type * as React from "react";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "~/components/ui/empty";
import { WorkspaceFrame } from "~/components/workspace/frame";
import { useParams } from "react-router";
import { useOpenNav } from "~/shell/context";
import { sections } from "~/shell/sections";

// A workspace section that isn't built yet: its place in the rail and what it will be for. In a
// section with sub items, the one open in the second panel (the rest of the path after it).
export function SectionPlaceholder({ path }: { path: string }): React.ReactElement {
  const sub = useParams()["*"] ?? "";
  const s = sections.find((x) => x.path === path);
  const item = s?.items?.find((it) => it.path === sub);
  const onOpenNav = useOpenNav();
  const Icon = item?.icon ?? s?.icon;
  const title = s && item ? `${s.label} · ${item.label}` : (s?.label ?? path);
  return (
    <WorkspaceFrame icon={Icon && <Icon />} title={title} onOpenNav={onOpenNav}>
      <Empty className="py-16">
        <EmptyHeader>
          {Icon && (
            <EmptyMedia variant="icon">
              <Icon />
            </EmptyMedia>
          )}
          <EmptyTitle>Not Built Yet</EmptyTitle>
          <EmptyDescription>{item?.about ?? s?.about}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </WorkspaceFrame>
  );
}

