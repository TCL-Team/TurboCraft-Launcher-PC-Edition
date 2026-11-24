import React, { useEffect, useState } from 'react';
import {
  X,
  ExternalLink,
  Gauge,
  Folder,
  FileCode,
  Save,
  Plus,
  Trash2,
  ArrowUp,
  Cpu,
  Check,
} from 'lucide-react';
import { LauncherSettings } from '../types/launcher';
import { tclBridge } from '../bridge/tclBridge';
import { BuildKeys } from '../generated/buildConfig';

/** Official TCL Team roster ported 1:1 from `TeamData.kt` */
const TEAM_MEMBERS = [
  { name: 'Wolf', role: 'Founder', photo: './assets/team/wolf.jpg' },
  { name: 'Petitecake', role: 'Founder', photo: './assets/team/petitecake.png' },
  { name: 'Roller_Gaming', role: 'Co-Founder', photo: './assets/team/roller_gaming.png' },
  { name: 'ItzRealHyper', role: 'Manager', photo: './assets/team/itzrealhyper.png' },
  { name: 'AHMAD XD', role: 'Beta Testers', photo: './assets/team/ahmad_xd.png' },
  { name: 'SkyGaming25', role: 'Beta Testers', photo: './assets/team/sky_gaming.png' },
  { name: 'Devansh', role: 'Beta Testers', photo: './assets/team/devansh.png' },
];

export const TeamDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="tcl-modal-backdrop" onClick={onClose}>
    <div
      className="tcl-glass-card"
      style={{ width: 'min(640px, 94vw)', padding: 24 }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 20 }}>Our Team — TCL Team</h3>
          <div style={{ fontSize: 12, opacity: 0.7 }}>The people behind TurboCraft Launcher (Android & PC Edition)</div>
        </div>
        <button type="button" className="tcl-icon-btn" onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: 12 }}>
        {TEAM_MEMBERS.map((m) => (
          <div
            key={m.name}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 11,
              padding: 12,
              borderRadius: 16,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <img
              src={m.photo}
              alt={m.name}
              style={{ width: 46, height: 46, borderRadius: '50%', objectFit: 'cover' }}
            />
            <div>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>{m.name}</div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--primary)',
                  fontWeight: 600,
                }}
              >
                {m.role}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const SocialLinksDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const links = [
    {
      name: 'Official Discord Community',
      desc: 'Get support, share modpacks, find party teammates & test pre-releases',
      icon: './assets/icons/discord.png',
      url: BuildKeys.URL_DISCORD,
    },
    {
      name: 'Official YouTube Channel',
      desc: 'Watch release showcases, setup guides, and performance benchmarks',
      icon: './assets/icons/youtube.png',
      url: BuildKeys.URL_YOUTUBE,
    },
    {
      name: `GitHub — ${BuildKeys.LAUNCHER_SHORT_NAME} Organization`,
      desc: 'Source code, issue tracker, PC & Android releases (GPL-3.0)',
      icon: './assets/turbocraft-icon.png',
      url: BuildKeys.URL_GITHUB_ORG,
    },
  ];

  return (
    <div className="tcl-modal-backdrop" onClick={onClose}>
      <div
        className="tcl-glass-card"
        style={{ width: 'min(520px, 92vw)', padding: 22 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 19 }}>Official TurboCraft Links</h3>
          <button type="button" className="tcl-icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {links.map((item) => (
            <button
              key={item.name}
              type="button"
              onClick={() => void tclBridge.openExternal(item.url)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '12px 14px',
                borderRadius: 16,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.09)',
                color: 'var(--on-surface)',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <img src={item.icon} alt="" style={{ width: 38, height: 38, borderRadius: 10, objectFit: 'contain' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{item.name}</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>{item.desc}</div>
              </div>
              <ExternalLink size={16} opacity={0.7} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export const AboutDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="tcl-modal-backdrop" onClick={onClose}>
    <div
      className="tcl-glass-card"
      style={{ width: 'min(560px, 92vw)', padding: 24 }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <img src="./assets/turbocraft-icon.png" alt="TCL" style={{ width: 58, height: 58, borderRadius: 16 }} />
          <div>
            <h3 style={{ margin: 0, fontSize: 21 }}>{BuildKeys.LAUNCHER_APP_NAME}</h3>
            <div style={{ fontSize: 12.5, color: 'var(--primary)', fontWeight: 700 }}>
              Version {BuildKeys.LAUNCHER_VERSION_NAME} (Build {BuildKeys.LAUNCHER_VERSION_CODE}) • GNU GPL v3.0
            </div>
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>
              One Core, Endless Worlds — Windows, Linux & macOS
            </div>
          </div>
        </div>
        <button type="button" className="tcl-icon-btn" onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      <p style={{ fontSize: 13, lineHeight: 1.6, opacity: 0.85, margin: '16px 0' }}>
        TurboCraft Launcher PC Edition brings the exact expressive glass UI, 3D player pet, and cross-platform Social Hub of TurboCraft Android natively to desktop gamers, powered by multi-threaded Mojang/Modrinth downloads and hardware-accelerated JVM execution.
      </p>

      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, opacity: 0.8 }}>
        Open-Source Ecosystem Acknowledgements
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        {[
          { name: 'TurboCraft Launcher', icon: './assets/turbocraft-icon.png', role: 'TCL Team Core & Social' },
          { name: 'Zalith Launcher 2', icon: './assets/icons/zl2plus.png', role: 'UI Inspiration & Design' },
          { name: 'HMCL & PojavLauncher', icon: './assets/icons/hmcl.png', role: 'Java Ecosystem Heritage' },
          { name: 'skinview3d & LWJGL', icon: './assets/icons/minecraft.png', role: '3D Skin & OpenGL Stack' },
        ].map((c) => (
          <div
            key={c.name}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 10px',
              borderRadius: 12,
              background: 'rgba(255,255,255,0.05)',
            }}
          >
            <img src={c.icon} alt="" style={{ width: 28, height: 28, borderRadius: 7 }} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 700 }}>{c.name}</div>
              <div style={{ fontSize: 10.5, opacity: 0.65 }}>{c.role}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button
          type="button"
          className="tcl-btn"
          onClick={() => void tclBridge.openExternal(BuildKeys.URL_HOME)}
        >
          GitHub Repo <ExternalLink size={14} />
        </button>
        <button type="button" className="tcl-btn tcl-btn-primary" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  </div>
);

