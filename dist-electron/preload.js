import { createRequire } from "node:module";
//#endregion
//#region electron/preload.js
var { contextBridge, ipcRenderer } = (/* @__PURE__ */ createRequire(import.meta.url))("electron");
contextBridge.exposeInMainWorld("electronAPI", {
	getVaultData: () => ipcRenderer.invoke("get-vault-data"),
	updateVaultData: (tier, id, updates) => ipcRenderer.invoke("update-vault-data", {
		tier,
		id,
		updates
	}),
	onDataUpdated: (callback) => ipcRenderer.on("data-updated", (_event, data) => callback(data)),
	gitSync: () => ipcRenderer.invoke("git-sync")
});
//#endregion
export {};
