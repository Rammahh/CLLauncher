// ─── Core API Models ──────────────────────────────────────────────────────────

export interface LauncherConfig {
  announcement?: string;
  minVersion?: string;
  latestVersion?: string;
  downloadUrl?: string;
  maintenanceMode?: boolean;
  maintenanceMessage?: string;
  discordUrl?: string;
  websiteUrl?: string;
  forumUrl?: string;
}

export interface NewsPost {
  id: string;
  title: string;
  slug: string;
  body: string;
  excerpt?: string | null;
  imageUrl?: string | null;
  author: string;
  tags: string[];
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ModpackSummary {
  id: string;
  name: string;
  slug: string;
  description: string;
  iconUrl?: string;
  bannerUrl?: string;
  mcVersion: string;
  loader: LoaderType;
  loaderVersion?: string;
  latestVersion: string;
  recommendedRam?: number;
  minRam?: number;
  tags: string[];
  categories: string[];
  featured?: boolean;
  status?: "active" | "archived" | "beta";
  playerCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ModpackDetails extends ModpackSummary {
  fullDescription?: string;
  screenshots?: string[];
  serverIp?: string;
  serverPort?: number;
  requiredJava?: number;
  changelog?: string;
  versions?: ModpackVersion[];
  links?: Record<string, string>;
}

export interface ModpackVersion {
  id: string;
  packId: string;
  version: string;
  mcVersion: string;
  loader: LoaderType;
  loaderVersion: string;
  changelog?: string;
  releaseType: "release" | "beta" | "alpha";
  createdAt: string;
  fileCount?: number;
  totalSize?: number;
}

export interface ModpackManifest {
  packId: string;
  versionId: string;
  version: string;
  files: ManifestFile[];
  mcVersion: string;
  loader: LoaderType;
  loaderVersion: string;
  requiredJava?: number;
  minRam?: number;
  recommendedRam?: number;
  jvmArgs?: string[];
  gameArgs?: string[];
  manifestHash?: string;
  archiveUrl?: string;
  archive?: {
    url: string;
    format: string;
    strategy: string;
  };
}

export interface InstallState {
  packId: string;
  versionId: string;
  manifestHash?: string;
  installedAt: string;
  installMode: "archive" | "manifest";
}

export interface ManifestFile {
  path: string;
  url?: string;
  sha256?: string;
  size?: number;
  type?: "mod" | "config" | "resource" | "shader" | "library" | "other";
  side?: "client" | "server" | "both";
  required?: boolean;
  optional?: boolean;
  action?: "download" | "delete" | "skip";
  group?: string;
  description?: string;
}

// ─── Installed Instances ──────────────────────────────────────────────────────

export type InstanceStatus =
  | "idle"
  | "installing"
  | "updating"
  | "repairing"
  | "launching"
  | "running"
  | "error";

export interface InstalledInstance {
  id: string;
  packId: string;
  packName: string;
  iconUrl?: string;
  installedVersion: string;
  latestVersion?: string;
  mcVersion: string;
  loader: LoaderType;
  loaderVersion: string;
  installPath: string;
  gamePath: string;
  lastPlayed?: string;
  installDate: string;
  diskSizeBytes?: number;
  status: InstanceStatus;
  enabledOptional: string[];
  settings?: InstanceSettings;
}

// ─── Accounts ─────────────────────────────────────────────────────────────────

export type AccountType = "microsoft" | "offline";

export interface BaseAccount {
  id: string;
  username: string;
  uuid: string;
  accountType: AccountType;
  addedAt: string;
  selected?: boolean;
  avatarUrl?: string;
}

export interface MicrosoftAccount extends BaseAccount {
  accountType: "microsoft";
  expiresAt?: number;
  needsRefresh?: boolean;
}

export interface OfflineAccount extends BaseAccount {
  accountType: "offline";
}

export type Account = MicrosoftAccount | OfflineAccount;

// ─── Java ─────────────────────────────────────────────────────────────────────

export interface JavaInstallation {
  path: string;
  version: string;
  majorVersion: number;
  vendor: string;
  arch: string;
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export type Theme = "dark" | "light" | "system";

export interface LauncherSettings {
  theme: Theme;
  language: string;
  apiBaseUrl: string;
  installDir: string;
  cacheDir: string;
  downloadThreads: number;
  downloadSpeedLimitKbps: number;
  keepLauncherOpen: boolean;
  closeLauncherOnLaunch: boolean;
  enableDebugLogs: boolean;
  enableDiscordRpc: boolean;
  experimentalFeatures: boolean;

  // Minecraft
  autoDetectJava: boolean;
  javaPath: string;
  minRamMb: number;
  maxRamMb: number;
  defaultWidth: number;
  defaultHeight: number;
  fullscreen: boolean;
  extraJvmArgs: string;
  extraGameArgs: string;
  checkHashesBeforeLaunch: boolean;
  autoUpdateBeforeLaunch: boolean;
}

export interface InstanceSettings {
  overrideJavaPath?: string;
  overrideMinRamMb?: number;
  overrideMaxRamMb?: number;
  overrideJvmArgs?: string;
  overrideWidth?: number;
  overrideHeight?: number;
  enabledOptional: string[];
}

// ─── Downloads ────────────────────────────────────────────────────────────────

export type DownloadStatus = "pending" | "downloading" | "extracting" | "verifying" | "complete" | "error" | "cancelled";

export interface DownloadTask {
  taskId: string;
  instanceId: string;
  fileName: string;
  bytesDownloaded: number;
  totalBytes: number;
  speedBps: number;
  etaSecs: number;
  status: DownloadStatus;
  error?: string;
}

export interface InstallProgress {
  instanceId: string;
  status: DownloadStatus | "complete";
  currentFile: string;
  filesDone: number;
  filesTotal: number;
  bytesDownloaded: number;
  totalBytes: number;
  speedBps: number;
  etaSecs: number;
  error?: string;
}

// ─── Launch ───────────────────────────────────────────────────────────────────

export interface LaunchProfile {
  javaPath: string;
  mcVersion: string;
  loader: LoaderType;
  loaderVersion?: string;
  instanceDir: string;
  gameDir: string;
  librariesDir: string;
  assetsDir: string;
  assetsIndex: string;
  minRamMb: number;
  maxRamMb: number;
  extraJvmArgs: string[];
  extraGameArgs: string[];
  username: string;
  uuid: string;
  accessToken: string;
  clientId: string;
  userType: string;
  resolutionWidth?: number;
  resolutionHeight?: number;
  fullscreen: boolean;
  mainClass?: string;
  classpath: string[];
}

// ─── Servers ──────────────────────────────────────────────────────────────────

export interface ServerSummary {
  id: string;
  name: string;
  ip: string;
  port: number;
  description?: string | null;
  iconUrl?: string | null;
  linkedPackId?: string;
  linkedPackName?: string;
  enabled?: boolean;
  tags?: string[];
}

export interface ServerStatus extends ServerSummary {
  online: boolean;
  status?: "online" | "offline" | "degraded" | "unknown" | string;
  playerCount?: number;
  maxPlayers?: number;
  motd?: string;
  version?: string;
  pingMs?: number;
  lastChecked?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Loader ───────────────────────────────────────────────────────────────────

export type LoaderType = "vanilla" | "forge" | "neoforge" | "fabric" | "quilt";

export const LOADER_LABELS: Record<LoaderType, string> = {
  vanilla: "Vanilla",
  forge: "Forge",
  neoforge: "NeoForge",
  fabric: "Fabric",
  quilt: "Quilt",
};

export const LOADER_COLORS: Record<LoaderType, string> = {
  vanilla: "#5C8E3A",
  forge: "#E67E22",
  neoforge: "#F39C12",
  fabric: "#DBD0B4",
  quilt: "#6E3D9E",
};

// ─── Misc ─────────────────────────────────────────────────────────────────────

export interface ApiError {
  kind: string;
  message: string;
}

export interface GameLogEvent {
  instanceId: string;
  line: string;
  stream: "stdout" | "stderr" | "launcher";
}

export interface GameStatusEvent {
  instanceId: string;
  status: string;
  exitCode?: number;
}

export interface DeviceCodeResponse {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  expiresIn: number;
  interval: number;
  message: string;
}

export interface OptionalModGroup {
  group: string;
  description?: string;
  files: ManifestFile[];
}
