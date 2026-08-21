/**
 * This runs inside the Electron window (the renderer process). Since it's
 * essentially a webpage, it has the browser's native WebSocket API built in -
 * no npm package needed for this part.
 *
 * IMPORTANT: replace SIGNALING_SERVER_URL below with YOUR deployed Render URL
 * (the one you tested with wscat) once you have it. Using wss:// (not ws://)
 * since Render serves over a secure connection.
 */

const SIGNALING_SERVER_URL = "wss://macky-signaling-server.onrender.com";

const statusEl = document.getElementById("status");
const codeEl = document.getElementById("code");

const socket = new WebSocket(SIGNALING_SERVER_URL);

socket.addEventListener("open", () => {
  statusEl.textContent = "Connected. Registering as host...";
  socket.send(JSON.stringify({ type: "host-register" }));
});

socket.addEventListener("message", (event) => {
  const msg = JSON.parse(event.data);
  console.log("[received]", msg);

  if (msg.type === "host-registered") {
    statusEl.textContent = "Waiting for a device to connect...";
    codeEl.textContent = msg.code;
  }

  if (msg.type === "peer-joined") {
    statusEl.textContent = "Device connected! (WebRTC setup comes in step 2c)";
  }

  if (msg.type === "peer-disconnected") {
    statusEl.textContent = "Device disconnected. Waiting again...";
  }
});

socket.addEventListener("close", () => {
  statusEl.textContent = "Disconnected from signaling server.";
});

socket.addEventListener("error", () => {
  statusEl.textContent = "Connection error - check the server URL and your internet.";
});
