// Best result and settings, persisted through the platform adapter.
import { platform } from "./platform.js";

let best = null;
let settings = { muted: false };

export async function initStorage() {
  best = (await platform.loadBest()) ?? null;
  settings = { ...settings, ...((await platform.loadSettings()) ?? {}) };
}

export function getBest() {
  return best;
}

// result = { stars, notes, totalNotes, timeSec }
// Better means more stars, then more notes, then a faster time.
export function recordResult(result) {
  const better =
    !best ||
    result.stars > best.stars ||
    (result.stars === best.stars && result.notes > best.notes) ||
    (result.stars === best.stars && result.notes === best.notes && result.timeSec < best.timeSec);
  if (better) {
    best = { ...result };
    platform.saveBest(best);
  }
  return better;
}

export function getSettings() {
  return settings;
}

export function setSetting(key, value) {
  settings = { ...settings, [key]: value };
  platform.saveSettings(settings);
}
