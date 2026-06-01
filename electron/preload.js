const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  getPlatform: () => ipcRenderer.invoke("get-platform"),
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),
  selectFolder: () => ipcRenderer.invoke("select-folder"),
  isElectron: true,
});
