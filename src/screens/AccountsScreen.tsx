import React, { useEffect, useMemo, useState } from 'react';
import {
  UserPlus,
  ShieldCheck,
  Server,
  Trash2,
  Check,
  Copy,
  ExternalLink,
  Upload,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { BootstrapState, LauncherAccount } from '../types/launcher';
import { SkinViewer3D } from '../components/SkinViewer3D';
import { getBuiltInCapes } from '../services/mojangMetaApi';
import { tclBridge } from '../bridge/tclBridge';

interface AccountsScreenProps {
  state: BootstrapState;
  initialTab?: 'accounts' | 'capes';
  onRefreshState: () => Promise<void>;
  onToast: (msg: string) => void;
}

export const AccountsScreen: React.FC<AccountsScreenProps> = ({
  state,
  initialTab = 'accounts',
  onRefreshState,
  onToast,
}) => {
  const [tab, setTab] = useState<'accounts' | 'capes'>(initialTab);
  const activeAccount: LauncherAccount | undefined =
    state.accounts.find((a) => a.id === state.activeAccountId) || state.accounts[0];

  // Offline Account Form
  const [offlineName, setOfflineName] = useState('');
  const [offlineSlim, setOfflineSlim] = useState(false);

  // Yggdrasil Form
  const [yggUrl, setYggUrl] = useState('https://littleskin.cn/api/yggdrasil');
  const [yggUser, setYggUser] = useState('');
  const [yggPass, setYggPass] = useState('');
  const [yggLoading, setYggLoading] = useState(false);

  // Microsoft Device Code Flow
  const [msFlow, setMsFlow] = useState<{
    flowId: string;
    userCode: string;
    verificationUri: string;
    status: string;
    error?: string;
  } | null>(null);
  const [msStarting, setMsStarting] = useState(false);

  // Wardrobe Skin lookup
  const [skinUsernameLookup, setSkinUsernameLookup] = useState('');
  const builtInCapes = useMemo(() => getBuiltInCapes(), []);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!msFlow || msFlow.status === 'COMPLETED' || msFlow.status === 'FAILED') return;
    const timer = setInterval(async () => {
      try {
        const st = await tclBridge.rpc<{ status: string; error?: string }>('getMicrosoftDeviceFlowStatus', {
          flowId: msFlow.flowId,
        });
        setMsFlow((prev) => (prev ? { ...prev, status: st.status, error: st.error } : null));
        if (st.status === 'COMPLETED') {
          onToast('Microsoft Minecraft Account connected!');
          await onRefreshState();
        }
      } catch {
        // ignore
      }
    }, 2500);
    return () => clearInterval(timer);
  }, [msFlow?.flowId, msFlow?.status]);

  const startMsLogin = async () => {
    setMsStarting(true);
    try {
      const flow = await tclBridge.rpc<{
        flowId: string;
        userCode: string;
        verificationUri: string;
      }>('startMicrosoftDeviceLogin');
      setMsFlow({ ...flow, status: 'WAITING_FOR_USER' });
    } catch (err) {
      onToast(
        `Microsoft Login requires direct PC internet access (${err instanceof Error ? err.message : String(err)}). Offline accounts work immediately!`
      );
    } finally {
      setMsStarting(false);
    }
  };

  const handleSkinFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeAccount) return;
    const reader = new FileReader();
    reader.onload = async () => {
      await tclBridge.rpc('updateAccountWardrobe', {
        accountId: activeAccount.id,
        patch: { skinUrl: String(reader.result) },
      });
      await onRefreshState();
      onToast('Custom PNG skin applied!');
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      style={{
        padding: 16,
        height: 'calc(100vh - 48px)',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {/* Top Tabs */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          className={tab === 'accounts' ? 'tcl-btn tcl-btn-primary' : 'tcl-btn'}
          onClick={() => setTab('accounts')}
        >
          <ShieldCheck size={16} /> Accounts Manager ({state.accounts.length})
        </button>
        <button
          type="button"
          className={tab === 'capes' ? 'tcl-btn tcl-btn-primary' : 'tcl-btn'}
          onClick={() => setTab('capes')}
        >
          <Sparkles size={16} /> 3D Skin & Cape Gallery
        </button>
      </div>

      {tab === 'accounts' ? (
        <div
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: '1.15fr 1fr',
            gap: 14,
            minHeight: 0,
          }}
        >
          {/* Saved Accounts + Live 3D Preview */}
          <div
            className="tcl-glass-card"
            style={{
              padding: 18,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              minHeight: 0,
            }}
          >
            <h3 style={{ margin: 0, fontSize: 17 }}>Saved Minecraft Profiles</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: 12, flex: 1, minHeight: 0 }}>
              <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {state.accounts.map((acc) => {
                  const selected = acc.id === activeAccount?.id;
                  return (
                    <div
                      key={acc.id}
                      onClick={async () => {
                        await tclBridge.rpc('selectAccount', { accountId: acc.id });
                        await onRefreshState();
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        borderRadius: 15,
                        background: selected
                          ? 'rgba(139, 229, 27, 0.14)'
                          : 'rgba(255,255,255,0.04)',
                        border: selected
                          ? '1.5px solid var(--primary)'
                          : '1px solid rgba(255,255,255,0.08)',
                        cursor: 'pointer',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 700, fontSize: 14 }}>{acc.username}</span>
                          <span
                            style={{
                              fontSize: 10,
                              padding: '2px 7px',
                              borderRadius: 999,
                              background: 'rgba(255,255,255,0.1)',
                              textTransform: 'uppercase',
                              fontWeight: 700,
                            }}
                          >
                            {acc.type}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, opacity: 0.6, marginTop: 3 }}>
                          UUID: {acc.uuid.slice(0, 18)}…
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {selected && <Check size={16} color="var(--primary)" />}
                        {state.accounts.length > 1 && (
                          <button
                            type="button"
                            className="tcl-icon-btn"
                            onClick={async (e) => {
                              e.stopPropagation();
                              await tclBridge.rpc('deleteAccount', { accountId: acc.id });
                              await onRefreshState();
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 16,
                  background: 'rgba(0,0,0,0.22)',
                  padding: 8,
                }}
              >
                <SkinViewer3D
                  skinUrl={activeAccount?.skinUrl}
                  capeUrl={activeAccount?.capeUrl}
                  slim={activeAccount?.skinModel === 'slim'}
                  width={180}
                  height={235}
                />
              </div>
            </div>
          </div>

          {/* Add New Account Methods */}
          <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* 1. Microsoft OAuth 2.0 */}
            <div className="tcl-glass-card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, marginBottom: 6 }}>
                <ShieldCheck size={17} color="var(--primary)" /> Official Microsoft Account (Java Edition)
              </div>
              <p style={{ margin: '0 0 10px', fontSize: 12, opacity: 0.72 }}>
                Uses Microsoft Live Connect device-code sign-in (Xbox Live → XSTS → Minecraft Services). We never see your password.
              </p>

              {!msFlow ? (
                <button
                  type="button"
                  className="tcl-btn tcl-btn-primary"
                  disabled={msStarting}
                  onClick={startMsLogin}
                >
                  {msStarting ? <RefreshCw size={15} className="tcl-spin" /> : <ShieldCheck size={15} />}
                  Sign in with Microsoft
                </button>
              ) : (
                <div
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    background: 'rgba(0,0,0,0.32)',
                    border: '1px solid rgba(139,229,27,0.35)',
                  }}
                >
                  <div style={{ fontSize: 12, opacity: 0.8 }}>Enter this code in your browser:</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '8px 0' }}>
                    <code style={{ fontSize: 22, fontWeight: 800, letterSpacing: 2, color: 'var(--primary)' }}>
                      {msFlow.userCode}
                    </code>
                    <button
                      type="button"
                      className="tcl-btn"
                      onClick={() => {
                        void navigator.clipboard.writeText(msFlow.userCode);
                        onToast('Copied code!');
                      }}
                    >
                      <Copy size={13} /> Copy
                    </button>
                    <button
                      type="button"
                      className="tcl-btn tcl-btn-primary"
                      onClick={() => void tclBridge.openExternal(msFlow.verificationUri)}
                    >
                      Open Link <ExternalLink size={13} />
                    </button>
                  </div>
                  <div style={{ fontSize: 11.5, opacity: 0.75 }}>
                    Status: <strong>{msFlow.status}</strong> {msFlow.error ? `— ${msFlow.error}` : ''}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Offline Account */}
            <div className="tcl-glass-card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, marginBottom: 8 }}>
                <UserPlus size={17} color="var(--primary)" /> Create Offline Account
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input
                  className="tcl-input"
                  placeholder="Enter player name (e.g. Wolf_PC)"
                  value={offlineName}
                  onChange={(e) => setOfflineName(e.target.value)}
                  maxLength={16}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="tcl-btn tcl-btn-primary"
                  onClick={async () => {
                    try {
                      await tclBridge.rpc('createOfflineAccount', {
                        username: offlineName,
                        skinModel: offlineSlim ? 'slim' : 'classic',
                        skinUrl: offlineSlim ? './assets/skin/alex.png' : './assets/skin/steve.png',
                      });
                      setOfflineName('');
                      await onRefreshState();
                      onToast('Offline account created & selected!');
                    } catch (err) {
                      onToast(err instanceof Error ? err.message : String(err));
                    }
                  }}
                >
                  Create
                </button>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, opacity: 0.8 }}>
                <input
                  type="checkbox"
                  checked={offlineSlim}
                  onChange={(e) => setOfflineSlim(e.target.checked)}
                />
                Use Alex (Slim 3px Arms) default model
              </label>
            </div>

            {/* 3. Custom Yggdrasil Auth Server */}
            <div className="tcl-glass-card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, marginBottom: 8 }}>
                <Server size={17} color="var(--primary)" /> Custom Auth / Yggdrasil (LittleSkin, Ely.by)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                <input
                  className="tcl-input"
                  placeholder="Yggdrasil API URL"
                  value={yggUrl}
                  onChange={(e) => setYggUrl(e.target.value)}
                />
                <div style={{ display: 'flex', gap: 7 }}>
                  <input
                    className="tcl-input"
                    placeholder="Email / Username"
                    value={yggUser}
                    onChange={(e) => setYggUser(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <input
                    type="password"
                    className="tcl-input"
                    placeholder="Password"
                    value={yggPass}
                    onChange={(e) => setYggPass(e.target.value)}
                    style={{ flex: 1 }}
                  />
                </div>
                <button
                  type="button"
                  className="tcl-btn"
                  disabled={yggLoading}
                  onClick={async () => {
                    setYggLoading(true);
                    try {
                      await tclBridge.rpc('loginYggdrasilAccount', {
                        authServerUrl: yggUrl,
                        emailOrUsername: yggUser,
                        password: yggPass,
                      });
                      setYggPass('');
                      await onRefreshState();
                      onToast('Yggdrasil account added!');
                    } catch (err) {
                      onToast(err instanceof Error ? err.message : String(err));
                    } finally {
                      setYggLoading(false);
                    }
                  }}
                >
                  Authenticate Yggdrasil Server
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* 3D CAPE & SKIN GALLERY TAB */
        <div
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: '320px 1fr',
            gap: 14,
            minHeight: 0,
          }}
        >
          <div
            className="tcl-glass-card"
            style={{
              padding: 18,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: 16 }}>
                {activeAccount?.username || 'Player'}
              </div>
              <div style={{ fontSize: 11.5, opacity: 0.65 }}>
                Drag to inspect front & back Cape in 3D
              </div>
            </div>

            <SkinViewer3D
              skinUrl={activeAccount?.skinUrl}
              capeUrl={activeAccount?.capeUrl}
              slim={activeAccount?.skinModel === 'slim'}
              width={250}
              height={320}
            />

            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  className={activeAccount?.skinModel === 'classic' ? 'tcl-btn tcl-btn-primary' : 'tcl-btn'}
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={async () => {
                    if (!activeAccount) return;
                    await tclBridge.rpc('updateAccountWardrobe', {
                      accountId: activeAccount.id,
                      patch: { skinModel: 'classic' },
                    });
                    await onRefreshState();
                  }}
                >
                  Classic (4px)
                </button>
                <button
                  type="button"
                  className={activeAccount?.skinModel === 'slim' ? 'tcl-btn tcl-btn-primary' : 'tcl-btn'}
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={async () => {
                    if (!activeAccount) return;
                    await tclBridge.rpc('updateAccountWardrobe', {
                      accountId: activeAccount.id,
                      patch: { skinModel: 'slim' },
                    });
                    await onRefreshState();
                  }}
                >
                  Slim (3px)
                </button>
              </div>

              <label className="tcl-btn" style={{ justifyContent: 'center', cursor: 'pointer' }}>
                <Upload size={14} /> Upload Custom Skin (.png)
                <input type="file" accept="image/png" hidden onChange={handleSkinFileUpload} />
              </label>
            </div>
          </div>

          <div
            className="tcl-glass-card"
            style={{
              padding: 18,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              overflowY: 'auto',
            }}
          >
            {/* Skin Presets & Mojang Username Import */}
            <div>
              <h4 style={{ margin: '0 0 8px', fontSize: 14.5 }}>Quick Skin Presets & Mojang Skin Import</h4>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="tcl-btn"
                  onClick={async () => {
                    if (!activeAccount) return;
                    await tclBridge.rpc('updateAccountWardrobe', {
                      accountId: activeAccount.id,
                      patch: { skinUrl: './assets/skin/steve.png', skinModel: 'classic' },
                    });
                    await onRefreshState();
                  }}
                >
                  Default Steve
                </button>
                <button
                  type="button"
                  className="tcl-btn"
                  onClick={async () => {
                    if (!activeAccount) return;
                    await tclBridge.rpc('updateAccountWardrobe', {
                      accountId: activeAccount.id,
                      patch: { skinUrl: './assets/skin/alex.png', skinModel: 'slim' },
                    });
                    await onRefreshState();
                  }}
                >
                  Default Alex
                </button>

                <input
                  className="tcl-input"
                  placeholder="Import skin by MC username (e.g. Technoblade)"
                  value={skinUsernameLookup}
                  onChange={(e) => setSkinUsernameLookup(e.target.value)}
                  style={{ flex: 1, minWidth: 210 }}
                />
                <button
                  type="button"
                  className="tcl-btn tcl-btn-primary"
                  onClick={async () => {
                    if (!activeAccount || !skinUsernameLookup.trim()) return;
                    const skinUrl = `https://minotar.net/skin/${encodeURIComponent(skinUsernameLookup.trim())}`;
                    await tclBridge.rpc('updateAccountWardrobe', {
                      accountId: activeAccount.id,
                      patch: { skinUrl },
                    });
                    await onRefreshState();
                    onToast(`Imported skin for ${skinUsernameLookup.trim()}`);
                  }}
                >
                  Apply Player Skin
                </button>
              </div>
            </div>

            {/* Cape Gallery */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <h4 style={{ margin: 0, fontSize: 15 }}>Cape Gallery (Equip in 1 Click)</h4>
                {activeAccount?.capeUrl && (
                  <button
                    type="button"
                    className="tcl-btn"
                    onClick={async () => {
                      await tclBridge.rpc('updateAccountWardrobe', {
                        accountId: activeAccount.id,
                        patch: { capeUrl: null },
                      });
                      await onRefreshState();
                      onToast('Cape unequipped');
                    }}
                  >
                    Unequip Cape
                  </button>
                )}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(195px, 1fr))',
                  gap: 10,
                }}
              >
                {builtInCapes.map((cape) => {
                  const equipped = activeAccount?.capeUrl === cape.url;
                  return (
                    <div
                      key={cape.id}
                      style={{
                        padding: 12,
                        borderRadius: 14,
                        background: equipped
                          ? 'rgba(139,229,27,0.14)'
                          : 'rgba(255,255,255,0.04)',
                        border: equipped
                          ? '1.5px solid var(--primary)'
                          : '1px solid rgba(255,255,255,0.08)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <img
                          src={cape.url}
                          alt={cape.name}
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 8,
                            imageRendering: 'pixelated',
                            background: 'rgba(0,0,0,0.4)',
                            padding: 4,
                          }}
                        />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{cape.name}</div>
                          <div style={{ fontSize: 11, opacity: 0.65 }}>{cape.subtitle}</div>
                        </div>
                      </div>

                      <button
                        type="button"
                        className={equipped ? 'tcl-btn tcl-btn-primary' : 'tcl-btn'}
                        style={{ justifyContent: 'center' }}
                        onClick={async () => {
                          if (!activeAccount) return;
                          await tclBridge.rpc('updateAccountWardrobe', {
                            accountId: activeAccount.id,
                            patch: { capeUrl: cape.url },
                          });
                          await onRefreshState();
                          onToast(`Equipped ${cape.name}!`);
                        }}
                      >
                        {equipped ? 'Equipped ✓' : 'Equip Cape'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
