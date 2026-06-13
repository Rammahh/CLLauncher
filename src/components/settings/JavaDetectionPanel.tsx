import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { invoke } from "@tauri-apps/api/core";
import { RefreshCw, Check, Coffee } from "lucide-react";
import type { JavaInstallation, LauncherSettings } from "@/types";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

interface JavaDetectionPanelProps {
  settings: LauncherSettings;
  onUpdate: (partial: Partial<LauncherSettings>) => void;
}

export function JavaDetectionPanel({ settings, onUpdate }: JavaDetectionPanelProps) {
  const [javaList, setJavaList] = useState<JavaInstallation[]>([]);
  const [scanning, setScanning] = useState(false);

  const scan = async () => {
    setScanning(true);
    try {
      const list = await invoke<JavaInstallation[]>("detect_java_installations");
      setJavaList(list);
      if (list.length === 0) {
        toast({ title: "No Java installations found", variant: "error" });
      }
    } catch (e) {
      toast({ title: "Java scan failed", description: String(e), variant: "error" });
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Auto-detect toggle */}
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">Auto-detect Java</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            Automatically find and select the best Java version for each modpack.
          </p>
        </div>
        <Switch
          checked={settings.autoDetectJava}
          onCheckedChange={(v) => onUpdate({ autoDetectJava: v })}
        />
      </div>

      {/* Manual path */}
      {!settings.autoDetectJava && (
        <div className="space-y-2 pt-1">
          <p className="text-sm font-medium text-foreground">Java executable path</p>
          <Input
            placeholder="C:\\Program Files\\Java\\bin\\javaw.exe"
            value={settings.javaPath}
            onChange={(e) => onUpdate({ javaPath: e.target.value })}
            className="font-mono text-xs"
          />
        </div>
      )}

      {/* Scan button + count */}
      <div className="flex items-center gap-3 pt-1">
        <Button variant="secondary" size="sm" onClick={scan} disabled={scanning}>
          <RefreshCw className={cn("w-4 h-4", scanning && "animate-spin")} />
          {scanning ? "Scanning…" : "Scan for Java"}
        </Button>
        {javaList.length > 0 && (
          <span className="text-xs text-muted-foreground">
            Found {javaList.length} installation{javaList.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Results */}
      {javaList.length > 0 && (
        <div className="space-y-2 pt-1">
          {javaList.map((java) => {
            const active = settings.javaPath === java.path;
            return (
              <div
                key={java.path}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border bg-launcher-bg-secondary/60 transition-colors",
                  active
                    ? "border-launcher-green/50 accent-ring"
                    : "border-launcher-border hover:bg-launcher-bg-hover"
                )}
              >
                <div className="shrink-0 w-9 h-9 rounded-lg bg-accent-soft flex items-center justify-center">
                  <Coffee className="w-4 h-4 text-launcher-green" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground">
                      Java {java.majorVersion}
                    </span>
                    <Badge variant="loader" className="text-[10px]">
                      {java.version}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{java.vendor}</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono truncate mt-0.5">
                    {java.path}
                  </p>
                </div>
                <Button
                  variant={active ? "ghost" : "secondary"}
                  size="sm"
                  disabled={active}
                  onClick={() => {
                    onUpdate({ javaPath: java.path, autoDetectJava: false });
                    toast({ title: `Java ${java.majorVersion} selected`, variant: "success" });
                  }}
                >
                  <Check className="w-3 h-3" />
                  {active ? "Selected" : "Use"}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
