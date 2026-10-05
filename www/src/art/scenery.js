// Parallax scenery, back to front: sky, sun, clouds, far hills and river town,
// the levee bank, the river; then (after the gameplay layer) foreground water
// and reeds. Every layer is painted once by hand-inked routines into an
// offscreen canvas and tiled as the camera moves.
import { PALETTE as C } from "./palette.js";
import { CONFIG } from "../config.js";
import { TAU, rng, makeLayer, layerRes, pen, brush, hatch, foliage, smoothPath } from "./ink.js";

const W = CONFIG.width;
const H = CONFIG.height;
const WATER = CONFIG.waterY;

const FAR_W = 2560;
const FAR_TOP = 290;
const MID_W = 3200;
const MID_TOP = 100;
const FRONT_W = 2600;
const FRONT_TOP = 600;
const WATER_W = 1600;

let L = null;

function paintAll() {
  const res = layerRes();
  L = {
    sky: paintSky(res),
    sun: paintSun(res),
    clouds: [0, 1, 2].map((i) => paintCloud(res, 101 + i)),
    far: paintFar(res),
    mid: paintMid(res),
    water: paintWater(res),
    front: paintFront(res),
  };
}

// ---------------------------------------------------------------- sky

function paintSky(res) {
  const lay = makeLayer(W, WATER, res);
  const { ctx } = lay;
  const r = rng(7);
  const g = ctx.createLinearGradient(0, 0, 0, WATER);
  g.addColorStop(0, C.silver);
  g.addColorStop(0.75, C.paper);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, WATER);
  // Long, loose horizontal pen strokes, denser toward the top like a hand-inked sky.
  for (let y = 8; y < 260; y += 7 + y * 0.06) {
    let x = r.range(-40, 40);
    while (x < W) {
      const len = r.range(80, 260);
      if (r() < 0.75 - y / 420) {
        ctx.globalAlpha = 0.35 + (1 - y / 260) * 0.35;
        pen(ctx, [[x, y], [x + len * 0.5, y + r.range(-1.5, 1.5)], [x + len, y + r.range(-1, 1)]], r, { w: 1, color: C.ash, amp: 0.6 });
      }
      x += len + r.range(20, 90);
    }
  }
  ctx.globalAlpha = 1;
  return lay;
}

function paintSun(res) {
  const lay = makeLayer(280, 280, res);
  const { ctx } = lay;
  const r = rng(11);
  ctx.translate(140, 140);
  // Wavy brush rays.
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU;
    const long = i % 2 === 0 ? 132 : 108;
    const pts = [];
    for (let k = 0; k <= 6; k++) {
      const d = 70 + ((long - 70) * k) / 6;
      const wob = Math.sin(k * 0.9) * 3;
      pts.push([Math.cos(a) * d - Math.sin(a) * wob, Math.sin(a) * d + Math.cos(a) * wob]);
    }
    brush(ctx, pts, r, { w: i % 2 === 0 ? 9 : 6, color: C.ash, amp: 0.3 });
  }
  ctx.beginPath();
  ctx.arc(0, 0, 62, 0, TAU);
  ctx.fillStyle = C.paper;
  ctx.fill();
  // Soft shading crescent.
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, 62, 0, TAU);
  ctx.clip();
  ctx.beginPath();
  ctx.arc(-18, -18, 64, 0, TAU);
  ctx.rect(-80, -80, 160, 160);
  ctx.clip("evenodd");
  hatch(ctx, -70, -70, 140, 140, r, { gap: 4, lw: 1, color: C.silver, angle: -0.7 });
  ctx.restore();
  pen(ctx, circlePts(0, 0, 62, 40), r, { w: 3, color: C.ash, amp: 1.2 });
  return lay;
}

function circlePts(cx, cy, rad, n) {
  const pts = [];
  for (let i = 0; i <= n; i++) pts.push([cx + Math.cos((i / n) * TAU) * rad, cy + Math.sin((i / n) * TAU) * rad]);
  return pts;
}

