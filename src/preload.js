const {
  contextBridge,
  ipcRenderer,
} = require("electron");


contextBridge.exposeInMainWorld(
  "nexaDesk",
  {
    getScreenSources: () =>
      ipcRenderer.invoke(
        "get-screen-sources"
      ),

    moveMouse: (x, y) =>
      ipcRenderer.invoke(
        "move-mouse",
        x,
        y
      ),

    clickMouse: () =>
      ipcRenderer.invoke(
        "click-mouse"
      ),

    rightClickMouse: () =>
      ipcRenderer.invoke(
        "right-click-mouse"
      ),

    doubleClickMouse: () =>
      ipcRenderer.invoke(
        "double-click-mouse"
      ),

    mouseDown: () =>
      ipcRenderer.invoke(
        "mouse-down"
      ),

    mouseUp: () =>
      ipcRenderer.invoke(
        "mouse-up"
      ),

    scrollMouse: (amount) =>
      ipcRenderer.invoke(
        "scroll-mouse",
        amount
      ),
  }
);