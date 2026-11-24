import React, { useEffect, useMemo, useState } from 'react';
import { marked } from 'marked';
import {
  Play,
  Square,
  ChevronDown,
  Sliders,
  Sparkles,
  Terminal,
  BarChart3,
  Shield,
  Edit3,
} from 'lucide-react';
import {
  BootstrapState,
  LauncherAccount,
  MinecraftInstance,
  ScreenRoute,
} from '../types/launcher';
import { SideBar } from '../components/SideBar';
import { SkinViewer3D } from '../components/SkinViewer3D';
import { t } from '../theme/i18n';
import { tclBridge } from '../bridge/tclBridge';

interface HomeScreenProps {
  state: BootstrapState;
  onNavigate: (route: ScreenRoute) => void;
  onRefreshState: () => Promise<void>;
  onOpenAbout: () => void;
  onOpenTeam: () => void;
  onOpenPerformance: () => void;
  onLaunchToast: (msg: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  state,
  onNavigate,
  onRefreshState,
  onOpenAbout,
  onOpenTeam,
  onOpenPerformance,
  onLaunchToast,
}) => {
  const lang = state.settings.language;
  const activeAccount: LauncherAccount | undefined =
    state.accounts.find((a) => a.id === state.activeAccountId) || state.accounts[0];
  const activeInstance: MinecraftInstance | undefined =
    state.instances.find((i) => i.id === state.activeInstanceId) || state.instances[0];

  const [changelogHtml, setChangelogHtml] = useState('');
  const [latestLogPreview, setLatestLogPreview] = useState('');
  const [instanceMenuOpen, setInstanceMenuOpen] = useState(false);
  const [launching, setLaunching] = useState(false);

  const isRunning = activeInstance ? state.runningInstanceIds.includes(activeInstance.id) : false;

  useEffect(() => {
    void fetch('./assets/CHANGELOGS_UPDATE.md')
      .then((r) => r.text())
      .then((md) => setChangelogHtml(marked.parse(md) as string))
      .catch(() => setChangelogHtml('<p>TurboCraft Launcher PC Edition v1.6.0</p>'));
  }, []);

  useEffect(() => {
    if (!activeInstance) return;
    void tclBridge
      .rpc<{ logText: string }>('getInstanceLog', { instanceId: activeInstance.id })
      .then((res) => setLatestLogPreview(res.logText || ''))
      .catch(() => setLatestLogPreview(''));
  }, [activeInstance?.id, state.runningInstanceIds.length]);

  const weeklyBars = useMemo(() => {
    const out: Array<{ label: string; hours: number; dateKey: string }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400_000);
      const key = d.toISOString().slice(0, 10);
      const dayBucket = state.playtimeByDate[key] || {};
      const totalMs = Object.values(dayBucket).reduce((a, b) => a + b, 0);
      out.push({
        dateKey: key,
        label: d.toLocaleDateString('en-US', { weekday: 'short' }),
        hours: totalMs / 3600_000,
      });
    }
    return out;
  }, [state.playtimeByDate]);

  const maxWeeklyHours = Math.max(0.5, ...weeklyBars.map((b) => b.hours));
  const todayHours = weeklyBars[weeklyBars.length - 1]?.hours || 0;

  const handleLaunchOrStop = async () => {
    if (!activeInstance) {
      onNavigate({ name: 'download', tab: 'game' });
      return;
    }
    if (isRunning) {
      await tclBridge.rpc('stopGame', { instanceId: activeInstance.id });
      await onRefreshState();
      return;
    }
    setLaunching(true);
    try {
      const res = await tclBridge.rpc<{ launched: boolean; message: string }>('launchGame', {
        instanceId: activeInstance.id,
      });
      onLaunchToast(res.message);
      await onRefreshState();
      if (!res.launched) {
        onNavigate({ name: 'logs', instanceId: activeInstance.id });
      }
    } catch (err) {
      onLaunchToast(err instanceof Error ? err.message : String(err));
    } finally {
      setLaunching(false);
    }
  };

  const customHomeHtml = useMemo(() => {
    if (!state.customHomeMarkdown.trim()) return '';
    return marked.parse(state.customHomeMarkdown) as string;
  }, [state.customHomeMarkdown]);

  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        padding: 12,
        height: 'calc(100vh - 48px)',
        boxSizing: 'border-box',
      }}
    >
      {/* Left Collapsible Glass SideBar */}
      <SideBar
        language={lang}
        onPerformanceClick={onOpenPerformance}
        onVersionsClick={() => onNavigate({ name: 'versions' })}
        onAboutClick={onOpenAbout}
        onTeamClick={onOpenTeam}
      />

      {/* Forced 3-Column Dashboard (Exact LauncherScreen.kt Layout) */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
        <div
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: '1fr 1.18fr 1fr',
            gap: 12,
            minHeight: 0,
          }}
        >
          {/* LEFT COLUMN: Weekly PlayTime Chart + Daily PlayTime Card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1, opacity: 0.58, paddingLeft: 4 }}>
              {t(lang, 'todayHeader')}
            </div>

            {/* WeeklyPlayTimeChart */}
            <div
              className="tcl-glass-card"
              style={{
                flex: 1.05,
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: 0,
              }}
            >
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  gap: 8,
                  paddingBottom: 6,
                }}
              >
                {weeklyBars.map((bar) => {
                  const pct = Math.max(6, Math.round((bar.hours / maxWeeklyHours) * 100));
                  return (
                    <div
                      key={bar.dateKey}
                      style={{
                        flex: 1,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: 4,
                      }}
                    >
                      <span style={{ fontSize: 10, opacity: 0.78 }}>
                        {bar.hours.toFixed(1)}
                      </span>
                      <div
                        style={{
                          width: '58%',
                          height: `${pct}%`,
                          borderRadius: 6,
                          background: 'var(--primary)',
                          opacity: 0.42 + (pct / 100) * 0.58,
                          transition: 'height 0.35s ease',
                        }}
                      />
                      <span style={{ fontSize: 10, opacity: 0.55 }}>{bar.label}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize: 11, opacity: 0.58, display: 'flex', alignItems: 'center', gap: 6 }}>
                <BarChart3 size={13} /> {t(lang, 'weeklyGraph')}
              </div>
            </div>

            {/* DailyPlayTimeCard */}
            <button
              type="button"
              onClick={() => onNavigate({ name: 'stats', tab: 'playtime' })}
              className="tcl-glass-card tcl-clickable-card"
              style={{
                flex: 0.95,
                padding: 18,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                alignItems: 'center',
                textAlign: 'center',
                border: '1px solid rgba(255,255,255,0.09)',
                color: 'var(--on-surface)',
                cursor: 'pointer',
              }}
            >
              <div>
                <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1.1 }}>
                  {todayHours.toFixed(1)} h
                </div>
                <div style={{ fontSize: 12, opacity: 0.68, marginTop: 3 }}>
                  {t(lang, 'todayLabel')}
                </div>
              </div>

              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--primary)' }}>
                {t(lang, 'statistics')}
              </div>

              <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--primary)', opacity: 0.85 }}>
                {t(lang, 'clickForMore')}
              </div>
            </button>
          </div>

          {/* CENTER COLUMN: 3D Player Model + Account + Version Selector + Launch Button */}
          <div
            className="tcl-glass-card"
            style={{
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'relative',
              minHeight: 0,
            }}
          >
            {/* Account Selector Header Pill */}
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => onNavigate({ name: 'accounts', tab: 'accounts' })}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 9,
                  padding: '6px 12px',
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'var(--on-surface)',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 7,
                    background: 'var(--primary-container)',
                    color: 'var(--on-primary-container)',
                    fontWeight: 800,
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {(activeAccount?.username || 'P')[0]?.toUpperCase()}
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.1 }}>
                    {activeAccount?.username || 'Add Account'}
                  </div>
                  <div style={{ fontSize: 10, opacity: 0.65, textTransform: 'uppercase' }}>
                    {activeAccount?.type || 'Account'}
                  </div>
                </div>
                <Shield size={13} color="var(--primary)" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate({ name: 'accounts', tab: 'capes' })}
                className="tcl-btn"
                style={{ fontSize: 11.5, padding: '6px 11px' }}
              >
                <Sparkles size={13} /> Capes & Skin
              </button>
            </div>

            {/* Interactive 3D Player Pet (`PetLib` + `skinview3d`) */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
              <SkinViewer3D
                skinUrl={activeAccount?.skinUrl || './assets/skin/steve.png'}
                capeUrl={activeAccount?.capeUrl}
                slim={activeAccount?.skinModel === 'slim'}
                width={225}
                height={270}
              />
            </div>

            {/* Bottom Instance Selector + Big Launch Game Button */}
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ position: 'relative', display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setInstanceMenuOpen((v) => !v)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    padding: '9px 13px',
                    borderRadius: 16,
                    background: 'rgba(0,0,0,0.32)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'var(--on-surface)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
                    <img
                      src={activeInstance?.icon || './assets/icons/minecraft.png'}
                      alt=""
                      style={{ width: 30, height: 30, borderRadius: 8, objectFit: 'contain' }}
                    />
                    <div style={{ textAlign: 'left', overflow: 'hidden' }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {activeInstance ? activeInstance.name : 'Install a Minecraft Version'}
                      </div>
                      <div style={{ fontSize: 11, opacity: 0.65 }}>
                        {activeInstance
                          ? `MC ${activeInstance.mcVersion} • ${activeInstance.loader.toUpperCase()}`
                          : 'Click to browse versions'}
                      </div>
                    </div>
                  </div>
                  <ChevronDown size={16} opacity={0.7} />
                </button>

                {activeInstance && (
                  <button
                    type="button"
                    className="tcl-icon-btn"
                    title="Instance Settings & Mods Manager"
                    onClick={() =>
                      onNavigate({
                        name: 'version_settings',
                        instanceId: activeInstance.id,
                        tab: 'overview',
                      })
                    }
                    style={{
                      width: 44,
                      height: 46,
                      borderRadius: 15,
                      background: 'rgba(0,0,0,0.32)',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    <Sliders size={17} />
                  </button>
                )}

                {instanceMenuOpen && (
                  <div
                    className="tcl-glass-card"
                    style={{
                      position: 'absolute',
                      bottom: 54,
                      left: 0,
                      right: 0,
                      padding: 8,
                      zIndex: 45,
                      maxHeight: 230,
                      overflowY: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}
                  >
                    {state.instances.map((inst) => (
                      <button
                        key={inst.id}
                        type="button"
                        onClick={async () => {
                          await tclBridge.rpc('selectInstance', { instanceId: inst.id });
                          setInstanceMenuOpen(false);
                          await onRefreshState();
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '8px 10px',
                          borderRadius: 11,
                          border: 'none',
                          background:
                            inst.id === activeInstance?.id
                              ? 'rgba(139,229,27,0.18)'
                              : 'transparent',
                          color: 'var(--on-surface)',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <img src={inst.icon} alt="" style={{ width: 24, height: 24, borderRadius: 6 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 700 }}>{inst.name}</div>
                          <div style={{ fontSize: 10.5, opacity: 0.65 }}>
                            {inst.mcVersion} • {inst.loader}
                          </div>
                        </div>
                      </button>
                    ))}
                    <button
                      type="button"
                      className="tcl-btn"
                      onClick={() => {
                        setInstanceMenuOpen(false);
                        onNavigate({ name: 'download', tab: 'game' });
                      }}
                      style={{ marginTop: 4, justifyContent: 'center' }}
                    >
                      + Install New Minecraft Version
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                disabled={launching}
                onClick={handleLaunchOrStop}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  borderRadius: 18,
                  border: 'none',
                  background: isRunning
                    ? 'linear-gradient(135deg, #EF4444, #B91C1C)'
                    : 'linear-gradient(135deg, var(--primary), var(--primary-container))',
                  color: isRunning ? '#FFFFFF' : 'var(--on-primary)',
                  fontSize: 15.5,
                  fontWeight: 800,
                  letterSpacing: 0.3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  cursor: 'pointer',
                  boxShadow: '0 12px 28px rgba(0,0,0,0.38)',
                }}
              >
                {isRunning ? (
                  <>
                    <Square size={18} fill="currentColor" /> {t(lang, 'stopGame')}
                  </>
                ) : (
                  <>
                    <Play size={19} fill="currentColor" />{' '}
                    {launching ? 'Preparing JVM...' : t(lang, 'launchGame')}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: Live Changelog Card + Latest Log Card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1, opacity: 0.58 }}>
                RELEASE NOTES & DIAGNOSTICS
              </span>
              <button
                type="button"
                onClick={() => onNavigate({ name: 'stats', tab: 'home_editor' })}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--primary)',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Edit3 size={11} /> Custom Home
              </button>
            </div>

            {/* ChangelogCard */}
            <div
              className="tcl-glass-card"
              style={{
                flex: 1.15,
                padding: '12px 15px',
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
              }}
            >
              <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 6, color: 'var(--primary)' }}>
                {t(lang, 'changelogTitle')}
              </div>
              <div
                className="tcl-markdown-body"
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  fontSize: 12,
                  lineHeight: 1.55,
                  opacity: 0.88,
                  paddingRight: 4,
                }}
                dangerouslySetInnerHTML={{ __html: changelogHtml }}
              />
            </div>

            {/* LastLogCard */}
            <button
              type="button"
              onClick={() => onNavigate({ name: 'logs', instanceId: activeInstance?.id })}
              className="tcl-glass-card tcl-clickable-card"
              style={{
                flex: 0.85,
                padding: '12px 15px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                textAlign: 'left',
                color: 'var(--on-surface)',
                cursor: 'pointer',
                minHeight: 0,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Terminal size={14} color="var(--primary)" /> {t(lang, 'lastLogTitle')}
                </span>
                <span style={{ fontSize: 10.5, color: 'var(--primary)', fontWeight: 700 }}>
                  Open Console →
                </span>
              </div>

              <pre
                style={{
                  flex: 1,
                  width: '100%',
                  margin: '8px 0',
                  overflow: 'hidden',
                  whiteSpace: 'pre-wrap',
                  fontSize: 10.5,
                  opacity: 0.65,
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                }}
              >
                {latestLogPreview ? latestLogPreview.slice(-460) : t(lang, 'noLogYet')}
              </pre>

              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)' }}>
                Smart Crash Analyzer & mclo.gs Share Ready
              </div>
            </button>
          </div>
        </div>

        {/* Custom Home Markdown Widget Row (when user defines custom Markdown blocks) */}
        {customHomeHtml && (
          <div
            className="tcl-glass-card tcl-markdown-body"
            style={{ padding: '10px 16px', fontSize: 12.5, maxHeight: 110, overflowY: 'auto' }}
            dangerouslySetInnerHTML={{ __html: customHomeHtml }}
          />
        )}
      </div>
    </div>
  );
};
