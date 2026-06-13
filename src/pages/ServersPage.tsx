import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  RefreshCw,
  Search,
  Server,
  ServerOff,
  Signal,
  Users,
} from "lucide-react";
import { api } from "@/api/endpoints";
import { queryKeys } from "@/api/queryKeys";
import { ServerCard } from "@/components/server/ServerCard";
import { StateMessage } from "@/components/states";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useLaunchMinecraft } from "@/hooks/useLaunchMinecraft";
import { useApiStatusStore } from "@/store/apiStatusStore";
import { useInstanceStore } from "@/store/instanceStore";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { ServerStatus } from "@/types";

type StatusFilter = "all" | "online" | "offline" | "installed" | "needs-pack";

const FILTERS: Array<{ id: StatusFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "online", label: "Online" },
  { id: "offline", label: "Offline" },
  { id: "installed", label: "Ready" },
  { id: "needs-pack", label: "Needs pack" },
];

export function ServersPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const isOnline = useApiStatusStore((state) => state.isOnline);
  const instances = useInstanceStore((state) => Object.values(state.instances));
  const { launch } = useLaunchMinecraft();
  const navigate = useNavigate();

  const {
    data: servers,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
    dataUpdatedAt,
  } = useQuery({
    queryKey: queryKeys.servers,
    queryFn: api.getServers,
    retry: 1,
    staleTime: 15_000,
    refetchInterval: isOnline ? 30_000 : false,
  });

  const { data: modpacks } = useQuery({
    queryKey: queryKeys.modpacks,
    queryFn: api.getModpacks,
    staleTime: 5 * 60_000,
    enabled: isOnline,
  });

  const instanceByPackId = useMemo(() => {
    const map = new Map<string, (typeof instances)[number]>();
    for (const instance of instances) map.set(instance.packId, instance);
    return map;
  }, [instances]);

  const packById = useMemo(() => {
    const map = new Map<string, NonNullable<typeof modpacks>[number]>();
    for (const pack of modpacks ?? []) map.set(pack.id, pack);
    return map;
  }, [modpacks]);

  const enrichedServers = useMemo<ServerStatus[]>(() => {
    return (servers ?? []).map((server) => {
      const pack = server.linkedPackId ? packById.get(server.linkedPackId) : undefined;
      return {
        ...server,
        linkedPackName: server.linkedPackName ?? pack?.name,
        iconUrl: server.iconUrl ?? pack?.iconUrl ?? null,
        tags: unique([...(server.tags ?? []), ...(pack?.categories ?? []).slice(0, 2)]),
      };
    });
  }, [packById, servers]);

  const filteredServers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return enrichedServers
      .filter((server) => {
        const hasLinkedInstance =
          !!server.linkedPackId && instanceByPackId.has(server.linkedPackId);

        if (statusFilter === "online" && !server.online) return false;
        if (statusFilter === "offline" && server.online) return false;
        if (statusFilter === "installed" && !hasLinkedInstance) return false;
        if (statusFilter === "needs-pack" && (!server.linkedPackId || hasLinkedInstance)) {
          return false;
        }

        if (!query) return true;
        return [
          server.name,
          server.ip,
          server.description,
          server.motd,
          server.version,
          server.linkedPackName,
          server.linkedPackId,
          ...(server.tags ?? []),
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      })
      .sort((a, b) => {
        if (a.online !== b.online) return a.online ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }, [enrichedServers, instanceByPackId, search, statusFilter]);

  const stats = useMemo(() => {
    const onlineServers = enrichedServers.filter((server) => server.online);
    const pingValues = onlineServers
      .map((server) => server.pingMs)
      .filter((value): value is number => typeof value === "number");

    return {
      total: enrichedServers.length,
      online: onlineServers.length,
      players: onlineServers.reduce((sum, server) => sum + (server.playerCount ?? 0), 0),
      avgPing:
        pingValues.length > 0
          ? Math.round(pingValues.reduce((sum, value) => sum + value, 0) / pingValues.length)
          : null,
    };
  }, [enrichedServers]);

  const copyIp = async (ip: string, port?: number) => {
    const full = port ? `${ip}:${port}` : ip;
    try {
      await navigator.clipboard.writeText(full);
      toast({ title: "Server address copied", description: full, variant: "success" });
    } catch {
      toast({ title: "Could not copy server address", description: full, variant: "error" });
    }
  };

  const launchForServer = (linkedPackId: string) => {
    const instance = instanceByPackId.get(linkedPackId);
    if (instance) {
      launch(instance);
    } else {
      navigate(`/modpacks/${linkedPackId}`);
    }
  };

  const hasServers = enrichedServers.length > 0;
  const updatedLabel = dataUpdatedAt
    ? `Updated ${formatRelativeTime(new Date(dataUpdatedAt).toISOString())}`
    : "Waiting for first update";

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-full flex-col">
        <div className="shrink-0 border-b border-launcher-border px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-launcher-green/20 bg-launcher-green/10 text-launcher-green shadow-glow-sm">
                <Server className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-semibold leading-tight">Servers</h1>
                <p className="text-xs text-muted-foreground">
                  Live CraftersLand servers, player counts, ping, and linked modpacks.
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="mx-auto w-full max-w-7xl space-y-5 p-6">
            {!isOnline && (
              <StateMessage
                state="apiOffline"
                action={
                  <Button variant="secondary" size="sm" onClick={() => refetch()}>
                    <RefreshCw className="h-3.5 w-3.5" />
                    Retry
                  </Button>
                }
              />
            )}

            <section className="surface-card rounded-2xl p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <CompactStat icon={Activity} value={`${stats.online}/${stats.total} online`} />
                  <CompactStat icon={Users} value={`${stats.players} players`} />
                  <CompactStat
                    icon={Signal}
                    value={stats.avgPing == null ? "— avg ping" : `${stats.avgPing} ms avg ping`}
                  />
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
                  {isFetching ? "Refreshing" : updatedLabel}
                </span>
              </div>

              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search server, address, MOTD, version, or linked pack..."
                    className="pl-9"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {FILTERS.map((filter) => (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => setStatusFilter(filter.id)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                        statusFilter === filter.id
                          ? "border-launcher-green/40 bg-launcher-green/15 text-launcher-green"
                          : "border-launcher-border bg-launcher-bg-card text-muted-foreground hover:bg-launcher-bg-hover hover:text-foreground"
                      )}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {isLoading && <ServersLoading />}

            {!isLoading && isError && !hasServers && (
              <EmptyState
                icon={ServerOff}
                title="Servers unavailable"
                description={
                  (error as Error | undefined)?.message ||
                  "The launcher could not load the server list."
                }
                action={
                  <Button variant="secondary" onClick={() => refetch()}>
                    <RefreshCw className="h-4 w-4" />
                    Try again
                  </Button>
                }
              />
            )}

            {!isLoading && hasServers && (
              <section className="space-y-3">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      Available Servers
                    </h2>
                    <p className="mt-0.5 text-xs text-muted-foreground/70">
                      Showing {filteredServers.length} of {enrichedServers.length}
                    </p>
                  </div>
                  {isFetching && (
                    <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Updating
                    </span>
                  )}
                </div>

                {filteredServers.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    {filteredServers.map((server) => (
                      <ServerCard
                        key={server.id}
                        server={server}
                        apiOnline={isOnline}
                        hasLinkedInstance={
                          !!server.linkedPackId && instanceByPackId.has(server.linkedPackId)
                        }
                        onCopyIp={() => copyIp(server.ip, server.port)}
                        onLaunch={
                          server.linkedPackId
                            ? () => launchForServer(server.linkedPackId!)
                            : undefined
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={Search}
                    title="No matching servers"
                    description="Adjust the search or filter to show more servers."
                  />
                )}
              </section>
            )}

            {!isLoading && !hasServers && !isError && (
              <EmptyState
                icon={ServerOff}
                title="No servers available"
                description="There are no enabled launcher servers to show right now."
                action={
                  <Button variant="secondary" onClick={() => refetch()}>
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </Button>
                }
              />
            )}
          </div>
        </ScrollArea>
      </div>
    </TooltipProvider>
  );
}

function CompactStat({
  icon: Icon,
  value,
}: {
  icon: typeof Activity;
  value: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-launcher-border bg-launcher-bg-primary/45 px-2.5 py-1 text-muted-foreground">
      <Icon className="h-3.5 w-3.5 text-launcher-green" />
      {value}
    </span>
  );
}

function ServersLoading() {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="surface-card rounded-2xl p-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-2xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-2/3" />
            </div>
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((_, statIndex) => (
              <Skeleton key={statIndex} className="h-14 rounded-xl" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
