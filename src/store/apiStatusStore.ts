import { create } from "zustand";

interface ApiStatusState {
  isOnline: boolean;
  lastChecked: string | null;
  setOnline: (online: boolean) => void;
}

export const useApiStatusStore = create<ApiStatusState>((set) => ({
  isOnline: true,
  lastChecked: null,
  setOnline: (isOnline) =>
    set({ isOnline, lastChecked: new Date().toISOString() }),
}));
