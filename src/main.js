/**
 * Electron has two kinds of code that run separately:
 *
 *  - MAIN process (this file): runs in Node.js, has full OS access
 *    (creating windows, capturing the screen, reading files, etc).
 *    There's exactly one main process per app.
 *
 *  - RENDERER process (src/renderer.js, loaded by index.html): runs
 *    inside a Chromium window, basically a webpage. For security,
 *    it does NOT get direct Node/OS access unless we explicitly expose
 *    it through a "preload" script.
 *
 * For this first step we just need the main process to open a window
 * that loads our HTML/JS - the renderer will handle connecting to the
 * signaling server.
 */

const { app, BrowserWindow } = require("electron");
const path = require("path");

function createWindow() {
  const win = new BrowserWindow({
    width: 420,
    height: 320,
    resizable: false,
    webPreferences: {
      // preload.js runs before the page loads, with access to both
      // Node APIs and the page - it's the secure bridge between them.
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true, // keeps Node APIs out of the webpage's own JS scope
      nodeIntegration: false, // security best practice - webpage JS can't touch Node directly
    },
  });

  win.loadFile(path.join(__dirname, "index.html"));
}

// Electron fires this once it's ready to create windows
app.whenReady().then(createWindow);

// Standard Electron boilerplate: quit when all windows are closed
// (except on macOS, where apps conventionally stay running in the dock)
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
