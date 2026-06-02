const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  getPlatform: () => ipcRenderer.invoke("get-platform"),
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),
  renderReferenceUrl: (url) => ipcRenderer.invoke("render-reference-url", url),
  confirmReferenceCapture: () => ipcRenderer.send("reference-url:capture-now"),
  onReferenceLoginNeeded: (callback) => {
    const listener = () => callback();
    ipcRenderer.on("reference-url:login-needed", listener);
    return () => ipcRenderer.removeListener("reference-url:login-needed", listener);
  },
  isElectron: true,
});
