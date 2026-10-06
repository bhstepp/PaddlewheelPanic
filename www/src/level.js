// Loads level data (hand-placed objects or a chunk list) and spawns entities.
import { Dock } from "./entities/dock.js";
import { Crate } from "./entities/crate.js";
import { Barrel } from "./entities/barrel.js";
import { Raft } from "./entities/raft.js";
import { Critter } from "./entities/critter.js";
import { Note } from "./entities/note.js";
import { Deco } from "./entities/deco.js";
import { Spring, Crumble, BeatPlatform, Lift, Balloon, Hook, Power, Reel, Switch, Ghost } from "./entities/mechanics.js";
import { buildFromChunks } from "./levels/chunks.js";
import { rng } from "./art/ink.js";

const PLATFORMS = { dock: Dock, crate: Crate, barrel: Barrel, raft: Raft, spring: Spring, crumble: Crumble, beat: BeatPlatform, lift: Lift, balloon: Balloon };
const PX_PER_FT = 12;

// Turn a level definition into plain objects plus the landing x.
export function expandLevel(def, theme, opts = {}) {
  if (def.chunks) {
    const { objects, landingX } = buildFromChunks(def.chunks, rng(def.seed ?? 1), theme, opts);
    return { objects, landingX };
  }
  return { objects: def.objects, landingX: def.landing.x };
}

export function loadLevel(def, theme, opts = {}) {
  const { objects, landingX } = expandLevel(def, theme, opts);
  const level = {
    id: def.id,
    name: def.name,
    boss: !!def.boss,
    landing: { x: landingX },
    pxPerFt: PX_PER_FT,
    lengthFt: Math.round(landingX / PX_PER_FT),
    platforms: [],
    critters: [],
    notes: [],
    hints: [],
    decos: [],
    hooks: [],
    powers: [],
    reels: [],
    switches: [],
  };
  for (const o of objects) {
    if (PLATFORMS[o.type]) {
      level.platforms.push(new PLATFORMS[o.type](o));
    } else if (o.type === "critter") {
      level.critters.push(new Critter(o));
    } else if (o.type === "ghost") {
      level.critters.push(new Ghost(o));
    } else if (o.type === "hook") {
      level.hooks.push(new Hook(o));
    } else if (o.type === "power") {
      level.powers.push(new Power(o));
    } else if (o.type === "reel") {
      level.reels.push(new Reel(o));
    } else if (o.type === "switch") {
      level.switches.push(new Switch(o));
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
  const order = { dock: 0, crumble: 0, lift: 1, raft: 1, beat: 1, barrel: 2, crate: 3, spring: 4, balloon: 4 };
  level.platforms.sort((a, b) => (order[a.type] ?? 4) - (order[b.type] ?? 4));
  return level;
}
