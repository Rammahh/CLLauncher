import { formatBytes } from "@/lib/utils";
import type { InstallProgress } from "@/types";

function formatEta(secs: number): string {
  if (secs < 60) return `${Math.ceil(secs)}s`;
  const m = Math.floor(secs / 60);
  const s = Math.ceil(secs % 60);
  return `${m}m ${s}s`;
}

interface InstallProgressBarProps {
  progress: InstallProgress;
  compact?: boolean;
}

export function InstallProgressBar({ progress, compact }: InstallProgressBarProps) {
  const { status } = progress;
  const isDownloading = status === "downloading";
  const isExtracting = status === "extracting";

  // Byte-based percent for downloads, file-based for extract/verify
  const bytePct =
    progress.totalBytes > 0
      ? Math.min(100, Math.round((progress.bytesDownloaded / progress.totalBytes) * 100))
      : 0;
  const filePct =
    progress.filesTotal > 0
      ? Math.round((progress.filesDone / progress.filesTotal) * 100)
      : 0;

  // Indeterminate when pending, or when streaming an archive with no Content-Length
  const indeterminate = status === "pending" || (isDownloading && progress.totalBytes === 0);
  const pct = isDownloading ? bytePct : filePct;

  const label =
    status === "pending"
      ? progress.currentFile || "Preparing…"
      : isExtracting
        ? "Extracting archive…"
        : status === "verifying"
          ? "Verifying files…"
          : isDownloading && progress.totalBytes === 0
            ? "Downloading archive…"
            : progress.currentFile || "Downloading…";

  const meta = indeterminate
    ? isDownloading && progress.bytesDownloaded > 0
      ? `${formatBytes(progress.bytesDownloaded)}${progress.speedBps > 0 ? ` · ${formatBytes(progress.speedBps)}/s` : ""}`
      : ""
    : `${pct}%${progress.speedBps > 0 ? ` · ${formatBytes(progress.speedBps)}/s` : ""}${progress.etaSecs > 1 ? ` · ${formatEta(progress.etaSecs)}` : ""}`;

  return (
    <div className="w-full space-y-1">
      <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
        <span className="truncate flex-1 min-w-0">{label}</span>
        {meta && <span className="shrink-0 tabular-nums">{meta}</span>}
      </div>

      <div className="h-1.5 w-full bg-launcher-bg-active rounded-full overflow-hidden">
        {indeterminate ? (
          <div className="h-full w-1/3 bg-launcher-green/60 rounded-full animate-indeterminate" />
        ) : (
          <div
            className="h-full bg-launcher-green rounded-full transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          />
        )}
      </div>

      {!compact && (isExtracting || status === "verifying") && progress.filesTotal > 0 && (
        <p className="text-[10px] text-muted-foreground/60 tabular-nums">
          {progress.filesDone.toLocaleString()} / {progress.filesTotal.toLocaleString()} files
        </p>
      )}
      {!compact && isDownloading && progress.totalBytes > 0 && (
        <p className="text-[10px] text-muted-foreground/60 tabular-nums">
          {formatBytes(progress.bytesDownloaded)} / {formatBytes(progress.totalBytes)}
        </p>
      )}
    </div>
  );
}
