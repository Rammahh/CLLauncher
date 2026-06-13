import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow, format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Resolves a Minecraft head avatar for an account. Works for Microsoft
 *  accounts (by UUID) and offline accounts (by name, falls back to Steve). */
export function getAccountAvatarUrl(
  account: { uuid?: string; username: string; accountType?: string },
  size = 64
): string {
  const key =
    account.accountType === "microsoft" && account.uuid
      ? account.uuid
      : account.username;
  return `https://mc-heads.net/avatar/${encodeURIComponent(key)}/${size}`;
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export function formatSpeed(bps: number): string {
  return formatBytes(bps) + "/s";
}

export function formatEta(secs: number): string {
  if (secs <= 0 || !isFinite(secs)) return "--";
  if (secs < 60) return `${Math.round(secs)}s`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ${Math.round(secs % 60)}s`;
  return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`;
}

export function formatRelativeTime(dateStr: string): string {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch {
    return dateStr;
  }
}

export function formatDate(dateStr: string, fmt = "MMM d, yyyy"): string {
  try {
    return format(new Date(dateStr), fmt);
  } catch {
    return dateStr;
  }
}

export function maskToken(token: string): string {
  if (!token) return "";
  if (token.length <= 8) return "***";
  return token.slice(0, 4) + "***" + token.slice(-4);
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}
