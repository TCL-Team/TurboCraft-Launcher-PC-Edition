import React, { useEffect, useState } from 'react';
import {
  Play,
  Sliders,
  Copy,
  Trash2,
  PackagePlus,
  Download,
  RefreshCw,
  Upload,
  CheckCircle2,
  XCircle,
  Globe,
  FolderOpen,
  Plus,
} from 'lucide-react';
import { BootstrapState, MinecraftInstance, ScreenRoute } from '../types/launcher';
import { tclBridge } from '../bridge/tclBridge';

interface VersionsScreenProps {
  state: BootstrapState;
  focusedInstanceId?: string;
  initialSubTab?: string;
  onNavigate: (route: ScreenRoute) => void;
  onRefreshState: () => Promise<void>;
  onToast: (msg: string) => void;
  onOpenFileManagerAt: (relPath: string) => void;
}

export const VersionsScreen: React.FC<VersionsScreenProps> = ({
  state,
  focusedInstanceId,
  initialSubTab = 'overview',
  onNavigate,
  onRefreshState,
  onToast,
  onOpenFileManagerAt,
}) => {
  const [selectedId, setSelectedId] = useState<string>(
    focusedInstanceId || state.activeInstanceId || state.instances[0]?.id || ''
  );
  const [subTab, setSubTab] = useState<string>(initialSubTab);

  useEffect(() => {
    if (focusedInstanceId) setSelectedId(focusedInstanceId);
  }, [focusedInstanceId]);

  const instance: MinecraftInstance | undefined = state.instances.find((i) => i.id === selectedId);

  // Content list for mods/resourcepacks/shaderpacks/saves/screenshots
  const [items, setItems] = useState<
    Array<{
      name: string;
      cleanName: string;
      enabled: boolean;
      isDirectory: boolean;
      sizeBytes: number;
    }>
  >([]);

  // Server ping statuses
  const [serverPingMap, setServerPingMap] = useState<Record<string, string>>({});
  const [newServerName, setNewServerName] = useState('');
  const [newServerAddr, setNewServerAddr] = useState('');

  // Export .mrpack state
  const [exportPackName, setExportPackName] = useState('');
  const [exportVersion, setExportVersion] = useState('1.0.0');

  const reloadCategory = async () => {
    if (!instance) return;
    if (['mods', 'resourcepacks', 'shaderpacks', 'saves', 'screenshots'].includes(subTab)) {
      const list = await tclBridge.rpc<typeof items>('listInstanceContent', {
        instanceId: instance.id,
        category: subTab,
      });
      setItems(list);
    }
  };

  useEffect(() => {
    void reloadCategory();
  }, [selectedId, subTab]);

  useEffect(() => {
    if (instance) setExportPackName(instance.name);
  }, [instance?.id]);

  const handleModpackImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const created = await tclBridge.rpc<MinecraftInstance>('importModpackBase64', {
          fileName: file.name,
          base64Data: String(reader.result),
        });
        await onRefreshState();
        setSelectedId(created.id);
        onToast(`Imported modpack "${created.name}"!`);
      } catch (err) {
        onToast(err instanceof Error ? err.message : String(err));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLocalAssetUpload = (
    category: 'mods' | 'resourcepacks' | 'shaderpacks',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file || !instance) return;
    const reader = new FileReader();
    reader.onload = async () => {
      await tclBridge.rpc('installAssetToInstance', {
        instanceId: instance.id,
        category,
        fileName: file.name,
        base64Data: String(reader.result),
      });
      await reloadCategory();
      onToast(`Added ${file.name} to ${category}`);
    };
    reader.readAsDataURL(file);
  };

  const pingServer = async (address: string) => {
    setServerPingMap((m) => ({ ...m, [address]: 'Pinging...' }));
    try {
      const res = await fetch(`https://api.mcsrvstat.us/3/${encodeURIComponent(address)}`);
      const json = await res.json();
      if (json.online) {
        setServerPingMap((m) => ({
          ...m,
          [address]: `Online • ${json.players?.online ?? 0}/${json.players?.max ?? 0} players`,
        }));
      } else {
        setServerPingMap((m) => ({ ...m, [address]: 'Offline / Unreachable' }));
      }
    } catch {
      setServerPingMap((m) => ({ ...m, [address]: 'Saved (Ping offline)' }));
    }
  };

  return (
    <div
      style={{
        padding: 14,
        height: 'calc(100vh - 48px)',
        boxSizing: 'border-box',
        display: 'grid',
        gridTemplateColumns: '320px 1fr',
        gap: 14,
      }}
    >
      {/* Left: Installed Instances List */}
      <div
        className="tcl-glass-card"
        style={{
          padding: 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          minHeight: 0,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Installed Instances</h3>
          <div style={{ display: 'flex', gap: 6 }}>
            <label className="tcl-btn" style={{ padding: '5px 9px', fontSize: 11.5, cursor: 'pointer' }} title="Import .mrpack or CurseForge .zip">
              <PackagePlus size={14} /> Import
              <input type="file" accept=".mrpack,.zip" hidden onChange={handleModpackImport} />
            </label>
            <button
              type="button"
              className="tcl-btn tcl-btn-primary"
              style={{ padding: '5px 10px', fontSize: 11.5 }}
              onClick={() => onNavigate({ name: 'download', tab: 'game' })}
            >
              <Plus size={14} /> New
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 7 }}>
          {state.instances.map((inst) => {
            const isSelected = inst.id === selectedId;
            const isActive = inst.id === state.activeInstanceId;
            return (
              <div
                key={inst.id}
                onClick={() => setSelectedId(inst.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 14,
                  background: isSelected ? 'rgba(139,229,27,0.15)' : 'rgba(255,255,255,0.04)',
                  border: isSelected
                    ? '1.5px solid var(--primary)'
                    : '1px solid rgba(255,255,255,0.07)',
                  cursor: 'pointer',
                }}
              >
                <img src={inst.icon} alt="" style={{ width: 34, height: 34, borderRadius: 8, objectFit: 'contain' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 13,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {inst.name}
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.65 }}>
                    MC {inst.mcVersion} • {inst.loader.toUpperCase()} • {(inst.totalPlayTimeMs / 3600_000).toFixed(1)}h
                  </div>
                </div>
                {isActive && (
                  <span
                    style={{
                      fontSize: 9.5,
                      padding: '2px 6px',
                      borderRadius: 999,
                      background: 'var(--primary)',
                      color: 'var(--on-primary)',
                      fontWeight: 800,
                    }}
                  >
                    ACTIVE
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Selected Instance Sub-Managers */}
      {instance ? (
        <div
          className="tcl-glass-card"
          style={{
            padding: 18,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            minHeight: 0,
          }}
        >
          {/* Instance Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <img src={instance.icon} alt="" style={{ width: 44, height: 44, borderRadius: 11 }} />
              <div>
                <h2 style={{ margin: 0, fontSize: 19 }}>{instance.name}</h2>
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  Minecraft {instance.mcVersion} • {instance.loader.toUpperCase()}{' '}
                  {instance.loaderVersion || ''} • Played {(instance.totalPlayTimeMs / 3600_000).toFixed(1)} hrs ({instance.launchCount} launches)
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {instance.id !== state.activeInstanceId && (
                <button
                  type="button"
                  className="tcl-btn"
                  onClick={async () => {
                    await tclBridge.rpc('selectInstance', { instanceId: instance.id });
                    await onRefreshState();
                    onToast(`Selected ${instance.name}`);
                  }}
                >
                  Set Active
                </button>
              )}
              <button
                type="button"
                className="tcl-btn"
                onClick={() => onOpenFileManagerAt(`instances/${instance.id}`)}
              >
                <FolderOpen size={14} /> Files & Configs
              </button>
              <button
                type="button"
                className="tcl-btn"
                onClick={async () => {
                  await tclBridge.rpc('repairInstance', { instanceId: instance.id });
                  onToast('Started file verification & sync task!');
                }}
              >
                <RefreshCw size={14} /> Sync / Verify
              </button>
              <button
                type="button"
                className="tcl-btn tcl-btn-primary"
                onClick={async () => {
                  await tclBridge.rpc('selectInstance', { instanceId: instance.id });
                  const res = await tclBridge.rpc<{ message: string }>('launchGame', {
                    instanceId: instance.id,
                  });
                  await onRefreshState();
                  onToast(res.message);
                }}
              >
                <Play size={14} fill="currentColor" /> Launch
              </button>
            </div>
          </div>

          {/* Sub-navigation Tabs */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              { id: 'overview', label: 'Overview & JVM' },
              { id: 'mods', label: 'Mods' },
              { id: 'resourcepacks', label: 'Resource Packs' },
              { id: 'shaderpacks', label: 'Shaders' },
              { id: 'saves', label: 'Saves / Worlds' },
              { id: 'servers', label: 'Servers' },
              { id: 'export', label: 'Export Modpack' },
            ].map((tb) => (
              <button
                key={tb.id}
                type="button"
                className={subTab === tb.id ? 'tcl-btn tcl-btn-primary' : 'tcl-btn'}
                onClick={() => setSubTab(tb.id)}
              >
                {tb.label}
              </button>
            ))}
          </div>

          {/* Sub-Tab Body */}
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {subTab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, opacity: 0.75 }}>Instance Display Name</label>
                    <input
                      className="tcl-input"
                      value={instance.name}
                      onChange={async (e) => {
                        await tclBridge.rpc('updateInstance', {
                          instanceId: instance.id,
                          patch: { name: e.target.value },
                        });
                        await onRefreshState();
                      }}
                      style={{ width: '100%', marginTop: 4 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, opacity: 0.75 }}>Mod Loader</label>
                    <select
                      className="tcl-input"
                      value={instance.loader}
                      onChange={async (e) => {
                        await tclBridge.rpc('updateInstance', {
                          instanceId: instance.id,
                          patch: { loader: e.target.value },
                        });
                        await onRefreshState();
                      }}
                      style={{ width: '100%', marginTop: 4 }}
                    >
                      <option value="vanilla">Vanilla</option>
                      <option value="fabric">Fabric</option>
                      <option value="quilt">Quilt</option>
                      <option value="neoforge">NeoForge</option>
                      <option value="forge">Forge</option>
                      <option value="optifine">OptiFine</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, opacity: 0.75 }}>
                      Per-Instance RAM Override (0 = Use Global {state.settings.defaultRamMb} MB)
                    </label>
                    <input
                      type="number"
                      step={256}
                      min={0}
                      max={32768}
                      className="tcl-input"
                      value={instance.ramMbOverride || 0}
                      onChange={async (e) => {
                        const v = Number(e.target.value);
                        await tclBridge.rpc('updateInstance', {
                          instanceId: instance.id,
                          patch: { ramMbOverride: v > 0 ? v : undefined },
                        });
                        await onRefreshState();
                      }}
                      style={{ width: '100%', marginTop: 4 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, opacity: 0.75 }}>Java Runtime Override</label>
                    <select
                      className="tcl-input"
                      value={instance.javaPathOverride || ''}
                      onChange={async (e) => {
                        await tclBridge.rpc('updateInstance', {
                          instanceId: instance.id,
                          patch: { javaPathOverride: e.target.value || undefined },
                        });
                        await onRefreshState();
                      }}
                      style={{ width: '100%', marginTop: 4 }}
                    >
                      <option value="">Automatic (Recommended by MC version)</option>
                      {state.javaRuntimes.map((j) => (
                        <option key={j.id} value={j.path}>
                          {j.name} — {j.version}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 12, opacity: 0.75 }}>Extra Per-Instance JVM Flags</label>
                  <input
                    className="tcl-input"
                    placeholder="Optional JVM flags for this instance..."
                    value={instance.jvmArgsOverride || ''}
                    onChange={async (e) => {
                      await tclBridge.rpc('updateInstance', {
                        instanceId: instance.id,
                        patch: { jvmArgsOverride: e.target.value },
                      });
                      await onRefreshState();
                    }}
                    style={{ width: '100%', marginTop: 4 }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <button
                    type="button"
                    className="tcl-btn"
                    onClick={async () => {
                      const cloned = await tclBridge.rpc<MinecraftInstance>('cloneInstance', {
                        instanceId: instance.id,
                        newName: `${instance.name} (Clone)`,
                      });
                      await onRefreshState();
                      setSelectedId(cloned.id);
                      onToast('Instance cloned!');
                    }}
                  >
                    <Copy size={14} /> Duplicate Instance
                  </button>

                  {state.instances.length > 1 && (
                    <button
                      type="button"
                      className="tcl-btn"
                      style={{ color: '#FCA5A5' }}
                      onClick={async () => {
                        await tclBridge.rpc('deleteInstance', { instanceId: instance.id });
                        await onRefreshState();
                        setSelectedId(state.instances[0]?.id || '');
                        onToast('Instance deleted');
                      }}
                    >
                      <Trash2 size={14} /> Delete Instance
                    </button>
                  )}
                </div>
              </div>
            )}

            {['mods', 'resourcepacks', 'shaderpacks', 'saves'].includes(subTab) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, opacity: 0.8 }}>
                    {items.length} item(s) in <code>/{subTab}</code>
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {subTab !== 'saves' && (
                      <label className="tcl-btn" style={{ cursor: 'pointer' }}>
                        <Upload size={14} /> Add Local File
                        <input
                          type="file"
                          hidden
                          onChange={(e) =>
                            handleLocalAssetUpload(
                              subTab as 'mods' | 'resourcepacks' | 'shaderpacks',
                              e
                            )
                          }
                        />
                      </label>
                    )}
                    <button
                      type="button"
                      className="tcl-btn tcl-btn-primary"
                      onClick={() =>
                        onNavigate({
                          name: 'download',
                          tab:
                            subTab === 'mods'
                              ? 'mod'
                              : subTab === 'resourcepacks'
                                ? 'resourcepack'
                                : subTab === 'shaderpacks'
                                  ? 'shader'
                                  : 'saves',
                        })
                      }
                    >
                      <Download size={14} /> Browse Online Store
                    </button>
                  </div>
                </div>

                {items.length === 0 ? (
                  <div style={{ padding: 34, textAlign: 'center', opacity: 0.6, fontSize: 13 }}>
                    No {subTab} installed in this instance yet. Click <strong>Browse Online Store</strong> to install in 1 click!
                  </div>
                ) : (
                  items.map((item) => (
                    <div
                      key={item.name}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderRadius: 12,
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        opacity: item.enabled ? 1 : 0.55,
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{item.cleanName}</div>
                        <div style={{ fontSize: 11, opacity: 0.65 }}>
                          {(item.sizeBytes / 1024).toFixed(1)} KB • {item.enabled ? 'Enabled' : 'Disabled'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {['mods', 'resourcepacks', 'shaderpacks'].includes(subTab) && (
                          <button
                            type="button"
                            className="tcl-btn"
                            onClick={async () => {
                              await tclBridge.rpc('toggleInstanceItem', {
                                instanceId: instance.id,
                                category: subTab,
                                fileName: item.name,
                              });
                              await reloadCategory();
                            }}
                          >
                            {item.enabled ? (
                              <>
                                <CheckCircle2 size={14} color="#8BE51B" /> Enabled
                              </>
                            ) : (
                              <>
                                <XCircle size={14} /> Disabled
                              </>
                            )}
                          </button>
                        )}
                        <button
                          type="button"
                          className="tcl-icon-btn"
                          onClick={async () => {
                            await tclBridge.rpc('deleteInstanceItem', {
                              instanceId: instance.id,
                              category: subTab,
                              fileName: item.name,
                            });
                            await reloadCategory();
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {subTab === 'servers' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="tcl-input"
                    placeholder="Server Name (e.g. My SMP)"
                    value={newServerName}
                    onChange={(e) => setNewServerName(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <input
                    className="tcl-input"
                    placeholder="Server Address (e.g. mc.hypixel.net)"
                    value={newServerAddr}
                    onChange={(e) => setNewServerAddr(e.target.value)}
                    style={{ flex: 1.2 }}
                  />
                  <button
                    type="button"
                    className="tcl-btn tcl-btn-primary"
                    onClick={async () => {
                      if (!newServerAddr.trim()) return;
                      const updated = [
                        ...(instance.servers || []),
                        {
                          name: newServerName.trim() || newServerAddr.trim(),
                          address: newServerAddr.trim(),
                        },
                      ];
                      await tclBridge.rpc('updateInstance', {
                        instanceId: instance.id,
                        patch: { servers: updated },
                      });
                      setNewServerName('');
                      setNewServerAddr('');
                      await onRefreshState();
                    }}
                  >
                    Add Server
                  </button>
                </div>

                {(instance.servers || []).map((srv, idx) => (
                  <div
                    key={`${srv.address}-${idx}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: 13,
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Globe size={18} color="var(--primary)" />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13.5 }}>{srv.name}</div>
                        <div style={{ fontSize: 11.5, opacity: 0.7 }}>
                          <code>{srv.address}</code>{' '}
                          {serverPingMap[srv.address] ? `• ${serverPingMap[srv.address]}` : ''}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        className="tcl-btn"
                        onClick={() => void pingServer(srv.address)}
                      >
                        Ping Status
                      </button>
                      <button
                        type="button"
                        className="tcl-icon-btn"
                        onClick={async () => {
                          const next = instance.servers.filter((_, i) => i !== idx);
                          await tclBridge.rpc('updateInstance', {
                            instanceId: instance.id,
                            patch: { servers: next },
                          });
                          await onRefreshState();
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {subTab === 'export' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 520 }}>
                <p style={{ margin: 0, fontSize: 13, opacity: 0.78 }}>
                  Package this instance (mods, configs, resource packs, and shaders) into a standard Modrinth <code>.mrpack</code> archive ready to share with friends on PC or TurboCraft Mobile!
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input
                    className="tcl-input"
                    placeholder="Modpack Name"
                    value={exportPackName}
                    onChange={(e) => setExportPackName(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <input
                    className="tcl-input"
                    placeholder="Version (e.g. 1.0.0)"
                    value={exportVersion}
                    onChange={(e) => setExportVersion(e.target.value)}
                    style={{ width: 130 }}
                  />
                </div>
                <button
                  type="button"
                  className="tcl-btn tcl-btn-primary"
                  style={{ alignSelf: 'flex-start' }}
                  onClick={async () => {
                    const out = await tclBridge.rpc<{
                      fileName: string;
                      base64: string;
                      sizeBytes: number;
                    }>('exportInstanceMrpack', {
                      instanceId: instance.id,
                      options: {
                        packName: exportPackName,
                        versionId: exportVersion,
                        summary: `Exported from TurboCraft Launcher PC Edition`,
                        includeMods: true,
                        includeConfig: true,
                        includeResourcePacks: true,
                        includeShaderPacks: true,
                      },
                    });
                    const link = document.createElement('a');
                    link.href = `data:application/octet-stream;base64,${out.base64}`;
                    link.download = out.fileName;
                    link.click();
                    onToast(`Exported ${out.fileName} (${(out.sizeBytes / 1024).toFixed(1)} KB)!`);
                  }}
                >
                  <Sliders size={15} /> Export .mrpack Archive
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};
