const { app, BrowserWindow, ipcMain, desktopCapturer } = require("electron");
const path = require("path");
const {
  mouse,
  Point,
  straightTo,
} = require("@nut-tree-fork/nut-js");
/**
 * Returns the available screens to the renderer.
 * The renderer cannot access Electron's desktopCapturer directly,
 * so it requests the information through this IPC handler.
 */
ipcMain.handle("get-screen-sources", async () => {
  const sources = await desktopCapturer.getSources({
    types: ["screen"],
    thumbnailSize: { width: 320, height: 180 },
  });

  return sources.map((source) => ({
    id: source.id,
    name: source.name,
    thumbnailDataUrl: source.thumbnail.toDataURL(),
  }));
});
ipcMain.handle("move-mouse", async (event, x, y) => {
  console.log(`Moving mouse to: x=${x}, y=${y}`);

  await mouse.move(
    straightTo(
      new Point(x, y)
    )
  );

  return true;
});
function createWindow() {
  const win = new BrowserWindow({
    width: 420,
    height: 560,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile(path.join(__dirname, "index.html"));
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});