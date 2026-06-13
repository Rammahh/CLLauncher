import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Globe, Bug, ScrollText, FileDown, ShieldAlert, RotateCcw } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";
import type { LauncherSettings } from "@/types";
import { SettingsSection, SettingRow, SwitchRow } from "./primitives";

interface SectionProps {
  settings: LauncherSettings;
  update: (partial: Partial<LauncherSettings>) => void;
  onResetAll: () => void;
}

export function AdvancedSection({ settings, update, onResetAll }: SectionProps) {
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const exportDiagnostics = async () => {
    try {
      await invoke("export_diagnostics");
      toast({ title: "Diagnostics exported", variant: "success" });
    } catch (e) {
      toast({ title: "Export failed", description: String(e), variant: "error" });
    }
  };

  const confirmReset = () => {
    onResetAll();
    setConfirmOpen(false);
    toast({ title: "Launcher data reset", variant: "success" });
  };

  return (
    <div className="space-y-5">
      <SettingsSection
        icon={Globe}
        title="Connection"
        description="Override the backend API the launcher talks to. Only change if instructed by staff."
      >
        <SettingRow label="API endpoint" align="start">
          <Input
            value={settings.apiBaseUrl}
            onChange={(e) => update({ apiBaseUrl: e.target.value })}
            className="w-72 h-9 font-mono text-xs"
            placeholder="https://apiv1.clbackend.net"
          />
        </SettingRow>
      </SettingsSection>

      <SettingsSection
        icon={Bug}
        title="Diagnostics"
        description="Tools for troubleshooting issues and sharing logs with support."
      >
        <SwitchRow
          label="Debug mode"
          description="Show verbose logging across the launcher and game output."
          checked={settings.enableDebugLogs}
          onCheckedChange={(v) => update({ enableDebugLogs: v })}
        />
        <SwitchRow
          label="Experimental features"
          description="Enable unstable, in-development features. May cause issues."
          checked={settings.experimentalFeatures}
          onCheckedChange={(v) => update({ experimentalFeatures: v })}
        />
        <SettingRow
          label="View logs"
          description="Open the live log viewer for the launcher and running games."
        >
          <Button variant="secondary" size="sm" onClick={() => navigate("/logs")}>
            <ScrollText className="w-4 h-4" />
            Open Logs
          </Button>
        </SettingRow>
        <SettingRow
          label="Export diagnostics"
          description="Bundle logs and system info into a file you can send to support."
        >
          <Button variant="secondary" size="sm" onClick={exportDiagnostics}>
            <FileDown className="w-4 h-4" />
            Export
          </Button>
        </SettingRow>
      </SettingsSection>

      {/* Danger Zone */}
      <section className="rounded-2xl overflow-hidden border border-launcher-red/40 bg-launcher-red/[0.04] animate-fade-up">
        <div className="flex items-start gap-3 px-5 pt-5 pb-4">
          <div className="mt-0.5 shrink-0 w-9 h-9 rounded-xl bg-launcher-red/15 flex items-center justify-center">
            <ShieldAlert className="w-[18px] h-[18px] text-launcher-red" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-launcher-red leading-tight">Danger Zone</h2>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Irreversible actions. Proceed with caution.
            </p>
          </div>
        </div>
        <div className="px-5 pb-5">
          <div className="flex items-center justify-between gap-4 pt-1">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">Reset launcher data</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Restore all settings to their defaults. Installed modpacks are not removed.
              </p>
            </div>
            <Button variant="danger" size="sm" onClick={() => setConfirmOpen(true)}>
              <RotateCcw className="w-4 h-4" />
              Reset
            </Button>
          </div>
        </div>
      </section>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-launcher-red" />
              Reset launcher data?
            </DialogTitle>
            <DialogDescription>
              This restores every setting to its default value. This cannot be undone.
              Your installed modpacks and accounts will remain untouched.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={confirmReset}>
              <RotateCcw className="w-4 h-4" />
              Reset everything
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
