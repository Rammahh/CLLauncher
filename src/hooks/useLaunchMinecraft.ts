import { useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useAccountStore } from "@/store/accountStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useInstanceStore } from "@/store/instanceStore";
import { useLogStore, logger } from "@/store/logStore";
import { useLaunchLogStore } from "@/store/launchLogStore";
import { api } from "@/api/endpoints";
import { toast } from "@/components/ui/toaster";
import type { InstalledInstance, JavaInstallation, GameLogEvent, GameStatusEvent } from "@/types";

export function useLaunchMinecraft() {
  const selectedAccount = useAccountStore((s) => s.selectedAccount);
  const settings = useSettingsStore((s) => s.settings);
  const setStatus = useInstanceStore((s) => s.setInstanceStatus);
  const setRunning = useInstanceStore((s) => s.setRunning);
  const updateInstance = useInstanceStore((s) => s.updateInstance);
  const addGameLog = useLogStore((s) => s.addGameLog);
  const clearGameLogs = useLogStore((s) => s.clearGameLogs);

  const launch = useCallback(
    async (instance: InstalledInstance) => {
      if (!selectedAccount) {
        toast({
          title: "No account selected",
          description: "Please add an account before launching.",
          variant: "error",
        });
        return;
      }

      setStatus(instance.id, "launching");
      setRunning(instance.id, true);

      // Open the live launch log window
      clearGameLogs(instance.id);
      useLaunchLogStore.getState().openFor(instance.id, instance.packName);
      const step = (msg: string) => addGameLog(instance.id, msg, "launcher");

      try {
        step(`Preparing to launch ${instance.packName} v${instance.installedVersion ?? "?"}...`);
        // Heal instances saved before API field normalization (missing mcVersion/loader)
        if (!instance.mcVersion || !instance.loader) {
          step("Instance is missing version info — recovering from API...");
          const versions = await api.getVersions(instance.packId);
          const v =
            versions.find((x) => x.version === instance.installedVersion) ??
            versions[0];
          if (!v) {
            throw new Error(
              "Instance is missing version info and it could not be recovered. Please repair or reinstall the modpack."
            );
          }
          instance = {
            ...instance,
            mcVersion: v.mcVersion,
            loader: v.loader,
            loaderVersion: v.loaderVersion,
            installedVersion: instance.installedVersion || v.version,
          };
          updateInstance(instance.id, {
            mcVersion: v.mcVersion,
            loader: v.loader,
            loaderVersion: v.loaderVersion,
            installedVersion: instance.installedVersion,
          });
        }

        // Get data dir
        const appDataDir = await invoke<string>("get_app_data_dir");

        // Find best Java
        step(`Looking for Java for Minecraft ${instance.mcVersion}...`);
        let javaPath = settings.javaPath;
        if (settings.autoDetectJava || !javaPath) {
          const java = await invoke<JavaInstallation | null>("find_best_java", {
            mcVersion: instance.mcVersion,
            requiredJava: null,
          });
          if (!java) {
            throw new Error(
              `Java not found for Minecraft ${instance.mcVersion}. Please install Java or configure a path in Settings.`
            );
          }
          javaPath = java.path;
          step(`Found Java ${java.version ?? ""} at ${java.path}`);
        } else {
          step(`Using configured Java: ${javaPath}`);
        }

        // Resolve tokens for microsoft accounts
        step(`Signing in as ${selectedAccount.username} (${selectedAccount.accountType})...`);
        let accessToken = "offline";
        let userType = "legacy";
        if (selectedAccount.accountType === "microsoft") {
          // Attempt token refresh if needed
          try {
            const refreshed = await invoke<{ access_token?: string }>(
              "refresh_microsoft_token",
              { accountId: selectedAccount.id }
            );
            // Token is stored in Tauri — we need the actual token for launch
            // Load from disk (full account with tokens)
            const raw = await invoke<any>("load_account_with_tokens_cmd", {
              accountId: selectedAccount.id,
            }).catch(() => null);
            if (raw?.access_token) {
              accessToken = raw.access_token;
              userType = "msa";
            }
          } catch {}
        }

        const assetsDir = `${appDataDir}/assets`;
        const librariesDir = `${appDataDir}/libraries`;

        const extraJvm = settings.extraJvmArgs
          .split(/\s+/)
          .filter(Boolean);
        const extraGame = settings.extraGameArgs
          .split(/\s+/)
          .filter(Boolean);

        // Listen for game logs
        const unlistenLog = await listen<GameLogEvent>("game-log", (e) => {
          if (e.payload.instanceId === instance.id) {
            addGameLog(instance.id, e.payload.line, e.payload.stream);
          }
        });

        const unlistenStatus = await listen<GameStatusEvent>("game-status", (e) => {
          if (e.payload.instanceId === instance.id) {
            if (e.payload.status === "running") {
              setStatus(instance.id, "running");
              setRunning(instance.id, true);
              step("Minecraft process started.");
            } else {
              setStatus(instance.id, "idle");
              setRunning(instance.id, false);
              updateInstance(instance.id, {
                lastPlayed: new Date().toISOString(),
              });
              unlistenLog();
              unlistenStatus();
              useLaunchLogStore.getState().setExitCode(e.payload.exitCode ?? 0);
              if (e.payload.exitCode !== 0 && e.payload.exitCode != null) {
                step(`Minecraft exited with code ${e.payload.exitCode}.`);
                toast({
                  title: "Minecraft exited with error",
                  description: `Exit code: ${e.payload.exitCode}`,
                  variant: "error",
                });
                logger.error("launch", `Game crashed with exit code ${e.payload.exitCode}`);
              } else {
                step("Minecraft exited normally.");
              }
            }
          }
        });

        step("Building launch command and starting Minecraft...");
        await invoke("launch_minecraft", {
          instanceId: instance.id,
          profile: {
            javaPath,
            mcVersion: instance.mcVersion,
            loader: instance.loader,
            loaderVersion: instance.loaderVersion ?? null,
            instanceDir: instance.installPath,
            gameDir: instance.gamePath,
            librariesDir,
            assetsDir,
            assetsIndex: instance.mcVersion.split(".").slice(0, 2).join("."),
            minRamMb: settings.minRamMb,
            maxRamMb: settings.maxRamMb,
            extraJvmArgs: extraJvm,
            extraGameArgs: extraGame,
            username: selectedAccount.username,
            uuid: selectedAccount.uuid,
            accessToken,
            clientId: "",
            userType,
            resolutionWidth: settings.defaultWidth || null,
            resolutionHeight: settings.defaultHeight || null,
            fullscreen: settings.fullscreen,
            mainClass: null,
            classpath: [],
          },
        });

        logger.info("launch", `Launched ${instance.packName} for ${selectedAccount.username}`);
      } catch (e: any) {
        const msg = typeof e === "string" ? e : e?.message ?? String(e);
        addGameLog(instance.id, `Launch failed: ${msg}`, "stderr");
        toast({ title: "Launch failed", description: msg, variant: "error" });
        logger.error("launch", `Launch failed for ${instance.packName}: ${msg}`);
        setStatus(instance.id, "idle");
        setRunning(instance.id, false);
      }
    },
    [selectedAccount, settings]
  );

  const stop = useCallback(async (instanceId: string) => {
    try {
      await invoke("kill_minecraft", { instanceId });
    } catch {}
  }, []);

  return { launch, stop };
}
