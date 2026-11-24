import React from 'react';
import {
  ArrowLeft,
  Home,
  FolderOpen,
  Camera,
  Users,
  MessageCircle,
  Globe,
  Download,
  Settings,
  ListTodo,
  Minus,
  Square,
  X,
} from 'lucide-react';
import { LauncherTask, ScreenRoute } from '../types/launcher';
import { t } from '../theme/i18n';
import { tclBridge } from '../bridge/tclBridge';
import { BuildKeys } from '../generated/buildConfig';

interface TopBarProps {
  route: ScreenRoute;
  language: 'en' | 'hi';
  tasks: LauncherTask[];
  taskDrawerOpen: boolean;
  unreadSocialCount: number;
  onBack: () => void;
  onHome: () => void;
  onNavigate: (route: ScreenRoute) => void;
  onToggleTaskDrawer: () => void;
  onOpenFileManager: () => void;
  onOpenLinksDialog: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  route,
  language,
  tasks,
  unreadSocialCount,
  onBack,
  onHome,
  onNavigate,
  onToggleTaskDrawer,
  onOpenFileManager,
  onOpenLinksDialog,
}) => {
  const inHome = route.name === 'home';
  const runningTasks = tasks.filter((tk) => tk.status === 'running');
  const avgProgress =
    runningTasks.length > 0
      ? Math.round(runningTasks.reduce((acc, tk) => acc + tk.progress, 0) / runningTasks.length)
      : 0;

  const routeTitle: Record<ScreenRoute['name'], string> = {
    home: BuildKeys.LAUNCHER_APP_NAME,
    accounts: 'Accounts & 3D Wardrobe',
    versions: 'Installed Instances',
    version_settings: 'Instance Configuration',
    download: 'Download Hub',
    social: 'Social Hub — Friends & Parties',
    multiplayer: 'Terracotta LAN Multiplayer',
    logs: 'Live Game Console & Crash Analyzer',
    stats: 'Analytics, Screenshots & Custom Home',
    settings: 'Launcher Settings',
  };

  return (
    <header
      className="tcl-topbar"
      style={{
        height: 48,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 14px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        background: 'rgba(10, 14, 11, 0.45)',
        backdropFilter: 'blur(16px)',
        WebkitAppRegion: 'drag',
        zIndex: 30,
      } as React.CSSProperties}
    >
      {/* Left: Back / Home + Brand / Page Title */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 10, WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {!inHome && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button type="button" className="tcl-icon-btn" onClick={onBack} title="Back">
              <ArrowLeft size={18} />
            </button>
            <button type="button" className="tcl-icon-btn" onClick={onHome} title="Main Dashboard">
              <Home size={17} />
            </button>
          </div>
        )}

        <div
          onClick={onHome}
          style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
        >
          <img
            src="./assets/turbocraft-icon.png"
            alt="TCL"
            style={{ width: 28, height: 28, borderRadius: 8 }}
          />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.15 }}>
              {routeTitle[route.name]}
            </div>
            {inHome && (
              <div style={{ fontSize: 10.5, opacity: 0.62, lineHeight: 1.1 }}>
                {t(language, 'launcherSubtitle')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right: Task pill + File Manager + Exact Mobile Rail Items + Window Controls */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 6, WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {/* Task Menu Button */}
        <button
          type="button"
          onClick={onToggleTaskDrawer}
          className="tcl-rail-pill"
          title="Background Download & Install Tasks"
          style={{
            background:
              runningTasks.length > 0 ? 'rgba(139, 229, 27, 0.16)' : 'rgba(255,255,255,0.06)',
            borderColor:
              runningTasks.length > 0 ? 'rgba(139, 229, 27, 0.4)' : 'rgba(255,255,255,0.08)',
          }}
        >
          <ListTodo size={15} />
          {runningTasks.length > 0 ? (
            <span style={{ fontSize: 11.5, fontWeight: 700 }}>
              {runningTasks.length} • {avgProgress}%
            </span>
          ) : tasks.length > 0 ? (
            <span style={{ fontSize: 11.5 }}>{tasks.length}</span>
          ) : null}
        </button>

        {/* Built-in File Explorer */}
        <button
          type="button"
          className="tcl-icon-btn"
          onClick={onOpenFileManager}
          title="Launcher File Explorer & Config Editor"
        >
          <FolderOpen size={17} />
        </button>

        <RailButton
          active={route.name === 'stats' && route.tab === 'screenshots'}
          icon={<Camera size={16} />}
          label={t(language, 'navRecordings')}
          onClick={() => onNavigate({ name: 'stats', tab: 'screenshots' })}
        />

        <RailButton
          active={route.name === 'multiplayer'}
          icon={<Users size={16} />}
          label={t(language, 'navMultiplayer')}
          onClick={() => onNavigate({ name: 'multiplayer' })}
        />

        <RailButton
          active={route.name === 'social'}
          icon={<MessageCircle size={16} />}
          label={t(language, 'navSocial')}
          badge={unreadSocialCount}
          onClick={() => onNavigate({ name: 'social' })}
        />

        <RailButton
          active={false}
          icon={<Globe size={16} />}
          label={t(language, 'navLinks')}
          onClick={onOpenLinksDialog}
        />

        <RailButton
          active={route.name === 'download'}
          icon={<Download size={16} />}
          label={t(language, 'navDownload')}
          onClick={() => onNavigate({ name: 'download', tab: 'game' })}
        />

        <RailButton
          active={route.name === 'settings'}
          icon={<Settings size={16} />}
          label={t(language, 'navSettings')}
          onClick={() => onNavigate({ name: 'settings', tab: 'appearance' })}
        />

        {/* Desktop Frameless Window Controls when running inside Electron */}
        {tclBridge.isElectron && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              marginLeft: 6,
              paddingLeft: 8,
              borderLeft: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <button
              type="button"
              className="tcl-icon-btn"
              onClick={() => void tclBridge.windowAction('minimize')}
              title="Minimize"
            >
              <Minus size={15} />
            </button>
            <button
              type="button"
              className="tcl-icon-btn"
              onClick={() => void tclBridge.windowAction('maximize')}
              title="Maximize / Restore"
            >
              <Square size={13} />
            </button>
            <button
              type="button"
              className="tcl-icon-btn tcl-close-btn"
              onClick={() => void tclBridge.windowAction('close')}
              title="Close"
            >
              <X size={15} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

const RailButton: React.FC<{
  active: boolean;
  icon: React.ReactNode;
  label: string;
  badge?: number;
  onClick: () => void;
}> = ({ active, icon, label, badge = 0, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`tcl-rail-pill ${active ? 'active' : ''}`}
    title={label}
  >
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      {icon}
      {badge > 0 && (
        <span
          style={{
            position: 'absolute',
            top: -6,
            right: -7,
            background: '#EF4444',
            color: '#FFF',
            fontSize: 9.5,
            fontWeight: 800,
            padding: '1px 4px',
            borderRadius: 999,
            lineHeight: 1.1,
          }}
        >
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </span>
    <span className="tcl-rail-label">{label}</span>
  </button>
);
