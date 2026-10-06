// The daily matinee: a fresh course every day, built from today's date so
// everyone gets the same one. It plays in one of the zones you have reached,
// uses only that zone's (and earlier zones') mechanics, and races you
// against your own best run of the day.
import { ZONES } from "../zones/index.js";
import { rng } from "../art/ink.js";
import { isUnlocked } from "./map.js";

// Chunks each zone can draw from. River pieces (barrels, rafts) only float
// on the river; later zones add their own mechanics to the shared pool.
const SHARED = ["warmup", "crateSteps", "critterDock", "critterCrate", "crateStack"];
const POOLS = [
  [...SHARED, "barrelRun", "barrelRun", "raftHop", "raftHop", "tubaPickup"],
  [...SHARED, "hookSwing", "hookChain", "crumbleRun", "liftHop", "drumWall"],
  [...SHARED, "hookSwing", "hookChain", "crumbleRun", "liftHop", "ghostHall", "ghostHall", "tromboneGap", "tubaPickup"],
  [...SHARED, "hookSwing", "crumbleRun", "liftHop", "ghostHall", "beatSteps", "beatSteps", "springWall", "dashRun", "tromboneGap"],
  [...SHARED, "hookChain", "crumbleRun", "liftHop", "ghostHall", "beatSteps", "springWall", "balloonHop", "balloonHop", "dashRun", "drumWall"],
];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export function todayKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

// Build today's course: { def, zone }.
export function dailyCourse(key = todayKey(), unlockedZones = null) {
  const open = unlockedZones ?? ZONES.map((z, i) => i).filter((i) => isUnlocked(ZONES[i].levels[0]));
  const seed = hash(`matinee:${key}`);
  const r = rng(seed);
  const zi = open[Math.floor(r() * open.length)] ?? 0;
  const pool = POOLS[zi];
  const chunks = [["start"], ["warmup", 0.3]];
  let lastName = "warmup";
  for (let i = 0; i < 9; i++) {
    let name;
    do name = pool[Math.floor(r() * pool.length)];
    while (name === lastName);
    lastName = name;
    const d = Math.round((0.3 + (i / 8) * 0.5 + r() * 0.15) * 100) / 100;
    chunks.push([name, Math.min(0.95, d)]);
  }
  const [y, m, dd] = key.split("-").map(Number);
  const day = new Date(y, m - 1, dd);
  return {
    zone: ZONES[zi],
    date: `${WEEKDAYS[day.getDay()].toUpperCase()}, ${MONTHS[m - 1]} ${dd}`,
    def: { id: "daily", name: `The ${WEEKDAYS[day.getDay()]} Matinee`, seed: seed % 100000, chunks },
  };
}

export function registerDaily(extras) {
  const { app } = extras;
  const { store } = app;

  function bestRecord(key) {
    const rec = store.dailyRecord(key);
    return rec ? { done: rec.won, stars: rec.stars ?? 0, notes: rec.notes, timeSec: rec.timeSec } : null;
  }

  extras.register("daily", {
    async open() {
      const key = todayKey();
      const { def, zone, date } = dailyCourse(key);
      const opts = {
        def,
        zone,
        mode: "daily",
        kicker: `DAILY MATINEE  ·  ${date}`,
        blurb: `Today's show plays in ${zone.name}. Same course for everyone.`,
        record: bestRecord(key),
        onBack: () => app.openMap(),
        onFinish(r) {
          r.daily = true;
          const better = r.won && store.recordDaily(key, { notes: r.notes, timeSec: r.timeSec, won: r.won, stars: r.stars });
          if (better && r.ghost) {
            store.saveGhost(`daily.${key}`, r.ghost);
            opts.ghost = r.ghost;
          }
          if (r.won) app.platform.submitScore({ board: `daily.${key}`, value: r.notes, timeSec: r.timeSec, stars: r.stars });
          opts.record = bestRecord(key);
          opts.lines = linesFor(opts.record);
          return better;
        },
      };
      opts.lines = linesFor(opts.record);
      opts.ghost = await store.loadGhost(`daily.${key}`);
      app.openLevel("daily", opts);
    },
  });
}

function linesFor(rec) {
  if (!rec) return ["A NEW SHOW EVERY DAY", "BEAT IT ONCE AND RACE YOUR OWN GHOST"];
  return [`TODAY'S BEST  ·  ${rec.notes} NOTES  ·  ${rec.timeSec.toFixed(1)} S`, "YOUR BEST RUN RACES ALONG AS A GHOST"];
}
