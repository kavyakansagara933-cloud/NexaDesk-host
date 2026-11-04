const {
  app,
  BrowserWindow,
  ipcMain,
  desktopCapturer,
} = require("electron");

const path = require("path");

const {
  mouse,
  keyboard,
  screen,
  Button,
  Point,
} = require("@nut-tree-fork/nut-js");

const { keyFromCode } = require("./keymap");


/* ---------------- PERFORMANCE ---------------- */

/**
 * While someone controls this PC remotely, the NexaDesk Host window is
 * almost always covered by other apps. Chromium treats covered or
 * background windows as "not visible" and slows them down (timers,
 * rendering, message handling), which makes remote control lag badly.
 * These switches tell Chromium to keep running at full speed.
 *
 * They must be set before the app is ready.
 */
app.commandLine.appendSwitch("disable-renderer-backgrounding");
app.commandLine.appendSwitch("disable-background-timer-throttling");
app.commandLine.appendSwitch("disable-backgrounding-occluded-windows");
app.commandLine.appendSwitch(
  "disable-features",
  "CalculateNativeWinOcclusion"
);

/**
 * nut-js adds a 100 ms pause after every mouse action by default,
 * which makes remote control feel slow and out of order.
 * Remote control needs every action to happen immediately.
 */
mouse.config.autoDelayMs = 0;
keyboard.config.autoDelayMs = 0;


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

/**
 * The client sends positions as fractions of the video:
 * x and y between 0 and 1 (0 = left/top edge, 1 = right/bottom edge).
 * Here they are converted into real pixels on THIS screen, using the
 * same screen size nut-js moves the cursor in. That makes the cursor
 * accurate regardless of the video's resolution or Windows scaling.
 */
let screenSize = null;
let screenSizeTime = 0;

// The size is cached because it rarely changes; it is re-read every
// few seconds in case the display resolution is changed.
async function getScreenSize() {
  const now = Date.now();

  if (!screenSize || now - screenSizeTime > 3000) {
    screenSize = {
      width: await screen.width(),
      height: await screen.height(),
    };
    screenSizeTime = now;
  }

  return screenSize;
}

/**
 * Jumps the cursor straight to the requested position.
 *
 * mouse.move(straightTo(...)) ANIMATES the cursor along a path, and
 * the client sends many positions per second, so many animations ran
 * at once and fought each other. setPosition moves instantly.
 */
ipcMain.handle(
  "move-mouse",
  async (event, x, y) => {
    const nx = Number(x);
    const ny = Number(y);

    if (!Number.isFinite(nx) || !Number.isFinite(ny)) {
      return false;
    }

    const { width, height } = await getScreenSize();

    // Fraction -> pixel, kept inside the screen (last pixel is width - 1).
    const px = Math.min(
      width - 1,
      Math.max(0, Math.round(nx * (width - 1)))
    );
    const py = Math.min(
      height - 1,
      Math.max(0, Math.round(ny * (height - 1)))
    );

    await mouse.setPosition(new Point(px, py));

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

/**
 * The amount is signed:
 *   positive -> scroll down
 *   negative -> scroll up
 */
ipcMain.handle(
  "scroll-mouse",
  async (event, amount) => {
    const steps = Math.round(Number(amount));

    if (!Number.isFinite(steps) || steps === 0) {
      return false;
    }

    if (steps > 0) {
      await mouse.scrollDown(steps);
    } else {
      await mouse.scrollUp(Math.abs(steps));
    }

    return true;
  }
);


/* ---------------- KEYBOARD ---------------- */

/**
 * Keys currently held down on this PC by the remote user.
 * Tracked so they can all be released if the connection drops,
 * otherwise a key like Shift or Ctrl could stay stuck down.
 */
const heldKeys = new Set();

ipcMain.handle(
  "key-down",
  async (event, code) => {
    const key = keyFromCode(code);

    // Ignore keys we don't know how to press.
    if (key === undefined) {
      return false;
    }

    heldKeys.add(key);
    await keyboard.pressKey(key);

    return true;
  }
);


ipcMain.handle(
  "key-up",
  async (event, code) => {
    const key = keyFromCode(code);

    if (key === undefined) {
      return false;
    }

    heldKeys.delete(key);
    await keyboard.releaseKey(key);

    return true;
  }
);


ipcMain.handle(
  "release-all-keys",
  async () => {
    const keys = [...heldKeys];
    heldKeys.clear();

    for (const key of keys) {
      await keyboard.releaseKey(key);
    }

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

        // Keep the window running at full speed even when it is
        // covered or minimized (see the PERFORMANCE section above).
        backgroundThrottling: false,
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