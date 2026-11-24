import React, { useEffect, useState } from 'react';
import {
  Palette,
  Cpu,
  Coffee,
  Download,
  Info,
  RefreshCw,
  Upload,
  Check,
  Compass,
  FileText,
  Users,
} from 'lucide-react';
import {
  BootstrapState,
  FestivalEffectId,
  LauncherSettings,
  ThemeId,
} from '../types/launcher';
import { OFFICIAL_THEMES } from '../theme/themes';
import { tclBridge } from '../bridge/tclBridge';
import { BuildKeys } from '../generated/buildConfig';

type SettingsTab = 'appearance' | 'game' | 'java' | 'downloads' | 'about';

interface SettingsScreenProps {
  state: BootstrapState;
  initialTab?: SettingsTab;
  onUpdateSettings: (patch: Partial<LauncherSettings>) => Promise<void>;
  onRefreshState: () => Promise<void>;
  onToast: (msg: string) => void;
  onOpenLegal: () => void;
  onOpenGuide: () => void;
  onOpenTeam: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  state,
  initialTab = 'appearance',
  onUpdateSettings,
  onRefreshState,
  onToast,
  onOpenLegal,
  onOpenGuide,
  onOpenTeam,
}) => {
  const [tab, setTab] = useState<SettingsTab>(initialTab);
  const [customJavaInput, setCustomJavaInput] = useState('');
  const [scanningJava, setScanningJava] = useState(false);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const s = state.settings;
  const maxRam = Math.max(4096, Math.min(32768, Math.floor(state.system.totalRamMb * 0.85)));

  const handleImportSettings = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        await tclBridge.rpc('importSettingsJson', { rawJson: String(reader.result) });
        await onRefreshState();
        onToast('Settings imported!');
      } catch (err) {
        onToast(err instanceof Error ? err.message : String(err));
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      style={{
        padding: 14,
        height: 'calc(100vh - 48px)',
        boxSizing: 'border-box',
        display: 'grid',
        gridTemplateColumns: '230px 1fr',
        gap: 14,
      }}
    >
      {/* Left Settings Category Rail */}
      <div className="tcl-glass-card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.6, padding: '4px 8px' }}>
          LAUNCHER SETTINGS
        </div>
        {[
          { id: 'appearance', label: 'Appearance & Themes', icon: <Palette size={16} /> },
          { id: 'game', label: 'Game & JVM Memory', icon: <Cpu size={16} /> },
          { id: 'java', label: `Java Runtimes (${state.javaRuntimes.length})`, icon: <Coffee size={16} /> },
          { id: 'downloads', label: 'Downloads & Discord RPC', icon: <Download size={16} /> },
          { id: 'about', label: 'About & Credits', icon: <Info size={16} /> },
        ].map((nav) => (
          <button
            key={nav.id}
            type="button"
            onClick={() => setTab(nav.id as SettingsTab)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 13,
              border: 'none',
              background: tab === nav.id ? 'var(--primary)' : 'transparent',
              color: tab === nav.id ? 'var(--on-primary)' : 'var(--on-surface)',
              fontWeight: tab === nav.id ? 800 : 600,
              fontSize: 13,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            {nav.icon} {nav.label}
          </button>
        ))}
      </div>

      {/* Right Settings Panel */}
      <div className="tcl-glass-card" style={{ padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {tab === 'appearance' && (
          <>
            <h3 style={{ margin: 0 }}>Official TurboCraft Color Themes (Material-3)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 10 }}>
              {(Object.keys(OFFICIAL_THEMES) as Array<Exclude<ThemeId, 'CUSTOM'>>).map((key) => {
                const info = OFFICIAL_THEMES[key];
                const active = s.theme === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => void onUpdateSettings({ theme: key })}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 12px',
                      borderRadius: 14,
                      border: active ? '1.5px solid var(--primary)' : '1px solid rgba(255,255,255,0.09)',
                      background: active ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
                      color: 'var(--on-surface)',
                      cursor: 'pointer',
                    }}
                  >
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        background: info.swatch,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: 12.5, fontWeight: 700, textAlign: 'left' }}>{info.label}</span>
                  </button>
                );
              })}

              {/* Custom Hex Picker */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  borderRadius: 14,
                  border: s.theme === 'CUSTOM' ? '1.5px solid var(--primary)' : '1px solid rgba(255,255,255,0.09)',
                  background: 'rgba(255,255,255,0.04)',
                }}
              >
                <input
                  type="color"
                  value={s.customThemeHex}
                  onChange={(e) => void onUpdateSettings({ theme: 'CUSTOM', customThemeHex: e.target.value })}
                  style={{ width: 28, height: 28, border: 'none', background: 'none', cursor: 'pointer' }}
                />
                <span style={{ fontSize: 12.5, fontWeight: 700 }}>Custom Color</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12.5, fontWeight: 700 }}>Launcher Background</label>
                <select
                  className="tcl-input"
                  value={s.backgroundType}
                  onChange={(e) => void onUpdateSettings({ backgroundType: e.target.value as any })}
                  style={{ width: '100%', marginTop: 6 }}
                >
                  <option value="default_video">Animated Video (default_background.mp4)</option>
                  <option value="hero_image">TurboCraft World Artwork</option>
                  <option value="custom_image">Custom Image URL / Data</option>
                  <option value="custom_video">Custom MP4/WebM Video URL</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12.5, fontWeight: 700 }}>Festival Particle Simulation</label>
                <select
                  className="tcl-input"
                  value={s.festivalEffect}
                  onChange={(e) => void onUpdateSettings({ festivalEffect: e.target.value as FestivalEffectId })}
                  style={{ width: '100%', marginTop: 6 }}
                >
                  <option value="fireflies">Emerald Fireflies</option>
                  <option value="snow">Winter Snowfall</option>
                  <option value="rain">Atmospheric Rain</option>
                  <option value="fireworks">Interactive Fireworks (Click Screen!)</option>
                  <option value="hearts">Floating Hearts</option>
                  <option value="bats">Spooky Bat Swarm</option>
                  <option value="none">Disabled</option>
                </select>
              </div>
            </div>

            {(s.backgroundType === 'custom_image' || s.backgroundType === 'custom_video') && (
              <input
                className="tcl-input"
                placeholder="Paste https:// image or .mp4 URL..."
                value={s.customBackgroundUrl}
                onChange={(e) => void onUpdateSettings({ customBackgroundUrl: e.target.value })}
              />
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                  <span>Surface Darkness / Opacity</span>
                  <strong>{s.backgroundOpacity}%</strong>
                </div>
                <input
                  type="range"
                  min={15}
                  max={95}
                  value={s.backgroundOpacity}
                  onChange={(e) => void onUpdateSettings({ backgroundOpacity: Number(e.target.value) })}
                  style={{ width: '100%', accentColor: 'var(--primary)' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                  <span>BackgroundGlass Blur Radius</span>
                  <strong>{s.backgroundBlur}px</strong>
                </div>
                <input
                  type="range"
                  min={0}
                  max={48}
                  value={s.backgroundBlur}
                  onChange={(e) => void onUpdateSettings({ backgroundBlur: Number(e.target.value) })}
                  style={{ width: '100%', accentColor: 'var(--primary)' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <ToggleRow
                label="Dark Mode UI"
                checked={s.darkMode}
                onChange={(v) => void onUpdateSettings({ darkMode: v })}
              />
              <ToggleRow
                label="Custom Minecraft Pointer Cursor"
                checked={s.customCursor}
                onChange={(v) => void onUpdateSettings({ customCursor: v })}
              />
              <ToggleRow
                label="Show Animated Welcome Screen on Startup"
                checked={s.showWelcomeOnStartup}
                onChange={(v) => void onUpdateSettings({ showWelcomeOnStartup: v })}
              />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.04)' }}>
                <span style={{ fontSize: 13 }}>Language / भाषा</span>
                <select
                  className="tcl-input"
                  value={s.language}
                  onChange={(e) => void onUpdateSettings({ language: e.target.value as 'en' | 'hi' })}
                >
                  <option value="en">English</option>
                  <option value="hi">हिन्दी (Hindi)</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="tcl-btn"
                onClick={async () => {
                  const json = await tclBridge.rpc<string>('exportSettingsJson');
                  const blob = new Blob([json], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'turbocraft-pc-settings.json';
                  a.click();
                  onToast('Exported settings JSON!');
                }}
              >
                Export Settings (.json)
              </button>
              <label className="tcl-btn" style={{ cursor: 'pointer' }}>
                <Upload size={14} /> Import Settings (.json)
                <input type="file" accept=".json" hidden onChange={handleImportSettings} />
              </label>
            </div>
          </>
        )}

        {tab === 'game' && (
          <>
            <h3 style={{ margin: 0 }}>Global Minecraft JVM & Window Configuration</h3>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span>Default Max Heap Memory (-Xmx)</span>
                <strong style={{ color: 'var(--primary)' }}>
                  {s.defaultRamMb} MB ({(s.defaultRamMb / 1024).toFixed(1)} GB)
                </strong>
              </div>
              <input
                type="range"
                min={1024}
                max={maxRam}
                step={256}
                value={s.defaultRamMb}
                onChange={(e) => void onUpdateSettings({ defaultRamMb: Number(e.target.value) })}
                style={{ width: '100%', accentColor: 'var(--primary)' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12.5 }}>Garbage Collector Optimization</label>
                <select
                  className="tcl-input"
                  value={s.gcPreset}
                  onChange={(e) => void onUpdateSettings({ gcPreset: e.target.value as any })}
                  style={{ width: '100%', marginTop: 4 }}
                >
                  <option value="g1gc_aikar">Aikar’s Flags (G1GC — Recommended)</option>
                  <option value="zgc_gen">Generational ZGC (Java 21+ Low Stutter)</option>
                  <option value="low_ram">Low-RAM Laptop Profile</option>
                  <option value="custom">Custom Flags Only</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12.5 }}>Default Window Resolution</label>
                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  <input
                    type="number"
                    className="tcl-input"
                    value={s.windowWidth}
                    onChange={(e) => void onUpdateSettings({ windowWidth: Number(e.target.value) })}
                    style={{ width: '50%' }}
                  />
                  <input
                    type="number"
                    className="tcl-input"
                    value={s.windowHeight}
                    onChange={(e) => void onUpdateSettings({ windowHeight: Number(e.target.value) })}
                    style={{ width: '50%' }}
                  />
                </div>
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12.5 }}>Additional Custom JVM Arguments</label>
              <input
                className="tcl-input"
                value={s.customJvmArgs}
                onChange={(e) => void onUpdateSettings({ customJvmArgs: e.target.value })}
                style={{ width: '100%', marginTop: 4 }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <ToggleRow
                label="Launch Fullscreen by Default"
                checked={s.fullscreen}
                onChange={(v) => void onUpdateSettings({ fullscreen: v })}
              />
              <ToggleRow
                label="Minimize Launcher to Tray on Launch"
                checked={s.minimizeOnLaunch}
                onChange={(v) => void onUpdateSettings({ minimizeOnLaunch: v })}
              />
              <ToggleRow
                label="Prefer Dedicated GPU (NVIDIA/AMD)"
                checked={s.preferDedicatedGpu}
                onChange={(v) => void onUpdateSettings({ preferDedicatedGpu: v })}
              />
              <ToggleRow
                label="Isolate Instance Folders by Default"
                checked={s.isolatedInstancesByDefault}
                onChange={(v) => void onUpdateSettings({ isolatedInstancesByDefault: v })}
              />
            </div>
          </>
        )}

        {tab === 'java' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0 }}>MultiRT — PC Java Runtime Manager</h3>
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  MC ≤1.16.5 uses Java 8 • MC 1.17–1.20.4 uses Java 17 • MC 1.20.5–1.21+ uses Java 21
                </div>
              </div>
              <button
                type="button"
                className="tcl-btn"
                disabled={scanningJava}
                onClick={async () => {
                  setScanningJava(true);
                  await tclBridge.rpc('scanJavaRuntimes');
                  await onRefreshState();
                  setScanningJava(false);
                  onToast('Completed PC Java scan!');
                }}
              >
                <RefreshCw size={14} className={scanningJava ? 'tcl-spin' : ''} /> Re-Scan PC
              </button>
            </div>

            {/* 1-Click Adoptium JRE Installers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {([8, 17, 21, 25] as const).map((ver) => {
                const hasVer = state.javaRuntimes.some((j) => j.major === ver);
                return (
                  <div
                    key={ver}
                    style={{
                      padding: 12,
                      borderRadius: 14,
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: 15 }}>Temurin Java {ver}</div>
                    <div style={{ fontSize: 11, opacity: 0.68 }}>
                      {ver === 8
                        ? 'Classic 1.7.10 – 1.16.5'
                        : ver === 17
                          ? 'Modern 1.17 – 1.20.4'
                          : ver === 21
                            ? 'Latest 1.20.5 – 1.21.4+'
                            : 'Next-Gen 26.x+ Snapshots'}
                    </div>
                    <button
                      type="button"
                      className={hasVer ? 'tcl-btn' : 'tcl-btn tcl-btn-primary'}
                      style={{ justifyContent: 'center' }}
                      onClick={async () => {
                        try {
                          onToast(`Downloading Adoptium Java ${ver} — check Task Menu!`);
                          await tclBridge.rpc('installManagedJava', { major: ver });
                          await onRefreshState();
                          onToast(`Java ${ver} installed!`);
                        } catch (err) {
                          onToast(err instanceof Error ? err.message : String(err));
                        }
                      }}
                    >
                      {hasVer ? (
                        <>
                          <Check size={14} /> Installed
                        </>
                      ) : (
                        <>
                          <Download size={14} /> 1-Click Install
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Custom Path Input */}
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="tcl-input"
                placeholder="Custom java / javaw.exe binary path..."
                value={customJavaInput}
                onChange={(e) => setCustomJavaInput(e.target.value)}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="tcl-btn"
                onClick={async () => {
                  try {
                    await tclBridge.rpc('addCustomJavaPath', { javaPath: customJavaInput });
                    setCustomJavaInput('');
                    await onRefreshState();
                    onToast('Java runtime verified & added!');
                  } catch (err) {
                    onToast(err instanceof Error ? err.message : String(err));
                  }
                }}
              >
                Add Binary
              </button>
            </div>

            {/* Detected Runtimes List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {state.javaRuntimes.length === 0 ? (
                <div style={{ padding: 20, opacity: 0.65, fontSize: 13 }}>
                  No system Java detected yet — use the 1-Click Install cards above on your PC or add a path manually.
                </div>
              ) : (
                state.javaRuntimes.map((j) => (
                  <div
                    key={j.id}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 12,
                      background: 'rgba(255,255,255,0.04)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13.5 }}>
                        {j.name} — <code>{j.version}</code>
                      </div>
                      <div style={{ fontSize: 11, opacity: 0.65 }}>{j.path}</div>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 700 }}>
                      {j.managed ? 'Managed by TCL' : 'System JDK'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {tab === 'downloads' && (
          <>
            <h3 style={{ margin: 0 }}>Download Engine, API Keys & Discord Rich Presence</h3>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                <span>Parallel Download Worker Threads</span>
                <strong>{s.downloadThreads} Threads</strong>
              </div>
              <input
                type="range"
                min={2}
                max={32}
                value={s.downloadThreads}
                onChange={(e) => void onUpdateSettings({ downloadThreads: Number(e.target.value) })}
                style={{ width: '100%', accentColor: 'var(--primary)' }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12.5 }}>Game & Asset Download Source Mirror</label>
              <select
                className="tcl-input"
                value={s.downloadMirror}
                onChange={(e) => void onUpdateSettings({ downloadMirror: e.target.value as any })}
                style={{ width: '100%', marginTop: 4 }}
              >
                <option value="official">Official Mojang + Maven Mirrors (Global Default)</option>
                <option value="bmclapi">BMCLAPI High-Speed Mirror</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12.5 }}>Optional CurseForge API Key (Modrinth works without any key)</label>
              <input
                type="password"
                className="tcl-input"
                placeholder="$2a$10$..."
                value={s.curseforgeApiKey}
                onChange={(e) => void onUpdateSettings({ curseforgeApiKey: e.target.value })}
                style={{ width: '100%', marginTop: 4 }}
              />
            </div>

            <ToggleRow
              label="Enable Desktop Discord Rich Presence (IPC)"
              checked={s.discordRpcEnabled}
              onChange={(v) => void onUpdateSettings({ discordRpcEnabled: v })}
            />

            <div>
              <label style={{ fontSize: 12.5 }}>Discord Application Client ID (Optional)</label>
              <input
                className="tcl-input"
                placeholder="Enter Discord App ID to broadcast live playing status..."
                value={s.discordAppId}
                onChange={(e) => void onUpdateSettings({ discordAppId: e.target.value })}
                style={{ width: '100%', marginTop: 4 }}
              />
            </div>
          </>
        )}

        {tab === 'about' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <img src="./assets/turbocraft-icon.png" alt="TCL" style={{ width: 64, height: 64, borderRadius: 16 }} />
              <div>
                <h2 style={{ margin: 0 }}>{BuildKeys.LAUNCHER_APP_NAME}</h2>
                <div style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 13 }}>
                  Version {BuildKeys.LAUNCHER_VERSION_NAME} (versionCode {BuildKeys.LAUNCHER_VERSION_CODE}) • {BuildKeys.LAUNCHER_COPYRIGHT}
                </div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  Configured via <code>gradle.properties</code> • {BuildKeys.URL_HOME}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button type="button" className="tcl-btn tcl-btn-primary" onClick={onOpenGuide}>
                <Compass size={15} /> Re-run Interactive Guide
              </button>
              <button type="button" className="tcl-btn" onClick={onOpenLegal}>
                <FileText size={15} /> User Agreement & Privacy Policy
              </button>
              <button type="button" className="tcl-btn" onClick={onOpenTeam}>
                <Users size={15} /> Meet TCL Team
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const ToggleRow: React.FC<{
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}> = ({ label, checked, onChange }) => (
  <label
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '10px 12px',
      borderRadius: 12,
      background: 'rgba(255,255,255,0.04)',
      cursor: 'pointer',
      fontSize: 13,
    }}
  >
    <span>{label}</span>
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      style={{ accentColor: 'var(--primary)', width: 17, height: 17 }}
    />
  </label>
);
