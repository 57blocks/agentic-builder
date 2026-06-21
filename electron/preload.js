const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  getPlatform: () => ipcRenderer.invoke("get-platform"),
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),
  selectFolder: () => ipcRenderer.invoke("select-folder"),
  renderReferenceUrl: (url, opts) =>
    ipcRenderer.invoke("render-reference-url", url, opts),
  captureUrl: (url) => ipcRenderer.invoke("capture-url", url),
  confirmReferenceCapture: () => ipcRenderer.send("reference-url:capture-now"),
  onReferenceLoginNeeded: (callback) => {
    const listener = () => callback();
    ipcRenderer.on("reference-url:login-needed", listener);
    return () => ipcRenderer.removeListener("reference-url:login-needed", listener);
  },
  isElectron: true,
});