function paintCloud(res, seed) {
  const lay = makeLayer(420, 190, res);
  const { ctx } = lay;
  const r = rng(seed);
  const lobes = [];
  const n = 7 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    const rad = 30 + Math.sin(u * Math.PI) * 32 + r() * 10;
    lobes.push([50 + u * 320, 120 - Math.sin(u * Math.PI) * 30 - r() * 14, rad]);
  }
  lobes.push([130, 135, 34], [260, 138, 36]);
  const path = new Path2D();
  for (const [x, y, rad] of lobes) {
    path.moveTo(x + rad, y);
    path.arc(x, y, rad, 0, TAU);
  }
  ctx.save();
  ctx.lineWidth = 6;
  ctx.strokeStyle = C.ash;
  ctx.stroke(path);
  ctx.fillStyle = C.paper;
  ctx.fill(path);
  // Hatched belly.
  ctx.clip(path);
  ctx.beginPath();
  ctx.ellipse(210, 175, 220, 45, 0, 0, TAU);
  ctx.clip();
  hatch(ctx, 0, 100, 420, 90, r, { gap: 4, lw: 1.1, color: C.silver, angle: -0.35 });
  ctx.restore();
  // A few inner curl lines.
  for (let i = 0; i < 4; i++) {
    const [x, y, rad] = lobes[1 + Math.floor(r() * (n - 2))];
    ctx.strokeStyle = C.silver;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y + 6, rad * 0.6, 3.6, 5.2);
    ctx.stroke();
  }
  return lay;
}

// ---------------------------------------------------------------- far hills and town

function periodic(x, period, terms) {
  let y = 0;
  for (const [amp, k, ph] of terms) y += amp * Math.sin((x / period) * TAU * k + ph);
  return y;
}

function paintFar(res) {
  const lay = makeLayer(FAR_W, WATER - FAR_TOP + 10, res);
  const { ctx } = lay;
  const r = rng(23);
  const h1 = (x) => 62 + periodic(x, FAR_W, [[34, 2, 0.3], [20, 5, 1.1], [8, 11, 2.2]]);
  const h2 = (x) => 122 + periodic(x, FAR_W, [[22, 3, 2.1], [12, 7, 0.4], [5, 13, 1.7]]);

  // Back ridge.
  const ridge = (fn, fill, line, shade, seed) => {
    const rr = rng(seed);
    const pts = [];
    for (let x = 0; x <= FAR_W; x += 16) pts.push([x, fn(x)]);
    const p = new Path2D();
    p.moveTo(0, lay.h);
    for (const [x, y] of pts) p.lineTo(x, y);
    p.lineTo(FAR_W, lay.h);
    p.closePath();
    ctx.fillStyle = fill;
    ctx.fill(p);
    ctx.save();
    ctx.clip(p);
    // Contour hatching following the slopes.
    for (let i = 0; i < 160; i++) {
      const x = rr() * FAR_W;
      const y = fn(x) + 6 + rr() * 40;
      const len = rr.range(14, 36);
      const slope = (fn(x + 4) - fn(x - 4)) / 8;
      ctx.strokeStyle = shade;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + len, y + slope * len + rr.range(-1, 1));
      ctx.stroke();
    }
    ctx.restore();
    pen(ctx, pts, rr, { w: 2, color: line, amp: 0.8 });
  };
  ridge(h1, C.silver, C.ash, C.ash, 31);

  // Little river town on the far ridge.
  drawTown(ctx, 520, h2, r);
  drawWindmill(ctx, 1880, h2(1880) + 4, r);
  drawWaterTower(ctx, 1500, h2(1500) + 6, r);

  ridge(h2, C.silver, C.slate, C.ash, 37);
  // Rows of distant trees along the ridge line.
  for (let x = 20; x < FAR_W - 20; x += r.range(14, 30)) {
    if ((x > 470 && x < 1160) || (x > 1440 && x < 1560) || (x > 1830 && x < 1940)) continue;
    const y = h2(x);
    const s = r.range(6, 11);
    ctx.fillStyle = C.ash;
    ctx.beginPath();
    ctx.ellipse(x, y - s * 0.6, s * 0.8, s, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = C.slate;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  return lay;
}

function house(ctx, x, base, w, h, roof, r, opts = {}) {
  const y = base - h;
  ctx.fillStyle = opts.fill ?? C.paper;
  ctx.fillRect(x, y, w, h);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x + w * 0.55, y, w * 0.45, h);
  ctx.clip();
  hatch(ctx, x, y, w, h, r, { gap: 3, lw: 0.8, color: C.ash, angle: 1.2 });
  ctx.restore();
  // Gable roof.
  ctx.beginPath();
  ctx.moveTo(x - 4, y);
  ctx.lineTo(x + w / 2, y - roof);
  ctx.lineTo(x + w + 4, y);
  ctx.closePath();
  ctx.fillStyle = C.ash;
  ctx.fill();
  ctx.strokeStyle = C.slate;
  ctx.lineWidth = 1.3;
  ctx.stroke();
  pen(ctx, [[x, base], [x, y], [x + w, y], [x + w, base]], r, { w: 1.3, color: C.slate, amp: 0.5 });
  // Windows.
  ctx.fillStyle = C.slate;
  const cols = Math.max(1, Math.floor(w / 12));
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < Math.max(1, Math.floor(h / 16)); j++) {
      ctx.fillRect(x + 4 + i * ((w - 8) / cols), y + 5 + j * 14, 4, 6);
    }
  }
}

