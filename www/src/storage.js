// Saved progress: per-level bests and film reels, daily matinee results,
// ghost replays and settings, all persisted through the platform adapter.
import { platform } from "./platform.js";

const PROGRESS = "progress.v2";
const SETTINGS = "settings.v1";

let progress = { levels: {}, daily: {} };
let settings = { muted: false, filter: "standard", sfx: true };

export async function initStorage() {
  progress = { ...progress, ...((await platform.load(PROGRESS)) ?? {}) };
  settings = { ...settings, ...((await platform.load(SETTINGS)) ?? {}) };
  // Carry the original demo's best result over to the first level.
  if (!progress.levels["1-1"]) {
    const old = await platform.loadBest();
    if (old && old.stars) progress.levels["1-1"] = { done: true, stars: old.stars, notes: old.notes, timeSec: old.timeSec, reel: false };
  }
}

function persist() {
  platform.save(PROGRESS, progress);
}

export function levelRecord(id) {
  return progress.levels[id] ?? null;
}

export function isDone(id) {
  return !!progress.levels[id]?.done;
}

// result = { won, stars, notes, timeSec, reel }
// Returns true when this run set a new best for the level.
export function recordLevel(id, result) {
  const prev = progress.levels[id];
  const rec = prev ? { ...prev } : { done: false, stars: 0, notes: 0, timeSec: 0, reel: false };
  if (result.reel) rec.reel = true;
  let better = false;
  if (result.won) {
    better =
      !prev?.done ||
      result.stars > rec.stars ||
      (result.stars === rec.stars && result.notes > rec.notes) ||
      (result.stars === rec.stars && result.notes === rec.notes && result.timeSec < rec.timeSec);
    rec.done = true;
    if (better) Object.assign(rec, { stars: result.stars, notes: result.notes, timeSec: result.timeSec });
  }
  progress.levels[id] = rec;
  persist();
  return better;
}

export function totalStars() {
  return Object.values(progress.levels).reduce((a, r) => a + (r.stars || 0), 0);
}

export function totalReels() {
  return Object.values(progress.levels).filter((r) => r.reel).length;
}

export function hasReel(id) {
  return !!progress.levels[id]?.reel;
}

// Daily matinee: one best score per calendar day.
export function dailyRecord(date) {
  return progress.daily[date] ?? null;
}

export function recordDaily(date, score) {
  const prev = progress.daily[date];
  const better = !prev || score.notes > prev.notes || (score.notes === prev.notes && score.timeSec < prev.timeSec);
  if (better) {
    // Keep only the last two weeks of daily results.
    const keys = Object.keys(progress.daily).sort();
    while (keys.length > 14) delete progress.daily[keys.shift()];
    progress.daily[date] = { notes: score.notes, timeSec: score.timeSec, won: score.won };
    persist();
  }
  return better;
}

// Ghost replays are stored separately so progress writes stay small.
export async function loadGhost(key) {
  return platform.load(`ghost.${key}`);
}

export function saveGhost(key, ghost) {
  platform.save(`ghost.${key}`, ghost);
}

export function getSettings() {
  return settings;
}

export function setSetting(key, value) {
  settings = { ...settings, [key]: value };
  platform.save(SETTINGS, settings);
}
