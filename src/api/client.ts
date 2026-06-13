import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { useSettingsStore } from "@/store/settingsStore";

export const DEFAULT_API_URL = "https://apiv1.clbackend.net";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data: unknown = null
  ) {
    super(message);
    this.name = "ApiError";
  }

  get isOffline(): boolean {
    return this.status === 0;
  }
}

function getBaseUrl(): string {
  return useSettingsStore.getState().settings?.apiBaseUrl || DEFAULT_API_URL;
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const baseUrl = getBaseUrl().replace(/\/$/, "");
  const url = `${baseUrl}${path}`;

  let response: Response;
  try {
    response = await tauriFetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Launcher": "CLLauncher/2.0",
      },
      ...options,
    });
  } catch {
    throw new ApiError(0, "Network unreachable", null);
  }

  if (!response.ok) {
    let data: unknown = null;
    try { data = await response.json(); } catch { /* ignore */ }
    const message =
      (data as any)?.message || (data as any)?.error || `HTTP ${response.status}`;
    throw new ApiError(response.status, message, data);
  }

  return response.json() as Promise<T>;
}

// Legacy compat — kept so any remaining axios import paths don't break at compile time
export function getApiClient() {
  return { get: <T>(path: string) => apiFetch<T>(path) };
}
export function resetApiClient() {}