function drawTown(ctx, x0, ground, r) {
  const items = [
    [0, 40, 30, 14], [46, 30, 22, 12], [84, 54, 40, 18], [146, 34, 26, 12],
    [300, 46, 34, 16], [356, 60, 46, 18], [420, 32, 24, 12], [470, 44, 32, 14], [530, 38, 28, 14],
  ];
  // Church with a tall steeple.
  const cx = x0 + 210;
  const cb = ground(cx) + 8;
  house(ctx, cx, cb, 40, 40, 22, r);
  ctx.fillStyle = C.paper;
  ctx.fillRect(cx + 12, cb - 86, 16, 46);
  ctx.strokeStyle = C.slate;
  ctx.lineWidth = 1.3;
  ctx.strokeRect(cx + 12, cb - 86, 16, 46);
  ctx.beginPath();
  ctx.moveTo(cx + 10, cb - 86);
  ctx.lineTo(cx + 20, cb - 126);
  ctx.lineTo(cx + 30, cb - 86);
  ctx.closePath();
  ctx.fillStyle = C.ash;
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx + 20, cb - 74, 4, 0, TAU);
  ctx.stroke();
  for (const [dx, w, h, roof] of items) {
    const x = x0 + dx;
    house(ctx, x, ground(x + w / 2) + 10, w, h, roof, r, { fill: r() < 0.5 ? C.paper : C.silver });
  }
  // Mill chimney with a curl of smoke.
  const mx = x0 + 600;
  const mb = ground(mx) + 10;
  house(ctx, mx, mb, 70, 34, 10, r, { fill: C.silver });
  ctx.fillStyle = C.ash;
  ctx.fillRect(mx + 50, mb - 92, 10, 60);
  ctx.strokeStyle = C.slate;
  ctx.strokeRect(mx + 50, mb - 92, 10, 60);
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(mx + 52 - i * 14, mb - 102 - i * 9, 7 + i * 3, 0, TAU);
    ctx.fillStyle = C.paper;
    ctx.fill();
    ctx.strokeStyle = C.ash;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
}

function drawWindmill(ctx, x, base, r) {
  ctx.fillStyle = C.paper;
  ctx.beginPath();
  ctx.moveTo(x - 12, base);
  ctx.lineTo(x - 6, base - 60);
  ctx.lineTo(x + 6, base - 60);
  ctx.lineTo(x + 12, base);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = C.slate;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  for (let i = 0; i < 4; i++) {
    const a = i * (TAU / 4) + 0.4;
    ctx.save();
    ctx.translate(x, base - 60);
    ctx.rotate(a);
    ctx.fillStyle = C.silver;
    ctx.fillRect(2, -4, 34, 8);
    ctx.strokeRect(2, -4, 34, 8);
    ctx.restore();
  }
  ctx.beginPath();
  ctx.arc(x, base - 60, 3, 0, TAU);
  ctx.fillStyle = C.slate;
  ctx.fill();
}

function drawWaterTower(ctx, x, base, r) {
  ctx.strokeStyle = C.slate;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - 14, base);
  ctx.lineTo(x - 10, base - 50);
  ctx.moveTo(x + 14, base);
  ctx.lineTo(x + 10, base - 50);
  ctx.moveTo(x - 13, base - 10);
  ctx.lineTo(x + 11, base - 40);
  ctx.moveTo(x + 13, base - 10);
  ctx.lineTo(x - 11, base - 40);
  ctx.stroke();
  ctx.fillStyle = C.paper;
  ctx.fillRect(x - 18, base - 78, 36, 28);
  ctx.strokeRect(x - 18, base - 78, 36, 28);
  ctx.beginPath();
  ctx.moveTo(x - 20, base - 78);
  ctx.lineTo(x, base - 92);
  ctx.lineTo(x + 20, base - 78);
  ctx.closePath();
  ctx.fillStyle = C.ash;
  ctx.fill();
  ctx.stroke();
}

