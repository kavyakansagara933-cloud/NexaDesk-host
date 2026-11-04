const { Key } = require("@nut-tree-fork/nut-js");

/**
 * Translates a browser KeyboardEvent.code (the PHYSICAL key, such as
 * "KeyA" or "ShiftLeft") into a nut-js Key.
 *
 * We use .code instead of .key because it doesn't change with Shift,
 * Caps Lock or the keyboard layout. The host then presses the same
 * physical key, and Windows applies its own layout and modifiers.
 * It also keeps the client platform-neutral, so the Android client
 * can send the same names later.
 */
const KEY_MAP = {};

// Letters: KeyA -> Key.A
for (const letter of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
  KEY_MAP[`Key${letter}`] = Key[letter];
}

// Number row: Digit0 -> Key.Num0
for (let i = 0; i <= 9; i++) {
  KEY_MAP[`Digit${i}`] = Key[`Num${i}`];
  KEY_MAP[`Numpad${i}`] = Key[`NumPad${i}`];
}

// Function keys: F1 -> Key.F1
for (let i = 1; i <= 12; i++) {
  KEY_MAP[`F${i}`] = Key[`F${i}`];
}

Object.assign(KEY_MAP, {
  // Editing and whitespace
  Enter: Key.Enter,
  NumpadEnter: Key.Enter,
  Space: Key.Space,
  Backspace: Key.Backspace,
  Tab: Key.Tab,
  Escape: Key.Escape,
  Delete: Key.Delete,
  Insert: Key.Insert,

  // Navigation
  ArrowUp: Key.Up,
  ArrowDown: Key.Down,
  ArrowLeft: Key.Left,
  ArrowRight: Key.Right,
  Home: Key.Home,
  End: Key.End,
  PageUp: Key.PageUp,
  PageDown: Key.PageDown,

  // Modifiers
  ShiftLeft: Key.LeftShift,
  ShiftRight: Key.RightShift,
  ControlLeft: Key.LeftControl,
  ControlRight: Key.RightControl,
  AltLeft: Key.LeftAlt,
  AltRight: Key.RightAlt,
  MetaLeft: Key.LeftSuper,
  MetaRight: Key.RightSuper,
  CapsLock: Key.CapsLock,
  ContextMenu: Key.Menu,

  // Punctuation
  Minus: Key.Minus,
  Equal: Key.Equal,
  BracketLeft: Key.LeftBracket,
  BracketRight: Key.RightBracket,
  Backslash: Key.Backslash,
  Semicolon: Key.Semicolon,
  Quote: Key.Quote,
  Backquote: Key.Grave,
  Comma: Key.Comma,
  Period: Key.Period,
  Slash: Key.Slash,

  // Numpad operators
  NumpadAdd: Key.Add,
  NumpadSubtract: Key.Subtract,
  NumpadMultiply: Key.Multiply,
  NumpadDivide: Key.Divide,
  NumpadDecimal: Key.Decimal,
  NumLock: Key.NumLock,

  // Others
  PrintScreen: Key.Print,
  ScrollLock: Key.ScrollLock,
  Pause: Key.Pause,
});

/**
 * Returns the nut-js Key for a browser key code, or undefined
 * if the key isn't supported.
 */
function keyFromCode(code) {
  return KEY_MAP[code];
}

module.exports = { keyFromCode };