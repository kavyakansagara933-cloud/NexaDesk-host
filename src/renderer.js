const SIGNALING_SERVER_URL =
  "wss://macky-signaling-server.onrender.com";

const statusEl = document.getElementById("status");
const codeEl = document.getElementById("code");
const previewEl = document.getElementById("preview");

/**
 * Gets the available screen from Electron and captures it as a MediaStream.
 */
async function startScreenCapture() {
  const sources =
    await window.nexaDesk.getScreenSources();

  if (sources.length === 0) {
    throw new Error("No screen sources found.");
  }

  const primaryScreen = sources[0];

  const stream =
    await navigator.mediaDevices.getUserMedia({
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
 * Screen capture starts immediately so the NexaDesk Host
 * is ready to create a WebRTC connection when a device pairs.
 */
let screenStream = null;
let peerConnection = null;
let controlChannel = null;

const RTC_CONFIG = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302",
    },
  ],
};

// Servers used to find a path to the other device. Replaced by the list
// the signaling server sends (it can include a TURN relay).
let iceServers = RTC_CONFIG.iceServers;

startScreenCapture()
  .then((stream) => {
    screenStream = stream;
    console.log("Screen capture ready.");
  })
  .catch((err) => {
    console.error(
      "Screen capture failed:",
      err
    );

    statusEl.textContent =
      "Screen capture failed - see console (Ctrl+Shift+I)";
  });


/* ---------------- CONTROL COMMAND QUEUE ---------------- */

/**
 * Remote control commands are run one at a time, in the order they
 * arrived, so a click can never run before the move that came first.
 *
 * If several mouse-move commands are waiting, only the newest one
 * matters (the older positions are already out of date), so a waiting
 * move is replaced instead of queued. This stops a backlog from
 * building up, which is what made the cursor fall further and further
 * behind.
 */
const commandQueue = [];
let processingQueue = false;

function enqueueCommand(command) {
  const last =
    commandQueue[commandQueue.length - 1];

  if (
    command.type === "mouse-move" &&
    last &&
    last.type === "mouse-move"
  ) {
    commandQueue[commandQueue.length - 1] =
      command;
  } else {
    commandQueue.push(command);
  }

  if (!processingQueue) {
    processCommandQueue();
  }
}

async function processCommandQueue() {
  processingQueue = true;

  while (commandQueue.length > 0) {
    const command = commandQueue.shift();

    try {
      await runCommand(command);
    } catch (err) {
      console.error(
        `Failed to run "${command.type}":`,
        err
      );
    }
  }

  processingQueue = false;
}

async function runCommand(command) {
  switch (command.type) {
    case "mouse-move":
      await window.nexaDesk.moveMouse(
        command.x,
        command.y
      );
      break;

    case "mouse-click":
      await window.nexaDesk.clickMouse();
      break;

    case "mouse-right-click":
      await window.nexaDesk.rightClickMouse();
      break;

    case "mouse-double-click":
      await window.nexaDesk.doubleClickMouse();
      break;

    case "mouse-scroll":
      await window.nexaDesk.scrollMouse(
        command.amount
      );
      break;

    case "mouse-down":
      await window.nexaDesk.mouseDown();
      break;

    case "mouse-up":
      await window.nexaDesk.mouseUp();
      break;

    case "key-down":
      await window.nexaDesk.keyDown(command.code);
      break;

    case "key-up":
      await window.nexaDesk.keyUp(command.code);
      break;

    case "key-text":
      await window.nexaDesk.typeText(command.text);
      break;

    default:
      console.warn(
        "Unknown control command:",
        command.type
      );
  }
}


/* ---------------- WEBRTC ---------------- */

async function createPeerConnection() {
  if (!screenStream) {
    throw new Error(
      "Screen capture is not ready yet."
    );
  }

  // Close any previous connection before creating a new one.
  if (peerConnection) {
    peerConnection.close();
  }

  peerConnection =
    new RTCPeerConnection({ iceServers });

  // Create the DataChannel used for remote control commands.
  controlChannel =
    peerConnection.createDataChannel("control");

  controlChannel.addEventListener(
    "open",
    () => {
      console.log(
        "Control DataChannel opened."
      );
    }
  );

  controlChannel.addEventListener(
    "message",
    (event) => {
      try {
        enqueueCommand(
          JSON.parse(event.data)
        );
      } catch (err) {
        console.error(
          "Invalid control command:",
          err
        );
      }
    }
  );

  controlChannel.addEventListener(
    "close",
    () => {
      console.log(
        "Control DataChannel closed."
      );

      // Forget any commands still waiting.
      commandQueue.length = 0;

      // Release the mouse button in case the client
      // disconnected in the middle of a drag.
      window.nexaDesk
        .mouseUp()
        .catch((err) => {
          console.error(
            "Failed to release mouse button on close:",
            err
          );
        });

      // Release any keys still held down so none stay stuck.
      window.nexaDesk
        .releaseAllKeys()
        .catch((err) => {
          console.error(
            "Failed to release keys on close:",
            err
          );
        });
    }
  );

  // Add the captured screen tracks to the WebRTC connection.
  screenStream
    .getTracks()
    .forEach((track) => {
      peerConnection.addTrack(
        track,
        screenStream
      );
    });

  peerConnection.addEventListener(
    "connectionstatechange",
    () => {
      console.log(
        "WebRTC connection state:",
        peerConnection.connectionState
      );
    }
  );

  // Forward ICE candidates to the paired client through signaling.
  peerConnection.addEventListener(
    "icecandidate",
    (event) => {
      if (
        event.candidate &&
        socket.readyState === WebSocket.OPEN
      ) {
        socket.send(
          JSON.stringify({
            type: "ice-candidate",
            candidate:
              event.candidate,
          })
        );
      }
    }
  );

  return peerConnection;
}