// ---------------------------------------------------------------- levee bank

function paintMid(res) {
  const lay = makeLayer(MID_W, WATER - MID_TOP + 14, res);
  const { ctx } = lay;
  const r = rng(57);
  const top = (x) => 372 + periodic(x, MID_W, [[6, 3, 0.4], [4, 8, 1.3], [2, 17, 0.2]]);

  // Trees behind the levee crest.
  const treeXs = [];
  for (let x = 120; x < MID_W - 140; x += r.range(250, 420)) treeXs.push(x);
  for (const x of treeXs) drawOak(ctx, x, top(x) + 4, r, r.range(0.75, 1.15));

  // Levee face.
  const face = new Path2D();
  face.moveTo(0, lay.h);
  const pts = [];
  for (let x = 0; x <= MID_W; x += 12) pts.push([x, top(x)]);
  for (const [x, y] of pts) face.lineTo(x, y);
  face.lineTo(MID_W, lay.h);
  face.closePath();
  ctx.fillStyle = C.ash;
  ctx.fill(face);
  ctx.save();
  ctx.clip(face);
  // Grassy strokes down the slope, sparse near the crest.
  for (let i = 0; i < 1300; i++) {
    const x = r() * MID_W;
    const y = top(x) + 8 + r() ** 0.7 * 60;
    ctx.strokeStyle = r() < 0.6 ? C.slate : C.silver;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + r.range(-2, 3), y - r.range(3, 7));
    ctx.stroke();
  }
  // Muddy waterline band.
  ctx.fillStyle = C.slate;
  ctx.fillRect(0, lay.h - 30, MID_W, 30);
  hatch(ctx, 0, lay.h - 40, MID_W, 40, r, { gap: 4, lw: 1, color: C.charcoal, angle: -0.15, density: 0.7 });
  ctx.restore();
  pen(ctx, pts, r, { w: 2.5, color: C.charcoal, amp: 1 });
  // Grass tufts on the crest.
  for (let x = 6; x < MID_W; x += r.range(10, 26)) {
    const y = top(x) + 1;
    for (let k = 0; k < 3; k++) brush(ctx, [[x + k * 3, y], [x + k * 3 + r.range(-3, 4), y - r.range(6, 12)]], r, { w: 2, color: C.charcoal });
  }

  // Props along the levee.
  let px = 260;
  const props = [drawCabin, drawBales, drawFence, drawLamp, drawCabin, drawBarrels, drawFence, drawBales, drawLamp];
  let pi = 0;
  while (px < MID_W - 260) {
    props[pi % props.length](ctx, px, top(px) + 4, r);
    pi++;
    px += r.range(300, 460);
  }

  // Reeds at the water's edge.
  for (let x = 10; x < MID_W - 10; x += r.range(40, 120)) reedClump(ctx, x, lay.h - 6, r, 0.7, C.charcoal);
  return lay;
}

