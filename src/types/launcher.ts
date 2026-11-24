export type ModLoaderType = 'vanilla' | 'fabric' | 'quilt' | 'neoforge' | 'forge' | 'optifine';
export type AccountType = 'microsoft' | 'offline' | 'yggdrasil';

export type ThemeId =
  | 'VERDANT_DAWN'
  | 'EMBERMIRE'
  | 'VELVET_ROSE'
  | 'MISTWAVE'
  | 'GLACIER'
  | 'VERDANTFIELD'
  | 'URBAN_ASH'
  | 'CUSTOM';

export type FestivalEffectId =
  | 'none'
  | 'fireflies'
  | 'snow'
  | 'rain'
  | 'fireworks'
  | 'hearts'
  | 'bats';

export interface LauncherAccount {
  id: string;
  username: string;
  uuid: string;
  type: AccountType;
  accessToken: string;
  refreshToken?: string;
  authServerUrl?: string;
  skinUrl?: string;
  capeUrl?: string;
  skinModel: 'classic' | 'slim';
  createdAt: number;
  lastUsedAt: number;
}

export interface JavaRuntimeInfo {
  id: string;
  name: string;
  path: string;
  version: string;
  major: number;
  vendor: string;
  arch: string;
  managed: boolean;
}

export interface MinecraftInstance {
  id: string;
  name: string;
  mcVersion: string;
  loader: ModLoaderType;
  loaderVersion?: string;
  icon: string;
  createdAt: number;
  lastPlayedAt?: number;
  totalPlayTimeMs: number;
  launchCount: number;
  pinned?: boolean;
  javaPathOverride?: string;
  ramMbOverride?: number;
  jvmArgsOverride?: string;
  resolutionWidth?: number;
  resolutionHeight?: number;
  isolated: boolean;
  readyState: 'ready' | 'metadata_only';
  servers: Array<{ name: string; address: string }>;
}

export interface LauncherSettings {
  theme: ThemeId;
  customThemeHex: string;
  darkMode: boolean;
  language: 'en' | 'hi';
  backgroundType: 'default_video' | 'hero_image' | 'custom_image' | 'custom_video';
  customBackgroundUrl: string;
  backgroundOpacity: number;
  backgroundBlur: number;
  festivalEffect: FestivalEffectId;
  customCursor: boolean;
  showWelcomeOnStartup: boolean;
  legalAcceptedVersion: string;
  guideCompleted: boolean;
  dismissedNoticeNumber: number;
  defaultRamMb: number;
  minRamMb: number;
  gcPreset: 'g1gc_aikar' | 'zgc_gen' | 'low_ram' | 'custom';
  customJvmArgs: string;
  windowWidth: number;
  windowHeight: number;
  fullscreen: boolean;
  minimizeOnLaunch: boolean;
  preferDedicatedGpu: boolean;
  isolatedInstancesByDefault: boolean;
  downloadThreads: number;
  downloadMirror: 'official' | 'bmclapi';
  curseforgeApiKey: string;
  discordRpcEnabled: boolean;
  discordAppId: string;
}

export interface LauncherTask {
  id: string;
  title: string;
  subtitle: string;
  progress: number;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  speedText?: string;
  error?: string;
  startedAt: number;
}

export interface CrashAnalysisReport {
  hasCrash: boolean;
  severity: 'info' | 'warning' | 'critical';
  titleEn: string;
  titleHi: string;
  summaryEn: string;
  summaryHi: string;
  suggestions: string[];
  matchedLine?: string;
}

export interface TerracottaState {
  mode: 'idle' | 'hosting' | 'joined';
  roomCode: string;
  localPort: number;
  targetPort: number;
  peersCount: number;
  startedAt?: number;
  logs: string[];
}

export interface FavoriteAsset {
  id: string;
  source: 'modrinth' | 'curseforge';
  type: string;
  title: string;
  iconUrl?: string;
  summary?: string;
}

export interface BootstrapState {
  system: {
    platform: string;
    arch: string;
    release: string;
    hostname: string;
    cpuModel: string;
    cpuCores: number;
    totalRamMb: number;
    freeRamMb: number;
    dataRoot: string;
    minecraftRoot: string;
    nodeVersion: string;
  };
  settings: LauncherSettings;
  accounts: LauncherAccount[];
  activeAccountId: string | null;
  instances: MinecraftInstance[];
  activeInstanceId: string | null;
  javaRuntimes: JavaRuntimeInfo[];
  playtimeByDate: Record<string, Record<string, number>>;
  favorites: FavoriteAsset[];
  customHomeMarkdown: string;
  tasks: LauncherTask[];
  runningInstanceIds: string[];
  terracotta: TerracottaState;
}

export type ScreenRoute =
  | { name: 'home' }
  | { name: 'accounts'; tab?: 'accounts' | 'capes' }
  | { name: 'versions'; selectedId?: string }
  | { name: 'version_settings'; instanceId: string; tab?: string }
  | { name: 'download'; tab?: 'game' | 'modpack' | 'mod' | 'resourcepack' | 'saves' | 'shader' | 'favorites' }
  | { name: 'social' }
  | { name: 'multiplayer' }
  | { name: 'logs'; instanceId?: string }
  | { name: 'stats'; tab?: 'playtime' | 'gamestats' | 'screenshots' | 'home_editor' }
  | { name: 'settings'; tab?: 'appearance' | 'game' | 'java' | 'downloads' | 'about' };
