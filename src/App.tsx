import React, { useCallback, useEffect, useState } from 'react';
import { BootstrapState, LauncherSettings, LauncherTask, ScreenRoute } from './types/launcher';
import { tclBridge } from './bridge/tclBridge';
import { applyThemeCssVars } from './theme/themes';
import { FestivalCanvas } from './components/FestivalCanvas';
import { WelcomeScreen } from './components/WelcomeScreen';
import { AgreementModal, LEGAL_VERSION } from './components/AgreementModal';
import { GuideOverlay } from './components/GuideOverlay';
import { TopBar } from './components/TopBar';
import { TaskDrawer } from './components/TaskDrawer';
import {
  AboutDialog,
  FileManagerModal,
  PerformanceSettingsDialog,
  SocialLinksDialog,
  TeamDialog,
} from './components/Dialogs';
import { HomeScreen } from './screens/HomeScreen';
import { AccountsScreen } from './screens/AccountsScreen';
import { VersionsScreen } from './screens/VersionsScreen';
import { DownloadScreen } from './screens/DownloadScreen';
import { SocialHubScreen } from './screens/SocialHubScreen';
import { MultiplayerScreen } from './screens/MultiplayerScreen';
import { LogViewScreen } from './screens/LogViewScreen';
import { StatsScreen } from './screens/StatsScreen';
import { SettingsScreen } from './screens/SettingsScreen';

