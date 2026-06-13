import { Palette, Monitor, Sun, Moon, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LauncherSettings, Theme } from "@/types";
import { SettingsSection, SettingRow, SwitchRow } from "./primitives";

interface SectionProps {
  settings: LauncherSettings;
  update: (partial: Partial<LauncherSettings>) => void;
  // UI-only state pending backend support
  ui: {
    accentColor: string;
    setAccentColor: (v: string) => void;
    compactMode: boolean;
    setCompactMode: (v: boolean) => void;
    animations: boolean;
    setAnimations: (v: boolean) => void;
    backgroundEffects: boolean;
    setBackgroundEffects: (v: boolean) => void;
  };
}

// UI-only accent swatches (visual preference, pending backend persistence).
const ACCENTS = [
  { id: "green", color: "#42d67c", label: "Emerald" },
  { id: "blue", color: "#3b9dff", label: "Azure" },
  { id: "purple", color: "#a06bff", label: "Violet" },
  { id: "orange", color: "#ff9f43", label: "Amber" },
  { id: "red", color: "#ff5c5c", label: "Crimson" },
  { id: "pink", color: "#ff6bcb", label: "Rose" },
];

const THEMES: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "dark", label: "Dark", icon: Moon },
  { value: "light", label: "Light", icon: Sun },
  { value: "system", label: "System", icon: Monitor },
];

export function AppearanceSection({ settings, update, ui }: SectionProps) {
  return (
    <div className="space-y-5">
      <SettingsSection
        icon={Palette}
        title="Theme"
        description="Choose the overall look of the launcher."
      >
        <SettingRow label="Color theme" description="System follows your OS appearance." align="start">
          <div className="flex gap-2">
            {THEMES.map(({ value, label, icon: Icon }) => {
              const active = settings.theme === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => update({ theme: value })}
                  className={cn(
                    "flex flex-col items-center gap-1.5 w-20 py-3 rounded-xl border text-xs font-medium transition-all",
                    active
                      ? "border-launcher-green/60 bg-accent-soft text-foreground accent-ring"
                      : "border-launcher-border bg-launcher-bg-secondary/60 text-muted-foreground hover:bg-launcher-bg-hover hover:text-foreground"
                  )}
                >
                  <Icon className={cn("w-5 h-5", active && "text-launcher-green")} />
                  {label}
                </button>
              );
            })}
          </div>
        </SettingRow>

        {/* UI-only pending backend: accentColor */}
        <SettingRow
          label="Accent color"
          description="Personalize highlights and primary buttons."
          align="start"
        >
          <div className="flex items-center gap-2.5 flex-wrap justify-end max-w-[260px]">
            {ACCENTS.map((a) => {
              const active = ui.accentColor === a.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  title={a.label}
                  aria-label={a.label}
                  onClick={() => ui.setAccentColor(a.id)}
                  className={cn(
                    "relative w-8 h-8 rounded-full transition-transform hover:scale-110",
                    active && "ring-2 ring-offset-2 ring-offset-launcher-bg-card"
                  )}
                  style={{
                    backgroundColor: a.color,
                    boxShadow: active ? `0 0 0 2px ${a.color}` : undefined,
                    // ring color matches swatch
                    ["--tw-ring-color" as any]: a.color,
                  }}
                >
                  {active && (
                    <Check className="w-4 h-4 text-white absolute inset-0 m-auto drop-shadow" strokeWidth={3} />
                  )}
                </button>
              );
            })}
          </div>
        </SettingRow>
      </SettingsSection>

      <SettingsSection
        icon={Monitor}
        title="Interface"
        description="Fine-tune density and visual effects."
      >
        {/* All UI-only, pending backend support */}
        <SwitchRow
          label="Compact mode"
          description="Reduce spacing and padding for a denser layout."
          checked={ui.compactMode}
          onCheckedChange={ui.setCompactMode}
        />
        <SwitchRow
          label="Interface animations"
          description="Enable transitions and motion across the launcher."
          checked={ui.animations}
          onCheckedChange={ui.setAnimations}
        />
        <SwitchRow
          label="Background effects"
          description="Show ambient gradients and blur on page backgrounds."
          checked={ui.backgroundEffects}
          onCheckedChange={ui.setBackgroundEffects}
        />
      </SettingsSection>
    </div>
  );
}
