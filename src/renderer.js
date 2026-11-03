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
    new RTCPeerConnection(RTC_CONFIG);

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
        const command =
          JSON.parse(event.data);

        console.log(
          "Control command received:",
          command
        );

        if (
          command.type === "mouse-move"
        ) {
          console.log(
            `Mouse move received: x=${command.x}, y=${command.y}`
          );

          window.nexaDesk
            .moveMouse(
              command.x,
              command.y
            )
            .catch((err) => {
              console.error(
                "Failed to move mouse:",
                err
              );
            });
        }

        if (
          command.type === "mouse-click"
        ) {
          console.log(
            "Mouse click received."
          );

          window.nexaDesk
            .clickMouse()
            .catch((err) => {
              console.error(
                "Failed to perform mouse click:",
                err
              );
            });
        }

        if (
          command.type === "mouse-right-click"
        ) {
          console.log(
            "Mouse right-click received."
          );

          window.nexaDesk
            .rightClickMouse()
            .catch((err) => {
              console.error(
                "Failed to perform right click:",
                err
              );
            });
        }

        if (
          command.type === "mouse-double-click"
        ) {
          console.log(
            "Mouse double-click received."
          );

          window.nexaDesk
            .doubleClickMouse()
            .catch((err) => {
              console.error(
                "Failed to perform double click:",
                err
              );
            });
        }

        if (
          command.type === "mouse-scroll"
        ) {
          console.log(
            `Mouse scroll received: amount=${command.amount}`
          );

          window.nexaDesk
            .scrollMouse(command.amount)
            .catch((err) => {
              console.error(
                "Failed to scroll:",
                err
              );
            });
        }

        if (
          command.type === "mouse-down"
        ) {
          console.log(
            "Mouse button down received."
          );

          window.nexaDesk
            .mouseDown()
            .catch((err) => {
              console.error(
                "Failed to press mouse button:",
                err
              );
            });
        }

        if (
          command.type === "mouse-up"
        ) {
          console.log(
            "Mouse button up received."
          );

          window.nexaDesk
            .mouseUp()
            .catch((err) => {
              console.error(
                "Failed to release mouse button:",
                err
              );
            });
        }
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
      msg
    );

    if (
      msg.type === "host-registered"
    ) {
      statusEl.textContent =
        "Waiting for a device to connect...";

      codeEl.textContent =
        msg.code;
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