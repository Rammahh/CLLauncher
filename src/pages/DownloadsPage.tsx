import { useInstanceStore } from "@/store/instanceStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/ui/empty-state";
import { InstallProgressBar } from "@/components/modpack/InstallProgressBar";
import { Package2, Download } from "lucide-react";

export function DownloadsPage() {
  const instances = useInstanceStore((s) => s.instances);
  const installProgress = useInstanceStore((s) => s.installProgress);

  const active = Object.values(installProgress).filter(
    (p) => p.status !== "complete" && p.status !== "error" && p.status !== "cancelled"
  );

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-launcher-border shrink-0">
        <h1 className="text-lg font-semibold">Downloads</h1>
        <p className="text-sm text-muted-foreground">
          Active installs, updates and repairs
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6">
          {active.length === 0 ? (
            <EmptyState
              icon={Download}
              title="No active downloads"
              description="Install or update a modpack and its progress will appear here with live speed and ETA."
            />
          ) : (
            <div className="space-y-3 max-w-3xl">
              {active.map((progress) => {
                const instance = instances[progress.instanceId];
                return (
                  <div
                    key={progress.instanceId}
                    className="surface-card rounded-2xl p-4 flex items-center gap-4"
                  >
                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-launcher-border bg-launcher-bg-active shrink-0 flex items-center justify-center">
                      {instance?.iconUrl ? (
                        <img
                          src={instance.iconUrl}
                          alt={instance.packName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package2 className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {instance?.packName ?? "Modpack"}
                      </p>
                      <div className="mt-2">
                        <InstallProgressBar progress={progress} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
