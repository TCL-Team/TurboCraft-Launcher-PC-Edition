import React, { useEffect, useState } from 'react';
import { marked } from 'marked';
import { BarChart3, Cpu, Camera, Edit3, Save, FolderOpen } from 'lucide-react';
import { BootstrapState } from '../types/launcher';
import { tclBridge } from '../bridge/tclBridge';

interface StatsScreenProps {
  state: BootstrapState;
  initialTab?: 'playtime' | 'gamestats' | 'screenshots' | 'home_editor';
  onRefreshState: () => Promise<void>;
  onToast: (msg: string) => void;
  onOpenFileManagerAt: (relPath: string) => void;
}

export const StatsScreen: React.FC<StatsScreenProps> = ({
  state,
  initialTab = 'playtime',
  onRefreshState,
  onToast,
  onOpenFileManagerAt,
}) => {
  const [tab, setTab] = useState(initialTab);
  const [customMd, setCustomMd] = useState(state.customHomeMarkdown);
  const [screenshots, setScreenshots] = useState<Array<{ name: string; instanceName: string; sizeBytes: number }>>([]);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (tab !== 'screenshots') return;
    void (async () => {
      const all: Array<{ name: string; instanceName: string; sizeBytes: number }> = [];
      for (const inst of state.instances) {
        const list = await tclBridge
          .rpc<Array<{ name: string; sizeBytes: number }>>('listInstanceContent', {
            instanceId: inst.id,
            category: 'screenshots',
          })
          .catch(() => []);
        for (const item of list) {
          all.push({ name: item.name, instanceName: inst.name, sizeBytes: item.sizeBytes });
        }
      }
      setScreenshots(all);
    })();
  }, [tab, state.instances.length]);

  const totalPlayHours =
    state.instances.reduce((acc, i) => acc + (i.totalPlayTimeMs || 0), 0) / 3600_000;
  const totalLaunches = state.instances.reduce((acc, i) => acc + (i.launchCount || 0), 0);

  return (
    <div
      style={{
        padding: 14,
        height: 'calc(100vh - 48px)',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          className={tab === 'playtime' ? 'tcl-btn tcl-btn-primary' : 'tcl-btn'}
          onClick={() => setTab('playtime')}
        >
          <BarChart3 size={15} /> Playtime Statistics
        </button>
        <button
          type="button"
          className={tab === 'gamestats' ? 'tcl-btn tcl-btn-primary' : 'tcl-btn'}
          onClick={() => setTab('gamestats')}
        >
          <Cpu size={15} /> System & Game Diagnostics
        </button>
        <button
          type="button"
          className={tab === 'screenshots' ? 'tcl-btn tcl-btn-primary' : 'tcl-btn'}
          onClick={() => setTab('screenshots')}
        >
          <Camera size={15} /> Screenshots & Recordings
        </button>
        <button
          type="button"
          className={tab === 'home_editor' ? 'tcl-btn tcl-btn-primary' : 'tcl-btn'}
          onClick={() => setTab('home_editor')}
        >
          <Edit3 size={15} /> Custom Home Page Editor
        </button>
      </div>

      {tab === 'playtime' && (
        <div className="tcl-glass-card" style={{ flex: 1, padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <StatMetric label="Total Playtime" value={`${totalPlayHours.toFixed(1)} Hours`} />
            <StatMetric label="Total Sessions Launched" value={`${totalLaunches} Sessions`} />
            <StatMetric label="Installed Instances" value={`${state.instances.length} Worlds/Profiles`} />
          </div>

          <h3 style={{ margin: '6px 0 0', fontSize: 16 }}>Playtime Breakdown by Instance</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[...state.instances]
              .sort((a, b) => b.totalPlayTimeMs - a.totalPlayTimeMs)
              .map((inst) => {
                const hrs = inst.totalPlayTimeMs / 3600_000;
                const pct = totalPlayHours > 0 ? Math.min(100, (hrs / totalPlayHours) * 100) : 0;
                return (
                  <div
                    key={inst.id}
                    style={{
                      padding: 12,
                      borderRadius: 14,
                      background: 'rgba(255,255,255,0.04)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                      <strong>{inst.name}</strong>
                      <span style={{ color: 'var(--primary)', fontWeight: 700 }}>
                        {hrs.toFixed(1)} h ({inst.launchCount} launches)
                      </span>
                    </div>
                    <div style={{ height: 7, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.max(4, pct)}%`, height: '100%', background: 'var(--primary)' }} />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {tab === 'gamestats' && (
        <div className="tcl-glass-card" style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
          <h3 style={{ marginTop: 0 }}>PC Hardware & Launcher Environment</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <StatMetric label="Operating System" value={`${state.system.platform} (${state.system.arch}) — ${state.system.release}`} />
            <StatMetric label="CPU Processor" value={`${state.system.cpuModel} (${state.system.cpuCores} Threads)`} />
            <StatMetric label="System Memory (RAM)" value={`${(state.system.totalRamMb / 1024).toFixed(1)} GB Total • ${(state.system.freeRamMb / 1024).toFixed(1)} GB Free`} />
            <StatMetric label="Detected Java Runtimes" value={`${state.javaRuntimes.length} JDK/JREs Registered`} />
            <StatMetric label="Launcher Data Root" value={state.system.dataRoot} />
            <StatMetric label="Shared Minecraft Assets" value={state.system.minecraftRoot} />
          </div>
        </div>
      )}

      {tab === 'screenshots' && (
        <div className="tcl-glass-card" style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>In-Game Screenshots (F2) & Captures</h3>
            <button
              type="button"
              className="tcl-btn"
              onClick={() =>
                onOpenFileManagerAt(
                  state.activeInstanceId ? `instances/${state.activeInstanceId}/screenshots` : 'instances'
                )
              }
            >
              <FolderOpen size={14} /> Open Screenshots Folder
            </button>
          </div>
          {screenshots.length === 0 ? (
            <div style={{ padding: 36, textAlign: 'center', opacity: 0.65, fontSize: 13.5 }}>
              Press <code>F2</code> while playing Minecraft to capture screenshots — they automatically appear right here!
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
              {screenshots.map((sc, i) => (
                <div key={i} style={{ padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.05)' }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{sc.name}</div>
                  <div style={{ fontSize: 11, opacity: 0.65 }}>{sc.instanceName}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'home_editor' && (
        <div className="tcl-glass-card" style={{ flex: 1, padding: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, minHeight: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>Custom Home Markdown Banner</strong>
              <button
                type="button"
                className="tcl-btn tcl-btn-primary"
                onClick={async () => {
                  await tclBridge.rpc('saveCustomHomeMarkdown', { markdown: customMd });
                  await onRefreshState();
                  onToast('Saved Custom Home Page!');
                }}
              >
                <Save size={14} /> Save to Dashboard
              </button>
            </div>
            <textarea
              className="tcl-input"
              placeholder="Write custom Markdown notes, server rules, or quick links to display at the bottom of your Home Dashboard..."
              value={customMd}
              onChange={(e) => setCustomMd(e.target.value)}
              style={{ flex: 1, resize: 'none', fontFamily: 'ui-monospace, monospace' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <strong>Live Preview</strong>
            <div
              className="tcl-markdown-body"
              style={{
                flex: 1,
                padding: 14,
                borderRadius: 12,
                background: 'rgba(0,0,0,0.3)',
                overflowY: 'auto',
              }}
              dangerouslySetInnerHTML={{
                __html: marked.parse(customMd || '*Empty — Home Dashboard shows standard 3-column view.*') as string,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const StatMetric: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ padding: 14, borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
    <div style={{ fontSize: 11.5, opacity: 0.65 }}>{label}</div>
    <div style={{ fontSize: 15.5, fontWeight: 800, marginTop: 4, wordBreak: 'break-word' }}>{value}</div>
  </div>
);
