const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("nexaDesk", {
  getScreenSources: () =>
    ipcRenderer.invoke("get-screen-sources"),

  // Mouse
  moveMouse: (x, y) =>
    ipcRenderer.invoke("move-mouse", x, y),
  clickMouse: () =>
    ipcRenderer.invoke("click-mouse"),
  rightClickMouse: () =>
    ipcRenderer.invoke("right-click-mouse"),
  doubleClickMouse: () =>
    ipcRenderer.invoke("double-click-mouse"),
  mouseDown: () =>
    ipcRenderer.invoke("mouse-down"),
  mouseUp: () =>
    ipcRenderer.invoke("mouse-up"),
  scrollMouse: (amount) =>
    ipcRenderer.invoke("scroll-mouse", amount),

  // Keyboard (code is a browser KeyboardEvent.code such as "KeyA")
  keyDown: (code) =>
    ipcRenderer.invoke("key-down", code),
  keyUp: (code) =>
    ipcRenderer.invoke("key-up", code),
  releaseAllKeys: () =>
    ipcRenderer.invoke("release-all-keys"),
});