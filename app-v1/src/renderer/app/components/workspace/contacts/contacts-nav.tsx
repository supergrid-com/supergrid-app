import { BookmarkIcon, BoxIcon, PlusIcon, SlidersHorizontalIcon, UsersIcon } from "lucide-react";
import * as React from "react";
import { FieldsSheet } from "~/components/workspace/contacts/fields-sheet";
import { SegmentSheet } from "~/components/workspace/contacts/segment-sheet";
import { SubNav, type SubNavItem } from "~/components/workspace/sub-nav";
import type { Workspace } from "~/lib/mock";
import { useWorkspacePage } from "~/lib/workspace-page";
import { useWsQuery } from "~/lib/ws-query";

// The contacts sub panel: everyone, then the segments, then the custom object types, then the
// two rows that open the field registry and the segment sheet.

export function ContactsNav({ ws }: { ws: Workspace }): React.ReactElement {
  const { go, page } = useWorkspacePage();
  const total = useWsQuery(ws.id, "queryContacts", [{ limit: 1 }], { tags: ["contacts"] });
  const segments = useWsQuery(ws.id, "listSegments", [], { tags: ["segments", "contacts"] });
  const types = useWsQuery(ws.id, "listObjectTypes", [], { tags: ["objects"] });
  const [fieldsOpen, setFieldsOpen] = React.useState(false);
  const [segmentOpen, setSegmentOpen] = React.useState(false);
  const onContacts = page.kind === "contacts";
  const items: SubNavItem[] = [
    { key: "all", label: "All contacts", icon: <UsersIcon />, meta: total.data?.total.toLocaleString(), active: onContacts && !page.segment && !page.id, onClick: () => go({ kind: "contacts" }) },
    {
      key: "segments",
      label: "Segments",
      icon: <BookmarkIcon />,
      meta: segments.data?.length ?? undefined,
      active: false,
      open: true,
      onClick: () => setSegmentOpen(true),
      children: (segments.data ?? []).map((s) => ({ key: s.id, label: s.name, meta: s.count?.toLocaleString(), active: onContacts && page.segment === s.id, onClick: () => go({ kind: "contacts", segment: s.id }) })),
    },
    {
      key: "objects",
      label: "Objects",
      icon: <BoxIcon />,
      meta: types.data?.length ?? undefined,
      active: false,
      open: true,
      onClick: () => { const first = types.data?.[0]; if (first) go({ kind: "objects", type: first.id }); },
      children: (types.data ?? []).map((t) => ({ key: t.id, label: t.plural, active: page.kind === "objects" && page.type === t.id, onClick: () => go({ kind: "objects", type: t.id }) })),
    },
    { key: "fields", label: "Fields…", icon: <SlidersHorizontalIcon />, active: false, onClick: () => setFieldsOpen(true) },
    { key: "new-segment", label: "New segment…", icon: <PlusIcon />, active: false, onClick: () => setSegmentOpen(true) },
  ];
  return (
    <>
      <SubNav title="Contacts" icon={<UsersIcon />} items={items} />
      <FieldsSheet ws={ws} open={fieldsOpen} onOpenChange={setFieldsOpen} />
      <SegmentSheet ws={ws} open={segmentOpen} onOpenChange={setSegmentOpen} onSaved={(s) => go({ kind: "contacts", segment: s.id })} />
    </>
  );
}
