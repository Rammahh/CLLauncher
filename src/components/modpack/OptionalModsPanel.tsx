import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/endpoints";
import { queryKeys } from "@/api/queryKeys";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useInstanceStore } from "@/store/instanceStore";
import type { InstalledInstance, OptionalModGroup } from "@/types";
import { cn } from "@/lib/utils";

interface OptionalModsPanelProps {
  instance: InstalledInstance;
  packId: string;
  versionId: string;
}

export function OptionalModsPanel({
  instance,
  packId,
  versionId,
}: OptionalModsPanelProps) {
  const updateInstance = useInstanceStore((s) => s.updateInstance);

  const { data: manifest, isLoading } = useQuery({
    queryKey: queryKeys.manifest(packId, versionId),
    queryFn: () => api.getManifest(packId, versionId),
    enabled: !!packId && !!versionId,
    staleTime: 5 * 60_000,
  });

  const optionalFiles = manifest?.files.filter((f) => f.optional) ?? [];

  // Group by category
  const groups = optionalFiles.reduce<Record<string, typeof optionalFiles>>(
    (acc, file) => {
      const g = file.group ?? "Other";
      if (!acc[g]) acc[g] = [];
      acc[g].push(file);
      return acc;
    },
    {}
  );

  const toggleMod = (path: string, enabled: boolean) => {
    const current = instance.enabledOptional ?? [];
    const next = enabled
      ? [...current, path]
      : current.filter((p) => p !== path);
    updateInstance(instance.id, { enabledOptional: next });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (optionalFiles.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No optional mods for this modpack.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(groups).map(([group, files]) => (
        <section key={group}>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {group}
          </h3>
          <div className="space-y-2">
            {files.map((file) => {
              const enabled = instance.enabledOptional?.includes(file.path) ?? false;
              return (
                <div
                  key={file.path}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                    enabled
                      ? "border-launcher-green/30 bg-launcher-green/5"
                      : "border-launcher-border bg-launcher-bg-card"
                  )}
                >
                  <Switch
                    id={file.path}
                    checked={enabled}
                    onCheckedChange={(v) => toggleMod(file.path, v)}
                  />
                  <div className="flex-1 min-w-0">
                    <Label
                      htmlFor={file.path}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {file.description ??
                        file.path.split("/").pop() ??
                        file.path}
                    </Label>
                    {file.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {file.path}
                      </p>
                    )}
                  </div>
                  {file.type && (
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      {file.type}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
