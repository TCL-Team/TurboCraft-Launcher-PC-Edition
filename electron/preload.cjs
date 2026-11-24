const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('tclElectron', {
  isElectron: true,
  rpc: (method, args) => ipcRenderer.invoke('tcl:rpc', { method, args }),
  windowAction: (action) => ipcRenderer.invoke('tcl:window', action),
  openExternal: (url) => ipcRenderer.invoke('tcl:openExternal', url),
  openFolder: (relPath) => ipcRenderer.invoke('tcl:openFolder', relPath || ''),
  onEvent: (eventName, callback) => {
    const channel = `tcl:event:${eventName}`;
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },
});
