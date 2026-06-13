import { apiFetch } from "./client";
import type {
  LauncherConfig,
  NewsPost,
  ModpackSummary,
  ModpackDetails,
  ModpackVersion,
  ModpackManifest,
  ServerSummary,
  ServerStatus,
} from "@/types";

// The backend uses different field names than the frontend types
// (minecraftVersion vs mcVersion, loaderType vs loader, etc.).
// Normalize at the API boundary so the rest of the app sees one shape.

function normalizeModpack(raw: any): ModpackSummary {
  return {
    ...raw,
    mcVersion: raw.mcVersion ?? raw.minecraftVersion ?? "",
    loader: raw.loader ?? raw.loaderType ?? "vanilla",
    loaderVersion: raw.loaderVersion ?? undefined,
    latestVersion: raw.latestVersion ?? raw.latestVersionId ?? "",
    recommendedRam: raw.recommendedRam ?? raw.recommendedRamMb,
    minRam: raw.minRam ?? raw.minimumRamMb,
    tags: raw.tags ?? [],
    categories: raw.categories ?? [],
  };
}

function normalizeModpackDetails(raw: any): ModpackDetails {
  return {
    ...normalizeModpack(raw),
    fullDescription: raw.fullDescription ?? raw.description,
    requiredJava: raw.requiredJava ?? raw.requiredJavaVersion,
    versions: Array.isArray(raw.versions)
      ? raw.versions.map(normalizeVersion)
      : undefined,
  };
}

function normalizeVersion(raw: any): ModpackVersion {
  return {
    ...raw,
    id: raw.versionId ?? raw.id,
    packId: raw.packId ?? raw.modpackId,
    version: raw.version ?? raw.versionId ?? raw.name,
    mcVersion: raw.mcVersion ?? raw.minecraftVersion ?? "",
    loader: raw.loader ?? raw.loaderType ?? "vanilla",
    loaderVersion: raw.loaderVersion ?? "",
    releaseType: raw.releaseType === "stable" ? "release" : (raw.releaseType ?? "release"),
    createdAt: raw.createdAt ?? raw.publishedAt,
  };
}

function normalizeManifest(raw: any): ModpackManifest {
  return {
    ...raw,
    mcVersion: raw.mcVersion ?? raw.minecraftVersion ?? "",
    loader: raw.loader ?? raw.loaderType ?? "vanilla",
    requiredJava: raw.requiredJava ?? raw.javaMajorVersion,
    minRam: raw.minRam ?? raw.minimumRamMb,
    recommendedRam: raw.recommendedRam ?? raw.recommendedRamMb,
    files: raw.files ?? [],
    manifestHash: raw.manifestHash,
    archiveUrl: raw.archiveUrl ?? raw.archive?.url,
    archive: raw.archive,
  };
}

function normalizeNewsPost(raw: any): NewsPost {
  return {
    ...raw,
    slug: raw.slug ?? raw.id,
    body: raw.body ?? raw.content ?? "",
    excerpt: raw.excerpt ?? raw.summary ?? null,
    imageUrl: raw.imageUrl ?? null,
    tags: raw.tags ?? (raw.category ? [raw.category] : []),
    publishedAt: raw.publishedAt ?? raw.createdAt ?? null,
    createdAt: raw.createdAt ?? raw.publishedAt ?? new Date(0).toISOString(),
    updatedAt: raw.updatedAt ?? raw.publishedAt ?? raw.createdAt ?? new Date(0).toISOString(),
  };
}

function normalizeServer(raw: any): ServerStatus {
  const statusText = String(raw.status ?? "").toLowerCase();
  const online =
    typeof raw.online === "boolean"
      ? raw.online
      : statusText === "online" || statusText === "degraded";

  return {
    ...raw,
    id: raw.id,
    name: raw.name,
    ip: raw.ip ?? raw.host ?? "",
    port: Number(raw.port ?? 25565),
    description: raw.description ?? null,
    iconUrl: raw.iconUrl ?? raw.icon ?? null,
    linkedPackId: raw.linkedPackId ?? raw.modpackId ?? raw.packId,
    linkedPackName: raw.linkedPackName ?? raw.modpackName ?? raw.packName,
    enabled: raw.enabled ?? true,
    tags: raw.tags ?? [],
    online,
    status: statusText || (online ? "online" : "unknown"),
    playerCount: raw.playerCount ?? raw.onlinePlayers,
    maxPlayers: raw.maxPlayers,
    motd: raw.motd,
    version: raw.version,
    pingMs: raw.pingMs ?? raw.pingLatencyMs,
    lastChecked: raw.lastChecked ?? raw.lastCheckedAt,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export const api = {
  // Launcher config
  getConfig: () => apiFetch<LauncherConfig>("/launcher/config"),

  // News
  getNews: async () => {
    const raw = await apiFetch<any[]>("/launcher/news");
    return raw.map(normalizeNewsPost);
  },
  getNewsPost: async (id: string) => {
    const raw = await apiFetch<any>(`/launcher/news/${encodeURIComponent(id)}`);
    return normalizeNewsPost(raw);
  },

  // Modpacks
  getModpacks: async () => {
    const raw = await apiFetch<any[]>("/launcher/modpacks");
    return raw.map(normalizeModpack);
  },
  getModpack: async (packId: string) => {
    const raw = await apiFetch<any>(`/launcher/modpacks/${packId}`);
    return normalizeModpackDetails(raw);
  },

  // Versions
  getVersions: async (packId: string) => {
    const raw = await apiFetch<any[]>(`/launcher/modpacks/${packId}/versions`);
    return raw.map(normalizeVersion);
  },
  getVersion: async (packId: string, versionId: string) => {
    const raw = await apiFetch<any>(
      `/launcher/modpacks/${packId}/versions/${versionId}`
    );
    return normalizeVersion(raw);
  },
  getManifest: async (packId: string, versionId: string) => {
    const raw = await apiFetch<any>(
      `/launcher/modpacks/${packId}/versions/${versionId}/manifest`
    );
    return normalizeManifest(raw);
  },
  getChangelog: (packId: string, versionId: string) =>
    apiFetch<string>(
      `/launcher/modpacks/${packId}/versions/${versionId}/changelog`
    ),

  // Servers
  getServers: async () => {
    const raw = await apiFetch<any[]>("/launcher/servers");
    return raw.map(normalizeServer);
  },
  getServerStatus: async (id: string) => {
    const raw = await apiFetch<any>(`/launcher/servers/${encodeURIComponent(id)}/status`);
    return normalizeServer(raw);
  },
};
