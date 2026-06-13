import { useNavigate } from "react-router-dom";
import {
  Play,
  Download,
  Settings2,
  Package2,
  Loader2,
  ArrowUpCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LOADER_LABELS } from "@/types";
import type { ModpackSummary, InstalledInstance } from "@/types";

interface HeroFeaturedProps {
  pack: ModpackSummary;
  /** Installed instance for this pack, if any. */
  instance?: InstalledInstance;
  /** In-flight install/update for this pack. */
  busy?: boolean;
  /** API offline — installs/updates disabled but Play still works. */
  offline?: boolean;
  onPlay: (instance: InstalledInstance) => void;
  onInstall: (pack: ModpackSummary) => void;
}

export function HeroFeatured({
  pack,
  instance,
  busy,
  offline,
  onPlay,
  onInstall,
}: HeroFeaturedProps) {
  const navigate = useNavigate();
  const installed = !!instance;
  const updateAvailable =
    installed &&
    instance!.latestVersion &&
    instance!.installedVersion &&
    instance!.latestVersion !== instance!.installedVersion;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-launcher-border shadow-elevated animate-scale-in">
      {/* Banner background */}
      <div className="absolute inset-0">
        {pack.bannerUrl ? (
          <img
            src={pack.bannerUrl}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="w-full h-full bg-accent-soft" />
        )}
        <div className="absolute inset-0 bg-hero-fade" />
        <div className="absolute inset-0 bg-gradient-to-r from-launcher-bg-primary/80 via-launcher-bg-primary/30 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative p-6 sm:p-8 min-h-[18rem] flex flex-col justify-end">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="green" className="text-[11px]">
            Featured
          </Badge>
          {pack.status === "beta" && (
            <Badge variant="orange" className="text-[11px]">
              Beta
            </Badge>
          )}
        </div>

        <div className="flex items-end gap-4">
          {/* Pack icon */}
          <div className="hidden sm:flex w-16 h-16 rounded-xl bg-launcher-bg-card border border-launcher-border items-center justify-center overflow-hidden shadow-card shrink-0">
            {pack.iconUrl ? (
              <img
                src={pack.iconUrl}
                alt={pack.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Package2 className="w-7 h-7 text-muted-foreground" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight drop-shadow-sm">
              {pack.name}
            </h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl line-clamp-2">
              {pack.description}
            </p>
          </div>
        </div>

        {/* Meta badges */}
        <div className="flex items-center gap-2 flex-wrap mt-4">
          <Badge variant="loader" className="text-[11px]">
            MC {pack.mcVersion}
          </Badge>
          <Badge variant="secondary" className="text-[11px]">
            {LOADER_LABELS[pack.loader] ?? pack.loader}
          </Badge>
          {installed ? (
            <>
              <Badge variant="installed" className="text-[11px]">
                Installed v{instance!.installedVersion || "?"}
              </Badge>
              {updateAvailable && (
                <Badge variant="update" className="text-[11px]">
                  Update → v{instance!.latestVersion}
                </Badge>
              )}
            </>
          ) : (
            pack.latestVersion && (
              <Badge variant="secondary" className="text-[11px]">
                Latest v{pack.latestVersion}
              </Badge>
            )
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-5">
          {installed ? (
            <Button
              variant="install"
              size="lg"
              className="shadow-glow"
              disabled={busy}
              onClick={() => onPlay(instance!)}
            >
              {busy ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Play className="w-5 h-5 fill-current" />
              )}
              {busy ? "Working..." : "Play"}
            </Button>
          ) : (
            <Button
              variant="install"
              size="lg"
              className="shadow-glow"
              disabled={busy || offline}
              onClick={() => onInstall(pack)}
              title={offline ? "Unavailable while offline" : undefined}
            >
              {busy ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Download className="w-5 h-5" />
              )}
              {busy ? "Installing..." : "Install"}
            </Button>
          )}

          {installed && updateAvailable && (
            <Button
              variant="update"
              size="lg"
              disabled={busy || offline}
              onClick={() => onInstall(pack)}
              title={offline ? "Unavailable while offline" : undefined}
            >
              <ArrowUpCircle className="w-5 h-5" />
              Update
            </Button>
          )}

          <Button
            variant="secondary"
            size="lg"
            onClick={() => navigate(`/modpacks/${pack.id}`)}
          >
            <Settings2 className="w-5 h-5" />
            Manage
          </Button>
        </div>
      </div>
    </section>
  );
}

export function HeroFeaturedSkeleton() {
  return (
    <div className="rounded-2xl border border-launcher-border overflow-hidden">
      <Skeleton className="h-[18rem] w-full" />
    </div>
  );
}
