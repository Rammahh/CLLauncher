import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { InstalledInstance, InstanceStatus, InstallProgress } from "@/types";

interface InstallProgressState {
  [instanceId: string]: InstallProgress;
}

interface InstanceState {
  instances: Record<string, InstalledInstance>;
  installProgress: InstallProgressState;
  runningInstances: Set<string>;

  addInstance: (instance: InstalledInstance) => void;
  updateInstance: (id: string, updates: Partial<InstalledInstance>) => void;
  removeInstance: (id: string) => void;
  setInstanceStatus: (id: string, status: InstanceStatus) => void;
  setInstallProgress: (instanceId: string, progress: InstallProgress) => void;
  clearInstallProgress: (instanceId: string) => void;
  setRunning: (instanceId: string, running: boolean) => void;
  getInstances: () => InstalledInstance[];
}

export const useInstanceStore = create<InstanceState>()(
  persist(
    (set, get) => ({
      instances: {},
      installProgress: {},
      runningInstances: new Set(),

      addInstance: (instance) =>
        set((state) => ({
          instances: { ...state.instances, [instance.id]: instance },
        })),

      updateInstance: (id, updates) =>
        set((state) => {
          if (!state.instances[id]) return state;
          return {
            instances: {
              ...state.instances,
              [id]: { ...state.instances[id], ...updates },
            },
          };
        }),

      removeInstance: (id) =>
        set((state) => {
          const { [id]: _, ...rest } = state.instances;
          return { instances: rest };
        }),

      setInstanceStatus: (id, status) =>
        set((state) => {
          if (!state.instances[id]) return state;
          return {
            instances: {
              ...state.instances,
              [id]: { ...state.instances[id], status },
            },
          };
        }),

      setInstallProgress: (instanceId, progress) =>
        set((state) => ({
          installProgress: {
            ...state.installProgress,
            [instanceId]: progress,
          },
        })),

      clearInstallProgress: (instanceId) =>
        set((state) => {
          const { [instanceId]: _, ...rest } = state.installProgress;
          return { installProgress: rest };
        }),

      setRunning: (instanceId, running) =>
        set((state) => {
          const next = new Set(state.runningInstances);
          if (running) next.add(instanceId);
          else next.delete(instanceId);
          return { runningInstances: next };
        }),

      getInstances: () => Object.values(get().instances),
    }),
    {
      name: "cl-launcher-instances",
      version: 2,
      partialize: (state) => ({ instances: state.instances }),
      migrate: (persisted: any) => {
        // Purge corrupt stub records left by early failed installs
        const instances: Record<string, InstalledInstance> = {};
        for (const [key, inst] of Object.entries<any>(persisted?.instances ?? {})) {
          if (inst && inst.id && inst.packId && inst.packName) {
            instances[key] = { ...inst, status: "idle" };
          }
        }
        return { instances };
      },
    }
  )
);
