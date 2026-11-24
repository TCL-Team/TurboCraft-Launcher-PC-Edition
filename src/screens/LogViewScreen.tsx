import React, { useEffect, useState } from 'react';
import {
  Terminal,
  Copy,
  Share2,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { BootstrapState, CrashAnalysisReport } from '../types/launcher';
import { tclBridge } from '../bridge/tclBridge';

interface LogViewScreenProps {
  state: BootstrapState;
  instanceId?: string;
  onToast: (msg: string) => void;
}

export const LogViewScreen: React.FC<LogViewScreenProps> = ({ state, instanceId, onToast }) => {
  const [selectedId, setSelectedId] = useState(
    instanceId || state.activeInstanceId || state.instances[0]?.id || ''
  );
  const [logText, setLogText] = useState('');
  const [analysis, setAnalysis] = useState<CrashAnalysisReport | null>(null);
  const [shareUrl, setShareUrl] = useState('');
  const [sharing, setSharing] = useState(false);

  const loadLog = async (id: string) => {
    const res = await tclBridge.rpc<{ logText: string; analysis: CrashAnalysisReport }>(
      'getInstanceLog',
      { instanceId: id }
    );
    setLogText(res.logText);
    setAnalysis(res.analysis);
  };

  useEffect(() => {
    void loadLog(selectedId);
    const unsub = tclBridge.on('log:line', (payload: { instanceId: string; line: string }) => {
      if (payload.instanceId === selectedId) {
        setLogText((prev) => `${prev}\n${payload.line}`);
      }
    });
    return unsub;
  }, [selectedId]);

  const uploadMclogs = async () => {
    setSharing(true);
    try {
      const form = new URLSearchParams({ content: logText });
      const res = await fetch('https://api.mclo.gs/1/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
      });
      const json = await res.json();
      if (json.success && json.url) {
        setShareUrl(json.url);
        await navigator.clipboard.writeText(json.url).catch(() => undefined);
        onToast(`Uploaded & copied link: ${json.url}`);
      } else {
        throw new Error(json.error || 'mclo.gs upload failed');
      }
    } catch (err) {
      onToast(`Could not reach mclo.gs (${err instanceof Error ? err.message : String(err)}) — copied raw log instead.`);
      await navigator.clipboard.writeText(logText).catch(() => undefined);
    } finally {
      setSharing(false);
    }
  };

  const lang = state.settings.language;

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
      {/* Top Toolbar */}
      <div
        className="tcl-glass-card"
        style={{
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Terminal size={19} color="var(--primary)" />
          <select
            className="tcl-input"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            {state.instances.map((i) => (
              <option key={i.id} value={i.id}>
                Instance: {i.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {shareUrl && (
            <button
              type="button"
              className="tcl-btn"
              onClick={() => void tclBridge.openExternal(shareUrl)}
            >
              {shareUrl} <ExternalLink size={13} />
            </button>
          )}
          <button
            type="button"
            className="tcl-btn"
            onClick={() => void loadLog(selectedId)}
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            type="button"
            className="tcl-btn"
            onClick={() => {
              void navigator.clipboard.writeText(logText);
              onToast('Copied log to clipboard!');
            }}
          >
            <Copy size={14} /> Copy Log
          </button>
          <button
            type="button"
            disabled={sharing}
            className="tcl-btn tcl-btn-primary"
            onClick={uploadMclogs}
          >
            <Share2 size={14} /> {sharing ? 'Uploading...' : 'Share via mclo.gs'}
          </button>
        </div>
      </div>

      {/* Smart Crash Analyzer Banner */}
      {analysis && (
        <div
          className="tcl-glass-card"
          style={{
            padding: '12px 16px',
            borderLeft: analysis.hasCrash ? '4px solid #EF4444' : '4px solid #8BE51B',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 14 }}>
            {analysis.hasCrash ? (
              <AlertTriangle size={17} color="#EF4444" />
            ) : (
              <CheckCircle2 size={17} color="#8BE51B" />
            )}
            {lang === 'hi' ? analysis.titleHi : analysis.titleEn}
          </div>
          <div style={{ fontSize: 12.5, opacity: 0.82, marginTop: 4 }}>
            {lang === 'hi' ? analysis.summaryHi : analysis.summaryEn}
          </div>
          {analysis.suggestions.length > 0 && (
            <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 12, opacity: 0.85 }}>
              {analysis.suggestions.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Live Console Output */}
      <pre
        className="tcl-glass-card"
        style={{
          flex: 1,
          margin: 0,
          padding: 16,
          overflowY: 'auto',
          whiteSpace: 'pre-wrap',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          fontSize: 12,
          lineHeight: 1.55,
          background: 'rgba(5, 9, 6, 0.78)',
        }}
      >
        {logText}
      </pre>
    </div>
  );
};
