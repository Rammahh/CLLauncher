import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/endpoints";
import { queryKeys } from "@/api/queryKeys";
import { useApiStatusStore } from "@/store/apiStatusStore";
import { useInstanceStore } from "@/store/instanceStore";
import { useAccountStore } from "@/store/accountStore";
import { useLaunchMinecraft } from "@/hooks/useLaunchMinecraft";
import { useInstallModpack } from "@/hooks/useInstallModpack";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/ui/empty-state";
import { branding } from "@/config/branding";
import { getAccountAvatarUrl } from "@/lib/utils";
import { WifiOff, Megaphone, Wrench, Newspaper, Server, Compass, Package2 } from "lucide-react";
import type { ModpackSummary } from "@/types";

import { HeroFeatured, HeroFeaturedSkeleton } from "@/components/home/HeroFeatured";
import { ContinuePlaying } from "@/components/home/ContinuePlaying";
import { QuickStats } from "@/components/home/QuickStats";
import { NewsStrip, NewsStripSkeleton } from "@/components/home/NewsStrip";
import { ServerStrip } from "@/components/home/ServerStrip";
import { HomeModpackCard } from "@/components/home/HomeModpackCard";
import { SectionHeader } from "@/components/home/SectionHeader";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Late night";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function HomePage() {
  const setOnline = useApiStatusStore((s) => s.setOnline);
  const isOnline = useApiStatusStore((s) => s.isOnline);
  const instances = useInstanceStore((s) => s.instances);
  const installProgress = useInstanceStore((s) => s.installProgress);
  const selectedAccount = useAccountStore((s) => s.selectedAccount);

  const { launch } = useLaunchMinecraft();
  const { install } = useInstallModpack();

  const instanceList = useMemo(() => Object.values(instances), [instances]);
  const progressList = useMemo(
    () => Object.values(installProgress),
    [installProgress]
  );

  const { data: config } = useQuery({
    queryKey: queryKeys.config,
    queryFn: api.getConfig,
    retry: 1,
    staleTime: 5 * 60_000,
  });

  const {
    data: modpacks,
    isLoading: modpacksLoading,
    error: modpacksError,
  } = useQuery({
    queryKey: queryKeys.modpacks,
    queryFn: api.getModpacks,
    retry: 1,
    staleTime: 60_000,
    refetchInterval: isOnline ? 60_000 : false,
  });

  const {
    data: news,
    isLoading: newsLoading,
    error: newsError,
  } = useQuery({
    queryKey: queryKeys.news,
    queryFn: api.getNews,
    retry: 1,
    staleTime: 5 * 60_000,
  });

  const { data: servers } = useQuery({
    queryKey: queryKeys.servers,
    queryFn: api.getServers,
    retry: 1,
    staleTime: 30_000,
  });

  // Mirror the existing online/offline detection behavior.
  useEffect(() => {
    if (newsError || modpacksError) setOnline(false);
    else if (news || modpacks) setOnline(true);
  }, [news, modpacks, newsError, modpacksError, setOnline]);

  // ─── Derived data ────────────────────────────────────────────────────────

  const instanceByPackId = useMemo(() => {
    const map: Record<string, (typeof instanceList)[number]> = {};
    for (const inst of instanceList) map[inst.packId] = inst;
    return map;
  }, [instanceList]);

  const busyPackIds = useMemo(() => {
    // A pack is "busy" when its instance is mid-install/update.
    const set = new Set<string>();
    for (const p of progressList) {
      if (p.status !== "complete") {
        const inst = instances[p.instanceId];
        if (inst) set.add(inst.packId);
      }
    }
    for (const inst of instanceList) {
      if (inst.status === "installing" || inst.status === "updating") {
        set.add(inst.packId);
      }
    }
    return set;
  }, [progressList, instances, instanceList]);

  const featured: ModpackSummary | undefined = useMemo(() => {
    if (!modpacks || modpacks.length === 0) return undefined;
    return modpacks.find((p) => p.featured) ?? modpacks[0];
  }, [modpacks]);

  const continueInstance = useMemo(() => {
    return [...instanceList]
      .filter((i) => i.lastPlayed)
      .sort(
        (a, b) =>
          new Date(b.lastPlayed!).getTime() - new Date(a.lastPlayed!).getTime()
      )[0];
  }, [instanceList]);

  const recommended = useMemo(() => {
    if (!modpacks) return [];
    return modpacks
      .filter((p) => p.id !== featured?.id && !instanceByPackId[p.id])
      .slice(0, 3);
  }, [modpacks, featured, instanceByPackId]);

  const activeDownloads = progressList.filter(
    (p) => p.status !== "complete"
  ).length;

  const hasInstanceBusy =
    continueInstance &&
    (continueInstance.status === "launching" ||
      continueInstance.status === "running");

  return (
    <ScrollArea className="flex-1">
      <div className="p-6 space-y-8 max-w-5xl mx-auto">
        {/* ─── Greeting header ─────────────────────────────────────────── */}
        <header className="flex items-center gap-4 animate-fade-up">
          {selectedAccount && (
            <img
              src={getAccountAvatarUrl(selectedAccount, 64)}
              alt={selectedAccount.username}
              className="w-12 h-12 rounded-xl border border-launcher-border shadow-card shrink-0"
            />
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              {greeting()}
              {selectedAccount && (
                <span className="accent-gradient-text">
                  , {selectedAccount.username}
                </span>
              )}
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {branding.network} · {branding.tagline}
            </p>
          </div>
        </header>

        {/* ─── Offline banner ──────────────────────────────────────────── */}
        {!isOnline && (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/5 animate-fade-up">
            <WifiOff className="w-5 h-5 text-yellow-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-yellow-300">
                API Unavailable
              </p>
              <p className="text-xs text-muted-foreground">
                You can still play installed modpacks. New installs and updates
                are disabled.
              </p>
            </div>
          </div>
        )}

        {/* ─── Announcement ────────────────────────────────────────────── */}
        {config?.announcement && (
          <div className="flex items-start gap-3 p-4 rounded-xl border border-launcher-blue/30 bg-launcher-blue/5 animate-fade-up">
            <Megaphone className="w-5 h-5 text-launcher-blue shrink-0 mt-0.5" />
            <p className="text-sm text-foreground">{config.announcement}</p>
          </div>
        )}

        {/* ─── Maintenance ─────────────────────────────────────────────── */}
        {config?.maintenanceMode && (
          <div className="flex items-start gap-3 p-4 rounded-xl border border-launcher-red/30 bg-launcher-red/5 animate-fade-up">
            <Wrench className="w-5 h-5 text-launcher-red shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-launcher-red">
                Maintenance Mode
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {config.maintenanceMessage ?? "The server is under maintenance."}
              </p>
            </div>
          </div>
        )}

        {/* ─── Hero featured ───────────────────────────────────────────── */}
        {modpacksLoading && !featured ? (
          <HeroFeaturedSkeleton />
        ) : featured ? (
          <HeroFeatured
            pack={featured}
            instance={instanceByPackId[featured.id]}
            busy={busyPackIds.has(featured.id)}
            offline={!isOnline}
            onPlay={(inst) => launch(inst)}
            onInstall={(pack) => install(pack)}
          />
        ) : (
          !modpacksError && (
            <EmptyState
              icon={Package2}
              title="No modpacks yet"
              description="Modpacks will appear here once they're published to the network."
            />
          )
        )}

        {/* ─── Quick stats ─────────────────────────────────────────────── */}
        <QuickStats
          installedCount={instanceList.length}
          activeDownloads={activeDownloads}
          online={isOnline}
        />

        {/* ─── Continue playing ────────────────────────────────────────── */}
        {continueInstance && (
          <section>
            <SectionHeader title="Continue Playing" to="/installed" />
            <ContinuePlaying
              instance={continueInstance}
              busy={!!hasInstanceBusy}
              onPlay={(inst) => launch(inst)}
            />
          </section>
        )}

        {/* ─── News ────────────────────────────────────────────────────── */}
        <section>
          <SectionHeader title="Latest News" to="/news" />
          {newsLoading ? (
            <NewsStripSkeleton />
          ) : news && news.length > 0 ? (
            <NewsStrip posts={news.slice(0, 3)} />
          ) : (
            <EmptyState
              icon={Newspaper}
              title={isOnline ? "No news yet" : "News unavailable offline"}
              description={
                isOnline
                  ? "Check back soon for updates and announcements."
                  : "Reconnect to load the latest announcements."
              }
              className="py-10"
            />
          )}
        </section>

        {/* ─── Server status ───────────────────────────────────────────── */}
        {servers && servers.length > 0 && (
          <section>
            <SectionHeader title="Server Status" to="/servers" />
            <ServerStrip servers={servers.slice(0, 6)} />
          </section>
        )}

        {/* ─── Recommended modpacks ────────────────────────────────────── */}
        {recommended.length > 0 ? (
          <section>
            <SectionHeader title="Recommended For You" to="/modpacks" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {recommended.map((pack) => (
                <HomeModpackCard
                  key={pack.id}
                  pack={pack}
                  installing={busyPackIds.has(pack.id)}
                  disabled={!isOnline}
                  onInstall={(p) => install(p)}
                />
              ))}
            </div>
          </section>
        ) : (
          !modpacksLoading &&
          modpacks &&
          modpacks.length > 0 &&
          instanceList.length > 0 && (
            <section>
              <SectionHeader title="Discover More" to="/modpacks" />
              <EmptyState
                icon={Compass}
                title="You're all caught up"
                description="You've installed every available modpack. Browse the catalog for versions and details."
                className="py-10"
              />
            </section>
          )
        )}

        {/* Subtle footer when fully offline with nothing to show */}
        {!isOnline && !servers && (
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/60 pt-2">
            <Server className="w-3.5 h-3.5" />
            Server status will return when you reconnect.
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
