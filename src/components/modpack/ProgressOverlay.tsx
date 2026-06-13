import { X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { formatBytes, formatSpeed, formatEta } from "@/lib/utils";
import type { InstallProgress } from "@/types";

interface ProgressOverlayProps {
  progress: InstallProgress;
  onCancel?: () => void;
}

export function ProgressOverlay({ progress, onCancel }: ProgressOverlayProps) {
  const percent =
    progress.filesTotal > 0
      ? Math.round((progress.filesDone / progress.filesTotal) * 100)
      : 0;

  const statusLabel: Record<string, string> = {
    downloading: "Downloading",
    verifying: "Verifying",
    complete: "Complete",
    error: "Error",
  };

  return (
    <div className="absolute inset-0 bg-launcher-bg-primary/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-lg p-6">
      <div className="w-full max-w-md space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">
            {statusLabel[progress.status] ?? progress.status}
          </span>
          {onCancel && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onCancel}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        <Progress value={percent} className="h-3" />

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {progress.filesDone} / {progress.filesTotal} files
          </span>
          <span className="font-mono">{percent}%</span>
        </div>

        {progress.currentFile && (
          <p className="text-xs text-muted-foreground truncate">
            {progress.currentFile}
          </p>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {formatBytes(progress.bytesDownloaded)} /{" "}
            {formatBytes(progress.totalBytes)}
          </span>
          <span>
            {progress.speedBps > 0 && formatSpeed(progress.speedBps)}
            {progress.etaSecs > 0 && ` · ETA ${formatEta(progress.etaSecs)}`}
          </span>
        </div>

        {progress.error && (
          <p className="text-xs text-launcher-red bg-launcher-red/10 rounded p-2">
            {progress.error}
          </p>
        )}
      </div>
    </div>
  );
}
