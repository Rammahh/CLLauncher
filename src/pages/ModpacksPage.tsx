import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/endpoints";
import { queryKeys } from "@/api/queryKeys";
import { ModpackCard } from "@/components/modpack/ModpackCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Search, X, WifiOff, RefreshCw, SlidersHorizontal, PackageOpen,
  Sparkles, LayoutGrid,
} from "lucide-react";
import type { LoaderType } from "@/types";
import { LOADER_LABELS } from "@/types";
import { useInstanceStore } from "@/store/instanceStore";
import { useApiStatusStore } from "@/store/apiStatusStore";
import { useInstallModpack } from "@/hooks/useInstallModpack";
import { useLaunchMinecraft } from "@/hooks/useLaunchMinecraft";
import { cn } from "@/lib/utils";

const ALL = "all";

type SortKey = "popularity" | "updated" | "az" | "last-played";
type StatusFilter = "all" | "installed" | "not-installed" | "updates";

const SORT_LABELS: Record<SortKey, string> = {
  popularity: "Popularity",
  updated: "Recently updated",
  az: "Name (A–Z)",
  "last-played": "Last played",
};

export function ModpacksPage() {
  const isOnline = useApiStatusStore((s) => s.isOnline);
  const instances = useInstanceStore((s) => s.instances);

  const {
    data: packs,
    isLoading,
    error,
    refetch,
    isFetching,
    dataUpdatedAt,
  } = useQuery({
    queryKey: queryKeys.modpacks,
    queryFn: api.getModpacks,
    retry: 1,
    staleTime: 25_000,
    refetchInterval: isOnline ? 30_000 : false,
    refetchOnWindowFocus: true,
  });

  // ?q= URL search param (TopBar routes searches here)
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";

  const [search, setSearch] = useState(urlQuery);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [filterMc, setFilterMc] = useState(ALL);
  const [filterLoader, setFilterLoader] = useState(ALL);
  const [filterCategory, setFilterCategory] = useState(ALL);
  const [sort, setSort] = useState<SortKey>("popularity");

  // Keep the search field in sync when the URL ?q= changes (e.g. TopBar search)
  useEffect(() => {
    setSearch(urlQuery);
  }, [urlQuery]);

  const updateSearch = (value: string) => {
    setSearch(value);
    const next = new URLSearchParams(searchParams);
    if (value) next.set("q", value);
    else next.delete("q");
    setSearchParams(next, { replace: true });
  };

  const { install } = useInstallModpack();
  const { launch } = useLaunchMinecraft();

  // Per-pack installed-instance lookup
  const instanceByPack = useMemo(() => {
    const map: Record<string, (typeof instances)[string]> = {};
    for (const inst of Object.values(instances)) map[inst.packId] = inst;
    return map;
  }, [instances]);

  const mcVersions = useMemo(() => {
    if (!packs) return [];
    return [...new Set(packs.map((p) => p.mcVersion))].sort((a, b) =>
      b.localeCompare(a, undefined, { numeric: true })
    );
  }, [packs]);

  const loaders = useMemo(() => {
    if (!packs) return [];
    return [...new Set(packs.map((p) => p.loader))];
  }, [packs]);

  const categories = useMemo(() => {
    if (!packs) return [];
    return [...new Set(packs.flatMap((p) => p.categories ?? []))];
  }, [packs]);

  const filtered = useMemo(() => {
    if (!packs) return [];
    const result = packs.filter((p) => {
      if (
        search &&
        !p.name.toLowerCase().includes(search.toLowerCase()) &&
        !p.description.toLowerCase().includes(search.toLowerCase())
      )
        return false;
      if (filterMc !== ALL && p.mcVersion !== filterMc) return false;
      if (filterLoader !== ALL && p.loader !== filterLoader) return false;
      if (filterCategory !== ALL && !p.categories?.includes(filterCategory))
        return false;

      const inst = instanceByPack[p.id];
      const hasUpdate = inst && p.latestVersion !== inst.installedVersion;
      if (statusFilter === "installed" && !inst) return false;
      if (statusFilter === "not-installed" && inst) return false;
      if (statusFilter === "updates" && !hasUpdate) return false;

      return true;
    });

    const sorted = [...result];
    switch (sort) {
      case "az":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "updated":
        sorted.sort(
          (a, b) =>
            new Date(b.updatedAt ?? 0).getTime() -
            new Date(a.updatedAt ?? 0).getTime()
        );
        break;
      case "last-played":
        sorted.sort((a, b) => {
          const at = instanceByPack[a.id]?.lastPlayed;
          const bt = instanceByPack[b.id]?.lastPlayed;
          return new Date(bt ?? 0).getTime() - new Date(at ?? 0).getTime();
        });
        break;
      case "popularity":
      default:
        sorted.sort(
          (a, b) => (b.playerCount ?? 0) - (a.playerCount ?? 0)
        );
        break;
    }
    return sorted;
  }, [
    packs, search, filterMc, filterLoader, filterCategory,
    statusFilter, sort, instanceByPack,
  ]);

  const featured = filtered.filter((p) => p.featured);
  const rest = filtered.filter((p) => !p.featured);

  const clearFilters = () => {
    updateSearch("");
    setStatusFilter("all");
    setFilterMc(ALL);
    setFilterLoader(ALL);
    setFilterCategory(ALL);
    setSort("popularity");
  };

  const hasFilters =
    !!search ||
    statusFilter !== "all" ||
    filterMc !== ALL ||
    filterLoader !== ALL ||
    filterCategory !== ALL;

  const installedCount = Object.keys(instanceByPack).length;
  const updatesCount = useMemo(() => {
    if (!packs) return 0;
    return packs.reduce((n, p) => {
      const inst = instanceByPack[p.id];
      return n + (inst && p.latestVersion !== inst.installedVersion ? 1 : 0);
    }, 0);
  }, [packs, instanceByPack]);

  // Tick every 10s so the "updated Xs ago" label stays current
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 10_000);
    return () => clearInterval(id);
  }, []);

  const lastUpdatedLabel = (() => {
    if (!dataUpdatedAt) return "";
    const secs = Math.floor((Date.now() - dataUpdatedAt) / 1000);
    if (secs < 10) return "Updated just now";
    if (secs < 60) return `Updated ${secs}s ago`;
    const mins = Math.floor(secs / 60);
    return `Updated ${mins}m ago`;
  })();

  const gridClass =
    "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 border-b border-launcher-border bg-launcher-bg-secondary/40">
        <div className="flex items-center gap-3 px-6 pt-4 pb-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft">
              <LayoutGrid className="w-5 h-5 text-launcher-green" />
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-tight">Modpacks</h1>
              <p className="text-[11px] text-muted-foreground/70 leading-tight">
                {packs ? `${packs.length} available` : "Browse & install"}
                {installedCount > 0 && ` · ${installedCount} installed`}
              </p>
            </div>
          </div>

          {!isOnline && (
            <Badge variant="offline" className="gap-1">
              <WifiOff className="w-3 h-3" />
              Offline
            </Badge>
          )}

          <div className="flex-1" />

          {/* Search */}
          <div className="relative w-64 max-w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search modpacks..."
              value={search}
              onChange={(e) => updateSearch(e.target.value)}
              className="pl-9 h-9 rounded-lg"
            />
            {search && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => updateSearch("")}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>

          {/* Refresh */}
          <div className="flex items-center gap-2">
            {!isLoading && lastUpdatedLabel && (
              <span className="text-[11px] text-muted-foreground/60 tabular-nums hidden xl:inline">
                {lastUpdatedLabel}
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refetch()}
              disabled={isFetching}
              title="Refresh modpacks"
              className="text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className={cn("w-4 h-4", isFetching && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* Filter / sort bar */}
        <div className="flex items-center gap-2 px-6 pb-3 flex-wrap">
          {/* Status segmented toggle */}
          <div className="flex items-center gap-1 rounded-lg border border-launcher-border bg-launcher-bg-card p-0.5">
            <SegBtn
              active={statusFilter === "all"}
              onClick={() => setStatusFilter("all")}
            >
              All
            </SegBtn>
            <SegBtn
              active={statusFilter === "installed"}
              onClick={() => setStatusFilter("installed")}
            >
              Installed
              {installedCount > 0 && (
                <span className="ml-1 tabular-nums opacity-70">{installedCount}</span>
              )}
            </SegBtn>
            <SegBtn
              active={statusFilter === "not-installed"}
              onClick={() => setStatusFilter("not-installed")}
            >
              Not installed
            </SegBtn>
            <SegBtn
              active={statusFilter === "updates"}
              onClick={() => setStatusFilter("updates")}
            >
              Updates
              {updatesCount > 0 && (
                <span className="ml-1 rounded-full bg-launcher-blue/20 px-1.5 text-launcher-blue tabular-nums">
                  {updatesCount}
                </span>
              )}
            </SegBtn>
          </div>

          <span className="hidden md:flex items-center gap-1 text-[11px] text-muted-foreground/50">
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </span>

          {/* MC Version */}
          <Select value={filterMc} onValueChange={setFilterMc}>
            <SelectTrigger className="w-32 h-8 rounded-lg text-xs">
              <SelectValue placeholder="MC Version" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All Versions</SelectItem>
              {mcVersions.map((v) => (
                <SelectItem key={v} value={v}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Loader */}
          <Select value={filterLoader} onValueChange={setFilterLoader}>
            <SelectTrigger className="w-28 h-8 rounded-lg text-xs">
              <SelectValue placeholder="Loader" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All Loaders</SelectItem>
              {loaders.map((l) => (
                <SelectItem key={l} value={l}>
                  {LOADER_LABELS[l as LoaderType] ?? l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Category */}
          {categories.length > 0 && (
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-32 h-8 rounded-lg text-xs">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All Categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="flex-1" />

          {/* Sort */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground/60 hidden sm:inline">
              Sort
            </span>
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="w-40 h-8 rounded-lg text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                  <SelectItem key={k} value={k}>{SORT_LABELS[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-8 text-muted-foreground"
            >
              <X className="w-3 h-3 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-8">
          {isLoading && (
            <div className={gridClass}>
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl surface-card overflow-hidden"
                >
                  <Skeleton className="h-32 w-full rounded-none" />
                  <div className="p-3.5 pt-7 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-8 w-full mt-2 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && !isLoading && (
            <EmptyState
              icon={WifiOff}
              title="Could not load modpacks"
              description={
                !isOnline
                  ? "You appear to be offline. Installed packs are still available from your library."
                  : "Something went wrong fetching the modpack list. Try refreshing."
              }
              action={
                <Button variant="secondary" size="sm" onClick={() => refetch()}>
                  <RefreshCw className="w-4 h-4 mr-1.5" />
                  Retry
                </Button>
              }
            />
          )}

          {!isLoading && !error && filtered.length === 0 && (
            <EmptyState
              icon={PackageOpen}
              title="No modpacks match your filters"
              description="Try adjusting your search or filters to find what you're looking for."
              action={
                hasFilters ? (
                  <Button variant="secondary" size="sm" onClick={clearFilters}>
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          )}

          {/* Featured */}
          {featured.length > 0 && !isLoading && (
            <section className="animate-fade-up">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground/90 mb-3">
                <Sparkles className="w-4 h-4 text-launcher-orange" />
                Featured
              </h2>
              <div className={gridClass}>
                {featured.map((pack) => (
                  <ModpackCard
                    key={pack.id}
                    pack={pack}
                    onInstall={(p) => install(p)}
                    onPlay={(inst) => launch(inst)}
                    onUpdate={(inst) =>
                      install(packs!.find((p) => p.id === inst.packId)!)
                    }
                  />
                ))}
              </div>
            </section>
          )}

          {/* All packs */}
          {rest.length > 0 && !isLoading && (
            <section className="animate-fade-up">
              {featured.length > 0 && (
                <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground/90 mb-3">
                  <LayoutGrid className="w-4 h-4 text-muted-foreground" />
                  All Modpacks
                </h2>
              )}
              <div className={gridClass}>
                {rest.map((pack) => (
                  <ModpackCard
                    key={pack.id}
                    pack={pack}
                    onInstall={(p) => install(p)}
                    onPlay={(inst) => launch(inst)}
                    onUpdate={(inst) =>
                      install(packs!.find((p) => p.id === inst.packId)!)
                    }
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function SegBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded-md px-2.5 h-7 text-xs font-medium transition-colors",
        active
          ? "bg-launcher-bg-active text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground hover:bg-launcher-bg-hover"
      )}
    >
      {children}
    </button>
  );
}
