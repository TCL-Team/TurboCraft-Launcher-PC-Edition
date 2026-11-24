import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('tclElectron', {
  isElectron: true,
  rpc: (method: string, args?: Record<string, unknown>) =>
    ipcRenderer.invoke('tcl:rpc', { method, args }),
  windowAction: (action: 'minimize' | 'maximize' | 'close') =>
    ipcRenderer.invoke('tcl:window', action),
  openExternal: (url: string) => ipcRenderer.invoke('tcl:openExternal', url),
  openFolder: (relPath?: string) => ipcRenderer.invoke('tcl:openFolder', relPath || ''),
  onEvent: (eventName: string, callback: (payload: unknown) => void) => {
    const channel = `tcl:event:${eventName}`;
    const handler = (_event: Electron.IpcRendererEvent, payload: unknown) => callback(payload);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },
});
