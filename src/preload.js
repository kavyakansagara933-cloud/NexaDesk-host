const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("macky", {
  getScreenSources: () => ipcRenderer.invoke("get-screen-sources"),
});