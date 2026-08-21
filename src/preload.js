/**
 * Preload script - runs before the page loads, in a special context that
 * can see both Node APIs and the page's window object.
 *
 * We don't need to expose anything yet since this first version only uses
 * the browser's built-in WebSocket API (no OS access required). Once we add
 * screen capture (step 2b) and input injection (step 2d), we'll expose those
 * specific functions here via contextBridge - never the whole Node API,
 * just the exact functions the renderer needs. This keeps the app secure
 * even though it's rendering web content.
 */

// Intentionally empty for now.
