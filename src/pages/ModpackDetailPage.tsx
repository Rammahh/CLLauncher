import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/endpoints";
import { queryKeys } from "@/api/queryKeys";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import { ActionButton } from "@/components/modpack/ActionButton";
import { ProgressOverlay } from "@/components/modpack/ProgressOverlay";
import { OptionalModsPanel } from "@/components/modpack/OptionalModsPanel";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, Server, Cpu, MemoryStick, Copy, CheckCircle, Package2,
  HardDrive, Clock, FolderOpen, Search, Puzzle, ScrollText, History,
  Settings2, FileText, Download, RefreshCw, Calendar, Boxes, Wrench,
  Trash2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { LOADER_LABELS, LOADER_COLORS } from "@/types";
import type { ModpackVersion, ManifestFile } from "@/types";
import { useInstanceStore } from "@/store/instanceStore";
import { useApiStatusStore } from "@/store/apiStatusStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useLogStore } from "@/store/logStore";
import { useInstallModpack } from "@/hooks/useInstallModpack";
import { useLaunchMinecraft } from "@/hooks/useLaunchMinecraft";
import { toast } from "@/components/ui/toaster";
import { cn, formatBytes, formatRelativeTime, formatDate } from "@/lib/utils";

export function ModpackDetailPage() {
  const { packId } = useParams<{ packId: string }>();
  const navigate = useNavigate();
  const isOnline = useApiStatusStore((s) => s.isOnline);
  const instances = useInstanceStore((s) => s.instances);
  const installProgress = useInstanceStore((s) => s.installProgress);

  const [selectedVersionId, setSelectedVersionId] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const { data: pack, isLoading: packLoading } = useQuery({
    queryKey: queryKeys.modpack(packId!),
    queryFn: () => api.getModpack(packId!),
    enabled: !!packId,
    staleTime: 5 * 60_000,
  });

  const { data: versions } = useQuery({
    queryKey: queryKeys.versions(packId!),
    queryFn: () => api.getVersions(packId!),
    enabled: !!packId,
    staleTime: 5 * 60_000,
    select: (data) => {
      if (!selectedVersionId && data.length > 0) {
        setSelectedVersionId(data[0].id);
      }
      return data;
    },
  });

  const selectedVersion =
    versions?.find((v) => v.id === selectedVersionId) ?? versions?.[0];

  const { data: changelog } = useQuery({
    queryKey: queryKeys.changelog(packId!, selectedVersion?.id ?? ""),
    queryFn: () => api.getChangelog(packId!, selectedVersion!.id),
    enabled: !!packId && !!selectedVersion,
    staleTime: 30 * 60_000,
  });

  // Manifest (used by Mods tab); only fetched once a version is known
  const { data: manifest, isLoading: manifestLoading } = useQuery({
    queryKey: queryKeys.manifest(packId!, selectedVersion?.id ?? ""),
    queryFn: () => api.getManifest(packId!, selectedVersion!.id),
    enabled: !!packId && !!selectedVersion,
    staleTime: 5 * 60_000,
  });

  const instance = Object.values(instances).find((i) => i.packId === packId);
  const progress = instance ? installProgress[instance.id] : undefined;
  const hasUpdate =
    instance && pack && pack.latestVersion !== instance.installedVersion;

  const { install, repair, cancel } = useInstallModpack();
  const { launch, stop } = useLaunchMinecraft();

  const actionStatus = instance
    ? hasUpdate
      ? "update-available"
      : instance.status
    : "not-installed";

  const handleCopyIp = () => {
    if (!pack?.serverIp) return;
    navigator.clipboard.writeText(
      pack.serverPort ? `${pack.serverIp}:${pack.serverPort}` : pack.serverIp
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Server IP copied!", variant: "success" });
  };

  if (packLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-6 py-3 border-b border-launcher-border">
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="p-6 space-y-6 max-w-5xl mx-auto w-full">
          <Skeleton className="h-56 w-full rounded-2xl" />
          <div className="flex gap-4">
            <Skeleton className="h-20 w-20 rounded-2xl" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-7 w-1/3" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!pack) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <EmptyState
          icon={Package2}
          title="Modpack not found"
          description="This modpack may have been removed or is unavailable right now."
          action={
            <Button variant="secondary" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Go back
            </Button>
          }
        />
      </div>
    );
  }

  const loaderColor = LOADER_COLORS[pack.loader];
  const serverAddress = pack.serverIp
    ? pack.serverPort
      ? `${pack.serverIp}:${pack.serverPort}`
      : pack.serverIp
    : undefined;

  return (
    <div className="flex flex-col h-full relative">
      {/* Fixed install progress overlay */}
      {progress &&
        (progress.status === "downloading" || progress.status === "verifying") && (
          <ProgressOverlay
            progress={progress}
            onCancel={instance ? () => cancel(instance.id) : undefined}
          />
        )}

      {/* Back bar */}
      <div className="flex items-center gap-2 px-6 py-3 border-b border-launcher-border shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="gap-1 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <span className="text-sm text-muted-foreground/50">/</span>
        <span className="text-sm font-medium truncate">{pack.name}</span>
      </div>

      <ScrollArea className="flex-1">
        {/* Banner header */}
        <div className="relative">
          <div className="h-56 w-full overflow-hidden bg-launcher-bg-secondary">
            {pack.bannerUrl ? (
              <img
                src={pack.bannerUrl}
                alt={pack.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-launcher-bg-active to-launcher-bg-secondary" />
            )}
          </div>
          {/* Hero fade overlay */}
          <div className="absolute inset-0 bg-hero-fade pointer-events-none" />

          {/* Header content sitting on the banner */}
          <div className="absolute inset-x-0 bottom-0 px-6 pb-5">
            <div className="max-w-5xl mx-auto flex items-end gap-4 flex-wrap">
              <div className="w-24 h-24 rounded-2xl overflow-hidden border border-launcher-border bg-launcher-bg-card shadow-elevated shrink-0">
                {pack.iconUrl ? (
                  <img
                    src={pack.iconUrl}
                    alt={pack.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-launcher-bg-active">
                    <Package2 className="w-9 h-9 text-muted-foreground" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 pb-0.5">
                <h1 className="text-2xl font-bold drop-shadow-sm truncate">
                  {pack.name}
                </h1>
                <p className="text-sm text-foreground/70 mt-0.5">
                  by Craftersland Network
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-2.5">
                  <Badge variant="loader" className="text-[11px]">
                    MC {pack.mcVersion}
                  </Badge>
                  <Badge
                    variant="loader"
                    className="text-[11px] gap-1"
                    style={{ color: loaderColor }}
                  >
                    <span
                      className="inline-block w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: loaderColor }}
                    />
                    {LOADER_LABELS[pack.loader]}
                  </Badge>
                  <Badge variant="loader" className="text-[11px]">
                    v{instance?.installedVersion || pack.latestVersion}
                  </Badge>
                  {pack.status && pack.status !== "active" && (
                    <Badge
                      variant={pack.status === "beta" ? "orange" : "secondary"}
                      className="text-[11px] capitalize"
                    >
                      {pack.status}
                    </Badge>
                  )}
                  {pack.tags?.slice(0, 3).map((t) => (
                    <Badge key={t} variant="secondary" className="text-[11px]">
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Primary actions */}
              <div className="flex items-center gap-2 pb-0.5">
                <ActionButton
                  instanceId={instance?.id}
                  status={actionStatus as any}
                  isApiOnline={isOnline}
                  size="lg"
                  onInstall={() => install(pack, selectedVersion?.id)}
                  onUpdate={() => install(pack, selectedVersion?.id)}
                  onPlay={() => instance && launch(instance)}
                  onRepair={() => instance && repair(instance)}
                  onStop={() => instance && stop(instance.id)}
                />
                {instance &&
                  (instance.status === "idle" ||
                    actionStatus === "update-available") && (
                    <Button
                      variant="secondary"
                      size="lg"
                      onClick={() => repair(instance)}
                      title="Verify & repair files"
                      className="gap-2"
                    >
                      <Wrench className="w-4 h-4" />
                      <span className="hidden sm:inline">Repair</span>
                    </Button>
                  )}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto p-6 space-y-6">
          {/* Version selector */}
          {versions && versions.length > 0 && (
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm text-muted-foreground">Install version:</span>
              <Select value={selectedVersionId} onValueChange={setSelectedVersionId}>
                <SelectTrigger className="w-52 h-9">
                  <SelectValue placeholder="Select version" />
                </SelectTrigger>
                <SelectContent>
                  {versions.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.version}
                      {v.releaseType !== "release" && (
                        <span className="ml-1 text-muted-foreground/60 text-xs">
                          ({v.releaseType})
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedVersion && (
                <Badge variant="loader" className="text-xs">
                  MC {selectedVersion.mcVersion}
                </Badge>
              )}
              {instance && (
                <span className="text-xs text-muted-foreground/70">
                  Installed: v{instance.installedVersion}
                </span>
              )}
            </div>
          )}

          {/* Tabs */}
          <Tabs defaultValue="overview">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="overview" className="gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Overview
              </TabsTrigger>
              <TabsTrigger value="versions" className="gap-1.5">
                <History className="w-3.5 h-3.5" /> Versions
              </TabsTrigger>
              <TabsTrigger value="mods" className="gap-1.5">
                <Boxes className="w-3.5 h-3.5" /> Mods
              </TabsTrigger>
              <TabsTrigger value="changelog" className="gap-1.5">
                <ScrollText className="w-3.5 h-3.5" /> Changelog
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-1.5">
                <Settings2 className="w-3.5 h-3.5" /> Settings
              </TabsTrigger>
              <TabsTrigger value="logs" className="gap-1.5">
                <ScrollText className="w-3.5 h-3.5" /> Logs
              </TabsTrigger>
              {instance && (
                <TabsTrigger value="optional" className="gap-1.5">
                  <Puzzle className="w-3.5 h-3.5" /> Optional
                </TabsTrigger>
              )}
            </TabsList>

            {/* OVERVIEW */}
            <TabsContent value="overview" className="mt-5 space-y-6">
              {/* Stat grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                <Stat
                  icon={<Cpu className="w-4 h-4" />}
                  label="Java"
                  value={pack.requiredJava ? `Java ${pack.requiredJava}` : "Auto"}
                />
                <Stat
                  icon={<MemoryStick className="w-4 h-4" />}
                  label="Recommended RAM"
                  value={pack.recommendedRam ? `${(pack.recommendedRam / 1024).toFixed(0)} GB` : "—"}
                />
                <Stat
                  icon={<MemoryStick className="w-4 h-4" />}
                  label="Minimum RAM"
                  value={pack.minRam ? `${(pack.minRam / 1024).toFixed(0)} GB` : "—"}
                />
                <Stat
                  icon={<Calendar className="w-4 h-4" />}
                  label="Updated"
                  value={pack.updatedAt ? formatRelativeTime(pack.updatedAt) : "—"}
                />
                {instance?.diskSizeBytes ? (
                  <Stat
                    icon={<HardDrive className="w-4 h-4" />}
                    label="Disk size"
                    value={formatBytes(instance.diskSizeBytes)}
                  />
                ) : null}
                {instance?.lastPlayed ? (
                  <Stat
                    icon={<Clock className="w-4 h-4" />}
                    label="Last played"
                    value={formatRelativeTime(instance.lastPlayed)}
                  />
                ) : null}
                {serverAddress && (
                  <button
                    onClick={handleCopyIp}
                    className="flex items-center gap-2 p-3 rounded-xl surface-card hover:border-launcher-green/30 transition-colors text-left group"
                  >
                    {copied ? (
                      <CheckCircle className="w-4 h-4 text-launcher-green shrink-0" />
                    ) : (
                      <Server className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground">Server IP</p>
                      <p className="text-xs font-mono truncate">{serverAddress}</p>
                    </div>
                    <Copy className="w-3 h-3 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </button>
                )}
                {instance?.installPath && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(instance.installPath);
                      toast({ title: "Install path copied!", variant: "success" });
                    }}
                    className="flex items-center gap-2 p-3 rounded-xl surface-card hover:border-launcher-green/30 transition-colors text-left group col-span-2"
                  >
                    <FolderOpen className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground">Install path</p>
                      <p className="text-xs font-mono truncate">{instance.installPath}</p>
                    </div>
                    <Copy className="w-3 h-3 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </button>
                )}
              </div>

              <Separator />

              {/* Description */}
              <section>
                <h2 className="text-sm font-semibold text-foreground/90 mb-3">
                  About this modpack
                </h2>
                {pack.fullDescription ? (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{pack.fullDescription}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {pack.description}
                  </p>
                )}
              </section>

              {/* Screenshots */}
              {pack.screenshots && pack.screenshots.length > 0 && (
                <section>
                  <h2 className="text-sm font-semibold text-foreground/90 mb-3">
                    Screenshots
                  </h2>
                  <div className="grid grid-cols-2 gap-3">
                    {pack.screenshots.map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt={`Screenshot ${i + 1}`}
                        loading="lazy"
                        className="rounded-xl w-full h-44 object-cover border border-launcher-border"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ))}
                  </div>
                </section>
              )}
            </TabsContent>

            {/* VERSIONS */}
            <TabsContent value="versions" className="mt-5">
              <VersionsTab
                versions={versions}
                selectedId={selectedVersionId}
                installedVersion={instance?.installedVersion}
                onSelect={setSelectedVersionId}
                isApiOnline={isOnline}
                onInstall={(v) => install(pack, v.id)}
              />
            </TabsContent>

            {/* MODS */}
            <TabsContent value="mods" className="mt-5">
              <ModsTab files={manifest?.files} isLoading={manifestLoading} />
            </TabsContent>

            {/* CHANGELOG */}
            <TabsContent value="changelog" className="mt-5">
              {changelog ? (
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown>{changelog}</ReactMarkdown>
                </div>
              ) : selectedVersion?.changelog ? (
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown>{selectedVersion.changelog}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No changelog available for this version.
                </p>
              )}
            </TabsContent>

            {/* SETTINGS */}
            <TabsContent value="settings" className="mt-5">
              <InstanceSettingsTab />
            </TabsContent>

            {/* LOGS */}
            <TabsContent value="logs" className="mt-5">
              <LogsTab instanceId={instance?.id} packName={pack.name} />
            </TabsContent>

            {/* OPTIONAL MODS */}
            {instance && (
              <TabsContent value="optional" className="mt-5">
                <OptionalModsPanel
                  instance={instance}
                  packId={packId!}
                  versionId={selectedVersion?.id ?? ""}
                />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
}

// ─── Overview Stat ────────────────────────────────────────────────────────────

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5 p-3 rounded-xl surface-card">
      <span className="text-launcher-green/80 shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className="text-xs font-semibold truncate">{value}</p>
      </div>
    </div>
  );
}

// ─── Versions Tab ─────────────────────────────────────────────────────────────

function VersionsTab({
  versions,
  selectedId,
  installedVersion,
  onSelect,
  onInstall,
  isApiOnline,
}: {
  versions?: ModpackVersion[];
  selectedId: string;
  installedVersion?: string;
  onSelect: (id: string) => void;
  onInstall: (v: ModpackVersion) => void;
  isApiOnline: boolean;
}) {
  if (!versions || versions.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="No versions found"
        description="This modpack has no published versions yet."
      />
    );
  }

  return (
    <div className="space-y-2">
      {versions.map((v) => {
        const isSelected = v.id === selectedId;
        const isInstalled = installedVersion === v.version;
        return (
          <div
            key={v.id}
            onClick={() => onSelect(v.id)}
            className={cn(
              "flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all",
              isSelected
                ? "border-launcher-green/40 bg-launcher-green/5 shadow-glow-sm"
                : "surface-card hover:border-launcher-green/20"
            )}
          >
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg shrink-0",
                v.releaseType === "release"
                  ? "bg-launcher-green/15 text-launcher-green"
                  : v.releaseType === "beta"
                    ? "bg-launcher-orange/15 text-launcher-orange"
                    : "bg-launcher-purple/15 text-launcher-purple"
              )}
            >
              <History className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">v{v.version}</span>
                <Badge variant="loader" className="text-[10px]">
                  MC {v.mcVersion}
                </Badge>
                <Badge
                  variant={v.releaseType === "release" ? "green" : "orange"}
                  className="text-[10px] capitalize"
                >
                  {v.releaseType}
                </Badge>
                {isInstalled && (
                  <Badge variant="installed" className="text-[10px]">
                    Installed
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground/70 mt-1">
                {v.createdAt && (
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(v.createdAt)}
                  </span>
                )}
                {typeof v.fileCount === "number" && (
                  <span className="inline-flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {v.fileCount} files
                  </span>
                )}
                {typeof v.totalSize === "number" && v.totalSize > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <HardDrive className="w-3 h-3" />
                    {formatBytes(v.totalSize)}
                  </span>
                )}
              </div>
            </div>
            <Button
              variant={isInstalled ? "secondary" : "install"}
              size="sm"
              disabled={!isApiOnline}
              onClick={(e) => {
                e.stopPropagation();
                onInstall(v);
              }}
              className="gap-1.5 shrink-0"
            >
              {isInstalled ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5" /> Reinstall
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" /> Install
                </>
              )}
            </Button>
          </div>
        );
      })}
    </div>
  );
}

// ─── Mods Tab ─────────────────────────────────────────────────────────────────

function ModsTab({
  files,
  isLoading,
}: {
  files?: ManifestFile[];
  isLoading: boolean;
}) {
  const [query, setQuery] = useState("");

  const mods = useMemo(() => {
    const list = (files ?? []).filter((f) => f.type === "mod");
    if (!query) return list;
    const q = query.toLowerCase();
    return list.filter(
      (f) =>
        (f.description ?? "").toLowerCase().includes(q) ||
        f.path.toLowerCase().includes(q)
    );
  }, [files, query]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const totalMods = (files ?? []).filter((f) => f.type === "mod").length;

  if (totalMods === 0) {
    return (
      <EmptyState
        icon={Boxes}
        title="No mod list available"
        description="The manifest for this version does not expose a mod listing."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative w-64 max-w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search mods..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          {mods.length} / {totalMods} mods
        </span>
      </div>

      <div className="space-y-1.5">
        {mods.map((f) => {
          const name = f.description || f.path.split("/").pop() || f.path;
          return (
            <div
              key={f.path}
              className="flex items-center gap-3 p-2.5 rounded-lg surface-card"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-launcher-bg-active shrink-0">
                <Boxes className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{name}</p>
                <p className="text-[11px] text-muted-foreground/60 font-mono truncate">
                  {f.path}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {f.side && f.side !== "both" && (
                  <Badge variant="secondary" className="text-[10px] capitalize">
                    {f.side}
                  </Badge>
                )}
                {f.optional && (
                  <Badge variant="blue" className="text-[10px]">
                    Optional
                  </Badge>
                )}
                {typeof f.size === "number" && f.size > 0 && (
                  <span className="text-[11px] text-muted-foreground/60 tabular-nums">
                    {formatBytes(f.size)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
        {mods.length === 0 && (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No mods match "{query}".
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Instance Settings Tab ────────────────────────────────────────────────────
// Reads/writes the launcher settings store (the same store the launch flow uses).

function InstanceSettingsTab() {
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);

  return (
    <div className="space-y-6 max-w-2xl">
      <p className="text-xs text-muted-foreground">
        These settings apply when launching this modpack. They use your global
        launcher configuration.
      </p>

      {/* RAM */}
      <section className="space-y-3 p-4 rounded-xl surface-card">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium flex items-center gap-2">
            <MemoryStick className="w-4 h-4 text-launcher-green/80" />
            Maximum RAM
          </Label>
          <span className="text-sm font-mono tabular-nums text-launcher-green">
            {(settings.maxRamMb / 1024).toFixed(1)} GB
          </span>
        </div>
        <Slider
          value={[settings.maxRamMb]}
          min={1024}
          max={16384}
          step={512}
          onValueChange={([v]) => updateSettings({ maxRamMb: v })}
        />
        <div className="flex justify-between text-[10px] text-muted-foreground/60">
          <span>1 GB</span>
          <span>16 GB</span>
        </div>
      </section>

      {/* Java path */}
      <section className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Cpu className="w-4 h-4 text-launcher-green/80" />
          Java path
        </Label>
        <Input
          placeholder="Auto-detect (leave blank)"
          value={settings.javaPath}
          onChange={(e) => updateSettings({ javaPath: e.target.value })}
          className="font-mono text-xs"
        />
        <p className="text-[11px] text-muted-foreground/60">
          Leave blank to let the launcher auto-detect a compatible Java runtime.
        </p>
      </section>

      {/* JVM args */}
      <section className="space-y-2">
        <Label className="text-sm font-medium">Extra JVM arguments</Label>
        <Input
          placeholder="-XX:+UseG1GC -Dsun.rmi..."
          value={settings.extraJvmArgs}
          onChange={(e) => updateSettings({ extraJvmArgs: e.target.value })}
          className="font-mono text-xs"
        />
      </section>

      {/* Resolution */}
      <section className="space-y-2">
        <Label className="text-sm font-medium">Game resolution</Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={settings.defaultWidth}
            onChange={(e) =>
              updateSettings({ defaultWidth: Number(e.target.value) || 0 })
            }
            className="w-28"
            placeholder="Width"
          />
          <span className="text-muted-foreground">×</span>
          <Input
            type="number"
            value={settings.defaultHeight}
            onChange={(e) =>
              updateSettings({ defaultHeight: Number(e.target.value) || 0 })
            }
            className="w-28"
            placeholder="Height"
          />
        </div>
      </section>

      {/* Fullscreen */}
      <section className="flex items-center justify-between p-4 rounded-xl surface-card">
        <div>
          <Label className="text-sm font-medium">Fullscreen</Label>
          <p className="text-[11px] text-muted-foreground/60 mt-0.5">
            Launch Minecraft in fullscreen mode.
          </p>
        </div>
        <Switch
          checked={settings.fullscreen}
          onCheckedChange={(v) => updateSettings({ fullscreen: v })}
        />
      </section>
    </div>
  );
}

// ─── Logs Tab ─────────────────────────────────────────────────────────────────

function LogsTab({
  instanceId,
  packName,
}: {
  instanceId?: string;
  packName: string;
}) {
  const gameLogs = useLogStore((s) =>
    instanceId ? s.gameLogs[instanceId] ?? [] : []
  );
  const clearGameLogs = useLogStore((s) => s.clearGameLogs);

  if (!instanceId) {
    return (
      <EmptyState
        icon={ScrollText}
        title="No logs yet"
        description="Install and launch this modpack to see game logs here."
      />
    );
  }

  const asText = () =>
    gameLogs.map((l) => `[${l.source}] ${l.message}`).join("\n");

  const handleCopy = () => {
    navigator.clipboard.writeText(asText());
    toast({ title: "Logs copied to clipboard", variant: "success" });
  };

  const handleExport = () => {
    const blob = new Blob([asText()], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${packName.replace(/\s+/g, "-").toLowerCase()}-logs.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground tabular-nums">
          {gameLogs.length.toLocaleString()} lines
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCopy}
            disabled={gameLogs.length === 0}
            className="gap-1.5"
          >
            <Copy className="w-3.5 h-3.5" /> Copy
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExport}
            disabled={gameLogs.length === 0}
            className="gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => clearGameLogs(instanceId)}
            disabled={gameLogs.length === 0}
            className="gap-1.5 text-muted-foreground"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear
          </Button>
        </div>
      </div>

      {gameLogs.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="No game logs"
          description="Logs from the last launch will appear here."
        />
      ) : (
        <ScrollArea className="h-[28rem] rounded-xl border border-launcher-border bg-launcher-bg-primary">
          <div className="p-3 font-mono text-[11px] leading-relaxed">
            {gameLogs.map((l) => (
              <div
                key={l.id}
                className={cn(
                  "whitespace-pre-wrap break-all py-0.5",
                  l.level === "error"
                    ? "text-launcher-red"
                    : l.source === "game:launcher"
                      ? "text-launcher-green/80"
                      : "text-muted-foreground"
                )}
              >
                {l.message}
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
