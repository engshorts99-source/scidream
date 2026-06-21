const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getVaultData: () => ipcRenderer.invoke('get-vault-data'),
  updateVaultData: (tier, id, updates) => ipcRenderer.invoke('update-vault-data', { tier, id, updates }),
  createVaultData: (tier, id, data) => ipcRenderer.invoke('create-vault-data', { tier, id, data }),
  onDataUpdated: (callback) => ipcRenderer.on('data-updated', (_event, data) => callback(data)),
  gitSync: () => ipcRenderer.invoke('git-sync')
});
