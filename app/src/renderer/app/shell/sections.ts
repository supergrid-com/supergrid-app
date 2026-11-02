import { ActivityIcon, BarChart3Icon, ClockIcon, CloudIcon, GlobeIcon, HomeIcon, ImageIcon, KeyRoundIcon, LayoutGridIcon, type LucideIcon, PackageIcon, PaletteIcon, RefreshCwIcon, SettingsIcon, StoreIcon, TriangleAlertIcon, UsersIcon, WorkflowIcon, ZapIcon } from "lucide-react";

// What is in a workspace, in the rail's order. The core sections first, then (in the rail) the
// workspace's installed apps, then the developer surfaces, with Settings pinned to the foot.

export type Section = { path: string; label: string; group: "main" | "content" | "developer" | "footer"; icon: LucideIcon; about: string };

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
  { path: "settings", label: "Settings", group: "footer", icon: SettingsIcon, about: "The workspace's name, address, domain, updates." },
];

/** Settings, one page per section, in the second panel. */
export const settingsSections = [
  { id: "general", label: "General", icon: StoreIcon },
  { id: "domain", label: "Domain & sitemap", icon: GlobeIcon },
  { id: "updates", label: "Updates", icon: RefreshCwIcon },
  { id: "danger", label: "Danger zone", icon: TriangleAlertIcon },
] as const;
export type SettingsSectionId = (typeof settingsSections)[number]["id"];

/** The organization modal's sections (?org=<id>). */
export const orgSections = [
  { id: "workspaces", label: "Workspaces", icon: LayoutGridIcon },
  { id: "apps", label: "Apps", icon: PackageIcon },
  { id: "cloudflare", label: "Cloudflare", icon: CloudIcon },
  { id: "activity", label: "Activity", icon: ClockIcon },
  { id: "settings", label: "Settings", icon: SettingsIcon },
] as const;
export type OrgSectionId = (typeof orgSections)[number]["id"];