function drawOak(ctx, x, base, r, s) {
  // Trunk: a tapered, slightly twisted brush shape with bark lines.
  const h = 150 * s;
  const lean = r.range(-14, 14) * s;
  const trunk = new Path2D();
  trunk.moveTo(x - 14 * s, base);
  trunk.bezierCurveTo(x - 10 * s, base - h * 0.4, x - 8 * s + lean, base - h * 0.7, x - 5 * s + lean, base - h);
  trunk.lineTo(x + 6 * s + lean, base - h);
  trunk.bezierCurveTo(x + 9 * s + lean, base - h * 0.7, x + 10 * s, base - h * 0.4, x + 16 * s, base);
  trunk.closePath();
  ctx.fillStyle = C.slate;
  ctx.fill(trunk);
  ctx.save();
  ctx.clip(trunk);
  hatch(ctx, x - 20 * s, base - h, 40 * s + Math.abs(lean), h, r, { gap: 3, lw: 1, color: C.charcoal, angle: 1.45 });
  ctx.restore();
  ctx.strokeStyle = C.charcoal;
  ctx.lineWidth = 2;
  ctx.stroke(trunk);
  // Branches.
  for (let i = 0; i < 4; i++) {
    const by = base - h * r.range(0.55, 0.9);
    const dir = i % 2 === 0 ? -1 : 1;
    brush(ctx, [[x + lean * 0.6, by], [x + lean * 0.6 + dir * 26 * s, by - 20 * s], [x + lean + dir * 52 * s, by - 46 * s]], r, { w: 7 * s, color: C.charcoal, taper: 0.8 });
  }
  // Foliage crown made of several scribbled clumps.
  const cy = base - h - 30 * s;
  const clumps = [
    [0, 0, 70, 46], [-62, 22, 50, 36], [62, 20, 52, 36], [-30, -34, 48, 34], [34, -30, 46, 32], [0, 34, 56, 30],
  ];
  for (const [dx, dy, rx, ry] of clumps) {
    foliage(ctx, x + lean + dx * s, cy + dy * s, rx * s, ry * s, r, { fill: C.silver, dark: C.ash, line: C.slate, lw: 1.5 });
  }
  // Hanging moss.
  ctx.strokeStyle = C.ash;
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 9; i++) {
    const mx = x + lean + r.range(-80, 80) * s;
    const my = cy + r.range(20, 50) * s;
    const len = r.range(20, 50) * s;
    ctx.beginPath();
    ctx.moveTo(mx, my);
    ctx.bezierCurveTo(mx + 4, my + len * 0.3, mx - 4, my + len * 0.7, mx + r.range(-3, 3), my + len);
    ctx.stroke();
  }
}

function drawCabin(ctx, x, base, r) {
  const w = 120;
  const h = 64;
  const y = base - h - 18;
  // Stilts.
  ctx.fillStyle = C.charcoal;
  for (const sx of [x + 6, x + 40, x + 80, x + w - 12]) ctx.fillRect(sx, y + h, 6, 24);
  // Board walls with vertical planks.
  ctx.fillStyle = C.silver;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = C.ash;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let px = x + 9; px < x + w; px += 9) {
    ctx.moveTo(px + r.range(-0.5, 0.5), y + 2);
    ctx.lineTo(px + r.range(-0.5, 0.5), y + h);
  }
  ctx.stroke();
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  hatch(ctx, x, y, w, 18, r, { gap: 3, lw: 0.9, color: C.slate, angle: 0.15 });
  ctx.restore();
  // Door and a shuttered window.
  ctx.fillStyle = C.charcoal;
  ctx.fillRect(x + 20, y + 22, 22, h - 22);
  ctx.fillStyle = C.paper;
  ctx.fillRect(x + 70, y + 20, 26, 20);
  ctx.strokeStyle = C.charcoal;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x + 70, y + 20, 26, 20);
  ctx.beginPath();
  ctx.moveTo(x + 83, y + 20);
  ctx.lineTo(x + 83, y + 40);
  ctx.moveTo(x + 70, y + 30);
  ctx.lineTo(x + 96, y + 30);
  ctx.stroke();
  ctx.fillStyle = C.slate;
  ctx.fillRect(x + 62, y + 18, 7, 24);
  ctx.fillRect(x + 97, y + 18, 7, 24);
  pen(ctx, [[x, y + h], [x, y], [x + w, y], [x + w, y + h], [x, y + h]], r, { w: 2, color: C.charcoal, amp: 0.8 });
  // Tin roof with ridges and a stovepipe.
  const roof = new Path2D();
  roof.moveTo(x - 12, y + 4);
  roof.lineTo(x + 18, y - 34);
  roof.lineTo(x + w - 10, y - 34);
  roof.lineTo(x + w + 14, y + 4);
  roof.closePath();
  ctx.fillStyle = C.ash;
  ctx.fill(roof);
  ctx.save();
  ctx.clip(roof);
  ctx.strokeStyle = C.slate;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let rx = x - 20; rx < x + w + 30; rx += 7) {
    ctx.moveTo(rx, y + 6);
    ctx.lineTo(rx + 10, y - 36);
  }
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = C.charcoal;
  ctx.lineWidth = 2;
  ctx.stroke(roof);
  ctx.fillStyle = C.charcoal;
  ctx.fillRect(x + w - 34, y - 54, 8, 26);
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(x + w - 30 - i * 9, y - 62 - i * 9, 5 + i * 2.5, 0, TAU);
    ctx.fillStyle = C.paper;
    ctx.fill();
    ctx.strokeStyle = C.ash;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  // Porch rail.
  ctx.strokeStyle = C.charcoal;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x + w, y + h - 18);
  ctx.lineTo(x + w + 34, y + h - 18);
  for (let px = x + w + 6; px <= x + w + 34; px += 7) {
    ctx.moveTo(px, y + h - 18);
    ctx.lineTo(px, y + h);
  }
  ctx.moveTo(x + w, y + h);
  ctx.lineTo(x + w + 34, y + h);
  ctx.stroke();
}

