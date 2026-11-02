import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import type * as React from "react";
import { SectionPage } from "~/components/section-page";
import { Label } from "~/components/ui/label";
import { Radio, RadioGroup } from "~/components/ui/radio-group";
import { Separator } from "~/components/ui/separator";
import { adminThemes, usePlatform, type AdminTheme, type Theme } from "~/lib/platform";
import { SettingsGroup } from "~/pages/org/parts";

// How the app looks on this Mac: light, dark or the system's choice for the pages, and the admin
// layer's theme behind them (the rail and panels). Kept per window in localStorage.

const modes: { id: Theme; label: string; icon: React.ReactNode }[] = [
  { id: "system", label: "Match system", icon: <MonitorIcon className="size-4" /> },
  { id: "light", label: "Light", icon: <SunIcon className="size-4" /> },
  { id: "dark", label: "Dark", icon: <MoonIcon className="size-4" /> },
];

const optionClass = "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 font-normal transition-colors hover:bg-accent/40 has-data-checked:border-ring/50 has-data-checked:bg-accent/40";

export function Appearance(): React.ReactElement {
  const { theme, setTheme, adminTheme, setAdminTheme } = usePlatform();
  return (
    <SectionPage title="Appearance" description="How SuperGrid looks on this Mac." width={880}>
      <div className="flex flex-col gap-8">
        <SettingsGroup title="Pages" description="The page area of the app.">
          <RadioGroup aria-label="Pages" value={theme} onValueChange={(v) => setTheme(v as Theme)} className="gap-2">
            {modes.map((m) => (
              <Label key={m.id} className={optionClass}>
                <Radio value={m.id} />
                <span className="text-muted-foreground">{m.icon}</span>
                <span className="font-medium">{m.label}</span>
              </Label>
            ))}
          </RadioGroup>
        </SettingsGroup>
        <Separator />
        <SettingsGroup title="Admin theme" description="The rail, panels and title bar around the page.">
          <RadioGroup aria-label="Admin theme" value={adminTheme} onValueChange={(v) => setAdminTheme(v as AdminTheme)} className="gap-2">
            {adminThemes.map((t) => (
              <Label key={t.id} className={optionClass}>
                <Radio value={t.id} />
                <span className="size-4 rounded-full border" style={{ background: t.swatch }} />
                <span className="font-medium">{t.name}</span>
              </Label>
            ))}
          </RadioGroup>
        </SettingsGroup>
      </div>
    </SectionPage>
  );
}
