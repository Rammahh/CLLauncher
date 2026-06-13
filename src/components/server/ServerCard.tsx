import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Clock3,
  Copy,
  Download,
  Gamepad2,
  Play,
  Radio,
  Server as ServerIcon,
  Signal,
  Tag,
  Users,
} from "lucide-react";
import { api } from "@/api/endpoints";
import { queryKeys } from "@/api/queryKeys";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { ServerStatus } from "@/types";

type LiveState = "online" | "degraded" | "offline" | "unknown";

const STATUS_META: Record<
  LiveState,
  { label: string; badge: "green" | "orange" | "destructive" | "secondary"; dot: string }
> = {
  online: {
    label: "Online",
    badge: "green",
    dot: "bg-launcher-green shadow-[0_0_12px] shadow-launcher-green/70",
  },
  degraded: {
    label: "High ping",
    badge: "orange",
    dot: "bg-launcher-orange shadow-[0_0_12px] shadow-launcher-orange/70",
  },
  offline: {
    label: "Offline",
    badge: "destructive",
    dot: "bg-launcher-red",
  },
  unknown: {
    label: "Checking",
    badge: "secondary",
    dot: "bg-muted-foreground animate-pulse",
  },
};

export interface ServerCardProps {
  server: ServerStatus;
  hasLinkedInstance: boolean;
  onCopyIp: () => void;
  onLaunch?: () => void;
  apiOnline: boolean;
}

export function ServerCard({
  server,
  hasLinkedInstance,
  onCopyIp,
  onLaunch,
  apiOnline,
}: ServerCardProps) {
  const [iconFailed, setIconFailed] = useState(false);

  const {
    data: liveServer = server,
    isFetching,
    isError,
  } = useQuery({
    queryKey: queryKeys.serverStatus(server.id),
    queryFn: () => api.getServerStatus(server.id),
    initialData: server,
    refetchInterval: apiOnline ? 30_000 : false,
    retry: 1,
    staleTime: 20_000,
    enabled: apiOnline,
  });

  const live = getLiveState(liveServer, isError || !apiOnline);
  const meta = STATUS_META[live];
  const address = `${liveServer.ip}${liveServer.port ? `:${liveServer.port}` : ""}`;
  const playerCount = liveServer.playerCount ?? 0;
  const maxPlayers = liveServer.maxPlayers ?? 0;
  const playerRatio = maxPlayers > 0 ? Math.min(100, (playerCount / maxPlayers) * 100) : 0;
  const motdLines = splitMotd(liveServer.motd || liveServer.description || "");

  return (
    <article
      className={cn(
        "surface-card group relative overflow-hidden rounded-2xl border border-launcher-border",
        "transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-launcher-green/30 hover:shadow-elevated"
      )}
    >
      <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-launcher-green/5 blur-2xl" />
      <div className="relative p-4">
        <div className="flex items-start gap-4">
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-launcher-border bg-launcher-bg-active">
            {liveServer.iconUrl && !iconFailed ? (
              <img
                src={liveServer.iconUrl}
                alt={liveServer.name}
                className="h-full w-full object-cover"
                onError={() => setIconFailed(true)}
              />
            ) : (
              <ServerIcon className="h-7 w-7 text-muted-foreground" />
            )}
            <span
              className={cn(
                "absolute bottom-1.5 right-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-launcher-bg-active",
                meta.dot
              )}
              aria-hidden
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-base font-semibold text-foreground">
                {liveServer.name}
              </h3>
              <Badge variant={meta.badge} className="text-[10px]">
                {meta.label}
              </Badge>
              {isFetching && (
                <span className="text-[10px] font-medium text-muted-foreground">
                  updating
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={onCopyIp}
              className="mt-1 inline-flex max-w-full items-center gap-1.5 rounded-md text-xs text-muted-foreground transition-colors hover:text-foreground"
              title="Copy server address"
            >
              <code className="truncate font-mono">{address}</code>
              <Copy className="h-3 w-3 shrink-0 opacity-70" />
            </button>

            {motdLines.length > 0 && (
              <div className="mt-2 space-y-0.5">
                {motdLines.slice(0, 2).map((line, index) => (
                  <p
                    key={`${line}-${index}`}
                    className="line-clamp-1 text-xs text-muted-foreground/85"
                  >
                    {line}
                  </p>
                ))}
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={onCopyIp}
                  aria-label="Copy server address"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy server address</TooltipContent>
            </Tooltip>

            {onLaunch &&
              (hasLinkedInstance ? (
                <Button variant="install" size="sm" onClick={onLaunch}>
                  <Play className="h-4 w-4" />
                  Play
                </Button>
              ) : (
                <Button variant="secondary" size="sm" onClick={onLaunch}>
                  <Download className="h-4 w-4" />
                  Get pack
                </Button>
              ))}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <ServerStat
            icon={Users}
            label="Players"
            value={
              liveServer.maxPlayers != null
                ? `${playerCount}/${liveServer.maxPlayers}`
                : String(playerCount)
            }
            tone={liveServer.online ? "text-launcher-green" : undefined}
          />
          <ServerStat
            icon={Signal}
            label="Ping"
            value={liveServer.pingMs != null ? `${liveServer.pingMs} ms` : "—"}
            tone={
              liveServer.pingMs != null
                ? liveServer.pingMs > 500
                  ? "text-launcher-orange"
                  : "text-launcher-green"
                : undefined
            }
          />
          <ServerStat
            icon={Gamepad2}
            label="Version"
            value={liveServer.version || "Unknown"}
          />
          <ServerStat
            icon={Clock3}
            label="Checked"
            value={liveServer.lastChecked ? formatRelativeTime(liveServer.lastChecked) : "Live"}
          />
        </div>

        {maxPlayers > 0 && (
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-launcher-bg-active">
            <div
              className="h-full rounded-full bg-launcher-green transition-all duration-500"
              style={{ width: `${playerRatio}%` }}
            />
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-launcher-border/60 pt-3">
          {liveServer.linkedPackName || liveServer.linkedPackId ? (
            <Badge
              variant={hasLinkedInstance ? "installed" : "loader"}
              className="gap-1 text-[10px]"
            >
              <Tag className="h-3 w-3" />
              {liveServer.linkedPackName ?? liveServer.linkedPackId}
              {hasLinkedInstance ? " · installed" : ""}
            </Badge>
          ) : null}
          {liveServer.tags?.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="loader" className="text-[10px]">
              {tag}
            </Badge>
          ))}
          <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            <Radio className="h-3 w-3" />
            {liveServer.enabled === false ? "Disabled" : "Public launcher server"}
          </span>
        </div>
      </div>
    </article>
  );
}

function getLiveState(server: ServerStatus, unavailable: boolean): LiveState {
  if (unavailable) return "unknown";
  if (!server.online) return server.status === "offline" ? "offline" : "unknown";
  if (server.pingMs != null && server.pingMs > 500) return "degraded";
  return "online";
}

function splitMotd(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function ServerStat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border border-launcher-border/70 bg-launcher-bg-primary/35 p-3">
      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <p className={cn("truncate text-xs font-semibold text-foreground", tone)}>
        {value}
      </p>
    </div>
  );
}
