export const queryKeys = {
  config: ["launcher", "config"] as const,
  news: ["launcher", "news"] as const,
  newsPost: (id: string) => ["launcher", "news", id] as const,
  modpacks: ["modpacks"] as const,
  modpack: (id: string) => ["modpacks", id] as const,
  versions: (packId: string) => ["modpacks", packId, "versions"] as const,
  version: (packId: string, versionId: string) =>
    ["modpacks", packId, "versions", versionId] as const,
  manifest: (packId: string, versionId: string) =>
    ["modpacks", packId, "versions", versionId, "manifest"] as const,
  changelog: (packId: string, versionId: string) =>
    ["modpacks", packId, "versions", versionId, "changelog"] as const,
  servers: ["servers"] as const,
  serverStatus: (id: string) => ["servers", id, "status"] as const,
};
