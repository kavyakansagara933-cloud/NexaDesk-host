const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("nexaDesk", {
  getScreenSources: () =>
    ipcRenderer.invoke("get-screen-sources"),

  moveMouse: (x, y) =>
    ipcRenderer.invoke("move-mouse", x, y),
});