import { Play, Package2, Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/utils";
import { LOADER_LABELS } from "@/types";
import type { InstalledInstance } from "@/types";

export function ContinuePlaying({
  instance,
  busy,
  onPlay,
}: {
  instance: InstalledInstance;
  busy?: boolean;
  onPlay: (instance: InstalledInstance) => void;
}) {
  return (
    <div className="surface-card rounded-2xl p-4 sm:p-5 flex items-center gap-4 transition-all hover:-translate-y-0.5 hover:border-launcher-green/30 animate-fade-up">
      {/* Icon */}
      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-launcher-bg-active border border-launcher-border flex items-center justify-center overflow-hidden shrink-0">
        {instance.iconUrl ? (
          <img
            src={instance.iconUrl}
            alt={instance.packName}
            className="w-full h-full object-cover"
          />
        ) : (
          <Package2 className="w-7 h-7 text-muted-foreground" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-launcher-green uppercase tracking-wider">
          Jump back in
        </p>
        <h3 className="text-base font-semibold text-foreground truncate">
          {instance.packName}
        </h3>
        <div className="flex items-center gap-2 flex-wrap mt-1.5">
          <Badge variant="loader" className="text-[10px] px-1.5 py-0">
            MC {instance.mcVersion}
          </Badge>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {LOADER_LABELS[instance.loader] ?? instance.loader}
          </Badge>
          {instance.lastPlayed && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="w-3 h-3" />
              {formatRelativeTime(instance.lastPlayed)}
            </span>
          )}
        </div>
      </div>

      {/* Play */}
      <Button
        variant="install"
        size="lg"
        className="shrink-0 shadow-glow-sm"
        disabled={busy}
        onClick={() => onPlay(instance)}
      >
        {busy ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Play className="w-5 h-5 fill-current" />
        )}
        {busy ? "Working..." : "Play"}
      </Button>
    </div>
  );
}
