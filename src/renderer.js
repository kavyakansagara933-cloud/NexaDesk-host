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
let screenStream = null;
let peerConnection = null;

const RTC_CONFIG = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302",
    },
  ],
};

startScreenCapture()
  .then((stream) => {
    screenStream = stream;
    console.log("Screen capture ready.");
  })
  .catch((err) => {
    console.error("Screen capture failed:", err);

    statusEl.textContent =
      "Screen capture failed - see console (Ctrl+Shift+I)";
  });

async function createPeerConnection() {
  if (!screenStream) {
    throw new Error("Screen capture is not ready yet.");
  }

  // Close any previous connection before creating a new one
  if (peerConnection) {
    peerConnection.close();
  }

  peerConnection = new RTCPeerConnection(RTC_CONFIG);

  // Add the captured screen tracks to the WebRTC connection
  screenStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, screenStream);
  });

    peerConnection.addEventListener("connectionstatechange", () => {
    console.log(
      "WebRTC connection state:",
      peerConnection.connectionState
    );
  });

  // Whenever the browser discovers a possible network path to reach us,
  // it fires this event. We forward each candidate to the other peer
  // through the signaling server - the answer/client side does the same
  // thing in reverse once it exists.
    peerConnection.addEventListener("icecandidate", (event) => {
    if (event.candidate && socket.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({
          type: "ice-candidate",
          candidate: event.candidate,
        })
      );
    }
  });

  return peerConnection;
}

/**
 * Creates an SDP offer describing what we're sending (the screen track),
 * sets it as our local description, and sends it through the signaling
 * server to whoever is on the other end of this pairing.
 */
async function createAndSendOffer() {
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  if (socket.readyState === WebSocket.OPEN) {
    socket.send(
      JSON.stringify({
        type: "offer",
        offer: offer,
      })
    );
    console.log("Offer sent.");
  } else {
    console.warn("Cannot send offer - signaling socket is not open.");
  }
}
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

socket.addEventListener("message", async (event) => {
  const msg = JSON.parse(event.data);

  console.log("[received]", msg);

  if (msg.type === "host-registered") {
    statusEl.textContent =
      "Waiting for a device to connect...";

    codeEl.textContent = msg.code;
  }

  if (msg.type === "peer-joined") {
  statusEl.textContent =
    "Device connected. Preparing screen stream...";

    try {
    await createPeerConnection();

    console.log("WebRTC peer connection created.");

    await createAndSendOffer();

    statusEl.textContent =
      "Device connected. Establishing secure connection...";
  } catch (err) {
    console.error("Failed to create WebRTC connection:", err);

    statusEl.textContent =
      "Failed to prepare WebRTC connection.";
  }
}
    if (msg.type === "answer") {
    if (peerConnection) {
      try {
        await peerConnection.setRemoteDescription(msg.answer);
        console.log("Remote description (answer) set.");
      } catch (err) {
        console.error("Failed to set remote description:", err);
      }
    }
  }

  if (msg.type === "ice-candidate") {
    if (peerConnection) {
      try {
        await peerConnection.addIceCandidate(msg.candidate);
      } catch (err) {
        console.error("Failed to add ICE candidate:", err);
      }
    }
  }if (msg.type === "peer-disconnected") {
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