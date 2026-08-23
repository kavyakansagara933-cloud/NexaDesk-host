# NexaDesk Host (Electron)

NexaDesk Host is the Windows desktop application for the NexaDesk remote desktop system.

It captures the Windows desktop, connects to the signaling server, generates a pairing code, streams the screen to a paired client using WebRTC, and receives remote mouse-control commands.

## Features

- Host registration with the signaling server
- Automatic 6-character pairing code generation
- Windows desktop screen capture
- Live local screen preview
- WebRTC peer-to-peer screen streaming
- WebRTC ICE candidate exchange
- Secure Electron IPC communication
- Remote mouse movement through the WebRTC DataChannel
- Scaled mouse coordinates for accurate remote control

## Files

- `src/main.js` — Electron's main process. Creates the application window, handles screen-source access, and moves the Windows mouse.

- `src/preload.js` — Secure bridge between the Electron main process and renderer process. Exposes screen capture and mouse-control functions through `contextBridge`.

- `src/index.html` — The NexaDesk Host application interface.

- `src/renderer.js` — Handles signaling, screen capture, WebRTC streaming, DataChannel communication, and remote control commands.

## Running the Application

First, install the dependencies:

```bash
npm install