import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useLaunchLogStore } from "@/store/launchLogStore";
import { useLogStore } from "@/store/logStore";
import { useInstanceStore } from "@/store/instanceStore";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toaster";
import { Loader2, Copy, Trash2, Skull } from "lucide-react";
import type { LogEntry } from "@/store/logStore";

function lineColor(entry: LogEntry): string {
  if (entry.source === "game:launcher") return "text-launcher-green";
  if (entry.level === "error") return "text-red-400";
  const msg = entry.message;
  if (msg.includes("/WARN") || msg.includes("[WARN")) return "text-yellow-400/90";
  if (msg.includes("/ERROR") || msg.includes("[ERROR")) return "text-red-400";
  return "text-foreground/75";
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function LaunchLogDialog() {
  const { open, instanceId, packName, exitCode, close } = useLaunchLogStore();
  const logs = useLogStore((s) =>
    instanceId ? s.gameLogs[instanceId] ?? [] : []
  );
  const clearGameLogs = useLogStore((s) => s.clearGameLogs);
  const status = useInstanceStore((s) =>
    instanceId ? s.instances[instanceId]?.status : undefined
  );

  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs.length, autoScroll, open]);

  const handleCopy = async () => {
    const text = logs
      .map((l) => `[${formatTime(l.timestamp)}] ${l.message}`)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Logs copied to clipboard", variant: "success" });
    } catch {
      toast({ title: "Could not copy logs", variant: "error" });
    }
  };

  const handleKill = async () => {
    if (!instanceId) return;
    try {
      await invoke("kill_minecraft", { instanceId });
      toast({ title: "Minecraft process terminated" });
    } catch (e: any) {
      const msg = typeof e === "string" ? e : e?.message ?? String(e);
      toast({ title: "Could not kill process", description: msg, variant: "error" });
    }
  };

  const isLaunching = status === "launching";
  const isRunning = status === "running";
  const hasExited = exitCode !== null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent className="max-w-3xl h-[560px] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-5 py-3.5 border-b border-launcher-border shrink-0 space-y-0">
          <div className="flex items-center gap-3 pr-8">
            <DialogTitle className="text-base font-semibold truncate">
              {packName || "Minecraft"}
            </DialogTitle>

            {isLaunching && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-launcher-green">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Launching…
              </span>
            )}
            {isRunning && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-launcher-green">
                <span className="w-2 h-2 rounded-full bg-launcher-green animate-pulse" />
                Running
              </span>
            )}
            {!isLaunching && !isRunning && hasExited && (
              <span
                className={cn(
                  "text-xs font-medium",
                  exitCode === 0 ? "text-muted-foreground" : "text-red-400"
                )}
              >
                {exitCode === 0 ? "Exited" : `Crashed (exit code ${exitCode})`}
              </span>
            )}
            {!isLaunching && !isRunning && !hasExited && (
              <span className="text-xs font-medium text-muted-foreground">Stopped</span>
            )}
          </div>
        </DialogHeader>

        {/* Log output */}
        <div
          ref={scrollRef}
          onWheel={(e) => {
            if (e.deltaY < 0) setAutoScroll(false);
          }}
          className="flex-1 overflow-y-auto bg-black/40 px-4 py-3 font-mono text-[11.5px] leading-[1.65]"
        >
          {logs.length === 0 ? (
            <p className="text-muted-foreground/50 italic">Waiting for output…</p>
          ) : (
            logs.map((entry) => (
              <div key={entry.id} className="flex gap-2.5 hover:bg-white/[0.03] rounded px-1 -mx-1">
                <span className="text-muted-foreground/40 shrink-0 select-none">
                  {formatTime(entry.timestamp)}
                </span>
                <span className={cn("break-all whitespace-pre-wrap", lineColor(entry))}>
                  {entry.message}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Footer controls */}
        <div className="flex items-center gap-3 px-4 py-3 border-t border-launcher-border shrink-0 bg-launcher-bg-secondary">
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <Switch checked={autoScroll} onCheckedChange={setAutoScroll} />
            Auto-scroll
          </label>

          <div className="flex-1" />

          <Button variant="ghost" size="sm" onClick={handleCopy} className="text-muted-foreground">
            <Copy className="w-3.5 h-3.5 mr-1.5" />
            Copy
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => instanceId && clearGameLogs(instanceId)}
            className="text-muted-foreground"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            Clear
          </Button>
          {(isRunning || isLaunching) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleKill}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              <Skull className="w-3.5 h-3.5 mr-1.5" />
              Kill process
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={close}>
            {isRunning ? "Hide" : "Close"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
