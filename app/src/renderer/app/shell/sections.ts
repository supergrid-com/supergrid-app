import { ActivityIcon, AppWindowIcon, CodeIcon, GitBranchIcon, RocketIcon, ServerIcon, ChartColumnIcon, ScrollTextIcon, WebhookIcon, BellIcon, BuildingIcon, ClapperboardIcon, ClockIcon, CloudIcon, ComponentIcon, DatabaseIcon, FolderIcon, GlobeIcon, HistoryIcon, ImageIcon, LayoutGridIcon, LibraryIcon, MapIcon, SparklesIcon, ListOrderedIcon, MousePointerClickIcon, NavigationIcon, PaletteIcon, PanelsTopLeftIcon, RectangleHorizontalIcon, SquareCheckIcon, SquareDashedIcon, TableIcon, TextCursorInputIcon, type LucideIcon, PackageIcon, RefreshCwIcon, SquareTerminalIcon, StoreIcon, SunMoonIcon, TriangleAlertIcon, TypeIcon, WorkflowIcon } from "lucide-react";

// The workspace's own surfaces, in the rail's order under its apps. Home is the workspace's landing
// page and has no row. Settings is a modal, not a section. A section with sub items opens them in
// the second panel (workspace-shell.tsx); the first one, at path "", is the section's own page.

export type SectionItem = { path: string; label: string; icon: LucideIcon; about: string; group?: string };
export type Section = { path: string; label: string; icon: LucideIcon; about: string; items?: SectionItem[] };

// Dev builds only: every piece of the app's own kit and theme, live, for designing against
// (pages/dev/components.tsx). Not part of a workspace; it sits under Core so it is one click away.
export const componentsSection: Section = {
  path: "components",
  label: "Components",
  icon: ComponentIcon,
  about: "The app's own theme and components, live, in every state.",
  items: [
    { path: "", label: "Colors", icon: PaletteIcon, about: "The page and admin tokens, as the current theme resolves them.", group: "Theme" },
    { path: "type", label: "Typography", icon: TypeIcon, about: "Typefaces, sizes and weights.", group: "Theme" },
    { path: "surfaces", label: "Radius & Surfaces", icon: SquareDashedIcon, about: "Corner radii, borders, shadows and the layers they stack in.", group: "Theme" },
    { path: "buttons", label: "Buttons", icon: MousePointerClickIcon, about: "Buttons, toggles and toolbars.", group: "Components" },
    { path: "inputs", label: "Inputs", icon: TextCursorInputIcon, about: "Text, number and grouped inputs, with their fields.", group: "Components" },
    { path: "selection", label: "Selection", icon: SquareCheckIcon, about: "Checkboxes, radios, switches, selects and sliders.", group: "Components" },
    { path: "overlays", label: "Overlays", icon: AppWindowIcon, about: "Dialogs, sheets, popovers, menus and tooltips.", group: "Components" },
    { path: "feedback", label: "Feedback", icon: BellIcon, about: "Alerts, toasts, badges, progress and loading states.", group: "Components" },
    { path: "navigation", label: "Navigation", icon: NavigationIcon, about: "Tabs, segmented controls, breadcrumbs and pagination.", group: "Components" },
    { path: "display", label: "Data Display", icon: TableIcon, about: "Cards, tables, avatars, accordions and keys.", group: "Components" },
    { path: "shell", label: "Workspace Shell", icon: PanelsTopLeftIcon, about: "The workspace's own pieces: the sub nav, page cards, stat tiles and index headers.", group: "Shell" },
    { path: "empty", label: "Empty States", icon: RectangleHorizontalIcon, about: "What a page shows with nothing in it.", group: "Shell" },
  ],
};

/**
 * The Code section, in the rail only in Dev mode (WORKSPACE-REPO.md §9): the workspace's repo on this Mac. Its pages
 * still answer in Live (pages/workspace/code.tsx); the Deploys page is how a Live workspace gets a new version.
 */
export const codeSection: Section = {
  path: "code",
  label: "Code",
  icon: CodeIcon,
  about: "The workspace's repo on this Mac: its files, its git, its dev server and its deploys.",
  items: [
    { path: "files", label: "Files", icon: FolderIcon, about: "The repo's files, app by app." },
    { path: "git", label: "Git", icon: GitBranchIcon, about: "The repo's branch, its changes and its history." },
    { path: "server", label: "Server", icon: ServerIcon, about: "The dev server that serves the workspace on this Mac, and its log." },
    { path: "deploys", label: "Deploys", icon: RocketIcon, about: "Build the repo and send it live as the workspace Worker; the versions it has had." },
  ],
};

export const sections: Section[] = [
  {
    path: "database",
    label: "Database",
    icon: DatabaseIcon,
    about: "The workspace's tables and the rows its apps keep in them.",
    // the sub panel lists the tables themselves (workspace-shell.tsx), then these
    items: [
      { path: "query", label: "Query", icon: SquareTerminalIcon, about: "Run SQL against the workspace's database." },
      { path: "migrations", label: "Migrations", icon: ListOrderedIcon, about: "Schema changes, applied in order as apps install and update." },
      { path: "backups", label: "Backups", icon: HistoryIcon, about: "Restore the database to an earlier point in time." },
    ],
  },
  {
    path: "workflows",
    label: "Workflows",
    icon: WorkflowIcon,
    about: "What runs when an event happens, and reports over what the workspace keeps.",
    // the sub panel lists the workflows and the reports themselves, each group with a + (workspace-shell.tsx), then these
    items: [
      { path: "", label: "Workflows", icon: WorkflowIcon, about: "Steps that run when an event happens: an HTTP request, a tag, a wait." },
      { path: "reports", label: "Reports", icon: ChartColumnIcon, about: "Saved queries over the workspace's tables, shown as numbers, tables and charts." },
      { path: "events", label: "Events", icon: ActivityIcon, about: "Every event the workspace has recorded, as it happens.", group: "System" },
      { path: "logging", label: "Logging", icon: ScrollTextIcon, about: "What the workspace's Worker and its runs wrote to the log, errors first.", group: "System" },
      { path: "hooks", label: "Hooks", icon: WebhookIcon, about: "Every event in the system, from the core and each app, and the workflows that fire on it.", group: "System" },
    ],
  },
  {
    path: "library",
    label: "Library",
    icon: LibraryIcon,
    about: "Shared pieces the workspace's apps draw on.",
    // Images and Media are the organization's Cloudflare Images and Stream; Files is this workspace's own R2 bucket; Themes live in its database.
    items: [
      { path: "", label: "Images", icon: ImageIcon, about: "Pictures in Cloudflare Images, resized on the URL." },
      { path: "media", label: "Media", icon: ClapperboardIcon, about: "Video and audio in Cloudflare Stream, with playback analytics." },
      { path: "files", label: "Files", icon: FolderIcon, about: "Files in the workspace's own bucket, served from its address." },
      { path: "themes", label: "Themes", icon: PaletteIcon, about: "The colors, fonts and logo the workspace's apps share." },
      { path: "skills", label: "Skills", icon: SparklesIcon, about: "What the agent knows how to do here: short guides it finds and follows." },
      { path: "sitemap", label: "Sitemap", icon: MapIcon, about: "The apps, their pages and routes, and the Workers behind them." },
    ],
  },
  ...(import.meta.env.DEV ? [componentsSection] : []),
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
      { id: "domain", label: "Domain & Sitemap", icon: GlobeIcon },
      { id: "updates", label: "Updates", icon: RefreshCwIcon },
      { id: "danger", label: "Danger Zone", icon: TriangleAlertIcon },
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
