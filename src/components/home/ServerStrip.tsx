import { useQuery } from "@tanstack/react-query";
import { Server, Users } from "lucide-react";
import { api } from "@/api/endpoints";
import { queryKeys } from "@/api/queryKeys";
import { cn } from "@/lib/utils";
import type { ServerSummary } from "@/types";

export function ServerStrip({ servers }: { servers: ServerSummary[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {servers.map((server) => (
        <ServerStripCard key={server.id} server={server} />
      ))}
    </div>
  );
}

function ServerStripCard({ server }: { server: ServerSummary }) {
  const { data: status } = useQuery({
    queryKey: queryKeys.serverStatus(server.id),
    queryFn: () => api.getServerStatus(server.id),
    refetchInterval: 30_000,
    retry: 0,
    staleTime: 20_000,
  });

  const online = status?.online ?? null;

  return (
    <div className="surface-card rounded-xl p-3 flex items-center gap-3 transition-all hover:-translate-y-0.5 hover:border-launcher-green/30 animate-fade-up">
      <div className="w-9 h-9 rounded-lg bg-launcher-bg-active border border-launcher-border flex items-center justify-center overflow-hidden shrink-0">
        {server.iconUrl ? (
          <img
            src={server.iconUrl}
            alt={server.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <Server className="w-4 h-4 text-muted-foreground" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "w-2 h-2 rounded-full shrink-0",
              online === null
                ? "bg-muted-foreground animate-pulse"
                : online
                  ? "bg-launcher-green"
                  : "bg-launcher-red"
            )}
          />
          <h4 className="text-sm font-medium text-foreground truncate">
            {server.name}
          </h4>
        </div>
        <p className="text-[11px] text-muted-foreground font-mono truncate mt-0.5">
          {server.ip}
          {server.port ? `:${server.port}` : ""}
        </p>
      </div>

      {online && status?.playerCount !== undefined && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
          <Users className="w-3.5 h-3.5" />
          <span className="tabular-nums">
            {status.playerCount}
            {status.maxPlayers ? `/${status.maxPlayers}` : ""}
          </span>
        </div>
      )}
    </div>
  );
}
