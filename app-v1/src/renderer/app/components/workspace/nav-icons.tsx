import {
  BarChart3Icon,
  BookmarkIcon,
  ClipboardListIcon,
  DatabaseIcon,
  FileIcon,
  FolderIcon,
  FunnelIcon,
  GlobeIcon,
  HandIcon,
  HeartIcon,
  HomeIcon,
  ImageIcon,
  InboxIcon,
  KeyRoundIcon,
  LayoutTemplateIcon,
  MessageCircleIcon,
  NetworkIcon,
  PaletteIcon,
  PlugIcon,
  RocketIcon,
  ScrollTextIcon,
  SparklesIcon,
  StarIcon,
  StoreIcon,
  TableIcon,
  TagIcon,
  UsersIcon,
  WorkflowIcon,
  ZapIcon,
  type LucideProps,
} from "lucide-react";
import type * as React from "react";

// The icons a nav item can pick from. Names are what the nav config stores.
export const navIcons = {
  home: HomeIcon,
  chat: MessageCircleIcon,
  table: TableIcon,
  workflow: WorkflowIcon,
  plug: PlugIcon,
  file: FileIcon,
  key: KeyRoundIcon,
  pages: LayoutTemplateIcon,
  funnel: FunnelIcon,
  forms: ClipboardListIcon,
  hand: HandIcon,
  star: StarIcon,
  folder: FolderIcon,
  globe: GlobeIcon,
  users: UsersIcon,
  rocket: RocketIcon,
  store: StoreIcon,
  palette: PaletteIcon,
  database: DatabaseIcon,
  sparkles: SparklesIcon,
  chart: BarChart3Icon,
  logs: ScrollTextIcon,
  sitemap: NetworkIcon,
  image: ImageIcon,
  inbox: InboxIcon,
  tag: TagIcon,
  heart: HeartIcon,
  zap: ZapIcon,
  bookmark: BookmarkIcon,
} satisfies Record<string, React.ComponentType<LucideProps>>;

export type NavIconName = keyof typeof navIcons;
export const navIconNames = Object.keys(navIcons) as NavIconName[];

export function NavIcon({ name, ...props }: { name: NavIconName } & LucideProps): React.ReactElement {
  const Icon = navIcons[name] ?? navIcons.star;
  return <Icon {...props} />;
}

// Icon colors a nav item can pick from. Empty means the rail's own color.
export const navColors: { name: string; value: string }[] = [
  { name: "Default", value: "" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Emerald", value: "#10b981" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Rose", value: "#f43f5e" },
  { name: "Slate", value: "#94a3b8" },
];
