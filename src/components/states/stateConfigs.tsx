import * as React from "react";
import {
  LogIn,
  CloudOff,
  ServerCrash,
  Rocket,
  Gamepad2,
  Bug,
  Coffee,
  MemoryStick,
  FileWarning,
  Wrench,
  UserX,
  type LucideIcon,
} from "lucide-react";
import { StateBanner, type StateVariant } from "./StateBanner";

/**
 * Registry of ready-made functional states for the launcher. Each entry is a
 * presentational preset (variant + icon + copy) that can be dropped into a
 * {@link StateBanner}, an EmptyState, or any custom shell. Descriptions accept
 * a runtime override so call sites can inject specifics (a Java path, a file
 * count, a crash code) without re-authoring the copy.
 */
export type StateKey =
  | "notLoggedIn"
  | "apiOffline"
  | "apiLoading"
  | "launching"
  | "gameRunning"
  | "gameCrashed"
  | "invalidJava"
  | "notEnoughRam"
  | "missingFiles"
  | "repairing"
  | "offlineMode";

export interface StateConfig {
  variant: StateVariant;
  icon: LucideIcon;
  title: string;
  description: string;
}

export const STATE_CONFIGS: Record<StateKey, StateConfig> = {
  notLoggedIn: {
    variant: "info",
    icon: LogIn,
    title: "You're not signed in",
    description:
      "Add a Microsoft account to play on online servers, or an offline account for offline-mode worlds.",
  },
  apiOffline: {
    variant: "warning",
    icon: CloudOff,
    title: "Can't reach CraftersLand",
    description:
      "The launcher is offline. Server status and the modpack catalog may be unavailable until the connection is restored.",
  },
  apiLoading: {
    variant: "loading",
    icon: CloudOff,
    title: "Connecting to CraftersLand…",
    description: "Fetching the latest data from the network.",
  },
  launching: {
    variant: "loading",
    icon: Rocket,
    title: "Launching Minecraft…",
    description: "Preparing Java, assets and the game window. Hang tight.",
  },
  gameRunning: {
    variant: "success",
    icon: Gamepad2,
    title: "Minecraft is running",
    description: "The game is live. Close it from inside Minecraft when you're done.",
  },
  gameCrashed: {
    variant: "error",
    icon: Bug,
    title: "Minecraft crashed",
    description:
      "The game exited unexpectedly. Check the launch log for details, or repair the instance.",
  },
  invalidJava: {
    variant: "error",
    icon: Coffee,
    title: "Java not found or invalid",
    description:
      "The configured Java path is missing or the wrong version. Set a valid Java path in Settings.",
  },
  notEnoughRam: {
    variant: "warning",
    icon: MemoryStick,
    title: "Not enough memory allocated",
    description:
      "This modpack needs more RAM than is currently assigned. Increase the memory limit in Settings.",
  },
  missingFiles: {
    variant: "warning",
    icon: FileWarning,
    title: "Files are missing",
    description:
      "Some required files are missing or corrupt. Repair the instance to download them again.",
  },
  repairing: {
    variant: "loading",
    icon: Wrench,
    title: "Repairing instance…",
    description: "Re-downloading and verifying files. This can take a few minutes.",
  },
  offlineMode: {
    variant: "warning",
    icon: UserX,
    title: "Offline mode",
    description:
      "You're signed in with an offline account. Online and premium-only servers won't accept this account.",
  },
} as const;

/** Loose, also-usable export so callers can map status strings to icons. */
export {
  LogIn,
  CloudOff,
  ServerCrash,
  Rocket,
  Gamepad2,
  Bug,
  Coffee,
  MemoryStick,
  FileWarning,
  Wrench,
  UserX,
};

export interface StateMessageProps {
  /** Which ready-made state to render. */
  state: StateKey;
  /** Override the preset description (e.g. inject a path or count). */
  description?: React.ReactNode;
  /** Override the preset title. */
  title?: string;
  /** Optional trailing action. */
  action?: React.ReactNode;
  compact?: boolean;
  className?: string;
}

/**
 * Convenience wrapper that renders a {@link StateBanner} from a ready-made
 * {@link STATE_CONFIGS} preset. Adopt anywhere a functional state needs to be
 * surfaced; override `title`/`description`/`action` for context.
 */
export function StateMessage({
  state,
  description,
  title,
  action,
  compact,
  className,
}: StateMessageProps) {
  const cfg = STATE_CONFIGS[state];
  return (
    <StateBanner
      variant={cfg.variant}
      icon={cfg.icon}
      title={title ?? cfg.title}
      description={description ?? cfg.description}
      action={action}
      compact={compact}
      className={className}
    />
  );
}
