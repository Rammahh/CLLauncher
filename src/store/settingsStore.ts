import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LauncherSettings, Theme } from "@/types";

const defaultSettings: LauncherSettings = {
  theme: "dark",
  language: "en",
  apiBaseUrl: "https://apiv1.clbackend.net",
  installDir: "",
  cacheDir: "",
  downloadThreads: 4,
  downloadSpeedLimitKbps: 0,
  keepLauncherOpen: true,
  closeLauncherOnLaunch: false,
  enableDebugLogs: false,
  enableDiscordRpc: false,
  experimentalFeatures: false,

  autoDetectJava: true,
  javaPath: "",
  minRamMb: 512,
  maxRamMb: 4096,
  defaultWidth: 854,
  defaultHeight: 480,
  fullscreen: false,
  extraJvmArgs: "",
  extraGameArgs: "",
  checkHashesBeforeLaunch: true,
  autoUpdateBeforeLaunch: true,
};

interface SettingsState {
  settings: LauncherSettings;
  updateSettings: (partial: Partial<LauncherSettings>) => void;
  resetSettings: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      updateSettings: (partial) =>
        set((state) => ({
          settings: { ...state.settings, ...partial },
        })),
      resetSettings: () => set({ settings: defaultSettings }),
    }),
    {
      name: "cl-launcher-settings",
      version: 1,
    }
  )
);
