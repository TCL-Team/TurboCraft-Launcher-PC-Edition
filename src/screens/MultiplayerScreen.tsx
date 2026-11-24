import React, { useState } from 'react';
import { Radio, LogIn, Square, Copy, Share2, Wifi } from 'lucide-react';
import { BootstrapState } from '../types/launcher';
import { tclBridge } from '../bridge/tclBridge';

interface MultiplayerScreenProps {
  state: BootstrapState;
  onRefreshState: () => Promise<void>;
  onToast: (msg: string) => void;
}

/**
 * Exact 2-Column port of `MultiplayerScreen.kt` (Terracotta / EasyTier LAN Multiplayer)
 */
export const MultiplayerScreen: React.FC<MultiplayerScreenProps> = ({
  state,
  onRefreshState,
  onToast,
}) => {
  const tc = state.terracotta;
  const [mcLanPort, setMcLanPort] = useState(25565);
  const [joinCode, setJoinCode] = useState('');
  const [remotePeerEndpoint, setRemotePeerEndpoint] = useState('127.0.0.1:25565');

  return (
    <div
      style={{
        padding: 14,
        height: 'calc(100vh - 48px)',
        boxSizing: 'border-box',
        display: 'grid',
        gridTemplateColumns: '1fr 1.15fr',
        gap: 14,
      }}
    >
      {/* Left: Step-by-Step Tutorial Menu (matching TutorialMenu in MultiplayerScreen.kt) */}
      <div className="tcl-glass-card" style={{ padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Wifi size={20} color="var(--primary)" />
          <h3 style={{ margin: 0, fontSize: 18 }}>Terracotta PC — LAN World Relay Guide</h3>
        </div>
        <p style={{ margin: 0, fontSize: 13, opacity: 0.78, lineHeight: 1.6 }}>
          Play single-player worlds together with friends over LAN / P2P relay without port-forwarding your router! Compatible with EasyTier & Terracotta sessions.
        </p>

        <div style={{ padding: 14, borderRadius: 14, background: 'rgba(255,255,255,0.05)' }}>
          <div style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: 6 }}>
            If You Are Hosting the World:
          </div>
          <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, lineHeight: 1.7, opacity: 0.88 }}>
            <li>Launch Minecraft and enter your Singleplayer world.</li>
            <li>Press <code>Esc → Open to LAN → Start LAN World</code> and note the port shown in chat (e.g. <code>54321</code> or <code>25565</code>).</li>
            <li>Enter that LAN port on the right and click <strong>Start Hosting Room</strong>.</li>
            <li>Copy your generated <code>TCL-XXXX-XXXX</code> room code & endpoint and share it in Social Party Chat!</li>
          </ol>
        </div>

        <div style={{ padding: 14, borderRadius: 14, background: 'rgba(255,255,255,0.05)' }}>
          <div style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: 6 }}>
            If You Are Joining a Friend’s World:
          </div>
          <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, lineHeight: 1.7, opacity: 0.88 }}>
            <li>Paste your friend’s Room Code (and relay address if over VPN/EasyTier) on the right and click <strong>Join Room</strong>.</li>
            <li>Copy the local bridge address (<code>127.0.0.1:&lt;port&gt;</code>) shown in the green banner.</li>
            <li>Open Minecraft → <code>Multiplayer → Direct Connect</code> and paste that address!</li>
          </ol>
        </div>
      </div>

      {/* Right: Host / Join Controls + Live Relay Logs */}
      <div className="tcl-glass-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0 }}>
        {tc.mode !== 'idle' ? (
          <div
            style={{
              padding: 16,
              borderRadius: 16,
              background: 'rgba(139, 229, 27, 0.14)',
              border: '1.5px solid var(--primary)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--primary)' }}>
                {tc.mode === 'hosting' ? 'Hosting Active Room' : 'Connected to Friend Room'}
              </span>
              <span style={{ fontSize: 12, opacity: 0.8 }}>{tc.peersCount} peer(s) active</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <code style={{ fontSize: 18, fontWeight: 800 }}>{tc.roomCode}</code>
              <button
                type="button"
                className="tcl-btn"
                onClick={() => {
                  void navigator.clipboard.writeText(tc.roomCode);
                  onToast('Copied Room Code!');
                }}
              >
                <Copy size={13} /> Copy Code
              </button>
              <button
                type="button"
                className="tcl-btn"
                onClick={() => {
                  const addr = `127.0.0.1:${tc.localPort}`;
                  void navigator.clipboard.writeText(addr);
                  onToast(`Copied Direct Connect address ${addr}`);
                }}
              >
                <Copy size={13} /> 127.0.0.1:{tc.localPort}
              </button>
            </div>

            <button
              type="button"
              className="tcl-btn"
              style={{ alignSelf: 'flex-start', color: '#FCA5A5', marginTop: 4 }}
              onClick={async () => {
                await tclBridge.rpc('stopTerracotta');
                await onRefreshState();
                onToast('Stopped multiplayer tunnel');
              }}
            >
              <Square size={14} /> Disconnect Session
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ padding: 14, borderRadius: 14, background: 'rgba(255,255,255,0.04)', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Host LAN World</div>
              <label style={{ fontSize: 11.5, opacity: 0.7 }}>Minecraft LAN Port</label>
              <input
                type="number"
                className="tcl-input"
                value={mcLanPort}
                onChange={(e) => setMcLanPort(Number(e.target.value))}
              />
              <button
                type="button"
                className="tcl-btn tcl-btn-primary"
                style={{ justifyContent: 'center', marginTop: 'auto' }}
                onClick={async () => {
                  await tclBridge.rpc('startTerracottaHost', { mcLanPort });
                  await onRefreshState();
                  onToast('Room started! Share the code with your friends.');
                }}
              >
                <Radio size={15} /> Start Hosting Room
              </button>
            </div>

            <div style={{ padding: 14, borderRadius: 14, background: 'rgba(255,255,255,0.04)', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Join Friend’s Room</div>
              <input
                className="tcl-input"
                placeholder="Room Code (TCL-XXXX-XXXX)"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
              />
              <input
                className="tcl-input"
                placeholder="Host Peer IP:Port"
                value={remotePeerEndpoint}
                onChange={(e) => setRemotePeerEndpoint(e.target.value)}
              />
              <button
                type="button"
                className="tcl-btn tcl-btn-primary"
                style={{ justifyContent: 'center' }}
                onClick={async () => {
                  if (!joinCode.trim()) {
                    onToast('Please enter a room code');
                    return;
                  }
                  await tclBridge.rpc('joinTerracottaRoom', {
                    roomCode: joinCode,
                    remoteAddress: remotePeerEndpoint,
                  });
                  await onRefreshState();
                  onToast('Connected! Direct Connect in Minecraft to the local port shown.');
                }}
              >
                <LogIn size={15} /> Join Room
              </button>
            </div>
          </div>
        )}

        {/* Live Session Log */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minHeight: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 700, opacity: 0.75 }}>Terracotta Relay Log</span>
            <button
              type="button"
              className="tcl-btn"
              style={{ padding: '4px 10px', fontSize: 11.5 }}
              onClick={() => {
                void navigator.clipboard.writeText(tc.logs.join('\n'));
                onToast('Copied Terracotta logs to clipboard!');
              }}
            >
              <Share2 size={13} /> Export Log
            </button>
          </div>
          <pre
            style={{
              flex: 1,
              margin: 0,
              padding: 12,
              borderRadius: 12,
              background: 'rgba(0,0,0,0.38)',
              fontSize: 11.5,
              overflowY: 'auto',
              whiteSpace: 'pre-wrap',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            }}
          >
            {tc.logs.join('\n')}
          </pre>
        </div>
      </div>
    </div>
  );
};
