// Loads level data and spawns entities.
import { Dock } from "./entities/dock.js";
import { Crate } from "./entities/crate.js";
import { Barrel } from "./entities/barrel.js";
import { Raft } from "./entities/raft.js";
import { Critter } from "./entities/critter.js";
import { Note } from "./entities/note.js";
import { Deco } from "./entities/deco.js";

const PLATFORMS = { dock: Dock, crate: Crate, barrel: Barrel, raft: Raft };

export function loadLevel(data) {
  const level = {
    name: data.name,
    bpm: data.bpm,
    landing: data.landing,
    pxPerFt: data.landing.x / data.lengthFt,
    platforms: [],
    critters: [],
    decos: [],
    notes: [],
    hints: [],
  };
  for (const o of data.objects) {
    if (PLATFORMS[o.type]) {
      level.platforms.push(new PLATFORMS[o.type](o));
    } else if (o.type === "critter") {
      level.critters.push(new Critter(o));
    } else if (o.type === "deco") {
      level.decos.push(new Deco(o));
    } else if (o.type === "note") {
      level.notes.push(new Note(o));
    } else if (o.type === "notes") {
      // A row or an arc of notes (h is the arc height above y).
      const n = o.count ?? 3;
      for (let i = 0; i < n; i++) {
        const u = n === 1 ? 0.5 : i / (n - 1);
        level.notes.push(new Note({ x: o.x + u * o.w, y: o.y - (o.h ?? 0) * 4 * u * (1 - u) }));
      }
    } else if (o.type === "hint") {
      level.hints.push({ x: o.x, text: o.text, desktop: o.desktop ?? o.text, shown: false });
    }
  }
  // Draw order: docks behind crates; moving things on top.
  const order = { dock: 0, raft: 1, barrel: 2, crate: 3 };
  level.platforms.sort((a, b) => order[a.type] - order[b.type]);
  return level;
}
