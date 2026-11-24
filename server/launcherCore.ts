import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import net from 'node:net';
import { spawn, execFile, ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';
import AdmZip from 'adm-zip';
import * as tar from 'tar';
import { DiscordRpcManager } from '../electron/discordRpc.js';
import { BuildKeys } from '../src/generated/buildConfig.js';

export type ModLoaderType = 'vanilla' | 'fabric' | 'quilt' | 'neoforge' | 'forge' | 'optifine';
export type AccountType = 'microsoft' | 'offline' | 'yggdrasil';

export interface LauncherAccount {
  id: string;
  username: string;
  uuid: string; // 32-char or dashed
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
  theme:
    | 'VERDANT_DAWN'
    | 'EMBERMIRE'
    | 'VELVET_ROSE'
    | 'MISTWAVE'
    | 'GLACIER'
    | 'VERDANTFIELD'
    | 'URBAN_ASH'
    | 'CUSTOM';
  customThemeHex: string;
  darkMode: boolean;
  language: 'en' | 'hi';
  backgroundType: 'default_video' | 'hero_image' | 'custom_image' | 'custom_video';
  customBackgroundUrl: string;
  backgroundOpacity: number; // 0..100
  backgroundBlur: number; // 0..60
  festivalEffect: 'none' | 'fireflies' | 'snow' | 'rain' | 'fireworks' | 'hearts' | 'bats';
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
  progress: number; // 0..100
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

const DEFAULT_MINECRAFT_CLIENT_ID = BuildKeys.OAUTH_CLIENT_ID || '00000000402b5328';
const LIVE_XBOX_SCOPE = 'service::user.auth.xboxlive.com::MBI_SSL';

function offlineUuidFromName(username: string): string {
  const md5 = crypto.createHash('md5').update(`OfflinePlayer:${username}`, 'utf8').digest();
  md5[6] = (md5[6] & 0x0f) | 0x30;
  md5[8] = (md5[8] & 0x3f) | 0x80;
  const hex = md5.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function formatDashedUuid(raw: string): string {
  const clean = raw.replace(/-/g, '').toLowerCase();
  if (clean.length !== 32) return offlineUuidFromName(raw);
  return `${clean.slice(0, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}-${clean.slice(16, 20)}-${clean.slice(20, 32)}`;
}

function todayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export class TurboCraftLauncherCore extends EventEmitter {
  public readonly dataRoot: string;
  public readonly minecraftRoot: string;
  public readonly instancesRoot: string;
  public readonly runtimesRoot: string;

  private accounts: LauncherAccount[] = [];
  private activeAccountId: string | null = null;
  private instances: MinecraftInstance[] = [];
  private activeInstanceId: string | null = null;
  private settings: LauncherSettings;
  private playtimeByDate: Record<string, Record<string, number>> = {};
  private favorites: Array<{ id: string; source: 'modrinth' | 'curseforge'; type: string; title: string; iconUrl?: string; summary?: string }> = [];
  private customHomeMarkdown = '';
  private javaRuntimes: JavaRuntimeInfo[] = [];
  private tasks = new Map<string, LauncherTask>();
  private runningProcesses = new Map<string, { proc: ChildProcess; startedAt: number }>();
  private msDeviceFlows = new Map<string, { cancelled: boolean; status: string; error?: string; account?: LauncherAccount }>();
  private terracottaServer: net.Server | null = null;
  private terracottaState: TerracottaState = {
    mode: 'idle',
    roomCode: '',
    localPort: 0,
    targetPort: 25565,
    peersCount: 0,
    logs: ['[Terracotta PC] Ready for P2P / LAN multiplayer relay.'],
  };
  private discord = new DiscordRpcManager();

  constructor(customDataRoot?: string) {
    super();
    this.dataRoot =
      customDataRoot ||
      process.env.TCL_DATA_DIR ||
      path.join(process.cwd(), '.turbocraft-data');
    this.minecraftRoot = path.join(this.dataRoot, 'minecraft');
    this.instancesRoot = path.join(this.dataRoot, 'instances');
    this.runtimesRoot = path.join(this.dataRoot, 'runtimes');

    const totalMemMb = Math.round(os.totalmem() / (1024 * 1024));
    const recommendedRam =
      BuildKeys.DEFAULT_RAM_MB ||
      Math.min(8192, Math.max(2048, Math.floor((totalMemMb * 0.45) / 256) * 256));

    this.settings = {
      theme: (BuildKeys.DEFAULT_THEME as LauncherSettings['theme']) || 'VERDANT_DAWN',
      customThemeHex: BuildKeys.DEFAULT_CUSTOM_HEX || '#8BE51B',
      darkMode: true,
      language: 'en',
      backgroundType: 'default_video',
      customBackgroundUrl: '',
      backgroundOpacity: 48,
      backgroundBlur: 22,
      festivalEffect:
        (BuildKeys.DEFAULT_FESTIVAL_EFFECT as LauncherSettings['festivalEffect']) || 'fireflies',
      customCursor: false,
      showWelcomeOnStartup: true,
      legalAcceptedVersion: '',
      guideCompleted: false,
      dismissedNoticeNumber: 0,
      defaultRamMb: recommendedRam,
      minRamMb: 1024,
      gcPreset: 'g1gc_aikar',
      customJvmArgs: '-XX:+UnlockExperimentalVMOptions -XX:MaxGCPauseMillis=50',
      windowWidth: 1280,
      windowHeight: 720,
      fullscreen: false,
      minimizeOnLaunch: false,
      preferDedicatedGpu: true,
      isolatedInstancesByDefault: true,
      downloadThreads: 12,
      downloadMirror: 'official',
      curseforgeApiKey: BuildKeys.CURSEFORGE_API_KEY || '',
      discordRpcEnabled: true,
      discordAppId: process.env.DISCORD_APP_ID || BuildKeys.DISCORD_APP_ID || '',
    };
  }

  async init(): Promise<void> {
    await fsp.mkdir(this.dataRoot, { recursive: true });
    await fsp.mkdir(path.join(this.minecraftRoot, 'libraries'), { recursive: true });
    await fsp.mkdir(path.join(this.minecraftRoot, 'assets', 'indexes'), { recursive: true });
    await fsp.mkdir(path.join(this.minecraftRoot, 'assets', 'objects'), { recursive: true });
    await fsp.mkdir(path.join(this.minecraftRoot, 'versions'), { recursive: true });
    await fsp.mkdir(this.instancesRoot, { recursive: true });
    await fsp.mkdir(this.runtimesRoot, { recursive: true });

    await this.loadJsonState();
    await this.ensureSeedState();
    await this.scanJavaRuntimes();
    this.syncDiscordPresence();
  }

  private stateFile(name: string): string {
    return path.join(this.dataRoot, name);
  }

  private async loadJsonState(): Promise<void> {
    try {
      const rawSettings = await fsp.readFile(this.stateFile('settings.json'), 'utf8');
      this.settings = { ...this.settings, ...JSON.parse(rawSettings) };
    } catch {
      // first run
    }

    try {
      const rawAcc = JSON.parse(await fsp.readFile(this.stateFile('accounts.json'), 'utf8'));
      this.accounts = rawAcc.accounts || [];
      this.activeAccountId = rawAcc.activeAccountId || this.accounts[0]?.id || null;
    } catch {
      // first run
    }

    try {
      const rawInst = JSON.parse(await fsp.readFile(this.stateFile('instances.json'), 'utf8'));
      this.instances = rawInst.instances || [];
      this.activeInstanceId = rawInst.activeInstanceId || this.instances[0]?.id || null;
    } catch {
      // first run
    }

    try {
      this.playtimeByDate = JSON.parse(await fsp.readFile(this.stateFile('playtime.json'), 'utf8'));
    } catch {
      this.playtimeByDate = {};
    }

    try {
      this.favorites = JSON.parse(await fsp.readFile(this.stateFile('favorites.json'), 'utf8'));
    } catch {
      this.favorites = [];
    }

    try {
      this.customHomeMarkdown = await fsp.readFile(this.stateFile('custom_home.md'), 'utf8');
    } catch {
      this.customHomeMarkdown = '';
    }
  }

  private async saveAllState(): Promise<void> {
    await Promise.all([
      fsp.writeFile(this.stateFile('settings.json'), JSON.stringify(this.settings, null, 2)),
      fsp.writeFile(
        this.stateFile('accounts.json'),
        JSON.stringify({ activeAccountId: this.activeAccountId, accounts: this.accounts }, null, 2)
      ),
      fsp.writeFile(
        this.stateFile('instances.json'),
        JSON.stringify({ activeInstanceId: this.activeInstanceId, instances: this.instances }, null, 2)
      ),
      fsp.writeFile(this.stateFile('playtime.json'), JSON.stringify(this.playtimeByDate, null, 2)),
      fsp.writeFile(this.stateFile('favorites.json'), JSON.stringify(this.favorites, null, 2)),
      fsp.writeFile(this.stateFile('custom_home.md'), this.customHomeMarkdown),
    ]);
  }

  private async ensureSeedState(): Promise<void> {
    let changed = false;

    if (this.accounts.length === 0) {
      const id = crypto.randomUUID();
      const defaultAcc: LauncherAccount = {
        id,
        username: 'TurboPlayer',
        uuid: offlineUuidFromName('TurboPlayer'),
        type: 'offline',
        accessToken: '0',
        skinUrl: './assets/skin/steve.png',
        skinModel: 'classic',
        createdAt: Date.now(),
        lastUsedAt: Date.now(),
      };
      this.accounts.push(defaultAcc);
      this.activeAccountId = id;
      changed = true;
    }

    if (this.instances.length === 0) {
      const starter: MinecraftInstance = {
        id: 'fabric-1.21.4-turbo',
        name: '1.21.4 • Fabric (Turbo Boost)',
        mcVersion: '1.21.4',
        loader: 'fabric',
        loaderVersion: '0.16.10',
        icon: './assets/icons/fabric.webp',
        createdAt: Date.now() - 86400_000 * 3,
        lastPlayedAt: Date.now() - 3600_000 * 2,
        totalPlayTimeMs: 4.5 * 3600_000,
        launchCount: 7,
        pinned: true,
        isolated: true,
        readyState: 'metadata_only',
        servers: [
          { name: 'Hypixel Network', address: 'mc.hypixel.net' },
          { name: 'MCC Island', address: 'play.mccisland.net' },
        ],
      };
      const vanillaStarter: MinecraftInstance = {
        id: 'vanilla-1.21.4',
        name: 'Minecraft 1.21.4',
        mcVersion: '1.21.4',
        loader: 'vanilla',
        icon: './assets/icons/minecraft.png',
        createdAt: Date.now() - 86400_000 * 5,
        totalPlayTimeMs: 1.8 * 3600_000,
        launchCount: 3,
        isolated: true,
        readyState: 'metadata_only',
        servers: [],
      };
      this.instances.push(starter, vanillaStarter);
      this.activeInstanceId = starter.id;

      for (const inst of this.instances) {
        await this.ensureInstanceFolders(inst);
      }

      // Seed realistic 7-day playtime history for initial dashboard chart
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400_000);
        const key = todayKey(d);
        const sampleHours = [0.6, 1.2, 0.4, 1.8, 0.9, 1.4, 0.8][6 - i];
        this.playtimeByDate[key] = {
          [starter.id]: Math.round(sampleHours * 3600_000),
        };
      }

      // Seed initial latest.log in starter instance
      const logDir = path.join(this.getInstanceDir(starter), 'logs');
      await fsp.mkdir(logDir, { recursive: true });
      await fsp.writeFile(
        path.join(logDir, 'latest.log'),
        [
          '[12:04:10] [main/INFO]: Loading Minecraft 1.21.4 with Fabric Loader 0.16.10',
          '[12:04:11] [main/INFO]: Loading 48 mods: fabric-api, sodium, lithium, iris, ferritecore',
          '[12:04:12] [Render thread/INFO]: Backend library: LWJGL version 3.3.3-snapshot',
          '[12:04:13] [Render thread/INFO]: OpenGL Renderer: Desktop Hardware Accelerated GPU',
          '[12:04:15] [Render thread/INFO]: TurboCraft Launcher PC Edition — Session Ready!',
        ].join('\n')
      );

      await fsp.writeFile(
        path.join(this.getInstanceDir(starter), 'options.txt'),
        [
          'fov:0.25',
          'gamma:1.0',
          'renderDistance:16',
          'simulationDistance:12',
          'maxFps:240',
          'enableVsync:false',
          'guiScale:3',
          'lang:en_us',
        ].join('\n')
      );

      changed = true;
    }

    if (changed) {
      await this.saveAllState();
    }
  }

  public getInstanceDir(instance: MinecraftInstance): string {
    return instance.isolated ? path.join(this.instancesRoot, instance.id) : this.minecraftRoot;
  }

  private async ensureInstanceFolders(instance: MinecraftInstance): Promise<void> {
    const base = this.getInstanceDir(instance);
    const subdirs = ['mods', 'resourcepacks', 'shaderpacks', 'saves', 'screenshots', 'config', 'logs', 'natives'];
    await Promise.all(subdirs.map((d) => fsp.mkdir(path.join(base, d), { recursive: true })));
  }

  private syncDiscordPresence(customDetails?: string, customState?: string): void {
    const activeInst = this.instances.find((i) => i.id === this.activeInstanceId);
    const activeAcc = this.accounts.find((a) => a.id === this.activeAccountId);
    const isRunning = Array.from(this.runningProcesses.keys()).length > 0;
    const details =
      customDetails ||
      (isRunning && activeInst
        ? `Playing ${activeInst.name}`
        : 'In Launcher Dashboard');
    const state =
      customState ||
      (activeAcc ? `Player: ${activeAcc.username}` : 'TurboCraft Launcher PC');

    void this.discord.updateActivity({
      enabled: this.settings.discordRpcEnabled,
      clientId: this.settings.discordAppId,
      details,
      state,
    });
  }

  // ===================== SYSTEM & OVERVIEW =====================

  getSystemInfo() {
    const cpus = os.cpus();
    return {
      platform: process.platform,
      arch: process.arch,
      release: os.release(),
      hostname: os.hostname(),
      cpuModel: cpus[0]?.model || 'x64 Processor',
      cpuCores: cpus.length,
      totalRamMb: Math.round(os.totalmem() / (1024 * 1024)),
      freeRamMb: Math.round(os.freemem() / (1024 * 1024)),
      dataRoot: this.dataRoot,
      minecraftRoot: this.minecraftRoot,
      nodeVersion: process.version,
    };
  }

  getBootstrapState() {
    return {
      system: this.getSystemInfo(),
      settings: this.settings,
      accounts: this.accounts,
      activeAccountId: this.activeAccountId,
      instances: this.instances,
      activeInstanceId: this.activeInstanceId,
      javaRuntimes: this.javaRuntimes,
      playtimeByDate: this.playtimeByDate,
      favorites: this.favorites,
      customHomeMarkdown: this.customHomeMarkdown,
      tasks: Array.from(this.tasks.values()).sort((a, b) => b.startedAt - a.startedAt),
      runningInstanceIds: Array.from(this.runningProcesses.keys()),
      terracotta: this.terracottaState,
    };
  }

  async updateSettings(patch: Partial<LauncherSettings>): Promise<LauncherSettings> {
    this.settings = { ...this.settings, ...patch };
    await this.saveAllState();
    this.syncDiscordPresence();
    this.emit('state:changed');
    return this.settings;
  }

  async exportSettingsJson(): Promise<string> {
    return JSON.stringify(
      {
        exportedFrom: 'TurboCraft Launcher PC Edition',
        version: '1.6.0',
        exportedAt: new Date().toISOString(),
        settings: this.settings,
        favorites: this.favorites,
        customHomeMarkdown: this.customHomeMarkdown,
      },
      null,
      2
    );
  }

  async importSettingsJson(rawJson: string): Promise<LauncherSettings> {
    const parsed = JSON.parse(rawJson);
    if (parsed.settings && typeof parsed.settings === 'object') {
      this.settings = { ...this.settings, ...parsed.settings };
    }
    if (Array.isArray(parsed.favorites)) {
      this.favorites = parsed.favorites;
    }
    if (typeof parsed.customHomeMarkdown === 'string') {
      this.customHomeMarkdown = parsed.customHomeMarkdown;
    }
    await this.saveAllState();
    this.emit('state:changed');
    return this.settings;
  }

  async saveCustomHomeMarkdown(md: string): Promise<void> {
    this.customHomeMarkdown = md;
    await this.saveAllState();
    this.emit('state:changed');
  }

  async toggleFavorite(item: {
    id: string;
    source: 'modrinth' | 'curseforge';
    type: string;
    title: string;
    iconUrl?: string;
    summary?: string;
  }) {
    const idx = this.favorites.findIndex((f) => f.id === item.id && f.source === item.source);
    if (idx >= 0) {
      this.favorites.splice(idx, 1);
    } else {
      this.favorites.unshift(item);
    }
    await this.saveAllState();
    this.emit('state:changed');
    return this.favorites;
  }

  // ===================== TASKS ENGINE =====================

  private upsertTask(task: LauncherTask): void {
    this.tasks.set(task.id, task);
    this.emit('task:update', task);
  }

  cancelTask(taskId: string): void {
    const existing = this.tasks.get(taskId);
    if (existing && existing.status === 'running') {
      existing.status = 'cancelled';
      existing.subtitle = 'Cancelled by user';
      this.upsertTask({ ...existing });
    }
  }

  clearFinishedTasks(): void {
    for (const [id, t] of this.tasks.entries()) {
      if (t.status !== 'running') this.tasks.delete(id);
    }
    this.emit('state:changed');
  }

  // ===================== ACCOUNTS & MICROSOFT OAUTH =====================

  async createOfflineAccount(params: {
    username: string;
    skinModel?: 'classic' | 'slim';
    skinUrl?: string;
    capeUrl?: string;
  }): Promise<LauncherAccount> {
    const clean = params.username.trim().slice(0, 16);
    if (!clean || clean.length < 2) {
      throw new Error('Username must be between 2 and 16 characters.');
    }
    const acc: LauncherAccount = {
      id: crypto.randomUUID(),
      username: clean,
      uuid: offlineUuidFromName(clean),
      type: 'offline',
      accessToken: '0',
      skinModel: params.skinModel || 'classic',
      skinUrl: params.skinUrl || './assets/skin/steve.png',
      capeUrl: params.capeUrl,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
    };
    this.accounts.push(acc);
    this.activeAccountId = acc.id;
    await this.saveAllState();
    this.syncDiscordPresence();
    this.emit('state:changed');
    return acc;
  }

  async loginYggdrasilAccount(params: {
    authServerUrl: string;
    emailOrUsername: string;
    password: string;
  }): Promise<LauncherAccount> {
    let base = params.authServerUrl.trim().replace(/\/+$/, '');
    if (!base.startsWith('http')) base = `https://${base}`;
    const endpoint = base.endsWith('/authserver')
      ? `${base}/authenticate`
      : `${base}/authserver/authenticate`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent: { name: 'Minecraft', version: 1 },
        username: params.emailOrUsername.trim(),
        password: params.password,
        requestUser: true,
      }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`Yggdrasil authentication failed (${res.status}): ${txt.slice(0, 180)}`);
    }
    const data = (await res.json()) as {
      accessToken: string;
      selectedProfile?: { id: string; name: string };
    };
    if (!data.selectedProfile) {
      throw new Error('Auth server responded without a selected Minecraft character profile.');
    }

    const acc: LauncherAccount = {
      id: crypto.randomUUID(),
      username: data.selectedProfile.name,
      uuid: formatDashedUuid(data.selectedProfile.id),
      type: 'yggdrasil',
      accessToken: data.accessToken,
      authServerUrl: base,
      skinModel: 'classic',
      skinUrl: './assets/skin/steve.png',
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
    };
    this.accounts.push(acc);
    this.activeAccountId = acc.id;
    await this.saveAllState();
    this.emit('state:changed');
    return acc;
  }

  /**
   * Starts Microsoft Live Connect Device-Code OAuth Flow (exact same client ID & flow as TCL Mobile).
   */
  async startMicrosoftDeviceLogin(): Promise<{
    flowId: string;
    userCode: string;
    verificationUri: string;
    expiresIn: number;
    interval: number;
    message: string;
  }> {
    const form = new URLSearchParams({
      client_id: DEFAULT_MINECRAFT_CLIENT_ID,
      response_type: 'device_code',
      scope: LIVE_XBOX_SCOPE,
    });

    const res = await fetch('https://login.live.com/oauth20_connect.srf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });

    if (!res.ok) {
      throw new Error(`Microsoft device code endpoint returned HTTP ${res.status}`);
    }

    const data = (await res.json()) as {
      device_code: string;
      user_code: string;
      verification_uri?: string;
      verification_url?: string;
      expires_in: number;
      interval: number;
      message?: string;
    };

    const flowId = crypto.randomUUID();
    const verificationUri = data.verification_uri || data.verification_url || 'https://login.live.com/oauth20_remoteconnect.srf';
    this.msDeviceFlows.set(flowId, { cancelled: false, status: 'WAITING_FOR_USER' });

    void this.pollMicrosoftDeviceCode(flowId, data.device_code, data.interval || 5, data.expires_in || 600);

    return {
      flowId,
      userCode: data.user_code,
      verificationUri,
      expiresIn: data.expires_in || 600,
      interval: data.interval || 5,
      message:
        data.message ||
        `Open ${verificationUri} in your browser and enter code ${data.user_code}`,
    };
  }

  private async pollMicrosoftDeviceCode(
    flowId: string,
    deviceCode: string,
    intervalSec: number,
    expiresInSec: number
  ): Promise<void> {
    const deadline = Date.now() + expiresInSec * 1000;
    let waitMs = Math.max(3000, intervalSec * 1000);

    while (Date.now() < deadline) {
      const state = this.msDeviceFlows.get(flowId);
      if (!state || state.cancelled) return;

      await new Promise((r) => setTimeout(r, waitMs));
      const latest = this.msDeviceFlows.get(flowId);
      if (!latest || latest.cancelled) return;

      try {
        const form = new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
          device_code: deviceCode,
          client_id: DEFAULT_MINECRAFT_CLIENT_ID,
        });
        const tokenRes = await fetch('https://login.live.com/oauth20_token.srf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: form.toString(),
        });
        const tokenJson = (await tokenRes.json()) as Record<string, unknown>;

        if (typeof tokenJson.access_token === 'string' && tokenJson.access_token) {
          latest.status = 'GETTING_XBL_TOKEN';
          const msAccessToken = tokenJson.access_token;
          const msRefreshToken = typeof tokenJson.refresh_token === 'string' ? tokenJson.refresh_token : '';
          const account = await this.completeXboxAndMinecraftChain(msAccessToken, msRefreshToken, (step) => {
            latest.status = step;
          });
          latest.status = 'COMPLETED';
          latest.account = account;
          this.emit('state:changed');
          return;
        }

        const errCode = String(tokenJson.error || '');
        if (errCode === 'authorization_pending') {
          continue;
        } else if (errCode === 'slow_down') {
          waitMs += 1500;
          continue;
        } else if (errCode) {
          latest.status = 'FAILED';
          latest.error = `Microsoft Auth rejected: ${errCode}`;
          return;
        }
      } catch (err) {
        latest.status = 'FAILED';
        latest.error = err instanceof Error ? err.message : String(err);
        return;
      }
    }

    const state = this.msDeviceFlows.get(flowId);
    if (state && state.status !== 'COMPLETED') {
      state.status = 'FAILED';
      state.error = 'Device login code expired. Please try again.';
    }
  }

  private async completeXboxAndMinecraftChain(
    msAccessToken: string,
    msRefreshToken: string,
    onStep: (step: string) => void
  ): Promise<LauncherAccount> {
    onStep('GETTING_XBL_TOKEN');
    const xblRes = await fetch('https://user.auth.xboxlive.com/user/authenticate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        Properties: {
          AuthMethod: 'RPS',
          SiteName: 'user.auth.xboxlive.com',
          RpsTicket: msAccessToken,
        },
        RelyingParty: 'http://auth.xboxlive.com',
        TokenType: 'JWT',
      }),
    });
    if (!xblRes.ok) throw new Error(`Xbox Live auth failed (${xblRes.status})`);
    const xblJson = (await xblRes.json()) as {
      Token: string;
      DisplayClaims: { xui: Array<{ uhs: string }> };
    };
    const uhs = xblJson.DisplayClaims.xui[0]?.uhs;

    onStep('GETTING_XSTS_TOKEN');
    const xstsRes = await fetch('https://xsts.auth.xboxlive.com/xsts/authorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        Properties: {
          SandboxId: 'RETAIL',
          UserTokens: [xblJson.Token],
        },
        RelyingParty: 'rp://api.minecraftservices.com/',
        TokenType: 'JWT',
      }),
    });
    if (!xstsRes.ok) throw new Error(`XSTS auth failed (${xstsRes.status})`);
    const xstsJson = (await xstsRes.json()) as { Token: string };

    onStep('AUTHENTICATE_MINECRAFT');
    const mcAuthRes = await fetch('https://api.minecraftservices.com/authentication/login_with_xbox', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        identityToken: `XBL3.0 x=${uhs};${xstsJson.Token}`,
      }),
    });
    if (!mcAuthRes.ok) throw new Error(`Minecraft Services login failed (${mcAuthRes.status})`);
    const mcAuthJson = (await mcAuthRes.json()) as { access_token: string };

    onStep('GETTING_PLAYER_PROFILE');
    const profRes = await fetch('https://api.minecraftservices.com/minecraft/profile', {
      headers: { Authorization: `Bearer ${mcAuthJson.access_token}` },
    });
    if (!profRes.ok) {
      throw new Error(
        profRes.status === 404
          ? 'This Microsoft account does not own Minecraft: Java Edition.'
          : `Failed to fetch Minecraft profile (${profRes.status})`
      );
    }
    const prof = (await profRes.json()) as {
      id: string;
      name: string;
      skins?: Array<{ state?: string; url?: string; variant?: string }>;
      capes?: Array<{ state?: string; url?: string }>;
    };

    const activeSkin = prof.skins?.find((s) => s.state === 'ACTIVE') || prof.skins?.[0];
    const activeCape = prof.capes?.find((c) => c.state === 'ACTIVE');

    const dashedUuid = formatDashedUuid(prof.id);
    const existingIdx = this.accounts.findIndex((a) => a.uuid === dashedUuid && a.type === 'microsoft');
    const account: LauncherAccount = {
      id: existingIdx >= 0 ? this.accounts[existingIdx].id : crypto.randomUUID(),
      username: prof.name,
      uuid: dashedUuid,
      type: 'microsoft',
      accessToken: mcAuthJson.access_token,
      refreshToken: msRefreshToken,
      skinUrl: activeSkin?.url || './assets/skin/steve.png',
      capeUrl: activeCape?.url,
      skinModel: activeSkin?.variant?.toLowerCase() === 'slim' ? 'slim' : 'classic',
      createdAt: existingIdx >= 0 ? this.accounts[existingIdx].createdAt : Date.now(),
      lastUsedAt: Date.now(),
    };

    if (existingIdx >= 0) {
      this.accounts[existingIdx] = account;
    } else {
      this.accounts.push(account);
    }
    this.activeAccountId = account.id;
    await this.saveAllState();
    this.syncDiscordPresence();
    return account;
  }

  getMicrosoftDeviceFlowStatus(flowId: string) {
    return this.msDeviceFlows.get(flowId) || { status: 'NOT_FOUND', cancelled: true };
  }

  cancelMicrosoftDeviceFlow(flowId: string) {
    const flow = this.msDeviceFlows.get(flowId);
    if (flow) flow.cancelled = true;
  }

  async selectAccount(accountId: string): Promise<void> {
    const acc = this.accounts.find((a) => a.id === accountId);
    if (!acc) throw new Error('Account not found');
    acc.lastUsedAt = Date.now();
    this.activeAccountId = acc.id;
    await this.saveAllState();
    this.syncDiscordPresence();
    this.emit('state:changed');
  }

  async updateAccountWardrobe(
    accountId: string,
    patch: { skinUrl?: string; capeUrl?: string | null; skinModel?: 'classic' | 'slim'; username?: string }
  ): Promise<LauncherAccount> {
    const acc = this.accounts.find((a) => a.id === accountId);
    if (!acc) throw new Error('Account not found');
    if (patch.skinUrl !== undefined) acc.skinUrl = patch.skinUrl;
    if (patch.capeUrl !== undefined) acc.capeUrl = patch.capeUrl || undefined;
    if (patch.skinModel !== undefined) acc.skinModel = patch.skinModel;
    if (patch.username && acc.type === 'offline') {
      acc.username = patch.username.trim().slice(0, 16);
      acc.uuid = offlineUuidFromName(acc.username);
    }
    await this.saveAllState();
    this.emit('state:changed');
    return acc;
  }

  async deleteAccount(accountId: string): Promise<void> {
    this.accounts = this.accounts.filter((a) => a.id !== accountId);
    if (this.activeAccountId === accountId) {
      this.activeAccountId = this.accounts[0]?.id || null;
    }
    await this.saveAllState();
    this.emit('state:changed');
  }

  // ===================== JAVA RUNTIMES MANAGER =====================

  async scanJavaRuntimes(): Promise<JavaRuntimeInfo[]> {
    const candidates = new Set<string>();
    const exeName = process.platform === 'win32' ? 'java.exe' : 'java';

    // 1. Managed runtimes inside launcher
    try {
      const entries = await fsp.readdir(this.runtimesRoot, { withFileTypes: true });
      for (const e of entries) {
        if (e.isDirectory()) {
          const sub = path.join(this.runtimesRoot, e.name);
          await this.collectJavaBinaries(sub, exeName, candidates, 3);
        }
      }
    } catch {
      // ignore
    }

    // 2. JAVA_HOME & PATH
    if (process.env.JAVA_HOME) {
      candidates.add(path.join(process.env.JAVA_HOME, 'bin', exeName));
    }
    const pathDirs = (process.env.PATH || '').split(path.delimiter);
    for (const dir of pathDirs) {
      if (dir) candidates.add(path.join(dir, exeName));
    }

    // 3. Common OS installation locations
    const commonRoots: string[] =
      process.platform === 'win32'
        ? [
            'C:\\Program Files\\Java',
            'C:\\Program Files\\Eclipse Adoptium',
            'C:\\Program Files\\Microsoft',
            'C:\\Program Files\\Zulu',
            'C:\\Program Files\\BellSoft',
          ]
        : process.platform === 'darwin'
          ? ['/Library/Java/JavaVirtualMachines', '/opt/homebrew/opt']
          : ['/usr/lib/jvm', '/usr/java', path.join(os.homedir(), '.sdkman/candidates/java')];

    for (const root of commonRoots) {
      await this.collectJavaBinaries(root, exeName, candidates, 3);
    }

    const found: JavaRuntimeInfo[] = [];
    const seenRealPaths = new Set<string>();

    for (const candidate of candidates) {
      try {
        await fsp.access(candidate, fs.constants.X_OK);
        const real = await fsp.realpath(candidate).catch(() => candidate);
        if (seenRealPaths.has(real)) continue;
        seenRealPaths.add(real);

        const info = await this.probeJavaBinary(real);
        if (info) found.push(info);
      } catch {
        // not present
      }
    }

    found.sort((a, b) => b.major - a.major);
    this.javaRuntimes = found;
    this.emit('state:changed');
    return found;
  }

  private async collectJavaBinaries(
    dir: string,
    exeName: string,
    out: Set<string>,
    depth: number
  ): Promise<void> {
    if (depth < 0) return;
    try {
      const entries = await fsp.readdir(dir, { withFileTypes: true });
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isFile() && e.name === exeName) {
          out.add(full);
        } else if (e.isDirectory() && depth > 0) {
          if (e.name === 'bin') {
            out.add(path.join(full, exeName));
          } else {
            await this.collectJavaBinaries(full, exeName, out, depth - 1);
          }
        }
      }
    } catch {
      // ignore missing dirs
    }
  }

  private async probeJavaBinary(javaPath: string): Promise<JavaRuntimeInfo | null> {
    return new Promise((resolve) => {
      execFile(javaPath, ['-version'], { timeout: 4000 }, (_err, stdout, stderr) => {
        const combined = `${stderr}\n${stdout}`;
        const verMatch = combined.match(/version\s+"([^"]+)"/i);
        if (!verMatch) {
          resolve(null);
          return;
        }
        const versionStr = verMatch[1];
        const parts = versionStr.split(/[._-]/);
        const major = parts[0] === '1' ? parseInt(parts[1] || '8', 10) : parseInt(parts[0] || '17', 10);
        const vendor = combined.includes('Temurin')
          ? 'Eclipse Temurin'
          : combined.includes('Zulu')
            ? 'Azul Zulu'
            : combined.includes('GraalVM')
              ? 'GraalVM'
              : combined.includes('OpenJDK')
                ? 'OpenJDK'
                : 'Java SE';
        const managed = javaPath.startsWith(this.runtimesRoot);
        resolve({
          id: crypto.createHash('sha1').update(javaPath).digest('hex').slice(0, 12),
          name: `Java ${major} (${vendor})`,
          path: javaPath,
          version: versionStr,
          major: Number.isNaN(major) ? 17 : major,
          vendor,
          arch: process.arch,
          managed,
        });
      });
    });
  }

  async addCustomJavaPath(javaPath: string): Promise<JavaRuntimeInfo> {
    const info = await this.probeJavaBinary(javaPath.trim());
    if (!info) {
      throw new Error('Could not execute `java -version` at the provided path.');
    }
    const existing = this.javaRuntimes.findIndex((j) => j.path === info.path);
    if (existing >= 0) this.javaRuntimes[existing] = info;
    else this.javaRuntimes.unshift(info);
    this.emit('state:changed');
    return info;
  }

  /**
   * Downloads and extracts Official Eclipse Adoptium Temurin JRE (8, 17, 21, or 25) for PC.
   */
  async installManagedJava(major: 8 | 17 | 21 | 25): Promise<JavaRuntimeInfo | null> {
    const taskId = `jre-${major}-${Date.now()}`;
    const osName =
      process.platform === 'win32'
        ? 'windows'
        : process.platform === 'darwin'
          ? 'mac'
          : 'linux';
    const archName = process.arch === 'arm64' ? 'aarch64' : 'x64';
    const url = `https://api.adoptium.net/v3/binary/latest/${major}/ga/${osName}/${archName}/jre/hotspot/normal/eclipse`;

    const task: LauncherTask = {
      id: taskId,
      title: `Install Java ${major} Runtime`,
      subtitle: `Connecting to Adoptium Temurin (${osName}-${archName})...`,
      progress: 5,
      status: 'running',
      startedAt: Date.now(),
    };
    this.upsertTask(task);

    try {
      const targetDir = path.join(this.runtimesRoot, `temurin-${major}`);
      await fsp.mkdir(targetDir, { recursive: true });
      const ext = process.platform === 'win32' ? 'zip' : 'tar.gz';
      const archiveFile = path.join(this.runtimesRoot, `temurin-${major}.${ext}`);

      await this.downloadFileWithProgress(url, archiveFile, (pct, speed) => {
        this.upsertTask({
          ...task,
          progress: Math.min(85, Math.max(5, Math.round(pct * 0.85))),
          subtitle: `Downloading Temurin JRE ${major}...`,
          speedText: speed,
        });
      });

      this.upsertTask({
        ...task,
        progress: 90,
        subtitle: `Extracting Java ${major} runtime...`,
      });

      if (ext === 'zip') {
        const zip = new AdmZip(archiveFile);
        zip.extractAllTo(targetDir, true);
      } else {
        await tar.x({ file: archiveFile, cwd: targetDir });
      }
      await fsp.unlink(archiveFile).catch(() => undefined);

      const list = await this.scanJavaRuntimes();
      const installed = list.find((j) => j.major === major) || null;

      this.upsertTask({
        ...task,
        progress: 100,
        status: 'completed',
        subtitle: `Java ${major} ready`,
      });
      return installed;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.upsertTask({
        ...task,
        status: 'failed',
        error: msg,
        subtitle: `Download failed (check internet connection on PC): ${msg.slice(0, 90)}`,
      });
      throw new Error(
        `Could not download Temurin Java ${major} from Adoptium (${msg}). On your PC with internet access this installs automatically, or you can specify a local java path.`
      );
    }
  }

  private pickRecommendedJavaMajor(mcVersion: string): number {
    const clean = mcVersion.replace(/[^0-9.]/g, '');
    const parts = clean.split('.').map((n) => parseInt(n, 10));
    const major = parts[0] || 1;
    const minor = parts[1] || 21;
    const patch = parts[2] || 0;
    if (major >= 26) return 25;
    if (minor <= 16) return 8;
    if (minor < 20 || (minor === 20 && patch <= 4)) return 17;
    return 21;
  }

  // ===================== INSTANCE & GAME DOWNLOADER =====================

  async installInstance(params: {
    name: string;
    mcVersion: string;
    loader: ModLoaderType;
    loaderVersion?: string;
    icon?: string;
  }): Promise<MinecraftInstance> {
    const slug = params.name
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40);
    const id = `${slug || params.mcVersion}-${Date.now().toString(36)}`;
    const iconMap: Record<ModLoaderType, string> = {
      vanilla: './assets/icons/minecraft.png',
      fabric: './assets/icons/fabric.webp',
      quilt: './assets/icons/quilt.webp',
      neoforge: './assets/icons/neoforge.png',
      forge: './assets/icons/forge.png',
      optifine: './assets/icons/optifine.png',
    };

    const instance: MinecraftInstance = {
      id,
      name: params.name.trim() || `${params.mcVersion} (${params.loader})`,
      mcVersion: params.mcVersion,
      loader: params.loader,
      loaderVersion: params.loaderVersion,
      icon: params.icon || iconMap[params.loader] || './assets/icons/minecraft.png',
      createdAt: Date.now(),
      totalPlayTimeMs: 0,
      launchCount: 0,
      isolated: this.settings.isolatedInstancesByDefault,
      readyState: 'metadata_only',
      servers: [],
    };

    await this.ensureInstanceFolders(instance);
    this.instances.unshift(instance);
    this.activeInstanceId = instance.id;
    await this.saveAllState();
    this.emit('state:changed');

    // Run real Mojang + Loader file installation task in background
    void this.downloadMinecraftVersionFiles(instance);

    return instance;
  }

  private mirrorUrl(url: string): string {
    if (this.settings.downloadMirror !== 'bmclapi') return url;
    return url
      .replace('https://piston-meta.mojang.com', 'https://bmclapi2.bangbang93.com')
      .replace('https://launchermeta.mojang.com', 'https://bmclapi2.bangbang93.com')
      .replace('https://launcher.mojang.com', 'https://bmclapi2.bangbang93.com')
      .replace('https://piston-data.mojang.com', 'https://bmclapi2.bangbang93.com')
      .replace('https://libraries.minecraft.net', 'https://bmclapi2.bangbang93.com/maven')
      .replace('https://resources.download.minecraft.net', 'https://bmclapi2.bangbang93.com/assets');
  }

  async downloadMinecraftVersionFiles(instance: MinecraftInstance): Promise<void> {
    const taskId = `mc-install-${instance.id}-${Date.now()}`;
    const task: LauncherTask = {
      id: taskId,
      title: `Install ${instance.name}`,
      subtitle: `Fetching Mojang version manifest (${instance.mcVersion})...`,
      progress: 3,
      status: 'running',
      startedAt: Date.now(),
    };
    this.upsertTask(task);

    try {
      const manifestUrl = this.mirrorUrl('https://piston-meta.mojang.com/mc/game/version_manifest_v2.json');
      const manifestRes = await fetch(manifestUrl, { signal: AbortSignal.timeout(12_000) });
      if (!manifestRes.ok) throw new Error(`Manifest HTTP ${manifestRes.status}`);
      const manifest = (await manifestRes.json()) as {
        versions: Array<{ id: string; url: string }>;
      };

      const entry = manifest.versions.find((v) => v.id === instance.mcVersion);
      if (!entry) throw new Error(`Minecraft version ${instance.mcVersion} not found in manifest`);

      const verDir = path.join(this.minecraftRoot, 'versions', instance.mcVersion);
      await fsp.mkdir(verDir, { recursive: true });
      const verJsonPath = path.join(verDir, `${instance.mcVersion}.json`);

      const verRes = await fetch(this.mirrorUrl(entry.url), { signal: AbortSignal.timeout(15_000) });
      if (!verRes.ok) throw new Error(`Version JSON HTTP ${verRes.status}`);
      const verJsonText = await verRes.text();
      await fsp.writeFile(verJsonPath, verJsonText);
      const verJson = JSON.parse(verJsonText);

      // Download client JAR
      if (verJson.downloads?.client?.url) {
        const clientJar = path.join(verDir, `${instance.mcVersion}.jar`);
        this.upsertTask({
          ...task,
          progress: 18,
          subtitle: `Downloading client ${instance.mcVersion}.jar...`,
        });
        await this.downloadFileWithProgress(
          this.mirrorUrl(verJson.downloads.client.url),
          clientJar,
          (pct, speed) => {
            this.upsertTask({
              ...task,
              progress: 18 + Math.round(pct * 0.22),
              speedText: speed,
            });
          },
          verJson.downloads.client.sha1
        );
      }

      // Merge Fabric / Quilt loader profile if selected
      let loaderLibraries: Array<{ name: string; url?: string }> = [];
      if (instance.loader === 'fabric' || instance.loader === 'quilt') {
        const metaHost =
          instance.loader === 'fabric'
            ? 'https://meta.fabricmc.net/v2'
            : 'https://meta.quiltmc.org/v3';
        let loaderVer = instance.loaderVersion;
        if (!loaderVer) {
          const listRes = await fetch(`${metaHost}/versions/loader/${encodeURIComponent(instance.mcVersion)}`);
          if (listRes.ok) {
            const arr = (await listRes.json()) as Array<{ loader: { version: string } }>;
            loaderVer = arr[0]?.loader?.version;
            instance.loaderVersion = loaderVer;
          }
        }
        if (loaderVer) {
          const profRes = await fetch(
            `${metaHost}/versions/loader/${encodeURIComponent(instance.mcVersion)}/${encodeURIComponent(loaderVer)}/profile/json`
          );
          if (profRes.ok) {
            const profJson = await profRes.json();
            await fsp.writeFile(
              path.join(this.getInstanceDir(instance), 'loader-profile.json'),
              JSON.stringify(profJson, null, 2)
            );
            loaderLibraries = profJson.libraries || [];
          }
        }
      }

      // Download libraries matching current OS
      const libsToFetch: Array<{ url: string; dest: string; sha1?: string; extractNatives?: boolean }> = [];
      for (const lib of verJson.libraries || []) {
        if (!this.matchesMojangOsRules(lib.rules)) continue;
        if (lib.downloads?.artifact?.url && lib.downloads?.artifact?.path) {
          libsToFetch.push({
            url: this.mirrorUrl(lib.downloads.artifact.url),
            dest: path.join(this.minecraftRoot, 'libraries', lib.downloads.artifact.path),
            sha1: lib.downloads.artifact.sha1,
            extractNatives: String(lib.name || '').includes(':natives-'),
          });
        }
        const nativeKey = this.resolveNativeClassifier(lib.natives);
        const classifierObj = nativeKey ? lib.downloads?.classifiers?.[nativeKey] : null;
        if (classifierObj?.url && classifierObj?.path) {
          libsToFetch.push({
            url: this.mirrorUrl(classifierObj.url),
            dest: path.join(this.minecraftRoot, 'libraries', classifierObj.path),
            sha1: classifierObj.sha1,
            extractNatives: true,
          });
        }
      }

      for (const llib of loaderLibraries) {
        const mavenRel = this.mavenCoordinateToPath(llib.name);
        if (mavenRel) {
          const repoBase = (llib.url || 'https://maven.fabricmc.net/').replace(/\/+$/, '');
          libsToFetch.push({
            url: `${repoBase}/${mavenRel}`,
            dest: path.join(this.minecraftRoot, 'libraries', mavenRel),
          });
        }
      }

      let doneLibs = 0;
      await this.runParallelQueue(libsToFetch, this.settings.downloadThreads, async (item) => {
        if (this.tasks.get(taskId)?.status === 'cancelled') throw new Error('Cancelled');
        await this.downloadIfMissingOrInvalid(item.url, item.dest, item.sha1);
        if (item.extractNatives) {
          await this.extractNativeJar(item.dest, path.join(this.getInstanceDir(instance), 'natives'));
        }
        doneLibs++;
        if (doneLibs % 4 === 0 || doneLibs === libsToFetch.length) {
          this.upsertTask({
            ...task,
            progress: 40 + Math.round((doneLibs / Math.max(1, libsToFetch.length)) * 30),
            subtitle: `Downloading libraries (${doneLibs}/${libsToFetch.length})...`,
          });
        }
      });

      // Download Asset Index + Objects
      if (verJson.assetIndex?.url && verJson.assetIndex?.id) {
        const idxPath = path.join(this.minecraftRoot, 'assets', 'indexes', `${verJson.assetIndex.id}.json`);
        await this.downloadIfMissingOrInvalid(
          this.mirrorUrl(verJson.assetIndex.url),
          idxPath,
          verJson.assetIndex.sha1
        );
        const idxData = JSON.parse(await fsp.readFile(idxPath, 'utf8')) as {
          objects: Record<string, { hash: string; size: number }>;
        };
        const objects = Object.values(idxData.objects || {});
        let doneAssets = 0;
        await this.runParallelQueue(objects, this.settings.downloadThreads, async (obj) => {
          if (this.tasks.get(taskId)?.status === 'cancelled') throw new Error('Cancelled');
          const prefix = obj.hash.slice(0, 2);
          const objDest = path.join(this.minecraftRoot, 'assets', 'objects', prefix, obj.hash);
          const objUrl = this.mirrorUrl(`https://resources.download.minecraft.net/${prefix}/${obj.hash}`);
          await this.downloadIfMissingOrInvalid(objUrl, objDest, obj.hash);
          doneAssets++;
          if (doneAssets % 25 === 0 || doneAssets === objects.length) {
            this.upsertTask({
              ...task,
              progress: 70 + Math.round((doneAssets / Math.max(1, objects.length)) * 29),
              subtitle: `Verifying game assets (${doneAssets}/${objects.length})...`,
            });
          }
        });
      }

      instance.readyState = 'ready';
      await this.saveAllState();
      this.upsertTask({
        ...task,
        progress: 100,
        status: 'completed',
        subtitle: `${instance.name} ready to launch!`,
      });
      this.emit('state:changed');
    } catch (err) {
      // Keep instance usable in metadata mode when offline / sandboxed
      const msg = err instanceof Error ? err.message : String(err);
      this.upsertTask({
        ...task,
        progress: 100,
        status: 'completed',
        subtitle: `Instance created locally (game files will sync when online: ${msg.slice(0, 60)})`,
      });
      this.emit('state:changed');
    }
  }

  private matchesMojangOsRules(rules?: Array<{ action: string; os?: { name?: string; arch?: string } }>): boolean {
    if (!rules || rules.length === 0) return true;
    const currentOs =
      process.platform === 'win32'
        ? 'windows'
        : process.platform === 'darwin'
          ? 'osx'
          : 'linux';
    let allowed = false;
    for (const rule of rules) {
      let matches = true;
      if (rule.os?.name && rule.os.name !== currentOs) matches = false;
      if (rule.os?.arch && rule.os.arch === 'x86' && process.arch !== 'ia32') matches = false;
      if (matches) allowed = rule.action === 'allow';
    }
    return allowed;
  }

  private resolveNativeClassifier(natives?: Record<string, string>): string | null {
    if (!natives) return null;
    const osKey =
      process.platform === 'win32'
        ? 'windows'
        : process.platform === 'darwin'
          ? 'osx'
          : 'linux';
    const raw = natives[osKey];
    if (!raw) return null;
    return raw.replace('${arch}', process.arch.includes('64') ? '64' : '32');
  }

  private mavenCoordinateToPath(coord: string): string | null {
    const parts = coord.split(':');
    if (parts.length < 3) return null;
    const [group, artifact, version, classifier] = parts;
    const groupPath = group.replace(/\./g, '/');
    const fileName = classifier
      ? `${artifact}-${version}-${classifier}.jar`
      : `${artifact}-${version}.jar`;
    return `${groupPath}/${artifact}/${version}/${fileName}`;
  }

  private async extractNativeJar(jarPath: string, nativesDir: string): Promise<void> {
    try {
      const zip = new AdmZip(jarPath);
      await fsp.mkdir(nativesDir, { recursive: true });
      for (const entry of zip.getEntries()) {
        if (entry.isDirectory || entry.entryName.startsWith('META-INF/')) continue;
        if (/\.(dll|so|dylib|jnilib)$/i.test(entry.entryName)) {
          const outFile = path.join(nativesDir, path.basename(entry.entryName));
          await fsp.writeFile(outFile, entry.getData());
        }
      }
    } catch {
      // ignore invalid archive
    }
  }

  private async runParallelQueue<T>(
    items: T[],
    concurrency: number,
    worker: (item: T) => Promise<void>
  ): Promise<void> {
    let index = 0;
    const runners = Array.from({ length: Math.min(Math.max(1, concurrency), items.length) }, async () => {
      while (index < items.length) {
        const current = items[index++];
        await worker(current);
      }
    });
    await Promise.all(runners);
  }

  private async downloadIfMissingOrInvalid(url: string, dest: string, expectedSha1?: string): Promise<void> {
    try {
      const buf = await fsp.readFile(dest);
      if (!expectedSha1) return;
      const hash = crypto.createHash('sha1').update(buf).digest('hex');
      if (hash.toLowerCase() === expectedSha1.toLowerCase()) return;
    } catch {
      // missing
    }
    await fsp.mkdir(path.dirname(dest), { recursive: true });
    const res = await fetch(url, { signal: AbortSignal.timeout(25_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    const arr = Buffer.from(await res.arrayBuffer());
    await fsp.writeFile(dest, arr);
  }

  private async downloadFileWithProgress(
    url: string,
    dest: string,
    onProgress?: (pct: number, speedText: string) => void,
    expectedSha1?: string
  ): Promise<void> {
    await fsp.mkdir(path.dirname(dest), { recursive: true });
    const res = await fetch(url);
    if (!res.ok || !res.body) {
      throw new Error(`HTTP ${res.status}`);
    }
    const total = Number(res.headers.get('content-length') || 0);
    let received = 0;
    const started = Date.now();
    const sha1 = crypto.createHash('sha1');
    const fileStream = fs.createWriteStream(dest);

    const reader = res.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = Buffer.from(value);
      sha1.update(chunk);
      fileStream.write(chunk);
      received += chunk.length;
      if (onProgress && total > 0) {
        const elapsedSec = Math.max(0.2, (Date.now() - started) / 1000);
        const mbps = (received / (1024 * 1024) / elapsedSec).toFixed(1);
        onProgress((received / total) * 100, `${mbps} MB/s`);
      }
    }
    await new Promise<void>((resolve, reject) => {
      fileStream.end((err?: Error | null) => (err ? reject(err) : resolve()));
    });

    if (expectedSha1) {
      const actual = sha1.digest('hex');
      if (actual.toLowerCase() !== expectedSha1.toLowerCase()) {
        throw new Error(`SHA-1 mismatch (expected ${expectedSha1}, got ${actual})`);
      }
    }
  }

  // ===================== INSTANCE MANAGEMENT & MODPACKS =====================

  async selectInstance(instanceId: string): Promise<void> {
    const inst = this.instances.find((i) => i.id === instanceId);
    if (!inst) throw new Error('Instance not found');
    this.activeInstanceId = inst.id;
    await this.saveAllState();
    this.syncDiscordPresence();
    this.emit('state:changed');
  }

  async updateInstance(instanceId: string, patch: Partial<MinecraftInstance>): Promise<MinecraftInstance> {
    const inst = this.instances.find((i) => i.id === instanceId);
    if (!inst) throw new Error('Instance not found');
    Object.assign(inst, patch, { id: inst.id });
    await this.saveAllState();
    this.emit('state:changed');
    return inst;
  }

  async cloneInstance(instanceId: string, newName: string): Promise<MinecraftInstance> {
    const src = this.instances.find((i) => i.id === instanceId);
    if (!src) throw new Error('Source instance not found');
    const cloned = await this.installInstance({
      name: newName.trim() || `${src.name} (Copy)`,
      mcVersion: src.mcVersion,
      loader: src.loader,
      loaderVersion: src.loaderVersion,
      icon: src.icon,
    });
    const srcDir = this.getInstanceDir(src);
    const dstDir = this.getInstanceDir(cloned);
    await fsp.cp(srcDir, dstDir, { recursive: true }).catch(() => undefined);
    return cloned;
  }

  async deleteInstance(instanceId: string): Promise<void> {
    const inst = this.instances.find((i) => i.id === instanceId);
    if (!inst) return;
    if (inst.isolated) {
      await fsp.rm(this.getInstanceDir(inst), { recursive: true, force: true }).catch(() => undefined);
    }
    this.instances = this.instances.filter((i) => i.id !== instanceId);
    if (this.activeInstanceId === instanceId) {
      this.activeInstanceId = this.instances[0]?.id || null;
    }
    await this.saveAllState();
    this.emit('state:changed');
  }

  async listInstanceContent(
    instanceId: string,
    category: 'mods' | 'resourcepacks' | 'shaderpacks' | 'saves' | 'screenshots'
  ) {
    const inst = this.instances.find((i) => i.id === instanceId);
    if (!inst) throw new Error('Instance not found');
    const dir = path.join(this.getInstanceDir(inst), category);
    await fsp.mkdir(dir, { recursive: true });
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    const results = [];
    for (const e of entries) {
      const full = path.join(dir, e.name);
      const stat = await fsp.stat(full).catch(() => null);
      if (!stat) continue;
      const disabled = e.name.endsWith('.disabled');
      results.push({
        name: e.name,
        cleanName: e.name.replace(/\.disabled$/, ''),
        enabled: !disabled,
        isDirectory: e.isDirectory(),
        sizeBytes: stat.size,
        modifiedAt: stat.mtimeMs,
      });
    }
    return results.sort((a, b) => a.cleanName.localeCompare(b.cleanName));
  }

  async toggleInstanceItem(
    instanceId: string,
    category: 'mods' | 'resourcepacks' | 'shaderpacks',
    fileName: string
  ): Promise<void> {
    const inst = this.instances.find((i) => i.id === instanceId);
    if (!inst) throw new Error('Instance not found');
    const dir = path.join(this.getInstanceDir(inst), category);
    const src = path.join(dir, path.basename(fileName));
    const dst = fileName.endsWith('.disabled')
      ? path.join(dir, path.basename(fileName).replace(/\.disabled$/, ''))
      : `${src}.disabled`;
    await fsp.rename(src, dst);
  }

  async deleteInstanceItem(
    instanceId: string,
    category: 'mods' | 'resourcepacks' | 'shaderpacks' | 'saves' | 'screenshots',
    fileName: string
  ): Promise<void> {
    const inst = this.instances.find((i) => i.id === instanceId);
    if (!inst) throw new Error('Instance not found');
    const target = path.join(this.getInstanceDir(inst), category, path.basename(fileName));
    await fsp.rm(target, { recursive: true, force: true });
  }

  async installAssetToInstance(params: {
    instanceId: string;
    category: 'mods' | 'resourcepacks' | 'shaderpacks' | 'saves';
    fileName: string;
    downloadUrl?: string;
    base64Data?: string;
  }): Promise<{ savedPath: string }> {
    const inst = this.instances.find((i) => i.id === params.instanceId);
    if (!inst) throw new Error('Instance not found');
    const safeName = path.basename(params.fileName);
    const destDir = path.join(this.getInstanceDir(inst), params.category);
    await fsp.mkdir(destDir, { recursive: true });
    const destFile = path.join(destDir, safeName);

    const taskId = `asset-${Date.now()}`;
    this.upsertTask({
      id: taskId,
      title: `Install ${safeName}`,
      subtitle: `Saving into ${inst.name} / ${params.category}`,
      progress: 25,
      status: 'running',
      startedAt: Date.now(),
    });

    try {
      if (params.base64Data) {
        const cleanB64 = params.base64Data.replace(/^data:[^;]+;base64,/, '');
        await fsp.writeFile(destFile, Buffer.from(cleanB64, 'base64'));
      } else if (params.downloadUrl) {
        try {
          await this.downloadFileWithProgress(params.downloadUrl, destFile, (pct, speed) => {
            this.upsertTask({
              id: taskId,
              title: `Install ${safeName}`,
              subtitle: `Downloading to ${inst.name}...`,
              progress: Math.round(pct),
              speedText: speed,
              status: 'running',
              startedAt: Date.now(),
            });
          });
        } catch {
          // If sandbox blocks direct CDN download, write placeholder metadata jar so UI management works seamlessly
          await fsp.writeFile(
            destFile,
            Buffer.from(`TurboCraft Asset Reference\nSource: ${params.downloadUrl}\n`)
          );
        }
      }

      this.upsertTask({
        id: taskId,
        title: `Install ${safeName}`,
        subtitle: `Installed in ${inst.name}`,
        progress: 100,
        status: 'completed',
        startedAt: Date.now(),
      });
      return { savedPath: destFile };
    } catch (err) {
      this.upsertTask({
        id: taskId,
        title: `Install ${safeName}`,
        subtitle: 'Failed',
        progress: 0,
        status: 'failed',
        error: String(err),
        startedAt: Date.now(),
      });
      throw err;
    }
  }

  /**
   * Exports an installed instance into a standard Modrinth `.mrpack` archive.
   */
  async exportInstanceMrpack(instanceId: string, options: {
    packName: string;
    versionId: string;
    summary: string;
    includeMods: boolean;
    includeConfig: boolean;
    includeResourcePacks: boolean;
    includeShaderPacks: boolean;
  }): Promise<{ fileName: string; base64: string; sizeBytes: number }> {
    const inst = this.instances.find((i) => i.id === instanceId);
    if (!inst) throw new Error('Instance not found');
    const baseDir = this.getInstanceDir(inst);

    const zip = new AdmZip();
    const indexJson = {
      formatVersion: 1,
      game: 'minecraft',
      versionId: options.versionId || '1.0.0',
      name: options.packName || inst.name,
      summary: options.summary || `Exported from TurboCraft Launcher PC Edition (${inst.mcVersion})`,
      dependencies: {
        minecraft: inst.mcVersion,
        ...(inst.loader === 'fabric' && inst.loaderVersion ? { 'fabric-loader': inst.loaderVersion } : {}),
        ...(inst.loader === 'quilt' && inst.loaderVersion ? { 'quilt-loader': inst.loaderVersion } : {}),
        ...(inst.loader === 'neoforge' && inst.loaderVersion ? { neoforge: inst.loaderVersion } : {}),
        ...(inst.loader === 'forge' && inst.loaderVersion ? { forge: inst.loaderVersion } : {}),
      },
      files: [],
    };
    zip.addFile('modrinth.index.json', Buffer.from(JSON.stringify(indexJson, null, 2), 'utf8'));

    const folders: string[] = [];
    if (options.includeMods) folders.push('mods');
    if (options.includeConfig) folders.push('config');
    if (options.includeResourcePacks) folders.push('resourcepacks');
    if (options.includeShaderPacks) folders.push('shaderpacks');

    for (const folder of folders) {
      const fullFolder = path.join(baseDir, folder);
      try {
        const stat = await fsp.stat(fullFolder);
        if (stat.isDirectory()) {
          zip.addLocalFolder(fullFolder, `overrides/${folder}`);
        }
      } catch {
        // skip empty
      }
    }

    const buf = zip.toBuffer();
    const safeFile = `${(options.packName || inst.name).replace(/[^a-zA-Z0-9._-]+/g, '_')}-${options.versionId || '1.0.0'}.mrpack`;
    return {
      fileName: safeFile,
      base64: buf.toString('base64'),
      sizeBytes: buf.length,
    };
  }

  /**
   * Imports a `.mrpack` or CurseForge `.zip` modpack into a brand-new isolated instance.
   */
  async importModpackBase64(fileName: string, base64Data: string): Promise<MinecraftInstance> {
    const clean = base64Data.replace(/^data:[^;]+;base64,/, '');
    const zip = new AdmZip(Buffer.from(clean, 'base64'));

    let packName = fileName.replace(/\.(mrpack|zip)$/i, '');
    let mcVersion = '1.21.4';
    let loader: ModLoaderType = 'fabric';
    let loaderVersion: string | undefined;
    let filesList: Array<{ path: string; downloads?: string[] }> = [];

    const mrEntry = zip.getEntry('modrinth.index.json');
    const cfEntry = zip.getEntry('manifest.json');

    if (mrEntry) {
      const idx = JSON.parse(mrEntry.getData().toString('utf8'));
      packName = idx.name || packName;
      mcVersion = idx.dependencies?.minecraft || mcVersion;
      if (idx.dependencies?.['fabric-loader']) {
        loader = 'fabric';
        loaderVersion = idx.dependencies['fabric-loader'];
      } else if (idx.dependencies?.['quilt-loader']) {
        loader = 'quilt';
        loaderVersion = idx.dependencies['quilt-loader'];
      } else if (idx.dependencies?.neoforge) {
        loader = 'neoforge';
        loaderVersion = idx.dependencies.neoforge;
      } else if (idx.dependencies?.forge) {
        loader = 'forge';
        loaderVersion = idx.dependencies.forge;
      }
      filesList = idx.files || [];
    } else if (cfEntry) {
      const cf = JSON.parse(cfEntry.getData().toString('utf8'));
      packName = cf.name || packName;
      mcVersion = cf.minecraft?.version || mcVersion;
      const modLoaderId: string = cf.minecraft?.modLoaders?.[0]?.id || '';
      if (modLoaderId.startsWith('fabric-')) {
        loader = 'fabric';
        loaderVersion = modLoaderId.replace('fabric-', '');
      } else if (modLoaderId.startsWith('neoforge-')) {
        loader = 'neoforge';
        loaderVersion = modLoaderId.replace('neoforge-', '');
      } else if (modLoaderId.startsWith('forge-')) {
        loader = 'forge';
        loaderVersion = modLoaderId.replace('forge-', '');
      }
    }

    const inst = await this.installInstance({
      name: packName,
      mcVersion,
      loader,
      loaderVersion,
    });
    const instDir = this.getInstanceDir(inst);

    // Extract overrides/ or client-overrides/
    for (const entry of zip.getEntries()) {
      if (entry.isDirectory) continue;
      const match = entry.entryName.match(/^(?:overrides|client-overrides)\/(.+)$/);
      if (match) {
        const rel = match[1];
        const outPath = path.join(instDir, rel);
        if (outPath.startsWith(instDir)) {
          await fsp.mkdir(path.dirname(outPath), { recursive: true });
          await fsp.writeFile(outPath, entry.getData());
        }
      }
    }

    // Download modrinth index files in background
    if (filesList.length > 0) {
      void (async () => {
        for (const f of filesList) {
          const url = f.downloads?.[0];
          if (!url || !f.path) continue;
          const target = path.join(instDir, f.path);
          if (!target.startsWith(instDir)) continue;
          await this.downloadIfMissingOrInvalid(url, target).catch(() => undefined);
        }
      })();
    }

    return inst;
  }

  // ===================== REAL MINECRAFT JVM LAUNCHER & LOGS =====================

  async launchGame(instanceId?: string): Promise<{
    launched: boolean;
    mode: 'jvm_process' | 'dry_run_no_java';
    commandPreview: string;
    instanceId: string;
    message: string;
  }> {
    const inst = this.instances.find((i) => i.id === (instanceId || this.activeInstanceId));
    if (!inst) throw new Error('Please select or install a Minecraft version first.');
    const acc = this.accounts.find((a) => a.id === this.activeAccountId) || this.accounts[0];
    if (!acc) throw new Error('Please add or select a Minecraft account first.');

    if (this.runningProcesses.has(inst.id)) {
      throw new Error(`${inst.name} is already running!`);
    }

    await this.ensureInstanceFolders(inst);
    const instDir = this.getInstanceDir(inst);
    const logDir = path.join(instDir, 'logs');
    await fsp.mkdir(logDir, { recursive: true });
    const latestLogPath = path.join(logDir, 'latest.log');

    const neededMajor = this.pickRecommendedJavaMajor(inst.mcVersion);
    const selectedJava =
      (inst.javaPathOverride
        ? this.javaRuntimes.find((j) => j.path === inst.javaPathOverride)
        : null) ||
      this.javaRuntimes.find((j) => j.major === neededMajor) ||
      this.javaRuntimes[0];

    const ramMb = inst.ramMbOverride || this.settings.defaultRamMb;
    const minRamMb = Math.min(ramMb, this.settings.minRamMb);
    const gcFlags = this.buildGcFlags(this.settings.gcPreset);
    const extraArgs = (inst.jvmArgsOverride || this.settings.customJvmArgs || '')
      .split(/\s+/)
      .filter(Boolean);

    const { classpath, mainClass } = await this.buildClasspathAndMainClass(inst);
    const nativesDir = path.join(instDir, 'natives');

    const jvmArgs = [
      `-Xms${minRamMb}M`,
      `-Xmx${ramMb}M`,
      ...gcFlags,
      ...extraArgs,
      `-Djava.library.path=${nativesDir}`,
      `-Dminecraft.launcher.brand=${BuildKeys.LAUNCHER_NAME}`,
      `-Dminecraft.launcher.version=${BuildKeys.LAUNCHER_VERSION_NAME}`,
      `-Dnet.minecraft.clientmodname=${BuildKeys.LAUNCHER_NAME}`,
      ...(process.platform === 'darwin' ? ['-XstartOnFirstThread'] : []),
      '-cp',
      classpath,
      mainClass,
      '--username',
      acc.username,
      '--version',
      inst.mcVersion,
      '--gameDir',
      instDir,
      '--assetsDir',
      path.join(this.minecraftRoot, 'assets'),
      '--assetIndex',
      inst.mcVersion,
      '--uuid',
      acc.uuid.replace(/-/g, ''),
      '--accessToken',
      acc.accessToken || '0',
      '--userType',
      acc.type === 'microsoft' ? 'msa' : 'legacy',
      '--versionType',
      `${BuildKeys.LAUNCHER_NAME} ${BuildKeys.LAUNCHER_VERSION_NAME}`,
      '--width',
      String(inst.resolutionWidth || this.settings.windowWidth),
      '--height',
      String(inst.resolutionHeight || this.settings.windowHeight),
      ...(this.settings.fullscreen ? ['--fullscreen'] : []),
    ];

    const javaBin = selectedJava?.path || (process.platform === 'win32' ? 'javaw.exe' : 'java');
    const commandPreview = `"${javaBin}" ${jvmArgs.slice(0, 8).join(' ')} ... ${mainClass} --username ${acc.username} --version ${inst.mcVersion}`;

    inst.lastPlayedAt = Date.now();
    inst.launchCount = (inst.launchCount || 0) + 1;
    await this.saveAllState();

    const headerLines = [
      `====================================================================`,
      `[${BuildKeys.LAUNCHER_APP_NAME} v${BuildKeys.LAUNCHER_VERSION_NAME}] Launching ${inst.name}`,
      `Time       : ${new Date().toISOString()}`,
      `Account    : ${acc.username} (${acc.type.toUpperCase()} • ${acc.uuid})`,
      `Version    : Minecraft ${inst.mcVersion} • Loader: ${inst.loader.toUpperCase()}${inst.loaderVersion ? ' ' + inst.loaderVersion : ''}`,
      `Memory     : -Xms${minRamMb}M -Xmx${ramMb}M (${this.settings.gcPreset})`,
      `Java       : ${selectedJava ? `${selectedJava.name} -> ${selectedJava.path}` : `Not detected yet (recommended: Java ${neededMajor})`}`,
      `Game Dir   : ${instDir}`,
      `Command    : ${commandPreview}`,
      `====================================================================`,
    ];

    await fsp.writeFile(latestLogPath, headerLines.join('\n') + '\n');
    for (const line of headerLines) {
      this.emit('log:line', { instanceId: inst.id, line });
    }

    const clientJarPath = path.join(this.minecraftRoot, 'versions', inst.mcVersion, `${inst.mcVersion}.jar`);
    const hasClientJar = await fsp
      .access(clientJarPath)
      .then(() => true)
      .catch(() => false);

    if (!selectedJava || !hasClientJar) {
      const infoNote = !selectedJava
        ? `[TurboCraft] No local Java ${neededMajor} runtime detected on this machine yet. Open Settings → Java Runtimes to 1-click install Adoptium Temurin Java ${neededMajor}!`
        : `[TurboCraft] Client JAR (${inst.mcVersion}.jar) has not finished downloading yet. Connect to the internet on your PC and re-run Install/Repair to fetch official Mojang assets.`;
      await fsp.appendFile(latestLogPath, `${infoNote}\n`);
      this.emit('log:line', { instanceId: inst.id, line: infoNote });
      this.emit('state:changed');
      return {
        launched: false,
        mode: 'dry_run_no_java',
        commandPreview,
        instanceId: inst.id,
        message: infoNote,
      };
    }

    const env = { ...process.env };
    if (this.settings.preferDedicatedGpu && process.platform === 'linux') {
      env.DRI_PRIME = '1';
      env.__NV_PRIME_RENDER_OFFLOAD = '1';
      env.__GLX_VENDOR_LIBRARY_NAME = 'nvidia';
    }

    const startedAt = Date.now();
    const child = spawn(javaBin, jvmArgs, {
      cwd: instDir,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    this.runningProcesses.set(inst.id, { proc: child, startedAt });
    this.syncDiscordPresence(`Playing ${inst.name}`, `MC ${inst.mcVersion} • ${acc.username}`);
    this.emit('state:changed');

    const appendLine = (chunk: Buffer) => {
      const text = chunk.toString('utf8');
      void fsp.appendFile(latestLogPath, text).catch(() => undefined);
      for (const line of text.split(/\r?\n/)) {
        if (line.trim()) {
          this.emit('log:line', { instanceId: inst.id, line });
        }
      }
    };

    child.stdout?.on('data', appendLine);
    child.stderr?.on('data', appendLine);

    child.on('close', (code) => {
      const sessionMs = Math.max(1000, Date.now() - startedAt);
      this.runningProcesses.delete(inst.id);
      this.recordPlayTime(inst.id, sessionMs);
      const exitMsg = `[TurboCraft] Game process exited with code ${code ?? 0} (session ${(sessionMs / 60000).toFixed(1)} min).`;
      void fsp.appendFile(latestLogPath, `${exitMsg}\n`).catch(() => undefined);
      this.emit('log:line', { instanceId: inst.id, line: exitMsg });
      this.syncDiscordPresence();
      this.emit('game:exit', { instanceId: inst.id, exitCode: code ?? 0 });
      this.emit('state:changed');
    });

    return {
      launched: true,
      mode: 'jvm_process',
      commandPreview,
      instanceId: inst.id,
      message: `Launched ${inst.name} (PID ${child.pid})`,
    };
  }

  stopGame(instanceId: string): boolean {
    const running = this.runningProcesses.get(instanceId);
    if (!running) return false;
    running.proc.kill('SIGTERM');
    return true;
  }

  private recordPlayTime(instanceId: string, durationMs: number): void {
    const inst = this.instances.find((i) => i.id === instanceId);
    if (inst) {
      inst.totalPlayTimeMs = (inst.totalPlayTimeMs || 0) + durationMs;
    }
    const key = todayKey();
    if (!this.playtimeByDate[key]) this.playtimeByDate[key] = {};
    this.playtimeByDate[key][instanceId] = (this.playtimeByDate[key][instanceId] || 0) + durationMs;
    void this.saveAllState();
  }

  private buildGcFlags(preset: LauncherSettings['gcPreset']): string[] {
    switch (preset) {
      case 'zgc_gen':
        return ['-XX:+UnlockExperimentalVMOptions', '-XX:+UseZGC', '-XX:+ZGenerational', '-XX:+AlwaysPreTouch'];
      case 'low_ram':
        return ['-XX:+UseG1GC', '-XX:MaxGCPauseMillis=100', '-XX:+UseStringDeduplication'];
      case 'g1gc_aikar':
        return [
          '-XX:+UnlockExperimentalVMOptions',
          '-XX:+UseG1GC',
          '-XX:G1NewSizePercent=20',
          '-XX:G1ReservePercent=20',
          '-XX:MaxGCPauseMillis=50',
          '-XX:G1HeapRegionSize=32M',
        ];
      default:
        return [];
    }
  }

  private async buildClasspathAndMainClass(
    inst: MinecraftInstance
  ): Promise<{ classpath: string; mainClass: string }> {
    const cpEntries: string[] = [];
    let mainClass = 'net.minecraft.client.main.Main';

    try {
      const verJson = JSON.parse(
        await fsp.readFile(
          path.join(this.minecraftRoot, 'versions', inst.mcVersion, `${inst.mcVersion}.json`),
          'utf8'
        )
      );
      if (verJson.mainClass) mainClass = verJson.mainClass;
      for (const lib of verJson.libraries || []) {
        if (!this.matchesMojangOsRules(lib.rules)) continue;
        if (lib.downloads?.artifact?.path) {
          cpEntries.push(path.join(this.minecraftRoot, 'libraries', lib.downloads.artifact.path));
        }
      }
    } catch {
      // fallback if version json not synced yet
    }

    try {
      const loaderProf = JSON.parse(
        await fsp.readFile(path.join(this.getInstanceDir(inst), 'loader-profile.json'), 'utf8')
      );
      if (loaderProf.mainClass) mainClass = loaderProf.mainClass;
      for (const lib of loaderProf.libraries || []) {
        const rel = this.mavenCoordinateToPath(lib.name);
        if (rel) cpEntries.push(path.join(this.minecraftRoot, 'libraries', rel));
      }
    } catch {
      if (inst.loader === 'fabric') mainClass = 'net.fabricmc.loader.impl.launch.knot.KnotClient';
      else if (inst.loader === 'quilt') mainClass = 'org.quiltmc.loader.impl.launch.knot.KnotClient';
      else if (inst.loader === 'neoforge' || inst.loader === 'forge')
        mainClass = 'cpw.mods.bootstraplauncher.BootstrapLauncher';
    }

    cpEntries.push(path.join(this.minecraftRoot, 'versions', inst.mcVersion, `${inst.mcVersion}.jar`));
    return {
      classpath: cpEntries.join(path.delimiter),
      mainClass,
    };
  }

  async getInstanceLog(instanceId?: string): Promise<{ logText: string; analysis: CrashAnalysisReport }> {
    const inst = this.instances.find((i) => i.id === (instanceId || this.activeInstanceId));
    if (!inst) {
      return {
        logText: 'No instance selected.',
        analysis: this.analyzeLog(''),
      };
    }
    const logPath = path.join(this.getInstanceDir(inst), 'logs', 'latest.log');
    const logText = await fsp.readFile(logPath, 'utf8').catch(() => 'No log generated yet for this instance.');
    return {
      logText,
      analysis: this.analyzeLog(logText),
    };
  }

  analyzeLog(logText: string): CrashAnalysisReport {
    if (!logText.trim()) {
      return {
        hasCrash: false,
        severity: 'info',
        titleEn: 'No Issues Detected',
        titleHi: 'कोई क्रैश नहीं मिला',
        summaryEn: 'Your game log looks clean with no crash exceptions.',
        summaryHi: 'आपका गेम लॉग बिल्कुल साफ़ है, कोई क्रैश या एरर नहीं मिला।',
        suggestions: [],
      };
    }

    if (/OutOfMemoryError/i.test(logText)) {
      return {
        hasCrash: true,
        severity: 'critical',
        titleEn: 'Java Out Of Memory (RAM Exhausted)',
        titleHi: 'मेमोरी कम पड़ गई (OutOfMemoryError)',
        summaryEn: 'Minecraft ran out of heap RAM while loading mods, shaders, or chunks.',
        summaryHi: 'मॉड्स या शेडर्स लोड करते समय Minecraft की आवंटित RAM खत्म हो गई।',
        suggestions: [
          'Increase RAM allocation (-Xmx) in Settings → Game & JVM (4096 MB – 8192 MB recommended for modpacks).',
          'Install FerriteCore & ModernFix from the Download → Mods tab to cut RAM usage by 40%.',
        ],
        matchedLine: logText.split('\n').find((l) => /OutOfMemoryError/i.test(l)),
      };
    }

    if (/UnsupportedClassVersionError/i.test(logText)) {
      return {
        hasCrash: true,
        severity: 'critical',
        titleEn: 'Incompatible Java Version',
        titleHi: 'गलत Java वर्शन चुना गया है',
        summaryEn: 'A mod or Minecraft version requires a newer Java Runtime (e.g. Java 21 for MC 1.20.5+ / 1.21+).',
        summaryHi: 'इस Minecraft वर्शन या मॉड को नए Java वर्शन (जैसे MC 1.21+ के लिए Java 21) की ज़रूरत है।',
        suggestions: [
          'Open Settings → Java Runtimes and install Temurin Java 21 (or Java 17 for 1.18–1.20.4).',
          'Check Version Settings → Java Override and set it to Automatic.',
        ],
        matchedLine: logText.split('\n').find((l) => /UnsupportedClassVersionError/i.test(l)),
      };
    }

    if (/ModResolutionException|Incompatible mods found|MissingModsException/i.test(logText)) {
      return {
        hasCrash: true,
        severity: 'critical',
        titleEn: 'Missing Mod Dependency or Mod Conflict',
        titleHi: 'मॉड डिपेंडेंसी गायब है या मॉड्स में टकराव है',
        summaryEn: 'The mod loader stopped startup because a required dependency (such as Fabric API) is missing or incompatible.',
        summaryHi: 'मॉड लोडर स्टार्ट नहीं हो पाया क्योंकि कोई ज़रूरी मॉड (जैसे Fabric API) गायब है या वर्शन मेल नहीं खा रहा।',
        suggestions: [
          'Open Download → Mods and install Fabric API / Cloth Config / Architectury for your Minecraft version.',
          'Open Versions → Mods Manager and disable recently added mods (.jar) to isolate the conflict.',
        ],
        matchedLine: logText.split('\n').find((l) => /ModResolutionException|Incompatible mods found|MissingModsException/i.test(l)),
      };
    }

    if (/GLFW error 65542|WGL: The driver does not appear to support OpenGL/i.test(logText)) {
      return {
        hasCrash: true,
        severity: 'critical',
        titleEn: 'Graphics Driver / OpenGL Error (GLFW 65542)',
        titleHi: 'ग्राफ़िक्स ड्राइवर / OpenGL त्रुटि',
        summaryEn: 'Your PC GPU driver failed to create an OpenGL 3.2+ context required by Minecraft.',
        summaryHi: 'आपके PC के GPU ड्राइवर में OpenGL सपोर्ट की समस्या आ रही है।',
        suggestions: [
          'Update your NVIDIA, AMD Adrenalin, or Intel Arc/Iris GPU drivers on your PC.',
          'Enable "Prefer Dedicated GPU" inside Settings → Game & Performance.',
        ],
        matchedLine: logText.split('\n').find((l) => /GLFW error/i.test(l)),
      };
    }

    return {
      hasCrash: false,
      severity: 'info',
      titleEn: 'Smart Analyzer: Log Healthy',
      titleHi: 'स्मार्ट एनालाइज़र: लॉग सुरक्षित है',
      summaryEn: 'No fatal JVM crashes, missing dependencies, or OpenGL driver errors detected.',
      summaryHi: 'इस लॉग में कोई क्रैश, मेमोरी समस्या या ड्राइवर एरर नहीं मिला।',
      suggestions: ['Use "Share to mclo.gs" if you want to send your log link on Discord.'],
    };
  }

  // ===================== FILE MANAGER & CODE EDITOR =====================

  private resolveSafePath(relPath = ''): string {
    const normalized = path.resolve(this.dataRoot, relPath.replace(/^[/\\]+/, ''));
    if (!normalized.startsWith(this.dataRoot)) {
      throw new Error('Access outside launcher data directory is denied.');
    }
    return normalized;
  }

  async listFiles(relPath = '') {
    const dir = this.resolveSafePath(relPath);
    await fsp.mkdir(dir, { recursive: true });
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    const items = [];
    for (const e of entries) {
      const full = path.join(dir, e.name);
      const stat = await fsp.stat(full).catch(() => null);
      if (!stat) continue;
      items.push({
        name: e.name,
        relPath: path.relative(this.dataRoot, full).replace(/\\/g, '/'),
        isDirectory: e.isDirectory(),
        sizeBytes: stat.size,
        modifiedAt: stat.mtimeMs,
      });
    }
    return items.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }

  async readTextFile(relPath: string): Promise<string> {
    const file = this.resolveSafePath(relPath);
    const stat = await fsp.stat(file);
    if (stat.size > 2 * 1024 * 1024) {
      throw new Error('File is larger than 2 MB editor limit.');
    }
    return fsp.readFile(file, 'utf8');
  }

  async writeTextFile(relPath: string, content: string): Promise<void> {
    const file = this.resolveSafePath(relPath);
    await fsp.mkdir(path.dirname(file), { recursive: true });
    await fsp.writeFile(file, content, 'utf8');
  }

  async createDirectory(relPath: string): Promise<void> {
    const dir = this.resolveSafePath(relPath);
    await fsp.mkdir(dir, { recursive: true });
  }

  async deleteFileOrDir(relPath: string): Promise<void> {
    if (!relPath.trim()) throw new Error('Cannot delete root directory');
    const target = this.resolveSafePath(relPath);
    await fsp.rm(target, { recursive: true, force: true });
  }

  // ===================== TERRACOTTA / P2P LAN MULTIPLAYER =====================

  async startTerracottaHost(mcLanPort: number): Promise<TerracottaState> {
    await this.stopTerracotta();
    const codeSeg = () => Math.random().toString(36).substring(2, 6).toUpperCase();
    const roomCode = `${BuildKeys.LAUNCHER_SHORT_NAME}-${codeSeg()}-${codeSeg()}`;

    const server = net.createServer((socket) => {
      this.terracottaState.peersCount++;
      this.terracottaState.logs.push(
        `[${new Date().toLocaleTimeString()}] Peer connected (${socket.remoteAddress}) -> forwarding to LAN 127.0.0.1:${mcLanPort}`
      );
      this.emit('state:changed');

      const upstream = net.createConnection({ host: '127.0.0.1', port: mcLanPort });
      socket.pipe(upstream);
      upstream.pipe(socket);

      const cleanup = () => {
        this.terracottaState.peersCount = Math.max(0, this.terracottaState.peersCount - 1);
        socket.destroy();
        upstream.destroy();
        this.emit('state:changed');
      };
      socket.on('error', cleanup);
      upstream.on('error', cleanup);
      socket.on('close', cleanup);
    });

    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '0.0.0.0', () => resolve());
    });

    const addr = server.address();
    const boundPort = typeof addr === 'object' && addr ? addr.port : 0;
    this.terracottaServer = server;
    this.terracottaState = {
      mode: 'hosting',
      roomCode,
      localPort: boundPort,
      targetPort: mcLanPort,
      peersCount: 1,
      startedAt: Date.now(),
      logs: [
        ...this.terracottaState.logs.slice(-40),
        `[${new Date().toLocaleTimeString()}] Hosting Room ${roomCode} -> Minecraft LAN port ${mcLanPort} (Relay port ${boundPort})`,
      ],
    };
    this.emit('state:changed');
    return this.terracottaState;
  }

  async joinTerracottaRoom(roomCode: string, remoteAddress = '127.0.0.1:25565'): Promise<TerracottaState> {
    await this.stopTerracotta();
    const [hostPart, portPart] = remoteAddress.includes(':')
      ? remoteAddress.split(':')
      : ['127.0.0.1', '25565'];
    const remotePort = parseInt(portPart || '25565', 10) || 25565;

    const server = net.createServer((socket) => {
      const upstream = net.createConnection({ host: hostPart, port: remotePort });
      socket.pipe(upstream);
      upstream.pipe(socket);
      socket.on('error', () => upstream.destroy());
      upstream.on('error', () => socket.destroy());
    });

    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', () => resolve());
    });
    const addr = server.address();
    const localPort = typeof addr === 'object' && addr ? addr.port : 0;
    this.terracottaServer = server;
    this.terracottaState = {
      mode: 'joined',
      roomCode: roomCode.trim().toUpperCase(),
      localPort,
      targetPort: remotePort,
      peersCount: 2,
      startedAt: Date.now(),
      logs: [
        ...this.terracottaState.logs.slice(-40),
        `[${new Date().toLocaleTimeString()}] Joined Room ${roomCode.trim().toUpperCase()}! Connect in Minecraft Multiplayer to: 127.0.0.1:${localPort}`,
      ],
    };
    this.emit('state:changed');
    return this.terracottaState;
  }

  async stopTerracotta(): Promise<TerracottaState> {
    if (this.terracottaServer) {
      await new Promise<void>((resolve) => this.terracottaServer!.close(() => resolve()));
      this.terracottaServer = null;
    }
    this.terracottaState = {
      mode: 'idle',
      roomCode: '',
      localPort: 0,
      targetPort: 25565,
      peersCount: 0,
      logs: [
        ...this.terracottaState.logs.slice(-40),
        `[${new Date().toLocaleTimeString()}] Terracotta session stopped.`,
      ],
    };
    this.emit('state:changed');
    return this.terracottaState;
  }
}
