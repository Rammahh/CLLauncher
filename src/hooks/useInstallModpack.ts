import { useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/api/queryKeys";
import { api } from "@/api/endpoints";
import { useInstanceStore } from "@/store/instanceStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useApiStatusStore } from "@/store/apiStatusStore";
import { logger } from "@/store/logStore";
import { toast } from "@/components/ui/toaster";
import { generateId } from "@/lib/utils";
import type { ModpackSummary, InstalledInstance, InstallProgress, InstallState } from "@/types";

export function useInstallModpack() {
  const qc = useQueryClient();
  const addInstance = useInstanceStore((s) => s.addInstance);
  const updateInstance = useInstanceStore((s) => s.updateInstance);
  const setProgress = useInstanceStore((s) => s.setInstallProgress);
  const clearProgress = useInstanceStore((s) => s.clearInstallProgress);
  const setStatus = useInstanceStore((s) => s.setInstanceStatus);
  const instances = useInstanceStore((s) => s.instances);
  const settings = useSettingsStore((s) => s.settings);
  const isOnline = useApiStatusStore((s) => s.isOnline);

  const cancelRef = useRef<Record<string, boolean>>({});

  const install = useCallback(
    async (pack: ModpackSummary, versionId?: string) => {
      if (!isOnline) {
        toast({ title: "Cannot install while offline", variant: "error" });
        return;
      }

      let instance = Object.values(instances).find((i) => i.packId === pack.id);
      const instanceId = instance?.id ?? generateId();

      cancelRef.current[instanceId] = false;

      try {
        // App data dir
        const appDataDir = await invoke<string>("get_app_data_dir");
        const instanceDir = `${appDataDir}/instances/${pack.id}`;
        const gameDir = `${instanceDir}/.minecraft`;

        // Create the instance record immediately so the UI reflects the install
        if (!instance) {
          const newInstance: InstalledInstance = {
            id: instanceId,
            packId: pack.id,
            packName: pack.name,
            iconUrl: pack.iconUrl,
            installedVersion: "",
            latestVersion: pack.latestVersion,
            mcVersion: pack.mcVersion,
            loader: pack.loader,
            loaderVersion: pack.loaderVersion ?? "",
            installPath: instanceDir,
            gamePath: gameDir,
            installDate: new Date().toISOString(),
            status: "installing",
            enabledOptional: [],
          };
          addInstance(newInstance);
          instance = newInstance;
        } else {
          updateInstance(instanceId, {
            status: "installing",
            latestVersion: pack.latestVersion,
          });
        }

        setProgress(instanceId, {
          instanceId,
          status: "pending",
          currentFile: "Fetching version info…",
          filesDone: 0,
          filesTotal: 0,
          bytesDownloaded: 0,
          totalBytes: 0,
          speedBps: 0,
          etaSecs: 0,
        });

        // Fetch versions if needed
        const versions = await qc.fetchQuery({
          queryKey: queryKeys.versions(pack.id),
          queryFn: () => api.getVersions(pack.id),
          staleTime: 5 * 60_000,
        });

        const targetVersion = versionId
          ? versions.find((v) => v.id === versionId)
          : versions[0];

        if (!targetVersion) {
          throw new Error("No version available");
        }

        setProgress(instanceId, {
          instanceId,
          status: "pending",
          currentFile: `Fetching manifest for v${targetVersion.version}…`,
          filesDone: 0,
          filesTotal: 0,
          bytesDownloaded: 0,
          totalBytes: 0,
          speedBps: 0,
          etaSecs: 0,
        });

        // Fetch manifest
        const manifest = await qc.fetchQuery({
          queryKey: queryKeys.manifest(pack.id, targetVersion.id),
          queryFn: () => api.getManifest(pack.id, targetVersion.id),
          staleTime: 5 * 60_000,
        });

        updateInstance(instanceId, {
          installedVersion: targetVersion.version,
          mcVersion: targetVersion.mcVersion,
          loader: targetVersion.loader,
          loaderVersion: targetVersion.loaderVersion,
        });

        // Create dirs
        await invoke("create_dir_all", { dirPath: gameDir });

        // Listen to progress events
        const unlisten = await listen<InstallProgress>("install-progress", (event) => {
          if (event.payload.instanceId === instanceId) {
            setProgress(instanceId, event.payload);
          }
        });

        // Get enabled optional mods
        const enabledOptional = instance.enabledOptional ?? [];

        // Decide install strategy: fresh installs use the one-shot ZIP archive
        // (when the backend offers one); updates/reinstalls use file-by-file sync.
        const priorState = await invoke<InstallState | null>("read_install_state", {
          instanceDir,
        }).catch(() => null);
        const useArchive =
          (!priorState || priorState.packId !== pack.id) && !!manifest.archiveUrl;

        if (useArchive) {
          await invoke("install_modpack_archive", {
            request: {
              instanceId,
              archiveUrl: manifest.archiveUrl,
              gameDir,
              files: manifest.files,
            },
          });
        } else {
          await invoke("install_modpack", {
            request: {
              instanceId,
              files: manifest.files,
              enabledOptional,
              gameDir,
            },
          });
        }

        unlisten();

        // Persist install state for future update/repair decisions
        await invoke("write_install_state", {
          instanceDir,
          state: {
            packId: pack.id,
            versionId: targetVersion.id,
            manifestHash: manifest.manifestHash ?? null,
            installedAt: new Date().toISOString(),
            installMode: useArchive ? "archive" : "manifest",
          },
        }).catch(() => {});

        // Update instance
        updateInstance(instanceId, {
          installedVersion: targetVersion.version,
          latestVersion: pack.latestVersion,
          mcVersion: targetVersion.mcVersion,
          loader: targetVersion.loader,
          loaderVersion: targetVersion.loaderVersion,
          status: "idle",
        });

        // Save instance.json
        await invoke("write_instance_config", {
          instanceId: pack.id,
          config: {
            id: instanceId,
            packId: pack.id,
            packName: pack.name,
            installedVersion: targetVersion.version,
            mcVersion: targetVersion.mcVersion,
            loader: targetVersion.loader,
            loaderVersion: targetVersion.loaderVersion,
            installDate: instance.installDate,
          },
        });

        clearProgress(instanceId);
        toast({
          title: `${pack.name} installed!`,
          description: `v${targetVersion.version}`,
          variant: "success",
        });
        logger.info("install", `Installed ${pack.name} v${targetVersion.version}`);
      } catch (e: any) {
        if (e?.kind === "Cancelled" || e === "Cancelled") {
          toast({ title: "Installation cancelled" });
          setStatus(instanceId, "idle");
        } else {
          const msg = typeof e === "string" ? e : e?.message ?? "Unknown error";
          toast({ title: "Installation failed", description: msg, variant: "error" });
          logger.error("install", `Install failed for ${pack.name}: ${msg}`);
          setStatus(instanceId, "error");
        }
        clearProgress(instanceId);
      }
    },
    [instances, settings, isOnline, qc]
  );

  const repair = useCallback(
    async (instance: InstalledInstance) => {
      setStatus(instance.id, "repairing");
      setProgress(instance.id, {
        instanceId: instance.id,
        status: "pending",
        currentFile: "Fetching manifest…",
        filesDone: 0,
        filesTotal: 0,
        bytesDownloaded: 0,
        totalBytes: 0,
        speedBps: 0,
        etaSecs: 0,
      });
      try {
        const manifest = await qc.fetchQuery({
          queryKey: queryKeys.manifest(instance.packId, instance.installedVersion),
          queryFn: () =>
            api.getManifest(instance.packId, instance.installedVersion),
          staleTime: 5 * 60_000,
        });

        const unlisten = await listen<InstallProgress>("install-progress", (e) => {
          if (e.payload.instanceId === instance.id) {
            setProgress(instance.id, e.payload);
          }
        });

        await invoke("repair_modpack", {
          request: {
            instanceId: instance.id,
            files: manifest.files,
            enabledOptional: instance.enabledOptional ?? [],
            gameDir: instance.gamePath,
          },
        });

        unlisten();

        // Repair always reconciles file-by-file against the manifest
        await invoke("write_install_state", {
          instanceDir: instance.installPath,
          state: {
            packId: instance.packId,
            versionId: instance.installedVersion,
            manifestHash: manifest.manifestHash ?? null,
            installedAt: new Date().toISOString(),
            installMode: "manifest",
          },
        }).catch(() => {});

        clearProgress(instance.id);
        setStatus(instance.id, "idle");
        toast({ title: "Repair complete", variant: "success" });
      } catch (e) {
        clearProgress(instance.id);
        setStatus(instance.id, "error");
        toast({ title: "Repair failed", description: String(e), variant: "error" });
      }
    },
    [qc]
  );

  const cancel = useCallback((instanceId: string) => {
    cancelRef.current[instanceId] = true;
    invoke("cancel_download", { taskId: instanceId }).catch(() => {});
  }, []);

  return { install, repair, cancel };
}
