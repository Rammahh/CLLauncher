import { useInstanceStore } from "@/store/instanceStore";
import { useApiStatusStore } from "@/store/apiStatusStore";
import { useInstallModpack } from "@/hooks/useInstallModpack";
import { useLaunchMinecraft } from "@/hooks/useLaunchMinecraft";
import { ActionButton } from "@/components/modpack/ActionButton";
import { InstallProgressBar } from "@/components/modpack/InstallProgressBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { formatBytes, formatRelativeTime, formatDate } from "@/lib/utils";
import { LOADER_LABELS } from "@/types";
import type { InstalledInstance } from "@/types";
import {
  Package2, FolderOpen, Wrench, RefreshCw, Trash2, Settings2, ScrollText,
} from "lucide-react";
import { useLaunchLogStore } from "@/store/launchLogStore";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "@/components/ui/toaster";
import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

export function InstalledPage() {
  const instances = useInstanceStore((s) => Object.values(s.instances));
  const installProgress = useInstanceStore((s) => s.installProgress);
  const removeInstance = useInstanceStore((s) => s.removeInstance);
  const isOnline = useApiStatusStore((s) => s.isOnline);
  const { launch } = useLaunchMinecraft();
  const { install, repair } = useInstallModpack();
  const navigate = useNavigate();

  const [deleteTarget, setDeleteTarget] = useState<InstalledInstance | null>(null);

  const handleOpenFolder = async (instance: InstalledInstance) => {
    try {
      await invoke("open_instance_folder", { instanceId: instance.packId });
    } catch (e) {
      toast({ title: "Could not open folder", variant: "error" });
    }
  };

  const handleDelete = async (instance: InstalledInstance) => {
    try {
      // Instance folders on disk are named by packId
      const folder = instance.packId ?? instance.id;
      if (folder) {
        try {
          await invoke("delete_instance", { instanceId: folder });
        } catch (e: any) {
          // Folder may not exist (failed/partial install) — still remove the record
          if (e?.kind !== "NotFound") throw e;
        }
      }
      removeInstance(instance.id);
      toast({ title: "Instance deleted", variant: "success" });
    } catch (e: any) {
      const msg = typeof e === "string" ? e : e?.message ?? String(e);
      toast({ title: "Could not delete instance", description: msg, variant: "error" });
    }
    setDeleteTarget(null);
  };

  if (instances.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4 text-center p-6">
        <Package2 className="w-16 h-16 text-muted-foreground/30" />
        <div>
          <p className="text-muted-foreground font-medium">No modpacks installed</p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            Browse and install modpacks from the Modpacks page.
          </p>
        </div>
        <Button variant="install" onClick={() => navigate("/modpacks")}>
          Browse Modpacks
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-full">
        <div className="px-6 py-4 border-b border-launcher-border shrink-0">
          <h1 className="text-lg font-semibold">Installed</h1>
          <p className="text-sm text-muted-foreground">
            {instances.length} modpack{instances.length !== 1 ? "s" : ""} installed
          </p>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-3">
            {instances.map((instance) => {
              const progress = installProgress[instance.id];
              const hasUpdate = instance.latestVersion && instance.latestVersion !== instance.installedVersion;

              return (
                <div
                  key={instance.id}
                  className="p-4 rounded-xl border border-launcher-border bg-launcher-bg-card hover:border-launcher-border/80 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {/* Icon */}
                    <div className="w-14 h-14 rounded-xl overflow-hidden border border-launcher-border bg-launcher-bg-active shrink-0">
                      {instance.iconUrl ? (
                        <img
                          src={instance.iconUrl}
                          alt={instance.packName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package2 className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3
                          className="font-semibold text-foreground cursor-pointer hover:text-launcher-green transition-colors"
                          onClick={() => navigate(`/modpacks/${instance.packId}`)}
                        >
                          {instance.packName}
                        </h3>
                        {hasUpdate && (
                          <Badge variant="update" className="text-[10px]">
                            Update available
                          </Badge>
                        )}
                        {instance.status === "error" && (
                          <Badge variant="destructive" className="text-[10px]">
                            Error
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-xs text-muted-foreground">
                          v{instance.installedVersion}
                          {hasUpdate && (
                            <span className="text-launcher-blue ml-1">
                              → v{instance.latestVersion}
                            </span>
                          )}
                        </span>
                        <Badge variant="loader" className="text-[10px]">
                          {instance.mcVersion}
                        </Badge>
                        <Badge variant="loader" className="text-[10px]">
                          {LOADER_LABELS[instance.loader]}
                        </Badge>
                        {instance.diskSizeBytes && (
                          <span className="text-xs text-muted-foreground">
                            {formatBytes(instance.diskSizeBytes)}
                          </span>
                        )}
                      </div>

                      {instance.lastPlayed && (
                        <p className="text-xs text-muted-foreground/60 mt-1">
                          Last played {formatRelativeTime(instance.lastPlayed)}
                        </p>
                      )}

                      {/* Progress bar */}
                      {progress && (progress.status === "pending" || progress.status === "downloading" || progress.status === "extracting" || progress.status === "verifying") && (
                        <div className="mt-2">
                          <InstallProgressBar progress={progress} />
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <ActionButton
                        status={hasUpdate ? "update-available" : instance.status as any}
                        isApiOnline={isOnline}
                        size="default"
                        onPlay={() => launch(instance)}
                        onUpdate={() => install({ id: instance.packId } as any)}
                        onRepair={() => repair(instance)}
                      />
                      {(instance.status === "running" || instance.status === "launching") && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            useLaunchLogStore.getState().openFor(instance.id, instance.packName)
                          }
                          title="View logs"
                          className="text-launcher-green hover:text-launcher-green"
                        >
                          <ScrollText className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenFolder(instance)}
                        title="Open folder"
                      >
                        <FolderOpen className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => repair(instance)}
                        title="Repair"
                        disabled={!isOnline && !progress}
                      >
                        <Wrench className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/modpacks/${instance.packId}`)}
                        title="Settings"
                      >
                        <Settings2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(instance)}
                        title="Delete"
                        className="text-muted-foreground hover:text-launcher-red"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Instance</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-foreground">
              {deleteTarget?.packName}
            </span>
            ? This will remove all files including saves, screenshots, and configs.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
