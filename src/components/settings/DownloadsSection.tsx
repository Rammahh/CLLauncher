import { useState } from "react";
import { Gauge, HardDrive, Trash2, RotateCw } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import type { LauncherSettings } from "@/types";
import { SettingsSection, SettingRow, SliderRow, SwitchRow } from "./primitives";

interface SectionProps {
  settings: LauncherSettings;
  update: (partial: Partial<LauncherSettings>) => void;
  // UI-only pending backend
  ui: {
    retryFailed: boolean;
    setRetryFailed: (v: boolean) => void;
  };
}

export function DownloadsSection({ settings, update, ui }: SectionProps) {
  const [clearing, setClearing] = useState(false);

  const clearCache = async () => {
    setClearing(true);
    try {
      await invoke("clear_cache");
      toast({ title: "Cache cleared", variant: "success" });
    } catch (e) {
      toast({ title: "Failed to clear cache", description: String(e), variant: "error" });
    } finally {
      setClearing(false);
    }
  };

  const speedDisplay =
    settings.downloadSpeedLimitKbps === 0
      ? "Unlimited"
      : `${(settings.downloadSpeedLimitKbps / 1024).toFixed(1)} MB/s`;

  return (
    <div className="space-y-5">
      <SettingsSection
        icon={Gauge}
        title="Performance"
        description="Tune how aggressively the launcher downloads files."
      >
        <SettingRow
          label="Max parallel downloads"
          description="More threads download faster but use more bandwidth."
        >
          <Select
            value={String(settings.downloadThreads)}
            onValueChange={(v) => update({ downloadThreads: Number(v) })}
          >
            <SelectTrigger className="w-24 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 4, 8, 16, 32].map((n) => (
                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>
        <SliderRow
          label="Download speed limit"
          description="Cap total download bandwidth. Set to the far left for unlimited."
          value={settings.downloadSpeedLimitKbps}
          display={speedDisplay}
          min={0}
          max={102400}
          step={1024}
          onValueChange={(v) => update({ downloadSpeedLimitKbps: v })}
        />
        {/* UI-only pending backend: retryFailed */}
        <SwitchRow
          label="Retry failed downloads automatically"
          description="Re-attempt downloads that fail due to network errors."
          checked={ui.retryFailed}
          onCheckedChange={ui.setRetryFailed}
        />
      </SettingsSection>

      <SettingsSection
        icon={HardDrive}
        title="Cache"
        description="Temporary files speed up repeat installs. Clearing is safe but slows the next download."
      >
        <SettingRow label="Cache location" align="start">
          <Input
            placeholder="System default"
            value={settings.cacheDir}
            onChange={(e) => update({ cacheDir: e.target.value })}
            className="w-64 h-9 font-mono text-xs"
          />
        </SettingRow>
        <SettingRow
          label="Clear download cache"
          description="Remove all cached download files to free up disk space."
        >
          <Button variant="secondary" size="sm" onClick={clearCache} disabled={clearing}>
            {clearing ? (
              <RotateCw className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            {clearing ? "Clearing…" : "Clear Cache"}
          </Button>
        </SettingRow>
      </SettingsSection>
    </div>
  );
}
