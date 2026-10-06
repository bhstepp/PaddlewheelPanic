// Web vs native adapter. Game code never calls browser-only or
// Capacitor-only APIs directly; everything platform-specific goes here.

function readJSON(key) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJSON(key, value) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be unavailable or full (private mode); the game still runs.
  }
}

export const platform = {
  isNative: false, // true when running inside Capacitor

  // "light" | "medium" | "heavy" | "success" | "error". No-op on the web
  // (iPhone Safari has no vibration); the native build wires in haptics.
  haptic(kind) {},

  // Generic persisted values (localStorage on web, Preferences natively).
  async save(key, data) {
    writeJSON(`pwp.${key}`, data);
  },

  async load(key) {
    return readJSON(`pwp.${key}`);
  },

  // Kept for the spec's adapter shape: the demo's single best result.
  async saveBest(data) {
    writeJSON("pwp.best.v1", data);
  },

  async loadBest() {
    return readJSON("pwp.best.v1");
  },

  // No-op on the web; Game Center later. score = { board, value, ... }
  submitScore(score) {},
};
