const {
  app,
  BrowserWindow,
  ipcMain,
  desktopCapturer,
} = require("electron");

const path = require("path");

const {
  mouse,
  Button,
  Point,
  straightTo,
} = require("@nut-tree-fork/nut-js");


ipcMain.handle(
  "get-screen-sources",
  async () => {
    const sources =
      await desktopCapturer.getSources({
        types: ["screen"],
        thumbnailSize: {
          width: 320,
          height: 180,
        },
      });

    return sources.map((source) => ({
      id: source.id,
      name: source.name,
      thumbnailDataUrl:
        source.thumbnail.toDataURL(),
    }));
  }
);


/* ---------------- MOUSE MOVEMENT ---------------- */

ipcMain.handle(
  "move-mouse",
  async (event, x, y) => {
    console.log(
      `Moving mouse to: x=${x}, y=${y}`
    );

    await mouse.move(
      straightTo(
        new Point(x, y)
      )
    );

    return true;
  }
);


/* ---------------- MOUSE CLICKS ---------------- */

ipcMain.handle(
  "click-mouse",
  async () => {
    console.log(
      "Performing left mouse click."
    );

    await mouse.click(
      Button.LEFT
    );

    return true;
  }
);


ipcMain.handle(
  "right-click-mouse",
  async () => {
    console.log(
      "Performing right mouse click."
    );

    await mouse.click(
      Button.RIGHT
    );

    return true;
  }
);


ipcMain.handle(
  "double-click-mouse",
  async () => {
    console.log(
      "Performing double mouse click."
    );

    await mouse.doubleClick(
      Button.LEFT
    );

    return true;
  }
);


/* ---------------- MOUSE DRAG ---------------- */

ipcMain.handle(
  "mouse-down",
  async () => {
    console.log(
      "Mouse button pressed."
    );

    await mouse.pressButton(
      Button.LEFT
    );

    return true;
  }
);


ipcMain.handle(
  "mouse-up",
  async () => {
    console.log(
      "Mouse button released."
    );

    await mouse.releaseButton(
      Button.LEFT
    );

    return true;
  }
);


/* ---------------- MOUSE SCROLL ---------------- */

ipcMain.handle(
  "scroll-mouse",
  async (event, amount) => {
    console.log(
      `Scrolling mouse: ${amount}`
    );

    await mouse.scrollDown(
      amount
    );

    return true;
  }
);


/* ---------------- ELECTRON WINDOW ---------------- */

function createWindow() {
  const win =
    new BrowserWindow({
      width: 420,
      height: 560,
      resizable: false,

      webPreferences: {
        preload:
          path.join(
            __dirname,
            "preload.js"
          ),

        contextIsolation: true,
        nodeIntegration: false,
      },
    });

  win.loadFile(
    path.join(
      __dirname,
      "index.html"
    )
  );
}


app.whenReady().then(
  createWindow
);


app.on(
  "window-all-closed",
  () => {
    if (
      process.platform !== "darwin"
    ) {
      app.quit();
    }
  }
);