// Web vs native adapter. Game code never calls browser-only or
// Capacitor-only APIs directly; everything platform-specific goes here.

const BEST_KEY = "pwp.best.v1";
const SETTINGS_KEY = "pwp.settings.v1";

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
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be unavailable (private mode); the game still runs.
  }
}

export const platform = {
  isNative: false, // true when running inside Capacitor

  // "light" | "medium" | "heavy" | "success" | "error". No-op on the web
  // (iPhone Safari has no vibration); the native build wires in haptics.
  haptic(kind) {},

  async saveBest(data) {
    writeJSON(BEST_KEY, data);
  },

  async loadBest() {
    return readJSON(BEST_KEY);
  },

  async saveSettings(data) {
    writeJSON(SETTINGS_KEY, data);
  },

  async loadSettings() {
    return readJSON(SETTINGS_KEY);
  },

  // No-op on the web; Game Center later.
  submitScore(score) {},
};
