import { MemoryStick, Coffee, Terminal, Monitor, FolderOpen, RefreshCw } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toaster";
import type { LauncherSettings } from "@/types";
import { SettingsSection, SettingRow, SwitchRow, SliderRow } from "./primitives";
import { JavaDetectionPanel } from "./JavaDetectionPanel";

interface SectionProps {
  settings: LauncherSettings;
  update: (partial: Partial<LauncherSettings>) => void;
}

function gb(mb: number) {
  return `${(mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1)} GB`;
}

export function MinecraftSection({ settings, update }: SectionProps) {
  // Best-effort native folder picker; falls back to manual input if unavailable.
  const pickGameDir = async () => {
    try {
      const dir = await invoke<string | null>("pick_directory");
      if (dir) update({ installDir: dir });
    } catch {
      toast({
        title: "Folder picker unavailable",
        description: "Type the path manually below.",
        variant: "error",
      });
    }
  };

  return (
    <div className="space-y-5">
      <SettingsSection
        icon={MemoryStick}
        title="Memory"
        description="Default RAM allocation for new modpack installs. Individual packs can override this."
      >
        <SliderRow
          label="Minimum RAM"
          value={settings.minRamMb}
          display={gb(settings.minRamMb)}
          min={256}
          max={8192}
          step={256}
          onValueChange={(v) => update({ minRamMb: Math.min(v, settings.maxRamMb) })}
        />
        <SliderRow
          label="Maximum RAM"
          value={settings.maxRamMb}
          display={gb(settings.maxRamMb)}
          min={1024}
          max={32768}
          step={512}
          onValueChange={(v) => update({ maxRamMb: Math.max(v, settings.minRamMb) })}
        />
      </SettingsSection>

      <SettingsSection
        icon={Coffee}
        title="Java Runtime"
        description="Select which Java installation runs Minecraft."
      >
        <JavaDetectionPanel settings={settings} onUpdate={update} />
      </SettingsSection>

      <SettingsSection
        icon={Monitor}
        title="Game Window"
        description="Default resolution for newly launched instances."
      >
        <SettingRow label="Default resolution" description="Window width × height on launch.">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={640}
              value={settings.defaultWidth}
              onChange={(e) => update({ defaultWidth: Number(e.target.value) })}
              className="w-24 h-9"
            />
            <span className="text-muted-foreground text-sm">×</span>
            <Input
              type="number"
              min={480}
              value={settings.defaultHeight}
              onChange={(e) => update({ defaultHeight: Number(e.target.value) })}
              className="w-24 h-9"
            />
          </div>
        </SettingRow>
        <SwitchRow
          label="Launch in fullscreen"
          description="Start Minecraft in fullscreen mode by default."
          checked={settings.fullscreen}
          onCheckedChange={(v) => update({ fullscreen: v })}
        />
      </SettingsSection>

      <SettingsSection
        icon={Terminal}
        title="JVM & Game Arguments"
        description="Advanced flags appended to every launch. Leave blank unless you know what you need."
      >
        <SettingRow label="Extra JVM arguments" align="start">
          <Textarea
            placeholder="-XX:+UseG1GC -XX:+UnlockExperimentalVMOptions"
            value={settings.extraJvmArgs}
            onChange={(e) => update({ extraJvmArgs: e.target.value })}
            className="w-72 min-h-[60px] font-mono text-xs"
          />
        </SettingRow>
        <SettingRow label="Extra game arguments" align="start">
          <Textarea
            placeholder="--demo"
            value={settings.extraGameArgs}
            onChange={(e) => update({ extraGameArgs: e.target.value })}
            className="w-72 min-h-[60px] font-mono text-xs"
          />
        </SettingRow>
      </SettingsSection>

      <SettingsSection
        icon={FolderOpen}
        title="Game Directory"
        description="Where modpack instances and game files are stored."
      >
        <SettingRow label="Install location" align="start">
          <div className="flex items-center gap-2">
            <Input
              placeholder="C:\\Users\\You\\AppData\\Roaming\\CLLauncher"
              value={settings.installDir}
              onChange={(e) => update({ installDir: e.target.value })}
              className="w-64 h-9 font-mono text-xs"
            />
            <Button variant="secondary" size="sm" onClick={pickGameDir}>
              <FolderOpen className="w-4 h-4" />
              Browse
            </Button>
          </div>
        </SettingRow>
      </SettingsSection>

      <SettingsSection
        icon={RefreshCw}
        title="Updates & Integrity"
        description="Keep modpacks current and verify files before each launch."
      >
        <SwitchRow
          label="Auto-update modpacks before launch"
          description="Check for and apply modpack updates automatically before starting."
          checked={settings.autoUpdateBeforeLaunch}
          onCheckedChange={(v) => update({ autoUpdateBeforeLaunch: v })}
        />
        <SwitchRow
          label="Verify files before launch"
          description="Re-check every file's hash before launching to catch corruption."
          checked={settings.checkHashesBeforeLaunch}
          onCheckedChange={(v) => update({ checkHashesBeforeLaunch: v })}
        />
      </SettingsSection>
    </div>
  );
}
