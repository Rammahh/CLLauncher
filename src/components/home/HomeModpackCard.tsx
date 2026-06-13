import { useNavigate } from "react-router-dom";
import { Package2, Download, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LOADER_LABELS } from "@/types";
import type { ModpackSummary } from "@/types";

/**
 * Compact home-dashboard modpack card. Intentionally separate from the shared
 * `components/modpack/ModpackCard` so the Home surface can own its own styling.
 */
export function HomeModpackCard({
  pack,
  onInstall,
  installing,
  disabled,
}: {
  pack: ModpackSummary;
  onInstall: (pack: ModpackSummary) => void;
  installing?: boolean;
  disabled?: boolean;
}) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/modpacks/${pack.id}`)}
      className="group surface-card rounded-xl overflow-hidden cursor-pointer transition-all hover:-translate-y-0.5 hover:border-launcher-green/30 hover:shadow-glow-sm animate-fade-up"
    >
      {/* Banner / icon header */}
      <div className="relative h-24 bg-launcher-bg-active overflow-hidden">
        {pack.bannerUrl ? (
          <img
            src={pack.bannerUrl}
            alt=""
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="w-full h-full bg-accent-soft" />
        )}
        <div className="absolute inset-0 bg-hero-fade" />
        <div className="absolute bottom-2 left-2 w-10 h-10 rounded-lg bg-launcher-bg-card border border-launcher-border flex items-center justify-center overflow-hidden shadow-card">
          {pack.iconUrl ? (
            <img
              src={pack.iconUrl}
              alt={pack.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <Package2 className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
        {pack.featured && (
          <Badge variant="green" className="absolute top-2 right-2 text-[10px]">
            Featured
          </Badge>
        )}
      </div>

      {/* Body */}
      <div className="p-3 space-y-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-launcher-green transition-colors">
            {pack.name}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 min-h-[2rem]">
            {pack.description}
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="loader" className="text-[10px] px-1.5 py-0">
            {pack.mcVersion}
          </Badge>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {LOADER_LABELS[pack.loader] ?? pack.loader}
          </Badge>
        </div>

        <Button
          variant="install"
          size="sm"
          className="w-full"
          disabled={disabled || installing}
          onClick={(e) => {
            e.stopPropagation();
            onInstall(pack);
          }}
        >
          {installing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          {installing ? "Installing..." : "Install"}
        </Button>
      </div>
    </div>
  );
}