/**
 * Video quality limits.
 *
 * The browser's congestion control keeps raising the bitrate until the
 * Wi-Fi link is full. A phone on Wi-Fi then builds up a queue of video
 * and the picture falls further and further behind. Capping the
 * bitrate, frame rate and size keeps the stream light enough to stay
 * real-time. Raise these for a sharper picture on a fast connection,
 * lower them if the picture still lags.
 *
 * Shrinking the picture is safe because mouse positions are sent as
 * fractions of the screen, not as pixels.
 */
const VIDEO_MAX_BITRATE = 3000000; // bits per second (3 Mbps)
const VIDEO_MAX_FRAMERATE = 30; // frames per second
const VIDEO_MAX_WIDTH = 1280; // pixels; larger screens are scaled down

async function applyVideoLimits() {
  for (const sender of peerConnection.getSenders()) {
    if (
      !sender.track ||
      sender.track.kind !== "video"
    ) {
      continue;
    }

    const params = sender.getParameters();

    if (
      !params.encodings ||
      params.encodings.length === 0
    ) {
      params.encodings = [{}];
    }

    const encoding = params.encodings[0];

    encoding.maxBitrate = VIDEO_MAX_BITRATE;
    encoding.maxFramerate = VIDEO_MAX_FRAMERATE;

    // Scale big screens down (e.g. 1920 wide -> 1280 wide).
    const captureWidth = sender.track.getSettings().width;

    if (captureWidth && captureWidth > VIDEO_MAX_WIDTH) {
      encoding.scaleResolutionDownBy =
        captureWidth / VIDEO_MAX_WIDTH;
    }

    await sender.setParameters(params);

    console.log(
      "Video limits applied:",
      VIDEO_MAX_BITRATE / 1000000 + " Mbps,",
      VIDEO_MAX_FRAMERATE + " fps,",
      "capture width " + captureWidth
    );
  }
}

/**
 * Creates an SDP offer describing the captured screen,
 * then sends it to the paired NexaDesk client.
 */
async function createAndSendOffer() {
  const offer =
    await peerConnection.createOffer();

  await peerConnection.setLocalDescription(
    offer
  );

  if (
    socket.readyState === WebSocket.OPEN
  ) {
    socket.send(
      JSON.stringify({
        type: "offer",
        offer: offer,
      })
    );

    console.log("Offer sent.");
  } else {
    console.warn(
      "Cannot send offer - signaling socket is not open."
    );
  }
}

/* ---------------- SIGNALING SERVER ---------------- */

const socket =
  new WebSocket(SIGNALING_SERVER_URL);

socket.addEventListener(
  "open",
  () => {
    statusEl.textContent =
      "Connected. Registering as host...";

    socket.send(
      JSON.stringify({
        type: "host-register",
      })
    );
  }
);

socket.addEventListener(
  "message",
  async (event) => {
    const msg =
      JSON.parse(event.data);

    console.log(
      "[received]",
      msg.type
    );

    if (
      msg.type === "host-registered"
    ) {
      statusEl.textContent =
        "Waiting for a device to connect...";

      codeEl.textContent =
        msg.code;

      if (
        Array.isArray(msg.iceServers) &&
        msg.iceServers.length > 0
      ) {
        iceServers = msg.iceServers;
      }
    }

    if (
      msg.type === "peer-joined"
    ) {
      statusEl.textContent =
        "Device connected. Preparing screen stream...";

      try {
        await createPeerConnection();

        console.log(
          "WebRTC peer connection created."
        );

        await createAndSendOffer();

        statusEl.textContent =
          "Device connected. Establishing secure connection...";
      } catch (err) {
        console.error(
          "Failed to create WebRTC connection:",
          err
        );

        statusEl.textContent =
          "Failed to prepare WebRTC connection.";
      }
    }

    if (
      msg.type === "answer"
    ) {
      if (peerConnection) {
        try {
          await peerConnection.setRemoteDescription(
            msg.answer
          );

          console.log(
            "Remote description (answer) set."
          );

          await applyVideoLimits();
        } catch (err) {
          console.error(
            "Failed to set remote description:",
            err
          );
        }
      }
    }

    if (
      msg.type === "ice-candidate"
    ) {
      if (peerConnection) {
        try {
          await peerConnection.addIceCandidate(
            msg.candidate
          );
        } catch (err) {
          console.error(
            "Failed to add ICE candidate:",
            err
          );
        }
      }
    }

    if (
      msg.type === "peer-disconnected"
    ) {
      statusEl.textContent =
        "Device disconnected. Waiting again...";
    }
  }
);

socket.addEventListener(
  "close",
  () => {
    statusEl.textContent =
      "Disconnected from signaling server.";
  }
);

socket.addEventListener(
  "error",
  () => {
    statusEl.textContent =
      "Connection error - check the server URL and your internet.";
  }
);