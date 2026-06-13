import { create } from "zustand";

export type LogLevel = "info" | "warn" | "error" | "debug" | "game";

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  source: string;
  message: string;
}

interface LogState {
  launcherLogs: LogEntry[];
  gameLogs: Record<string, LogEntry[]>;
  maxLogs: number;

  addLauncherLog: (level: LogLevel, source: string, message: string) => void;
  addGameLog: (instanceId: string, line: string, stream: string) => void;
  clearLauncherLogs: () => void;
  clearGameLogs: (instanceId: string) => void;
  clearAllLogs: () => void;
  getLauncherLogs: () => LogEntry[];
  getGameLogs: (instanceId: string) => LogEntry[];
}

let logCounter = 0;
function nextId() {
  return `log-${Date.now()}-${++logCounter}`;
}

export const useLogStore = create<LogState>((set, get) => ({
  launcherLogs: [],
  gameLogs: {},
  maxLogs: 5000,

  addLauncherLog: (level, source, message) =>
    set((state) => {
      const entry: LogEntry = {
        id: nextId(),
        timestamp: new Date().toISOString(),
        level,
        source,
        message,
      };
      const logs = [...state.launcherLogs, entry];
      if (logs.length > state.maxLogs) logs.splice(0, logs.length - state.maxLogs);
      return { launcherLogs: logs };
    }),

  addGameLog: (instanceId, line, stream) =>
    set((state) => {
      const level: LogLevel =
        stream === "stderr" ? "error" : "game";
      const entry: LogEntry = {
        id: nextId(),
        timestamp: new Date().toISOString(),
        level,
        source: `game:${stream}`,
        message: line,
      };
      const existing = state.gameLogs[instanceId] ?? [];
      const logs = [...existing, entry];
      if (logs.length > state.maxLogs) logs.splice(0, logs.length - state.maxLogs);
      return { gameLogs: { ...state.gameLogs, [instanceId]: logs } };
    }),

  clearLauncherLogs: () => set({ launcherLogs: [] }),
  clearGameLogs: (instanceId) =>
    set((state) => ({
      gameLogs: { ...state.gameLogs, [instanceId]: [] },
    })),
  clearAllLogs: () => set({ launcherLogs: [], gameLogs: {} }),
  getLauncherLogs: () => get().launcherLogs,
  getGameLogs: (instanceId) => get().gameLogs[instanceId] ?? [],
}));

// Global logger helper
export const logger = {
  info: (source: string, msg: string) =>
    useLogStore.getState().addLauncherLog("info", source, msg),
  warn: (source: string, msg: string) =>
    useLogStore.getState().addLauncherLog("warn", source, msg),
  error: (source: string, msg: string) =>
    useLogStore.getState().addLauncherLog("error", source, msg),
  debug: (source: string, msg: string) =>
    useLogStore.getState().addLauncherLog("debug", source, msg),
};
