import type * as React from "react";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "~/components/ui/empty";
import { WorkspaceFrame } from "~/components/workspace/frame";
import { useOpenNav } from "~/shell/context";
import { sections } from "~/shell/sections";

// A workspace section that isn't built yet: its place in the rail and what it will be for.
export function SectionPlaceholder({ path }: { path: string }): React.ReactElement {
  const s = sections.find((x) => x.path === path);
  const onOpenNav = useOpenNav();
  const Icon = s?.icon;
  return (
    <WorkspaceFrame icon={Icon && <Icon />} title={s?.label ?? path} onOpenNav={onOpenNav}>
      <Empty className="py-16">
        <EmptyHeader>
          {Icon && (
            <EmptyMedia variant="icon">
              <Icon />
            </EmptyMedia>
          )}
          <EmptyTitle>Not built yet</EmptyTitle>
          <EmptyDescription>{s?.about}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </WorkspaceFrame>
  );
}

export const Contacts = () => <SectionPlaceholder path="contacts" />;
export const Analytics = () => <SectionPlaceholder path="analytics" />;
export const Assets = () => <SectionPlaceholder path="assets" />;
export const Design = () => <SectionPlaceholder path="design" />;
export const Workflows = () => <SectionPlaceholder path="workflows" />;
export const Hooks = () => <SectionPlaceholder path="hooks" />;
export const Events = () => <SectionPlaceholder path="events" />;
export const Secrets = () => <SectionPlaceholder path="secrets" />;
