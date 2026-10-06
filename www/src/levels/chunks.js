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
  for (const [name, d = 0.5] of list) {
    const fn = CHUNKS[name];
    if (!fn) throw new Error(`Unknown chunk "${name}"`);
    fn(b, d);
  }
  if (!b.landing) CHUNKS.landing(b);
  return { objects: b.objects, landingX: b.landing };
}
