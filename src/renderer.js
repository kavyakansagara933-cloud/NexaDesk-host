const SIGNALING_SERVER_URL =
  "wss://macky-signaling-server.onrender.com";

const statusEl = document.getElementById("status");
const codeEl = document.getElementById("code");
const previewEl = document.getElementById("preview");

/**
 * Gets the available screen from Electron and captures it as a MediaStream.
 */
async function startScreenCapture() {
  const sources = await window.macky.getScreenSources();

  if (sources.length === 0) {
    throw new Error("No screen sources found.");
  }

  const primaryScreen = sources[0];

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,

    video: {
      mandatory: {
        chromeMediaSource: "desktop",
        chromeMediaSourceId: primaryScreen.id,
      },
    },
  });

  previewEl.srcObject = stream;
  previewEl.style.display = "block";

  return stream;
}

/**
 * For Milestone 2B, start capturing immediately so we can verify
 * that screen capture works. In Milestone 2C, this stream will be
 * passed into the WebRTC connection after a device pairs.
 */
startScreenCapture().catch((err) => {
  console.error("Screen capture failed:", err);

  statusEl.textContent =
    "Screen capture failed - see console (Ctrl+Shift+I)";
});


/* ---------------- SIGNALING SERVER ---------------- */

const socket = new WebSocket(SIGNALING_SERVER_URL);

socket.addEventListener("open", () => {
  statusEl.textContent = "Connected. Registering as host...";

  socket.send(
    JSON.stringify({
      type: "host-register",
    })
  );
});

socket.addEventListener("message", (event) => {
  const msg = JSON.parse(event.data);

  console.log("[received]", msg);

  if (msg.type === "host-registered") {
    statusEl.textContent =
      "Waiting for a device to connect...";

    codeEl.textContent = msg.code;
  }

  if (msg.type === "peer-joined") {
    statusEl.textContent =
      "Device connected! (WebRTC setup comes in step 2C)";
  }

  if (msg.type === "peer-disconnected") {
    statusEl.textContent =
      "Device disconnected. Waiting again...";
  }
});

socket.addEventListener("close", () => {
  statusEl.textContent =
    "Disconnected from signaling server.";
});

socket.addEventListener("error", () => {
  statusEl.textContent =
    "Connection error - check the server URL and your internet.";
});