export const PerformanceSettingsDialog: React.FC<{
  settings: LauncherSettings;
  totalRamMb: number;
  onSave: (patch: Partial<LauncherSettings>) => Promise<void>;
  onClose: () => void;
}> = ({ settings, totalRamMb, onSave, onClose }) => {
  const [ram, setRam] = useState(settings.defaultRamMb);
  const [gc, setGc] = useState(settings.gcPreset);
  const [dgpu, setDgpu] = useState(settings.preferDedicatedGpu);
  const [fullscreen, setFullscreen] = useState(settings.fullscreen);
  const maxSlider = Math.max(4096, Math.min(32768, Math.floor(totalRamMb * 0.85)));

  return (
    <div className="tcl-modal-backdrop" onClick={onClose}>
      <div
        className="tcl-glass-card"
        style={{ width: 'min(520px, 92vw)', padding: 24 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Gauge size={20} color="var(--primary)" />
            <h3 style={{ margin: 0, fontSize: 19 }}>Quick JVM & FPS Performance</h3>
          </div>
          <button type="button" className="tcl-icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
              <span>Allocated Max Memory (RAM -Xmx)</span>
              <strong style={{ color: 'var(--primary)' }}>
                {ram} MB ({(ram / 1024).toFixed(1)} GB / {(totalRamMb / 1024).toFixed(1)} GB System)
              </strong>
            </div>
            <input
              type="range"
              min={1024}
              max={maxSlider}
              step={256}
              value={ram}
              onChange={(e) => setRam(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--primary)' }}
            />
          </div>

          <div>
            <div style={{ fontSize: 13, marginBottom: 6 }}>JVM Garbage Collector Preset</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { id: 'g1gc_aikar', title: "Aikar's G1GC", desc: 'Best for modded 1.16–1.21' },
                { id: 'zgc_gen', title: 'Generational ZGC', desc: 'Ultra-low stutter (Java 21+)' },
                { id: 'low_ram', title: 'Low-RAM Saver', desc: 'For 4GB–8GB laptops' },
                { id: 'custom', title: 'Custom Flags Only', desc: 'Manual JVM arguments' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setGc(opt.id as LauncherSettings['gcPreset'])}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 12,
                    border:
                      gc === opt.id
                        ? '1.5px solid var(--primary)'
                        : '1px solid rgba(255,255,255,0.1)',
                    background:
                      gc === opt.id ? 'rgba(139,229,27,0.12)' : 'rgba(255,255,255,0.04)',
                    color: 'var(--on-surface)',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 12.5 }}>{opt.title}</div>
                  <div style={{ fontSize: 11, opacity: 0.68 }}>{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Cpu size={16} /> Prefer Dedicated NVIDIA / AMD GPU
            </span>
            <input
              type="checkbox"
              checked={dgpu}
              onChange={(e) => setDgpu(e.target.checked)}
              style={{ accentColor: 'var(--primary)', width: 17, height: 17 }}
            />
          </label>

          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
            <span>Launch Minecraft in Fullscreen Mode</span>
            <input
              type="checkbox"
              checked={fullscreen}
              onChange={(e) => setFullscreen(e.target.checked)}
              style={{ accentColor: 'var(--primary)', width: 17, height: 17 }}
            />
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button type="button" className="tcl-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="tcl-btn tcl-btn-primary"
            onClick={async () => {
              await onSave({
                defaultRamMb: ram,
                gcPreset: gc,
                preferDedicatedGpu: dgpu,
                fullscreen,
              });
              onClose();
            }}
          >
            <Check size={15} /> Apply Performance Profile
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Built-in File Manager + Config Code Editor (ported from `filemanager/` & `ui/code_editor/`)
 */
export const FileManagerModal: React.FC<{
  initialRelPath?: string;
  onClose: () => void;
}> = ({ initialRelPath = '', onClose }) => {
  const [relPath, setRelPath] = useState(initialRelPath);
  const [items, setItems] = useState<
    Array<{ name: string; relPath: string; isDirectory: boolean; sizeBytes: number; modifiedAt: number }>
  >([]);
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const [editorText, setEditorText] = useState('');
  const [savedNotice, setSavedNotice] = useState('');
  const [newFolderName, setNewFolderName] = useState('');

  const loadDir = async (targetPath: string) => {
    const list = await tclBridge.rpc<typeof items>('listFiles', { relPath: targetPath });
    setItems(list);
    setRelPath(targetPath);
  };

  useEffect(() => {
    void loadDir(initialRelPath);
  }, [initialRelPath]);

  const openFileInEditor = async (fileRel: string) => {
    try {
      const res = await tclBridge.rpc<{ content: string }>('readTextFile', { relPath: fileRel });
      setEditingFile(fileRel);
      setEditorText(res.content);
      setSavedNotice('');
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  const saveEditor = async () => {
    if (!editingFile) return;
    await tclBridge.rpc('writeTextFile', { relPath: editingFile, content: editorText });
    setSavedNotice('Saved!');
    setTimeout(() => setSavedNotice(''), 2000);
  };

  const goParent = () => {
    if (!relPath) return;
    const parts = relPath.split('/').filter(Boolean);
    parts.pop();
    void loadDir(parts.join('/'));
  };

  return (
    <div className="tcl-modal-backdrop" onClick={onClose}>
      <div
        className="tcl-glass-card"
        style={{
          width: 'min(940px, 95vw)',
          height: 'min(640px, 88vh)',
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18 }}>Launcher File Explorer & Config Code Editor</h3>
            <div style={{ fontSize: 11.5, opacity: 0.68 }}>
              Path: <code>/{relPath || '(root)'}</code>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {tclBridge.isElectron && (
              <button
                type="button"
                className="tcl-btn"
                onClick={() => void tclBridge.openFolder(relPath)}
              >
                Open in OS Explorer
              </button>
            )}
            <button type="button" className="tcl-icon-btn" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.35fr', gap: 14, flex: 1, minHeight: 0 }}>
          {/* Left Directory Browser */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              borderRadius: 14,
              padding: 10,
              background: 'rgba(0,0,0,0.28)',
              border: '1px solid rgba(255,255,255,0.08)',
              minHeight: 0,
            }}
          >
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button" className="tcl-btn" onClick={goParent} disabled={!relPath}>
                <ArrowUp size={14} /> Up
              </button>
              <input
                className="tcl-input"
                placeholder="New folder..."
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                style={{ flex: 1, padding: '5px 10px' }}
              />
              <button
                type="button"
                className="tcl-btn"
                onClick={async () => {
                  if (!newFolderName.trim()) return;
                  const target = relPath ? `${relPath}/${newFolderName.trim()}` : newFolderName.trim();
                  await tclBridge.rpc('createDirectory', { relPath: target });
                  setNewFolderName('');
                  await loadDir(relPath);
                }}
              >
                <Plus size={14} />
              </button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {items.map((item) => (
                <div
                  key={item.relPath}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '7px 10px',
                    borderRadius: 10,
                    background:
                      editingFile === item.relPath
                        ? 'rgba(139,229,27,0.16)'
                        : 'rgba(255,255,255,0.03)',
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    if (item.isDirectory) void loadDir(item.relPath);
                    else void openFileInEditor(item.relPath);
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                    {item.isDirectory ? (
                      <Folder size={15} color="var(--primary)" />
                    ) : (
                      <FileCode size={15} opacity={0.75} />
                    )}
                    <span
                      style={{
                        fontSize: 12.5,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {item.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="tcl-icon-btn"
                    onClick={async (e) => {
                      e.stopPropagation();
                      await tclBridge.rpc('deleteFileOrDir', { relPath: item.relPath });
                      if (editingFile === item.relPath) setEditingFile(null);
                      await loadDir(relPath);
                    }}
                    title="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Right Built-in Code Editor */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              borderRadius: 14,
              padding: 12,
              background: 'rgba(0,0,0,0.34)',
              border: '1px solid rgba(255,255,255,0.08)',
              minHeight: 0,
            }}
          >
            {editingFile ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <code style={{ fontSize: 12, color: 'var(--primary)' }}>{editingFile}</code>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {savedNotice && (
                      <span style={{ fontSize: 12, color: '#8BE51B', fontWeight: 700 }}>
                        {savedNotice}
                      </span>
                    )}
                    <button type="button" className="tcl-btn tcl-btn-primary" onClick={saveEditor}>
                      <Save size={14} /> Save File
                    </button>
                  </div>
                </div>
                <textarea
                  value={editorText}
                  onChange={(e) => setEditorText(e.target.value)}
                  spellCheck={false}
                  style={{
                    flex: 1,
                    width: '100%',
                    resize: 'none',
                    borderRadius: 10,
                    padding: 12,
                    background: 'rgba(6, 10, 7, 0.8)',
                    color: '#E5F2E0',
                    border: '1px solid rgba(255,255,255,0.1)',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    fontSize: 12.5,
                    lineHeight: 1.55,
                  }}
                />
              </>
            ) : (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0.6,
                  fontSize: 13,
                  textAlign: 'center',
                  padding: 20,
                }}
              >
                Select any config, JSON, TOML, options.txt, or log file on the left to inspect & edit directly inside TurboCraft Launcher.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
