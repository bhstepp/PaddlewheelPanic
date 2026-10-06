// Level building blocks. A level can list its objects directly (like 1-1)
// or as a sequence of chunks: ["chunkName", difficulty 0..1]. Chunks are
// placed left to right; every chunk starts just after a safe ledge and ends
// on one, so any sequence is playable. The daily matinee picks chunks too.
//
// Geometry rules (keep jumps fair at top speed): ledge tops at y 520,
// gaps between ledges 100-180 px, bobbing barrels 200-220 px apart.

export const LEDGE_Y = 520;

export class Builder {
  constructor(rng, theme) {
    this.r = rng;
    this.x = 0;
    this.objects = [];
    this.decoKinds = theme?.decoKinds ?? ["lamp", "lifering", "coil"];
    this.perch = theme?.perch ?? "gull";
  }

  add(o) {
    this.objects.push(o);
    return o;
  }

  gap(w) {
    this.x += w;
  }

  // A safe ledge (dock, rock shelf, floor...) with some dressing on it.
  ledge(w, { dress = true, y = LEDGE_Y } = {}) {
    const x0 = this.x;
    this.add({ type: "dock", x: x0, y, w });
    if (dress && w >= 380) {
      const kinds = this.decoKinds;
      const k = kinds[Math.floor(this.r() * kinds.length)];
      this.add({ type: "deco", kind: k, x: x0 + 90 + Math.floor(this.r() * Math.max(1, w - 300)), y });
    }
    if (dress && this.r() < 0.45) this.add({ type: "deco", kind: this.perch, x: x0 + w - 16, y: y - 26 });
    this.x += w;
    return { x0, x1: this.x };
  }

  notesRow(x, y, w, count) {
    this.add({ type: "notes", x, y, w, h: 0, count });
  }

  notesArc(x, y, w, h, count) {
    this.add({ type: "notes", x, y, w, h, count });
  }

  crate(x, h = 80, base = LEDGE_Y, w = 80) {
    this.add({ type: "crate", x, y: base, w, h });
  }
}

const lerp = (a, b, t) => a + (b - a) * t;

