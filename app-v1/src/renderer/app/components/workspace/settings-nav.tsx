import { ActivityIcon, KeyRoundIcon, PaletteIcon, StoreIcon } from "lucide-react";
import * as React from "react";
import { SubNav } from "~/components/workspace/sub-nav";
import { type SettingsSection, useWorkspacePage } from "~/lib/workspace-page";

// The settings sub nav: the shared SubNav with one row per settings section.

/** `width` widens the frame for sections that are a table rather than a column of cards. */
export const settingsMeta: Record<SettingsSection, { label: string; icon: React.ComponentType<{ className?: string }>; blurb: string; width?: "wide" }> = {
  general: { label: "General", icon: StoreIcon, blurb: "Where this workspace runs, and how its nav is laid out." },
  events: { label: "Events", icon: ActivityIcon, blurb: "Everything the workspace and its apps record, newest first.", width: "wide" },
  theme: { label: "Theme", icon: PaletteIcon, blurb: "Colors and fonts every app picks up." },
  secrets: { label: "Secrets", icon: KeyRoundIcon, blurb: "Environment secrets the apps can read." },
};

const order: SettingsSection[] = ["general", "events", "theme", "secrets"];

export function SettingsNav({ section, className }: { section: SettingsSection; className?: string }): React.ReactElement {
  const { go } = useWorkspacePage();
  return (
    <SubNav
      title="Settings"
      className={className}
      items={order.map((s) => {
        const Icon = settingsMeta[s].icon;
        return { key: s, label: settingsMeta[s].label, icon: <Icon />, active: s === section, onClick: () => go({ kind: "settings", section: s }) };
      })}
    />
  );
}
