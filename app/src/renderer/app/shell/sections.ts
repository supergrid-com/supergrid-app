import { ActivityIcon, BuildingIcon, BarChart3Icon, ClockIcon, CloudIcon, GlobeIcon, HomeIcon, ImageIcon, KeyRoundIcon, LayoutGridIcon, type LucideIcon, PackageIcon, PaletteIcon, RefreshCwIcon, StoreIcon, SunMoonIcon, TriangleAlertIcon, UsersIcon, WorkflowIcon, ZapIcon } from "lucide-react";

// What is in a workspace, in the rail's order. The core sections first, then (in the rail) the
// workspace's installed apps, then the developer surfaces. Settings is a modal, not a section.

export type Section = { path: string; label: string; group: "main" | "content" | "developer"; icon: LucideIcon; about: string };

export const sections: Section[] = [
  { path: "", label: "Home", group: "main", icon: HomeIcon, about: "The workspace at a glance." },
  { path: "contacts", label: "Contacts", group: "main", icon: UsersIcon, about: "Everyone the workspace's apps have met: fields, tags, segments and activity." },
  { path: "analytics", label: "Analytics", group: "main", icon: BarChart3Icon, about: "Visitors, events and funnels, from the workspace's own events." },
  { path: "assets", label: "Assets", group: "content", icon: ImageIcon, about: "Images, video and files, over Cloudflare Images, Stream and R2." },
  { path: "design", label: "Design", group: "content", icon: PaletteIcon, about: "The themes the site and apps read at runtime." },
  { path: "workflows", label: "Workflows", group: "developer", icon: WorkflowIcon, about: "Steps that run when an event happens: wait, branch, tag, send." },
  { path: "hooks", label: "Hooks", group: "developer", icon: ZapIcon, about: "Events sent on to a workflow, a webhook or an app." },
  { path: "events", label: "Events", group: "developer", icon: ActivityIcon, about: "Every event the workspace has recorded, as it happens." },
  { path: "secrets", label: "Secrets", group: "developer", icon: KeyRoundIcon, about: "Write-only values for the workspace and its apps." },
];

/**
 * The settings modal (?org=<id>): the workspace's settings, then the organization's (its
 * workspaces, apps, Cloudflare account, activity) and the app's appearance.
 */
export const settingsGroups = [
  {
    id: "workspace",
    label: "Workspace",
    items: [
      { id: "general", label: "General", icon: StoreIcon },
      { id: "domain", label: "Domain & sitemap", icon: GlobeIcon },
      { id: "updates", label: "Updates", icon: RefreshCwIcon },
      { id: "danger", label: "Danger zone", icon: TriangleAlertIcon },
    ],
  },
  {
    id: "organization",
    label: "Organization",
    items: [
      { id: "organization", label: "General", icon: BuildingIcon },
      { id: "workspaces", label: "Workspaces", icon: LayoutGridIcon },
      { id: "apps", label: "Apps", icon: PackageIcon },
      { id: "cloudflare", label: "Cloudflare", icon: CloudIcon },
      { id: "activity", label: "Activity", icon: ClockIcon },
      { id: "appearance", label: "Appearance", icon: SunMoonIcon },
    ],
  },
] as const;
export type SettingsSectionId = (typeof settingsGroups)[number]["items"][number]["id"];
export const settingsSections = settingsGroups.flatMap((g) => g.items.map((i) => ({ ...i, group: g.label })));
