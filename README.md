# Macky Host (Electron) — Step 2a

This is the first slice of the Electron host app: it connects to the
deployed signaling server, registers as a host, and displays the pairing
code. No screen capture or WebRTC yet — that comes in steps 2b/2c.

## Files

- `src/main.js` — Electron's main process. Creates the app window. Runs in
  Node.js with full OS access.
- `src/preload.js` — the secure bridge between main and renderer. Empty for
  now; we'll add screen-capture and input-injection functions here later.
- `src/index.html` / `src/renderer.js` — the actual window content. Connects
  to the signaling server using the browser's native WebSocket API and shows
  the pairing code.

## Running it

```bash
npm install
npm start
```

An Electron window should open showing "Connecting to signaling server...",
then a 6-character pairing code once it registers.

## Testing the full pairing flow

With this window open, use `wscat` (or the same manual test from the
signaling-server README) to simulate the Android client joining:

```bash
wscat -c wss://macky-signaling-server.onrender.com
> {"type":"client-join","code":"THE_CODE_SHOWN_IN_THE_APP"}
```

The Electron window's status text should update to
"Device connected! (WebRTC setup comes in step 2c)".

## Next step (2b)

Add screen capture using Electron's `desktopCapturer` API and preview it in
a small window inside the app, before we try sending it anywhere.
