import { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TurboCraftLauncherCore } from '../server/launcherCore.js';
import { dispatchCoreRpc } from '../server/devServer.js';
import { BuildKeys } from '../src/generated/buildConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let launcherCore: TurboCraftLauncherCore | null = null;

async function createWindow() {
  const userDataDir = path.join(app.getPath('appData'), 'TurboCraftLauncherPC');
  launcherCore = new TurboCraftLauncherCore(userDataDir);
  await launcherCore.init();

  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'app.asar', 'dist', 'assets', 'turbocraft-icon.png')
    : path.join(process.cwd(), 'public', 'assets', 'turbocraft-icon.png');

  mainWindow = new BrowserWindow({
    width: 1340,
    height: 820,
    minWidth: 1024,
    minHeight: 660,
    frame: false,
    backgroundColor: '#090E0A',
    icon: iconPath,
    title: BuildKeys.LAUNCHER_APP_NAME,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Forward launcher core events to renderer
  const forward = (eventName: string) => (payload: unknown) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(`tcl:event:${eventName}`, payload);
    }
  };
  launcherCore.on('state:changed', forward('state:changed'));
  launcherCore.on('task:update', forward('task:update'));
  launcherCore.on('log:line', forward('log:line'));
  launcherCore.on('game:exit', (payload) => {
    forward('game:exit')(payload);
    if (mainWindow && !mainWindow.isVisible()) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL || (!app.isPackaged ? 'http://127.0.0.1:5173' : '');
  if (devServerUrl) {
    await mainWindow.loadURL(devServerUrl);
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  // Setup System Tray
  try {
    const img = nativeImage.createFromPath(iconPath);
    if (!img.isEmpty()) {
      tray = new Tray(img.resize({ width: 16, height: 16 }));
      tray.setToolTip(BuildKeys.LAUNCHER_APP_NAME);
      tray.setContextMenu(
        Menu.buildFromTemplate([
          {
            label: `Open ${BuildKeys.LAUNCHER_NAME}`,
            click: () => {
              mainWindow?.show();
              mainWindow?.focus();
            },
          },
          { type: 'separator' },
          { label: 'Quit', click: () => app.quit() },
        ])
      );
      tray.on('double-click', () => {
        mainWindow?.show();
        mainWindow?.focus();
      });
    }
  } catch {
    // Tray optional on headless Desktop environments
  }
}

ipcMain.handle('tcl:rpc', async (_event, payload: { method: string; args?: Record<string, any> }) => {
  if (!launcherCore) throw new Error('Launcher core not initialized');
  const res = await dispatchCoreRpc(launcherCore, payload.method, payload.args || {});
  if (payload.method === 'launchGame' && launcherCore.getBootstrapState().settings.minimizeOnLaunch) {
    mainWindow?.minimize();
  }
  return res;
});

ipcMain.handle('tcl:window', (_event, action: 'minimize' | 'maximize' | 'close') => {
  if (!mainWindow) return;
  if (action === 'minimize') mainWindow.minimize();
  else if (action === 'maximize') {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  } else if (action === 'close') mainWindow.close();
});

ipcMain.handle('tcl:openExternal', async (_event, url: string) => {
  if (/^https?:\/\//i.test(url)) {
    await shell.openExternal(url);
  }
});

ipcMain.handle('tcl:openFolder', async (_event, relPath: string) => {
  if (!launcherCore) return;
  const target = path.resolve(launcherCore.dataRoot, relPath.replace(/^[/\\]+/, ''));
  if (target.startsWith(launcherCore.dataRoot)) {
    await shell.openPath(target);
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) void createWindow();
});
