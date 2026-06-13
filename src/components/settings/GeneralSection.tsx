import { Rocket, Languages, Bell } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { LauncherSettings } from "@/types";
import { SettingsSection, SettingRow, SwitchRow } from "./primitives";

interface SectionProps {
  settings: LauncherSettings;
  update: (partial: Partial<LauncherSettings>) => void;
  // UI-only state shared across sections (not yet in LauncherSettings backend)
  ui: {
    launchOnStartup: boolean;
    setLaunchOnStartup: (v: boolean) => void;
    minimizeToTray: boolean;
    setMinimizeToTray: (v: boolean) => void;
  };
}

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "de", label: "Deutsch" },
  { value: "fr", label: "Français" },
  { value: "es", label: "Español" },
  { value: "pt", label: "Português" },
  { value: "ru", label: "Русский" },
];

export function GeneralSection({ settings, update, ui }: SectionProps) {
  return (
    <div className="space-y-5">
      <SettingsSection
        icon={Rocket}
        title="Startup & Window"
        description="Control how the launcher behaves when Minecraft starts."
      >
        {/* UI-only pending backend: launchOnStartup */}
        <SwitchRow
          label="Launch on system startup"
          description="Open the launcher automatically when you sign in to your computer."
          checked={ui.launchOnStartup}
          onCheckedChange={ui.setLaunchOnStartup}
        />
        <SwitchRow
          label="Keep launcher open after game starts"
          description="Keep the launcher window visible while Minecraft is running."
          checked={settings.keepLauncherOpen}
          onCheckedChange={(v) => update({ keepLauncherOpen: v })}
        />
        <SwitchRow
          label="Close launcher after game starts"
          description="Quit the launcher once Minecraft has launched."
          checked={settings.closeLauncherOnLaunch}
          onCheckedChange={(v) => update({ closeLauncherOnLaunch: v })}
        />
        {/* UI-only pending backend: minimizeToTray */}
        <SwitchRow
          label="Minimize to system tray"
          description="Hide the launcher in the tray instead of the taskbar when minimized."
          checked={ui.minimizeToTray}
          onCheckedChange={ui.setMinimizeToTray}
        />
      </SettingsSection>

      <SettingsSection
        icon={Languages}
        title="Region"
        description="Set the display language for the launcher interface."
      >
        <SettingRow label="Language" description="Requires a restart to fully apply.">
          <Select
            value={settings.language}
            onValueChange={(v) => update({ language: v })}
          >
            <SelectTrigger className="w-44 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((l) => (
                <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>
      </SettingsSection>

      <SettingsSection
        icon={Bell}
        title="Presence"
        description="Share what you're playing with friends."
      >
        <SwitchRow
          label="Enable Discord Rich Presence"
          description="Show your current modpack and play time on your Discord profile."
          checked={settings.enableDiscordRpc}
          onCheckedChange={(v) => update({ enableDiscordRpc: v })}
        />
      </SettingsSection>
    </div>
  );
}
