import {
  BellIcon,
  CreditCardIcon,
  DatabaseIcon,
  GlobeIcon,
  KeyRoundIcon,
  LayoutGridIcon,
  PaletteIcon,
  PlugIcon,
  SlidersHorizontalIcon,
  StoreIcon,
  UsersIcon,
} from "lucide-react";
import * as React from "react";
import { SubNav } from "~/components/workspace/sub-nav";
import { type SettingsSection, useWorkspacePage } from "~/lib/workspace-page";

// The settings sub nav: the shared SubNav with one row per settings section.

export const settingsMeta: Record<SettingsSection, { label: string; icon: React.ComponentType<{ className?: string }>; blurb: string }> = {
  general: { label: "General", icon: StoreIcon, blurb: "Name, address and defaults for this workspace." },
  plan: { label: "Plan", icon: CreditCardIcon, blurb: "What this workspace is on and what it uses." },
  access: { label: "Access", icon: UsersIcon, blurb: "Who can open this workspace and what they can do." },
  apps: { label: "Apps", icon: LayoutGridIcon, blurb: "The apps installed here, their versions and deploys." },
  data: { label: "Data", icon: DatabaseIcon, blurb: "Tables, exports and backups." },
  theme: { label: "Theme", icon: PaletteIcon, blurb: "Colors and fonts every app picks up." },
  domains: { label: "Domains", icon: GlobeIcon, blurb: "Where the site is served from." },
  integrations: { label: "Integrations", icon: PlugIcon, blurb: "Services connected to this workspace." },
  notifications: { label: "Notifications", icon: BellIcon, blurb: "What this workspace tells you about, and where." },
  secrets: { label: "Secrets", icon: KeyRoundIcon, blurb: "Environment secrets the apps can read." },
  advanced: { label: "Advanced", icon: SlidersHorizontalIcon, blurb: "Identifiers, workers, and the danger zone." },
};

const order: SettingsSection[] = ["general", "plan", "access", "apps", "data", "theme", "domains", "integrations", "notifications", "secrets", "advanced"];

export function SettingsNav({ section, className }: { section: SettingsSection; className?: string }): React.ReactElement {
  const { go } = useWorkspacePage();
  return (
    <SubNav
      title="Settings"
      footer="user"
      className={className}
      items={order.map((s) => {
        const Icon = settingsMeta[s].icon;
        return { key: s, label: settingsMeta[s].label, icon: <Icon />, active: s === section, onClick: () => go({ kind: "settings", section: s }) };
      })}
    />
  );
}
