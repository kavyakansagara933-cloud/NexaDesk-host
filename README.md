# Macky Host (Electron)

This is the Electron host app: it connects to the deployed signaling server, registers as a host, and displays the pairing code.

## Files

- `src/main.js` — Electron's main process. Creates the app window and handles screen-source access.
- `src/preload.js` — the secure bridge between main and renderer. Exposes the screen-source function through `contextBridge`.
- `src/index.html` / `src/renderer.js` — the app window content. Connects to the signaling server using the browser's native WebSocket API, shows the pairing code, and previews the captured screen.

## Running it

```bash
npm install
npm start
```

An Electron window should open, connect to the signaling server, display a 6-character pairing code, and show a live preview of the captured screen.

## Signaling server

The host connects to the deployed signaling server at:

```text
wss://macky-signaling-server.onrender.com
```

## Current status

- Host registration and pairing-code display are implemented.
- Screen capture and local preview are implemented.
- WebRTC screen streaming and remote input control are planned next.