// Each chunk: (builder, difficulty 0..1) => void. The builder's x is the
// end of the previous ledge on entry and must be the end of a ledge on exit.
export const CHUNKS = {
  start(b) {
    b.add({ type: "deco", kind: "stack", x: 30, y: LEDGE_Y });
    b.ledge(900, { dress: false });
    b.add({ type: "deco", kind: b.decoKinds[0], x: 300, y: LEDGE_Y });
    b.notesRow(420, 470, 300, 4);
  },

  warmup(b, d) {
    for (let i = 0; i < 2; i++) {
      const g = Math.round(lerp(100, 140, d));
      b.notesArc(b.x - 140, 440, g + 160, 90, 4);
      b.gap(g);
      b.ledge(Math.round(lerp(560, 420, d)));
    }
  },

  crateSteps(b, d) {
    b.gap(Math.round(lerp(110, 140, d)));
    const { x0 } = b.ledge(820, { dress: false });
    b.crate(x0 + 160, 70);
    b.crate(x0 + 240, 70);
    b.crate(x0 + 240, 70, LEDGE_Y - 70);
    if (d > 0.4) b.crate(x0 + 320, 70);
    b.notesArc(x0 + 120, 330, 260, 60, 4);
  },

  barrelRun(b, d) {
    const n = 3 + Math.round(d * 2);
    const first = Math.round(lerp(150, 180, d));
    const sp = Math.round(lerp(200, 222, d));
    let x = b.x + first;
    b.notesArc(b.x - 120, 430, first + 140, 110, 4);
    for (let i = 0; i < n; i++) {
      b.add({ type: "barrel", x, y: 540, bob: Math.round(lerp(10, 20, d) + (i % 2) * 4) });
      if (i < n - 1 && i % 2 === 0) b.notesArc(x + 70, 440, sp - 70, 80, 3);
      x += sp;
    }
    b.x = x - sp + 66 + Math.round(lerp(150, 170, d));
    b.ledge(460);
  },

  critterDock(b, d) {
    b.gap(Math.round(lerp(110, 140, d)));
    const { x0 } = b.ledge(d > 0.5 ? 1000 : 820);
    b.add({ type: "critter", x: x0 + 520, y: LEDGE_Y });
    b.notesArc(x0 + 440, 380, 160, 50, 3);
    if (d > 0.5) b.add({ type: "critter", x: x0 + 700, y: LEDGE_Y });
  },

  critterCrate(b, d) {
    b.gap(Math.round(lerp(110, 140, d)));
    const { x0 } = b.ledge(860);
    b.crate(x0 + 260, 80);
    b.add({ type: "critter", x: x0 + 300, y: LEDGE_Y - 80 });
    b.add({ type: "critter", x: x0 + 640, y: LEDGE_Y });
    b.notesArc(x0 + 220, 330, 200, 40, 4);
  },

  raftHop(b, d) {
    const drift = Math.round(lerp(22, 32, d));
    let x = b.x + 160;
    b.notesArc(b.x - 100, 420, 900, 120, 6);
    for (let i = 0; i < 2; i++) {
      b.add({ type: "raft", x, y: 570, w: 170, drift, phase: i * 2.1 + b.r() });
      x += 320;
    }
    b.x = x - 320 + 170 + 160;
    b.ledge(520);
  },

  crateStack(b, d) {
    b.gap(Math.round(lerp(120, 150, d)));
    const { x0 } = b.ledge(800, { dress: false });
    b.crate(x0 + 150, 80);
    b.crate(x0 + 230, 80);
    b.crate(x0 + 230, 80, LEDGE_Y - 80);
    b.crate(x0 + 310, 80);
    b.notesArc(x0 + 200, 300, 160, 30, 3);
  },

  // ---- Zone mechanics.

  // A wide gap with a hook: jump, keep holding to grab, let go to fling.
  hookSwing(b, d) {
    const x0 = b.x;
    b.add({ type: "hook", x: x0 + 140, y: 285 });
    b.notesArc(x0 + 60, 470, 300, 110, 5);
    b.gap(Math.round(lerp(330, 360, d)));
    b.ledge(560);
  },

  // Two hooks in a row: grab, fling, grab again.
  hookChain(b, d) {
    const x0 = b.x;
    b.add({ type: "hook", x: x0 + 140, y: 285 });
    b.add({ type: "hook", x: x0 + 480, y: 285 });
    b.notesArc(x0 + 220, 400, 260, 70, 4);
    b.gap(Math.round(lerp(660, 690, d)));
    b.ledge(560);
  },

  // Ledges that give way a moment after you land: keep moving.
  crumbleRun(b, d) {
    const n = 3 + Math.round(d * 2);
    b.gap(120);
    for (let i = 0; i < n; i++) {
      b.add({ type: "crumble", x: b.x, y: LEDGE_Y, w: 150 });
      b.notesArc(b.x + 100, 420, 160, 60, 2);
      b.x += 150 + Math.round(lerp(100, 125, d));
    }
    b.ledge(520);
  },

  // A springboard launches you over a tall wall of crates.
  springWall(b, d) {
    b.gap(Math.round(lerp(110, 140, d)));
    const { x0 } = b.ledge(1000, { dress: false });
    b.add({ type: "spring", x: x0 + 300, y: LEDGE_Y });
    for (let k = 0; k < 3; k++) b.crate(x0 + 470, 80, LEDGE_Y - k * 80);
    b.notesArc(x0 + 330, 240, 220, 60, 4);
  },

  // Paint-stroke steps that come and go on the beat.
  beatSteps(b, d) {
    const n = 3 + Math.round(d * 2);
    b.gap(130);
    for (let i = 0; i < n; i++) {
      b.add({ type: "beat", x: b.x, y: LEDGE_Y, w: 160, period: 4, on: 3, offset: (i * 2) % 4 });
      b.notesArc(b.x + 120, 430, 160, 70, 2);
      b.x += 160 + 140;
    }
    b.x -= 140;
    b.gap(140);
    b.ledge(520);
  },

  // Platforms riding up and down on chains.
  liftHop(b, d) {
    const n = 2 + Math.round(d);
    b.gap(150);
    for (let i = 0; i < n; i++) {
      b.add({ type: "lift", x: b.x, y: 470, w: 160, range: Math.round(lerp(50, 80, d)), speed: 1.3 + d * 0.5, phase: i * 1.7 });
      b.notesArc(b.x + 40, 380, 120, 40, 2);
      b.x += 160 + 150;
    }
    b.x -= 150;
    b.gap(150);
    b.ledge(520);
  },

  // Bounce from balloon to balloon across open water.
  balloonHop(b, d) {
    const n = 2 + Math.round(d * 2);
    b.gap(170);
    for (let i = 0; i < n; i++) {
      b.add({ type: "balloon", x: b.x, y: 440 });
      b.notesArc(b.x + 40, 300, 220, 80, 3);
      b.x += 250;
    }
    b.x += 30;
    b.ledge(560);
  },

  // A hall with floating ghosts at head height: whistle to spook them.
  ghostHall(b, d) {
    b.gap(Math.round(lerp(110, 140, d)));
    const { x0 } = b.ledge(d > 0.5 ? 1100 : 900);
    b.add({ type: "ghost", x: x0 + 450, y: 450 });
    if (d > 0.5) b.add({ type: "ghost", x: x0 + 780, y: 450, range: 60 });
    b.notesRow(x0 + 300, 470, 500, 5);
  },

  // ---- Instrument set pieces.

  drumWall(b) {
    b.gap(120);
    const { x0 } = b.ledge(1000, { dress: false });
    b.add({ type: "power", kind: "drum", x: x0 + 160, y: 470 });
    b.add({ type: "crate", x: x0 + 520, y: LEDGE_Y, w: 90, h: 90, breakable: true });
    b.add({ type: "crate", x: x0 + 520, y: LEDGE_Y - 90, w: 90, h: 70, breakable: true });
    b.add({ type: "critter", x: x0 + 820, y: LEDGE_Y });
    b.notesRow(x0 + 520, 470, 200, 3);
  },

  dashRun(b) {
    b.gap(120);
    const { x0 } = b.ledge(1200);
    b.add({ type: "power", kind: "washboard", x: x0 + 140, y: 470 });
    for (const dx of [420, 560, 700, 840]) b.add({ type: "critter", x: x0 + dx, y: LEDGE_Y });
    b.notesRow(x0 + 380, 470, 520, 6);
  },

  tromboneGap(b) {
    b.gap(120);
    const { x0, x1 } = b.ledge(600);
    b.add({ type: "power", kind: "trombone", x: x0 + 250, y: 470 });
    b.add({ type: "hint", x: x0 + 240, text: "JUMP, THEN HOLD TO GLIDE", desktop: "JUMP, THEN HOLD SPACE TO GLIDE" });
    b.notesArc(x1 - 40, 360, 420, 40, 6);
    b.gap(380);
    b.ledge(600);
  },

  tubaPickup(b) {
    b.gap(120);
    const { x0 } = b.ledge(600);
    b.add({ type: "power", kind: "tuba", x: x0 + 260, y: 470 });
  },

  // ---- Boss chase: a lever that sends cargo crashing into the Captain.
  bossSwitch(b, d) {
    b.gap(Math.round(lerp(110, 140, d)));
    const { x0 } = b.ledge(760, { dress: false });
    b.add({ type: "switch", x: x0 + 430, y: LEDGE_Y });
  },

  // ---- Film-reel hiding places (one per level).
  reelSpring(b) {
    b.gap(120);
    const { x0 } = b.ledge(1000, { dress: false });
    b.add({ type: "spring", x: x0 + 300, y: LEDGE_Y });
    for (let k = 0; k < 3; k++) b.crate(x0 + 470, 80, LEDGE_Y - k * 80);
    b.add({ type: "reel", x: x0 + 470, y: 150 });
  },

  reelHook(b) {
    const x0 = b.x;
    b.add({ type: "hook", x: x0 + 140, y: 285 });
    b.add({ type: "reel", x: x0 + 345, y: 330 });
    b.gap(340);
    b.ledge(600);
  },

  reelBounce(b) {
    b.gap(120);
    const { x0 } = b.ledge(900);
    b.add({ type: "critter", x: x0 + 360, y: LEDGE_Y });
    b.add({ type: "reel", x: x0 + 470, y: 250 });
  },

  hint(b, d, o) {
    b.add({ type: "hint", x: b.x - 400, text: o.text, desktop: o.desktop ?? o.text });
  },

  landing(b) {
    b.gap(160);
    const x0 = b.x;
    b.add({ type: "dock", x: x0, y: LEDGE_Y, w: 1800, landing: true });
    b.x += 1800;
    b.landing = x0 + 1000;
    b.add({ type: "deco", kind: "stack", x: x0 + 120, y: LEDGE_Y });
    b.add({ type: "deco", kind: b.decoKinds[0], x: x0 + 400, y: LEDGE_Y });
    b.add({ type: "deco", kind: "shed", x: x0 + 1120, y: LEDGE_Y });
    b.add({ type: "deco", kind: "stack", x: x0 + 1500, y: LEDGE_Y, flip: true });
    b.add({ type: "deco", kind: b.perch, x: x0 + 1580, y: LEDGE_Y });
    b.notesArc(x0 - 330, 400, 600, 110, 6);
  },
};

// Expand a chunk list into plain level objects.
export function buildFromChunks(list, rng, theme) {
  const b = new Builder(rng, theme);
  for (const [name, d = 0.5, o = {}] of list) {
    const fn = CHUNKS[name];
    if (!fn) throw new Error(`Unknown chunk "${name}"`);
    fn(b, d, o);
  }
  if (!b.landing) CHUNKS.landing(b);
  return { objects: b.objects, landingX: b.landing };
}
