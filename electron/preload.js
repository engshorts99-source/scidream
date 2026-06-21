const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getVaultData: () => ipcRenderer.invoke('get-vault-data'),
  onDataUpdated: (callback) => ipcRenderer.on('data-updated', (_event, data) => callback(data)),
  gitSync: () => ipcRenderer.invoke('git-sync')
});
