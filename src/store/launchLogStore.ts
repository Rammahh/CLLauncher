import { create } from "zustand";

interface LaunchLogState {
  open: boolean;
  instanceId: string | null;
  packName: string;
  exitCode: number | null;
  openFor: (instanceId: string, packName: string) => void;
  close: () => void;
  setExitCode: (code: number | null) => void;
}

export const useLaunchLogStore = create<LaunchLogState>((set) => ({
  open: false,
  instanceId: null,
  packName: "",
  exitCode: null,

  openFor: (instanceId, packName) =>
    set({ open: true, instanceId, packName, exitCode: null }),

  close: () => set({ open: false }),

  setExitCode: (code) => set({ exitCode: code }),
}));
