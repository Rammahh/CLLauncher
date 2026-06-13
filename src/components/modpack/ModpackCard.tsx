import { Package2, MoreVertical, HardDrive, Clock, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { ActionButton } from "./ActionButton";
import { InstallProgressBar } from "./InstallProgressBar";
import { cn, formatBytes, formatRelativeTime } from "@/lib/utils";
import { LOADER_LABELS, LOADER_COLORS } from "@/types";
import type { ModpackSummary, InstalledInstance } from "@/types";
import { useApiStatusStore } from "@/store/apiStatusStore";
import { useInstanceStore } from "@/store/instanceStore";

interface ModpackCardProps {
  pack: ModpackSummary;
  onInstall?: (pack: ModpackSummary) => void;
  onPlay?: (instance: InstalledInstance) => void;
  onUpdate?: (instance: InstalledInstance) => void;
}

export function ModpackCard({ pack, onInstall, onPlay, onUpdate }: ModpackCardProps) {
  const isOnline = useApiStatusStore((s) => s.isOnline);
  const instances = useInstanceStore((s) => s.instances);
  const installProgress = useInstanceStore((s) => s.installProgress);

  const instance = Object.values(instances).find((i) => i.packId === pack.id);
  const progress = instance ? installProgress[instance.id] : undefined;
  const hasUpdate = instance && pack.latestVersion !== instance.installedVersion;

  const status = instance
    ? hasUpdate
      ? "update-available"
      : (instance.status === "idle" ? "idle" : instance.status)
    : "not-installed";

  const isInstalling =
    progress &&
    (progress.status === "pending" ||
      progress.status === "downloading" ||
      progress.status === "extracting" ||
      progress.status === "verifying");

  const loaderColor = LOADER_COLORS[pack.loader];
  const updatedAt = pack.updatedAt;

  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-2xl surface-card overflow-hidden",
        "transition-all duration-200 animate-fade-up",
        "hover:-translate-y-0.5 hover:border-launcher-green/30 hover:shadow-elevated"
      )}
    >
      {/* Banner */}
      <Link to={`/modpacks/${pack.id}`} className="block relative">
        <div className="relative h-32 bg-launcher-bg-secondary overflow-hidden">
          {pack.bannerUrl ? (
            <img
              src={pack.bannerUrl}
              alt={pack.name}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-launcher-bg-active to-launcher-bg-secondary">
              <Package2 className="w-10 h-10 text-launcher-border" />
            </div>
          )}
          {/* Fade so badges/icon stay legible */}
          <div className="absolute inset-0 bg-hero-fade pointer-events-none" />

          {/* Top badges */}
          <div className="absolute top-2.5 right-2.5 flex gap-1.5">
            {pack.featured && (
              <Badge variant="orange" className="text-[10px] shadow-card backdrop-blur">
                Featured
              </Badge>
            )}
            {instance && !hasUpdate && (
              <Badge variant="installed" className="text-[10px] shadow-card backdrop-blur">
                Installed
              </Badge>
            )}
            {hasUpdate && (
              <Badge variant="update" className="text-[10px] shadow-card backdrop-blur">
                Update
              </Badge>
            )}
          </div>
        </div>

        {/* Floating icon */}
        <div className="absolute -bottom-5 left-3.5 w-14 h-14 rounded-xl overflow-hidden border border-launcher-border bg-launcher-bg-card shadow-elevated">
          {pack.iconUrl ? (
            <img
              src={pack.iconUrl}
              alt={pack.name}
              loading="lazy"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-launcher-bg-active">
              <Package2 className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
        </div>
      </Link>

      {/* Kebab → detail page (no dropdown primitive available) */}
      <Link
        to={`/modpacks/${pack.id}`}
        title="More options"
        aria-label="More options"
        className="absolute top-2 left-2 z-10 flex h-7 w-7 items-center justify-center rounded-lg bg-black/30 text-white/80 opacity-0 backdrop-blur transition-opacity hover:bg-black/50 hover:text-white group-hover:opacity-100"
      >
        <MoreVertical className="w-4 h-4" />
      </Link>

      {/* Info */}
      <div className="flex flex-1 flex-col p-3.5 pt-7 gap-2">
        <Link to={`/modpacks/${pack.id}`} className="min-w-0">
          <h3 className="font-semibold text-sm text-foreground truncate transition-colors group-hover:text-launcher-green">
            {pack.name}
          </h3>
        </Link>

        <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2rem] leading-relaxed">
          {pack.description}
        </p>

        {/* Meta badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="loader" className="text-[10px]">
            {pack.mcVersion}
          </Badge>
          <Badge
            variant="loader"
            className="text-[10px] gap-1"
            style={{ color: loaderColor }}
          >
            <span
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: loaderColor }}
            />
            {LOADER_LABELS[pack.loader]}
          </Badge>
          {instance?.diskSizeBytes ? (
            <Badge variant="loader" className="text-[10px] gap-1">
              <HardDrive className="w-3 h-3" />
              {formatBytes(instance.diskSizeBytes)}
            </Badge>
          ) : null}
        </div>

        {/* Sub-meta */}
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground/70">
          {updatedAt && (
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatRelativeTime(updatedAt)}
            </span>
          )}
          {typeof pack.playerCount === "number" && pack.playerCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <Users className="w-3 h-3" />
              {pack.playerCount.toLocaleString()}
            </span>
          )}
        </div>

        {/* Action / progress */}
        <div className="mt-auto pt-1">
          {isInstalling ? (
            <InstallProgressBar progress={progress!} compact />
          ) : (
            <ActionButton
              status={status as any}
              isApiOnline={isOnline}
              size="sm"
              className="w-full"
              onInstall={() => onInstall?.(pack)}
              onPlay={() => instance && onPlay?.(instance)}
              onUpdate={() => instance && onUpdate?.(instance)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