export const App: React.FC = () => {
  const [state, setState] = useState<BootstrapState | null>(null);
  const [routeStack, setRouteStack] = useState<ScreenRoute[]>([{ name: 'home' }]);
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  const [forceLegalModal, setForceLegalModal] = useState(false);
  const [forceGuideModal, setForceGuideModal] = useState(false);

  // Global dialogs & drawers
  const [taskDrawerOpen, setTaskDrawerOpen] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showTeam, setShowTeam] = useState(false);
  const [showLinks, setShowLinks] = useState(false);
  const [showPerformance, setShowPerformance] = useState(false);
  const [fileManagerPath, setFileManagerPath] = useState<string | null>(null);

  // Toast & Social badge
  const [toast, setToast] = useState<string | null>(null);
  const [unreadSocialCount, setUnreadSocialCount] = useState(0);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const refreshState = useCallback(async () => {
    const next = await tclBridge.rpc<BootstrapState>('getBootstrapState');
    setState(next);
  }, []);

  useEffect(() => {
    void refreshState();
    const unsubState = tclBridge.on('state:changed', () => {
      void refreshState();
    });
    const unsubTask = tclBridge.on('task:update', (task: LauncherTask) => {
      setState((prev) => {
        if (!prev) return prev;
        const idx = prev.tasks.findIndex((t) => t.id === task.id);
        const updated = [...prev.tasks];
        if (idx >= 0) updated[idx] = task;
        else updated.unshift(task);
        return { ...prev, tasks: updated };
      });
    });
    return () => {
      unsubState();
      unsubTask();
    };
  }, [refreshState]);

  // Apply Material-3 Expressive Theme & Custom Cursor dynamically
  useEffect(() => {
    if (!state) return;
    applyThemeCssVars({
      theme: state.settings.theme,
      customHex: state.settings.customThemeHex,
      darkMode: state.settings.darkMode,
      opacity: state.settings.backgroundOpacity,
      blur: state.settings.backgroundBlur,
    });
    document.body.classList.toggle('tcl-custom-cursor', state.settings.customCursor);
  }, [
    state?.settings.theme,
    state?.settings.customThemeHex,
    state?.settings.darkMode,
    state?.settings.backgroundOpacity,
    state?.settings.backgroundBlur,
    state?.settings.customCursor,
  ]);

  const updateSettings = async (patch: Partial<LauncherSettings>) => {
    await tclBridge.rpc('updateSettings', { patch });
    await refreshState();
  };

  // Global Ctrl+Enter / Cmd+Enter instant launch shortcut
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && state?.activeInstanceId) {
        e.preventDefault();
        void tclBridge
          .rpc<{ message: string }>('launchInstance', { instanceId: state.activeInstanceId })
          .then((res) => showToast(res.message))
          .catch((err) => showToast(err instanceof Error ? err.message : String(err)));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [state?.activeInstanceId, showToast]);

  const navigate = (next: ScreenRoute) => {
    setRouteStack((prev) => {
      const top = prev[prev.length - 1];
      if (top.name === next.name && JSON.stringify(top) === JSON.stringify(next)) return prev;
      return [...prev, next];
    });
  };

  const goBack = () => {
    setRouteStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : [{ name: 'home' }]));
  };

  const goHome = () => {
    setRouteStack([{ name: 'home' }]);
  };

  if (!state) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#090E0A',
          color: '#8BE51B',
          fontWeight: 700,
        }}
      >
        Initializing TurboCraft Launcher — PC Core...
      </div>
    );
  }

  const activeAccount =
    state.accounts.find((a) => a.id === state.activeAccountId) || state.accounts[0];
  const currentRoute = routeStack[routeStack.length - 1] || { name: 'home' };

  const showWelcome = state.settings.showWelcomeOnStartup && !welcomeDismissed;
  const needsLegalAccept =
    !showWelcome && (forceLegalModal || state.settings.legalAcceptedVersion !== LEGAL_VERSION);
  const needsGuide =
    !showWelcome && !needsLegalAccept && (forceGuideModal || !state.settings.guideCompleted);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* Layer 1: Bundled Animated Video or Custom Background (Exact Mobile Background Layer) */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
        {state.settings.backgroundType === 'default_video' ? (
          <video
            src="./assets/default_background.mp4"
            poster="./assets/world-hero.jpg"
            autoPlay
            loop
            muted
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : state.settings.backgroundType === 'custom_video' && state.settings.customBackgroundUrl ? (
          <video
            src={state.settings.customBackgroundUrl}
            poster="./assets/world-hero.jpg"
            autoPlay
            loop
            muted
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <img
            src={
              state.settings.backgroundType === 'custom_image' && state.settings.customBackgroundUrl
                ? state.settings.customBackgroundUrl
                : './assets/world-hero.jpg'
            }
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}

        {/* Semi-transparent surface tint so background video shines through cards */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'color-mix(in srgb, var(--surface) calc(var(--shell-alpha) * 100%), transparent)',
          }}
        />
      </div>

      {/* Layer 2: 60fps Festival Particle Engine */}
      <FestivalCanvas effect={state.settings.festivalEffect} />

      {/* Layer 3: Main Application Shell */}
      <div style={{ position: 'relative', zIndex: 10, width: '100%', height: '100%' }}>
        <TopBar
          route={currentRoute}
          language={state.settings.language}
          tasks={state.tasks}
          taskDrawerOpen={taskDrawerOpen}
          unreadSocialCount={unreadSocialCount}
          onBack={goBack}
          onHome={goHome}
          onNavigate={navigate}
          onToggleTaskDrawer={() => setTaskDrawerOpen((v) => !v)}
          onOpenFileManager={() => setFileManagerPath('')}
          onOpenLinksDialog={() => setShowLinks(true)}
        />

        <TaskDrawer
          open={taskDrawerOpen}
          tasks={state.tasks}
          onClose={() => setTaskDrawerOpen(false)}
          onRefresh={() => void refreshState()}
        />

        {currentRoute.name === 'home' && (
          <HomeScreen
            state={state}
            onNavigate={navigate}
            onRefreshState={refreshState}
            onOpenAbout={() => setShowAbout(true)}
            onOpenTeam={() => setShowTeam(true)}
            onOpenPerformance={() => setShowPerformance(true)}
            onLaunchToast={showToast}
          />
        )}

        {currentRoute.name === 'accounts' && (
          <AccountsScreen
            state={state}
            initialTab={currentRoute.tab}
            onRefreshState={refreshState}
            onToast={showToast}
          />
        )}

        {(currentRoute.name === 'versions' || currentRoute.name === 'version_settings') && (
          <VersionsScreen
            state={state}
            focusedInstanceId={
              currentRoute.name === 'version_settings'
                ? currentRoute.instanceId
                : currentRoute.selectedId
            }
            initialSubTab={
              currentRoute.name === 'version_settings' ? currentRoute.tab || 'overview' : 'overview'
            }
            onNavigate={navigate}
            onRefreshState={refreshState}
            onToast={showToast}
            onOpenFileManagerAt={(rel) => setFileManagerPath(rel)}
          />
        )}

        {currentRoute.name === 'download' && (
          <DownloadScreen
            state={state}
            initialTab={currentRoute.tab}
            onNavigate={navigate}
            onRefreshState={refreshState}
            onToast={showToast}
          />
        )}

        {currentRoute.name === 'social' && (
          <SocialHubScreen
            state={state}
            onUnreadCountChange={setUnreadSocialCount}
            onToast={showToast}
          />
        )}

        {currentRoute.name === 'multiplayer' && (
          <MultiplayerScreen
            state={state}
            onRefreshState={refreshState}
            onToast={showToast}
          />
        )}

        {currentRoute.name === 'logs' && (
          <LogViewScreen
            state={state}
            instanceId={currentRoute.instanceId}
            onToast={showToast}
          />
        )}

        {currentRoute.name === 'stats' && (
          <StatsScreen
            state={state}
            initialTab={currentRoute.tab}
            onRefreshState={refreshState}
            onToast={showToast}
            onOpenFileManagerAt={(rel) => setFileManagerPath(rel)}
          />
        )}

        {currentRoute.name === 'settings' && (
          <SettingsScreen
            state={state}
            initialTab={currentRoute.tab}
            onUpdateSettings={updateSettings}
            onRefreshState={refreshState}
            onToast={showToast}
            onOpenLegal={() => setForceLegalModal(true)}
            onOpenGuide={() => setForceGuideModal(true)}
            onOpenTeam={() => setShowTeam(true)}
          />
        )}
      </div>

      {/* Onboarding & Modals */}
      {showWelcome && (
        <WelcomeScreen
          username={activeAccount?.username}
          onEnter={() => setWelcomeDismissed(true)}
        />
      )}

      {needsLegalAccept && (
        <AgreementModal
          onAccept={async () => {
            setForceLegalModal(false);
            await updateSettings({ legalAcceptedVersion: LEGAL_VERSION });
          }}
        />
      )}

      {needsGuide && (
        <GuideOverlay
          language={state.settings.language}
          onFinish={async () => {
            setForceGuideModal(false);
            await updateSettings({ guideCompleted: true });
          }}
        />
      )}

      {showAbout && <AboutDialog onClose={() => setShowAbout(false)} />}
      {showTeam && <TeamDialog onClose={() => setShowTeam(false)} />}
      {showLinks && <SocialLinksDialog onClose={() => setShowLinks(false)} />}
      {showPerformance && (
        <PerformanceSettingsDialog
          settings={state.settings}
          totalRamMb={state.system.totalRamMb}
          onSave={updateSettings}
          onClose={() => setShowPerformance(false)}
        />
      )}
      {fileManagerPath !== null && (
        <FileManagerModal
          initialRelPath={fileManagerPath}
          onClose={() => setFileManagerPath(null)}
        />
      )}

      {/* Floating Toast */}
      {toast && (
        <div
          className="tcl-glass-card"
          style={{
            position: 'fixed',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 130,
            padding: '10px 20px',
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 700,
            borderColor: 'var(--primary)',
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
};