function drawBales(ctx, x, base, r) {
  const bale = (bx, by, w, h) => {
    ctx.fillStyle = C.paper;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(bx, by, w, h, 8) : ctx.rect(bx, by, w, h);
    ctx.fill();
    ctx.save();
    ctx.clip();
    hatch(ctx, bx + w * 0.6, by, w * 0.4, h, r, { gap: 3, lw: 0.9, color: C.ash, angle: 1.3 });
    // Fluffy cotton texture.
    ctx.strokeStyle = C.silver;
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 18; i++) {
      ctx.beginPath();
      ctx.arc(bx + r() * w, by + r() * h, 3 + r() * 3, 0, 3);
      ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = C.charcoal;
    ctx.lineWidth = 2;
    ctx.stroke();
    // Bands.
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    for (const k of [0.25, 0.55, 0.85]) {
      ctx.moveTo(bx + w * k, by + 1);
      ctx.lineTo(bx + w * k + 2, by + h - 1);
    }
    ctx.stroke();
  };
  bale(x, base - 40, 56, 40);
  bale(x + 58, base - 40, 56, 40);
  bale(x + 28, base - 78, 56, 38);
}

function drawFence(ctx, x, base, r) {
  for (let i = 0; i < 7; i++) {
    const px = x + i * 26;
    brush(ctx, [[px, base + 2], [px + r.range(-2, 2), base - 36 - r.range(0, 6)]], r, { w: 5, color: C.charcoal, taper: 0.3 });
  }
  for (const yy of [-28, -14]) {
    brush(ctx, [[x - 6, base + yy + r.range(-2, 2)], [x + 80, base + yy + r.range(-2, 2)], [x + 166, base + yy + r.range(-3, 3)]], r, { w: 3.5, color: C.slate, taper: 0.2 });
  }
}

function drawLamp(ctx, x, base, r) {
  brush(ctx, [[x, base], [x, base - 100]], r, { w: 5, color: C.charcoal, taper: 0.2 });
  brush(ctx, [[x, base - 96], [x + 20, base - 104], [x + 30, base - 96]], r, { w: 3, color: C.charcoal, taper: 0.3 });
  ctx.fillStyle = C.paper;
  ctx.strokeStyle = C.charcoal;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 22, base - 94);
  ctx.lineTo(x + 38, base - 94);
  ctx.lineTo(x + 35, base - 74);
  ctx.lineTo(x + 25, base - 74);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawBarrels(ctx, x, base, r) {
  for (const [bx, by] of [[0, 0], [34, 0], [17, -38]]) {
    const cx = x + bx;
    const cy = base + by;
    const p = new Path2D();
    p.moveTo(cx, cy);
    p.bezierCurveTo(cx - 5, cy - 14, cx - 5, cy - 24, cx, cy - 38);
    p.lineTo(cx + 30, cy - 38);
    p.bezierCurveTo(cx + 35, cy - 24, cx + 35, cy - 14, cx + 30, cy);
    p.closePath();
    ctx.fillStyle = C.silver;
    ctx.fill(p);
    ctx.save();
    ctx.clip(p);
    hatch(ctx, cx + 18, cy - 40, 16, 42, r, { gap: 2.6, lw: 0.9, color: C.slate, angle: 1.4 });
    ctx.fillStyle = C.slate;
    ctx.fillRect(cx - 6, cy - 31, 44, 4);
    ctx.fillRect(cx - 6, cy - 11, 44, 4);
    ctx.restore();
    ctx.strokeStyle = C.charcoal;
    ctx.lineWidth = 1.8;
    ctx.stroke(p);
  }
}

