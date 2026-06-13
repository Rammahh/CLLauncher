import { useState } from "react";
import {
  SlidersHorizontal,
  Paintbrush,
  Gamepad2,
  Download,
  Wrench,
  RotateCcw,
  Save,
  type LucideIcon,
} from "lucide-react";
import { useSettingsStore } from "@/store/settingsStore";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { resetApiClient } from "@/api/client";
import { toast } from "@/components/ui/toaster";
import { invoke } from "@tauri-apps/api/core";
import { cn } from "@/lib/utils";
import type { LauncherSettings } from "@/types";
import { GeneralSection } from "@/components/settings/GeneralSection";
import { AppearanceSection } from "@/components/settings/AppearanceSection";
import { MinecraftSection } from "@/components/settings/MinecraftSection";
import { DownloadsSection } from "@/components/settings/DownloadsSection";
import { AdvancedSection } from "@/components/settings/AdvancedSection";

type SectionId = "general" | "appearance" | "minecraft" | "downloads" | "advanced";

const NAV: { id: SectionId; label: string; description: string; icon: LucideIcon }[] = [
  { id: "general", label: "General", description: "Startup & language", icon: SlidersHorizontal },
  { id: "appearance", label: "Appearance", description: "Theme & accent", icon: Paintbrush },
  { id: "minecraft", label: "Minecraft", description: "RAM, Java & game", icon: Gamepad2 },
  { id: "downloads", label: "Downloads", description: "Speed & cache", icon: Download },
  { id: "advanced", label: "Advanced", description: "API & diagnostics", icon: Wrench },
];

export function SettingsPage() {
  const { settings, updateSettings, resetSettings } = useSettingsStore();
  const [section, setSection] = useState<SectionId>("general");
  const [saved, setSaved] = useState(false);

  // ── UI-only preferences (pending backend persistence in LauncherSettings) ──
  const [launchOnStartup, setLaunchOnStartup] = useState(false);
  const [minimizeToTray, setMinimizeToTray] = useState(false);
  const [accentColor, setAccentColor] = useState("green");
  const [compactMode, setCompactMode] = useState(false);
  const [animations, setAnimations] = useState(true);
  const [backgroundEffects, setBackgroundEffects] = useState(true);
  const [retryFailed, setRetryFailed] = useState(true);

  const u = (partial: Partial<LauncherSettings>) => updateSettings(partial);

  const save = async () => {
    resetApiClient();
    try {
      await invoke("write_launcher_config", { config: settings });
    } catch {}
    setSaved(true);
    toast({ title: "Settings saved", variant: "success" });
    setTimeout(() => setSaved(false), 2000);
  };

  const activeMeta = NAV.find((n) => n.id === section)!;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-launcher-border shrink-0">
        <div>
          <h1 className="text-lg font-semibold leading-tight">Settings</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure your launcher and gameplay defaults
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={resetSettings}
            className="text-muted-foreground"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </Button>
          <Button variant="install" size="sm" onClick={save} className="min-w-[92px]">
            <Save className="w-4 h-4" />
            {saved ? "Saved!" : "Save"}
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left nav */}
        <nav className="w-56 shrink-0 border-r border-launcher-border bg-launcher-bg-secondary/40 p-3 overflow-y-auto">
          <ul className="space-y-1">
            {NAV.map((item) => {
              const active = section === item.id;
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setSection(item.id)}
                    className={cn(
                      "group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all",
                      active
                        ? "bg-accent-soft text-foreground shadow-glow-sm"
                        : "text-muted-foreground hover:bg-launcher-bg-hover hover:text-foreground"
                    )}
                  >
                    <span
                      className={cn(
                        "shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                        active
                          ? "bg-launcher-green/15 text-launcher-green"
                          : "bg-launcher-bg-card text-muted-foreground group-hover:text-foreground"
                      )}
                    >
                      <Icon className="w-[18px] h-[18px]" strokeWidth={2} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium leading-tight">{item.label}</span>
                      <span className="block text-[11px] text-muted-foreground leading-tight mt-0.5 truncate">
                        {item.description}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="max-w-3xl mx-auto px-6 py-6">
            <div className="mb-5 flex items-center gap-2.5">
              <activeMeta.icon className="w-5 h-5 text-launcher-green" />
              <h2 className="text-base font-semibold accent-gradient-text">{activeMeta.label}</h2>
            </div>

            {section === "general" && (
              <GeneralSection
                settings={settings}
                update={u}
                ui={{
                  launchOnStartup,
                  setLaunchOnStartup,
                  minimizeToTray,
                  setMinimizeToTray,
                }}
              />
            )}

            {section === "appearance" && (
              <AppearanceSection
                settings={settings}
                update={u}
                ui={{
                  accentColor,
                  setAccentColor,
                  compactMode,
                  setCompactMode,
                  animations,
                  setAnimations,
                  backgroundEffects,
                  setBackgroundEffects,
                }}
              />
            )}

            {section === "minecraft" && (
              <MinecraftSection settings={settings} update={u} />
            )}

            {section === "downloads" && (
              <DownloadsSection
                settings={settings}
                update={u}
                ui={{ retryFailed, setRetryFailed }}
              />
            )}

            {section === "advanced" && (
              <AdvancedSection
                settings={settings}
                update={u}
                onResetAll={resetSettings}
              />
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