function reedClump(ctx, x, base, r, s, color) {
  const n = 4 + Math.floor(r() * 5);
  for (let i = 0; i < n; i++) {
    const h = r.range(20, 50) * s;
    const bend = r.range(-12, 12) * s;
    brush(ctx, [[x + i * 3, base], [x + i * 3 + bend * 0.3, base - h * 0.6], [x + i * 3 + bend, base - h]], r, { w: 3 * s + 1, color });
    if (r() < 0.25) {
      // Cattail head.
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(x + i * 3 + bend * 0.85, base - h * 0.85, 2.6 * s + 1, 7 * s + 2, bend * 0.02, 0, TAU);
      ctx.fill();
    }
  }
}

// ---------------------------------------------------------------- river

function paintWater(res) {
  const lay = makeLayer(WATER_W, H - WATER, res);
  const { ctx } = lay;
  const r = rng(71);
  const g = ctx.createLinearGradient(0, 0, 0, lay.h);
  g.addColorStop(0, C.slate);
  g.addColorStop(0.55, C.slate);
  g.addColorStop(1, C.charcoal);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, WATER_W, lay.h);
  // Reflection band of the bank, broken into horizontal strokes.
  for (let y = 2; y < 30; y += 3) {
    for (let x = r() * 30; x < WATER_W; x += r.range(20, 70)) {
      const len = r.range(12, 46);
      ctx.strokeStyle = C.charcoal;
      ctx.globalAlpha = 0.5 * (1 - y / 30);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + len, y);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  // Ripple strokes, longer and lighter near the top, getting sparse and dark deeper.
  for (let i = 0; i < 520; i++) {
    const y = 6 + r() ** 1.4 * (lay.h - 10);
    const x = r() * WATER_W;
    const len = r.range(10, 40) * (1.2 - y / lay.h);
    const light = r() < 0.55 - y / (lay.h * 2);
    const pts = [[x, y], [x + len * 0.5, y - r.range(1, 3)], [x + len, y]];
    // Keep strokes inside the tile so it repeats cleanly.
    if (x + len > WATER_W - 2) continue;
    brush(ctx, pts, r, { w: light ? 2.4 : 2, color: light ? C.ash : C.charcoal, amp: 0.4 });
  }
  // Sparkle glints.
  for (let i = 0; i < 60; i++) {
    const x = r.range(10, WATER_W - 30);
    const y = r.range(6, 40);
    brush(ctx, [[x, y], [x + r.range(8, 20), y]], r, { w: 2.2, color: C.paper, amp: 0.2 });
  }
  return lay;
}

// ---------------------------------------------------------------- foreground

function paintFront(res) {
  const lay = makeLayer(FRONT_W, H - FRONT_TOP, res);
  const { ctx } = lay;
  const r = rng(91);
  const base = lay.h;
  let x = 60;
  let k = 0;
  while (x < FRONT_W - 160) {
    if (k++ % 2 === 0) {
      // Lily pads with a flower.
      for (let i = 0; i < 3; i++) {
        const lx = x + i * r.range(22, 34);
        const ly = r.range(84, 106);
        const rad = r.range(18, 28);
        ctx.fillStyle = C.ash;
        ctx.beginPath();
        ctx.ellipse(lx, ly, rad, rad * 0.35, 0, 0.35, TAU - 0.05);
        ctx.lineTo(lx, ly);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.strokeStyle = C.slate;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx - rad * 0.6, ly - rad * 0.12);
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx + rad * 0.5, ly + rad * 0.15);
        ctx.stroke();
        if (i === 1) {
          for (let k = 0; k < 5; k++) {
            const a = Math.PI + (k / 4) * Math.PI;
            ctx.fillStyle = C.paper;
            ctx.beginPath();
            ctx.ellipse(lx + Math.cos(a) * 6, ly - 6 + Math.sin(a) * 5, 3, 7, a + Math.PI / 2, 0, TAU);
            ctx.fill();
            ctx.strokeStyle = C.ink;
            ctx.lineWidth = 1.2;
            ctx.stroke();
          }
        }
      }
      x += r.range(260, 420);
    } else {
      // Tall reeds and cattails in the near water.
      reedClump(ctx, x, base + 4, r, 1.8, C.ink);
      reedClump(ctx, x + 20, base + 4, r, 1.4, C.charcoal);
      reedClump(ctx, x - 16, base + 4, r, 1.1, C.charcoal);
      x += r.range(220, 380);
    }
  }
  return lay;
}

// ---------------------------------------------------------------- per-frame drawing

function tile(ctx, lay, offset, y, scaleY = 1) {
  const w = lay.w;
  let x = -(((offset % w) + w) % w);
  ctx.save();
  if (scaleY !== 1) {
    ctx.translate(0, y + lay.h);
    ctx.scale(1, scaleY);
    ctx.translate(0, -(y + lay.h));
  }
  for (; x < W; x += w) ctx.drawImage(lay.canvas, x, y, w, lay.h);
  ctx.restore();
}

export function drawBackground(ctx, camX, g) {
  if (!L) paintAll();
  ctx.drawImage(L.sky.canvas, 0, 0, W, WATER);

  // Sun, slowly turning, pulsing on the beat.
  const s = 1 + g.beat * 0.04;
  ctx.save();
  ctx.translate(1050, 118);
  ctx.rotate(g.time * 0.08);
  ctx.scale(s, s);
  ctx.drawImage(L.sun.canvas, -140, -140, 280, 280);
  ctx.restore();

  drawBirds(ctx, g);

  // Clouds drift and squash on the beat.
  const span = 1500;
  const off = camX * 0.06 + g.time * 8;
  for (let i = -1; i < 3; i++) {
    const cell = Math.floor(off / span) + i;
    const hsh = Math.abs(Math.sin(cell * 91.7)) % 1;
    const cx = cell * span - off + hsh * 600;
    const cy = 30 + ((hsh * 7.3) % 1) * 110;
    const sc = 0.75 + ((hsh * 3.1) % 1) * 0.4;
    const k = 1 + g.beat * 0.05;
    const cl = L.clouds[((cell % 3) + 3) % 3];
    ctx.save();
    ctx.translate(cx + 210 * sc, cy + 190 * sc);
    ctx.scale(sc * k, sc / k);
    ctx.drawImage(cl.canvas, -210, -190, cl.w, cl.h);
    ctx.restore();
  }

  tile(ctx, L.far, camX * 0.12, FAR_TOP);
  tile(ctx, L.mid, camX * 0.35, MID_TOP, 1 + g.beat * 0.012);
  tile(ctx, L.water, camX, WATER);
}

function drawBirds(ctx, g) {
  ctx.strokeStyle = C.slate;
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    const x = ((g.time * (18 + i * 3) + i * 330) % (W + 200)) - 100;
    const y = 150 + i * 22 + Math.sin(g.time * 0.8 + i) * 10;
    const f = Math.sin(g.time * 9 + i * 2) * 4;
    ctx.beginPath();
    ctx.moveTo(x - 9, y - f);
    ctx.quadraticCurveTo(x - 4, y - 5, x, y);
    ctx.quadraticCurveTo(x + 4, y - 5, x + 9, y - f);
    ctx.stroke();
  }
}

export function drawForeground(ctx, camX, g) {
  if (!L) paintAll();
  // Front water: hides the submerged parts of barrels, pilings and the hull.
  ctx.globalAlpha = 0.82;
  ctx.fillStyle = C.slate;
  ctx.fillRect(0, WATER + 8, W, H - WATER - 8);
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = C.charcoal;
  ctx.fillRect(0, WATER + 70, W, H - WATER - 70);
  ctx.globalAlpha = 1;
  // Wavy, inked surface line with little crests.
  const t = g.time;
  const pts = [];
  for (let sx = -12; sx <= W + 12; sx += 12) {
    const wx = sx + camX;
    pts.push([sx, WATER + 8 + Math.sin(wx * 0.03 + t * 3) * 2.5 + Math.sin(wx * 0.011 - t * 1.7) * 1.5]);
  }
  ctx.strokeStyle = C.paper;
  ctx.lineWidth = 3;
  smoothPath(ctx, pts);
  ctx.stroke();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let sx = -((camX * 1.0) % 90); sx < W; sx += 90) {
    const y = WATER + 13 + Math.sin((sx + camX) * 0.03 + t * 3) * 2.5;
    ctx.moveTo(sx, y);
    ctx.quadraticCurveTo(sx + 8, y - 4, sx + 16, y);
  }
  ctx.stroke();
  tile(ctx, L.front, camX * 1.3, FRONT_TOP);
}
