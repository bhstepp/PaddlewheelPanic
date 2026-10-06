// Parallax scenery in a soft, hand-inked storybook style: clean ink outlines,
// watercolor washes and paper grain. Back to front: sky, sun, clouds, far hills
// with a lighthouse, the far-shore town and wharves, a wide river with distant
// boats and gulls; then (after the gameplay layer) near water and foreground
// mooring posts. Each layer is painted once into an offscreen canvas and tiled.
import { PALETTE as C } from "./palette.js";
import { CONFIG } from "../config.js";
import { TAU, rng, makeLayer, layerRes, smoothPath, wash, paperTexture } from "./ink.js";

const W = CONFIG.width;
const H = CONFIG.height;
const WATER = CONFIG.waterY;
const HORIZON = 452; // the far shore's waterline

const HILLS_W = 3200;
const HILLS_TOP = 90;
const HILLS_OFF = 80; // headroom above the ridges for the lighthouse
const TOWN_W = 3600;
const TOWN_TOP = 250;
const FRONT_W = 3400;
const FRONT_TOP = 560;
const BANDS = [
  // [top, bottom, parallax, wave size, seed]
  [HORIZON, 500, 0.16, 5, 3],
  [500, 560, 0.45, 9, 5],
  [560, H, 1.0, 15, 9],
];

let L = null;

function paintAll() {
  const res = layerRes();
  L = {
    sky: paintSky(res),
    clouds: [0, 1, 2].map((i) => paintCloud(res, 101 + i)),
    hills: paintHills(res),
    town: paintTown(res),
    bands: BANDS.map((b) => paintBand(res, ...b)),
    boat: paintBoat(res),
    sail: paintSail(res),
    front: paintFront(res),
  };
}

// ---------------------------------------------------------------- helpers

function periodic(x, period, terms) {
  let y = 0;
  for (const [amp, k, ph] of terms) y += amp * Math.sin((x / period) * TAU * k + ph);
  return y;
}

function line(ctx, color, w) {
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
}

function rectPath(x, y, w, h) {
  const p = new Path2D();
  p.rect(x, y, w, h);
  return p;
}

// Small paned window with a frame.
function windowPane(ctx, x, y, w, h, ink, lw) {
  ctx.fillStyle = C.slate;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = C.ash;
  ctx.fillRect(x + w * 0.55, y + 1, w * 0.4, h * 0.45);
  line(ctx, ink, lw);
  ctx.strokeRect(x, y, w, h);
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y);
  ctx.lineTo(x + w / 2, y + h);
  ctx.moveTo(x, y + h / 2);
  ctx.lineTo(x + w, y + h / 2);
  ctx.stroke();
}


// A clump of foliage drawn like the reference trees: one clean inked
// silhouette over the union of the lobes, a shaded underside, and small
// scalloped leaf marks.
function treeClump(ctx, lobes, r, { fill = C.silver, ink = C.charcoal, lw = 1.6, trunk = null } = {}) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const p = new Path2D();
  for (const [x, y, rx, ry] of lobes) {
    p.moveTo(x + rx, y);
    p.ellipse(x, y, rx, ry, 0, 0, TAU);
    minX = Math.min(minX, x - rx); maxX = Math.max(maxX, x + rx);
    minY = Math.min(minY, y - ry); maxY = Math.max(maxY, y + ry);
  }
  if (trunk) {
    const [tx, ty, tb] = trunk;
    line(ctx, ink, 4.5);
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(tx - 2, (ty + tb) / 2, tx + 1, tb);
    ctx.stroke();
    line(ctx, C.slate, 2.2);
    ctx.stroke();
  }
  ctx.save();
  line(ctx, ink, lw * 2);
  ctx.stroke(p);
  ctx.restore();
  ctx.fillStyle = fill;
  ctx.fill(p);
  ctx.save();
  ctx.clip(p);
  const g = ctx.createLinearGradient(minX, minY, maxX * 0.4 + minX * 0.6, maxY);
  g.addColorStop(0, "rgba(248,246,240,0.55)");
  g.addColorStop(0.45, "rgba(248,246,240,0)");
  g.addColorStop(1, "rgba(23,22,20,0.38)");
  ctx.fillStyle = g;
  ctx.fillRect(minX, minY, maxX - minX, maxY - minY);
  // Leaf scallops: darker in the lower half, lighter up top.
  const n = Math.round(((maxX - minX) * (maxY - minY)) / 90);
  for (let i = 0; i < n; i++) {
    const x = minX + r() * (maxX - minX);
    const y = minY + r() * (maxY - minY);
    const lower = (y - minY) / (maxY - minY) > 0.5;
    ctx.strokeStyle = lower ? C.slate : C.paper;
    ctx.globalAlpha = lower ? 0.55 : 0.7;
    ctx.lineWidth = 1;
    const sz = 2.5 + r() * 2.5;
    ctx.beginPath();
    ctx.arc(x, y, sz, Math.PI * 0.1, Math.PI * 0.9, lower);
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- sky

function paintSky(res) {
  const lay = makeLayer(W, HORIZON + 10, res);
  const { ctx } = lay;
  const r = rng(7);
  const g = ctx.createLinearGradient(0, 0, 0, HORIZON);
  g.addColorStop(0, C.ash);
  g.addColorStop(0.45, C.silver);
  g.addColorStop(1, C.paper);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, HORIZON + 10);
  paperTexture(ctx, W, HORIZON + 10, r, { strength: 1.4, blot: 1.6 });

  // Plain sun disc with a soft ring, like a stamped moon in the reference.
  ctx.beginPath();
  ctx.arc(1010, 110, 54, 0, TAU);
  ctx.fillStyle = C.paper;
  ctx.fill();
  line(ctx, C.ash, 3);
  ctx.setLineDash([16, 5]);
  ctx.stroke();
  ctx.setLineDash([]);
  return lay;
}

function paintCloud(res, seed) {
  const lay = makeLayer(440, 200, res);
  const { ctx } = lay;
  const r = rng(seed);
  const lobes = [];
  const n = 6 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    lobes.push([60 + u * 310, 128 - Math.sin(u * Math.PI) * 40 - r() * 12, 26 + Math.sin(u * Math.PI) * 30 + r() * 10]);
  }
  const path = new Path2D();
  for (const [x, y, rad] of lobes) {
    path.moveTo(x + rad, y);
    path.arc(x, y, rad, 0, TAU);
  }
  path.rect(60, 128, 310, 30);
  // Broken ink outline, drawn wide then covered by the fill.
  ctx.save();
  line(ctx, C.charcoal, 5);
  ctx.setLineDash([18, 6, 4, 6]);
  ctx.stroke(path);
  ctx.restore();
  ctx.fillStyle = C.paper;
  ctx.fill(path);
  // Soft gray belly.
  ctx.save();
  ctx.clip(path);
  const g = ctx.createLinearGradient(0, 90, 0, 160);
  g.addColorStop(0, "rgba(154,150,143,0)");
  g.addColorStop(1, "rgba(154,150,143,0.75)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 60, 440, 110);
  ctx.restore();
  paperTexture(ctx, 440, 200, r, { strength: 1.2 });
  return lay;
}

// ---------------------------------------------------------------- far hills and lighthouse

function paintHills(res) {
  const h = HORIZON - HILLS_TOP - HILLS_OFF + 6;
  const lay = makeLayer(HILLS_W, h + HILLS_OFF, res);
  const { ctx } = lay;
  ctx.translate(0, HILLS_OFF);
  const r = rng(23);
  const ridge1 = (x) => 140 + periodic(x, HILLS_W, [[30, 2, 0.4], [16, 5, 1.6], [6, 11, 0.3]]);
  const ridge2 = (x) => 200 + periodic(x, HILLS_W, [[20, 3, 2.2], [10, 7, 0.1], [4, 13, 1.1]]);

  const hill = (fn, fill, ink, lw) => {
    const p = new Path2D();
    p.moveTo(0, h);
    for (let x = 0; x <= HILLS_W; x += 12) p.lineTo(x, fn(x));
    p.lineTo(HILLS_W, h);
    p.closePath();
    wash(ctx, p, fill, C.slate, { dir: "down", strength: 0.35, x: 0, y: 60, w: HILLS_W, h: h - 60 });
    const pts = [];
    for (let x = 0; x <= HILLS_W; x += 12) pts.push([x, fn(x)]);
    line(ctx, ink, lw);
    smoothPath(ctx, pts);
    ctx.stroke();
  };
  hill(ridge1, C.ash, C.slate, 2);

  // A rocky headland with a lighthouse, keeper's cottage, fence and path.
  const lx = 1150;
  const cliff = new Path2D();
  cliff.moveTo(lx - 260, h);
  cliff.bezierCurveTo(lx - 230, 140, lx - 170, 82, lx - 70, 76);
  cliff.lineTo(lx + 120, 74);
  cliff.bezierCurveTo(lx + 190, 80, lx + 210, 130, lx + 240, 170);
  cliff.bezierCurveTo(lx + 260, 220, lx + 300, 250, lx + 340, h);
  cliff.closePath();
  wash(ctx, cliff, C.silver, C.slate, { dir: "right", strength: 0.5, x: lx - 260, y: 70, w: 600, h: h - 70 });
  // Grass and scattered rocks on the headland.
  ctx.save();
  ctx.clip(cliff);
  line(ctx, C.slate, 1);
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  for (let i = 0; i < 420; i++) {
    const gx = lx - 240 + r() * 560;
    const gy = 80 + r() * (h - 80);
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx + r.range(-1, 2), gy - r.range(2, 5));
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
  for (let i = 0; i < 26; i++) {
    const rx = lx + 100 + r() * 220;
    const ry = 120 + r() * (h - 130);
    const rs = r.range(4, 10);
    const rock = new Path2D();
    rock.moveTo(rx - rs, ry);
    rock.quadraticCurveTo(rx - rs * 0.8, ry - rs * 0.9, rx, ry - rs);
    rock.quadraticCurveTo(rx + rs, ry - rs * 0.7, rx + rs, ry);
    rock.closePath();
    wash(ctx, rock, C.ash, C.ink, { dir: "right", strength: 0.5, x: rx - rs, y: ry - rs, w: rs * 2, h: rs });
    line(ctx, C.slate, 1);
    ctx.stroke(rock);
  }
  ctx.restore();
  line(ctx, C.charcoal, 2);
  ctx.stroke(cliff);
  // Rock strata.
  line(ctx, C.ash, 1.4);
  ctx.beginPath();
  for (let i = 0; i < 9; i++) {
    const y = 110 + i * 22;
    const x0 = lx + 120 + i * 18 + r.range(-6, 6);
    ctx.moveTo(x0, y);
    ctx.quadraticCurveTo(x0 + 30, y + 10, x0 + 56, y + 6);
  }
  ctx.stroke();
  // Winding path down the hill.
  line(ctx, C.paper, 3);
  ctx.beginPath();
  ctx.moveTo(lx + 10, 78);
  ctx.bezierCurveTo(lx + 80, 96, lx - 10, 116, lx + 60, 136);
  ctx.bezierCurveTo(lx + 120, 152, lx + 80, 176, lx + 150, 196);
  ctx.stroke();
  // Fence along the path.
  line(ctx, C.slate, 1.3);
  ctx.beginPath();
  for (let i = 0; i < 12; i++) {
    const x = lx + 90 + i * 16;
    const y = 112 + i * 9;
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - 9);
  }
  ctx.moveTo(lx + 90, 106);
  ctx.lineTo(lx + 266, 205);
  ctx.stroke();
  // Lighthouse.
  const tx = lx + 20;
  const tower = new Path2D();
  tower.moveTo(tx - 14, 78);
  tower.lineTo(tx - 9, 4);
  tower.lineTo(tx + 9, 4);
  tower.lineTo(tx + 14, 78);
  tower.closePath();
  ctx.fillStyle = C.paper;
  ctx.fill(tower);
  ctx.save();
  ctx.clip(tower);
  ctx.fillStyle = C.ash;
  for (const y of [18, 42, 64]) ctx.fillRect(tx - 20, y, 40, 9);
  ctx.restore();
  line(ctx, C.slate, 1.8);
  ctx.stroke(tower);
  ctx.fillStyle = C.paper;
  ctx.fillRect(tx - 8, -10, 16, 14);
  ctx.strokeRect(tx - 8, -10, 16, 14);
  ctx.beginPath();
  ctx.moveTo(tx - 11, -10);
  ctx.lineTo(tx, -22);
  ctx.lineTo(tx + 11, -10);
  ctx.closePath();
  ctx.fillStyle = C.slate;
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(tx - 13, 4);
  ctx.lineTo(tx + 13, 4);
  ctx.stroke();
  // Keeper's cottage.
  const cx = lx + 46;
  ctx.fillStyle = C.paper;
  ctx.fillRect(cx, 56, 40, 22);
  ctx.strokeRect(cx, 56, 40, 22);
  ctx.beginPath();
  ctx.moveTo(cx - 4, 56);
  ctx.lineTo(cx + 20, 40);
  ctx.lineTo(cx + 44, 56);
  ctx.closePath();
  ctx.fillStyle = C.ash;
  ctx.fill();
  ctx.stroke();
  windowPane(ctx, cx + 8, 62, 8, 8, C.slate, 1);
  windowPane(ctx, cx + 24, 62, 8, 8, C.slate, 1);

  hill(ridge2, C.silver, C.slate, 2);
  // Fields, hedgerows and tree clumps on the nearer slopes.
  const near = new Path2D();
  near.moveTo(0, h);
  for (let x = 0; x <= HILLS_W; x += 12) near.lineTo(x, ridge2(x));
  near.lineTo(HILLS_W, h);
  near.closePath();
  ctx.save();
  ctx.clip(near);
  // Curving field furrows.
  line(ctx, C.ash, 1);
  for (let x = 0; x < HILLS_W; x += r.range(160, 320)) {
    const y0 = ridge2(x) + 14;
    ctx.beginPath();
    for (let k = 0; k < 5; k++) {
      ctx.moveTo(x, y0 + k * 9);
      ctx.bezierCurveTo(x + 60, y0 + k * 9 - 8, x + 120, y0 + k * 11 + 6, x + 190, y0 + k * 12);
    }
    ctx.stroke();
  }
  // Grass ticks.
  line(ctx, C.slate, 1);
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  for (let i = 0; i < 900; i++) {
    const x = r() * HILLS_W;
    const y = ridge2(x) + 4 + r() ** 1.5 * 80;
    ctx.moveTo(x, y);
    ctx.lineTo(x + r.range(-1, 2), y - r.range(2, 5));
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.restore();
  for (let x = 30; x < HILLS_W - 30; x += r.range(50, 140)) {
    if (x > lx - 280 && x < lx + 360) continue;
    const y = ridge2(x) + 4;
    const s = r.range(9, 18);
    treeClump(ctx, [[x, y - s * 0.6, s * 1.2, s], [x + s, y - s * 0.3, s * 0.8, s * 0.7], [x - s * 0.7, y - s * 0.2, s * 0.6, s * 0.5]], r, { fill: C.silver, ink: C.slate, lw: 1.3 });
  }
  ctx.setTransform(res, 0, 0, res, 0, 0);
  paperTexture(ctx, HILLS_W, h + HILLS_OFF, r, { strength: 1.2 });
  return lay;
}

// ---------------------------------------------------------------- far-shore town

function paintTown(res) {
  const h = HORIZON - TOWN_TOP + 14;
  const lay = makeLayer(TOWN_W, h, res);
  const { ctx } = lay;
  const r = rng(57);
  const WL = HORIZON - TOWN_TOP; // waterline in layer coordinates
  const ink = C.charcoal;

  // Groves of trees behind the buildings, in irregular clusters.
  for (let x = 20; x < TOWN_W - 40; x += r.range(90, 260)) {
    const n = 2 + Math.floor(r() * 4);
    for (let k = 0; k < n; k++) {
      const s = r.range(14, 30);
      const tx = x + k * s * 1.1 + r.range(-6, 6);
      const ty = WL - 16 - r.range(14, 40);
      treeClump(ctx, [
        [tx, ty - s * 0.4, s, s * 0.9],
        [tx - s * 0.6, ty + s * 0.2, s * 0.7, s * 0.6],
        [tx + s * 0.7, ty + s * 0.25, s * 0.75, s * 0.6],
        [tx + s * 0.1, ty - s * 1.0, s * 0.55, s * 0.5],
      ], r, { fill: k % 2 ? C.silver : C.ash, trunk: [tx, ty + s * 0.5, WL - 16], lw: 1.4 });
    }
  }

  // Shore embankment.
  ctx.fillStyle = C.ash;
  ctx.fillRect(0, WL - 16, TOWN_W, 16);
  line(ctx, ink, 1.6);
  ctx.beginPath();
  ctx.moveTo(0, WL - 16);
  ctx.lineTo(TOWN_W, WL - 16);
  ctx.stroke();

  // Buildings, wharves, a water tower, a church spire, a crane.
  const items = ["houses", "tower", "warehouse", "houses", "church", "pier", "houses", "crane", "houses", "factory", "houses", "pier"];
  let x = 60;
  let i = 0;
  while (x < TOWN_W - 260) {
    const kind = items[i++ % items.length];
    x += drawTownPiece(ctx, kind, x, WL - 16, r, ink) + r.range(20, 70);
  }
  paperTexture(ctx, TOWN_W, h, r, { strength: 1.1 });
  return lay;
}

function gableHouse(ctx, x, base, w, hgt, r, ink) {
  const y = base - hgt;
  const body = rectPath(x, y, w, hgt);
  wash(ctx, body, r() < 0.5 ? C.paper : C.silver, C.ash, { dir: "right", strength: 0.7, x, y, w, h: hgt });
  // Clapboard siding.
  ctx.save();
  ctx.clip(body);
  line(ctx, C.ash, 0.8);
  ctx.beginPath();
  for (let yy = y + 4; yy < base; yy += 4) {
    ctx.moveTo(x, yy);
    ctx.lineTo(x + w, yy);
  }
  ctx.stroke();
  ctx.restore();
  line(ctx, ink, 1.7);
  ctx.stroke(body);
  const roofH = w * 0.45;
  const roof = new Path2D();
  roof.moveTo(x - 5, y + 1);
  roof.lineTo(x + w / 2, y - roofH);
  roof.lineTo(x + w + 5, y + 1);
  roof.closePath();
  wash(ctx, roof, C.ash, C.slate, { dir: "right", strength: 0.6, x: x - 5, y: y - roofH, w: w + 10, h: roofH });
  // Shingle courses.
  ctx.save();
  ctx.clip(roof);
  line(ctx, C.slate, 0.8);
  ctx.beginPath();
  for (let yy = y - roofH + 4, row = 0; yy < y + 2; yy += 4, row++) {
    ctx.moveTo(x - 6, yy);
    ctx.lineTo(x + w + 6, yy);
    for (let xx = x - 6 + (row % 2) * 3; xx < x + w + 6; xx += 6) {
      ctx.moveTo(xx, yy);
      ctx.lineTo(xx, yy - 4);
    }
  }
  ctx.stroke();
  ctx.restore();
  line(ctx, ink, 1.7);
  ctx.stroke(roof);
  if (r() < 0.6) {
    const cx = x + w * 0.7;
    const ch = rectPath(cx, y - roofH * 0.8, 6, roofH * 0.6);
    wash(ctx, ch, C.ash, null);
    ctx.stroke(ch);
    if (r() < 0.4) {
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.arc(cx + 3 + k * 5, y - roofH * 0.8 - 5 - k * 6, 3 + k * 1.5, 0, TAU);
        ctx.fillStyle = C.paper;
        ctx.fill();
        line(ctx, C.ash, 0.9);
        ctx.stroke();
      }
    }
  }
  const cols = Math.max(1, Math.floor(w / 16));
  const rows = Math.max(1, Math.floor((hgt - 14) / 16));
  for (let c = 0; c < cols; c++) {
    for (let rr = 0; rr < rows; rr++) {
      windowPane(ctx, x + 5 + c * ((w - 10) / cols) + 1, y + 5 + rr * 15, 7, 8, ink, 0.8);
    }
  }
  // Front door.
  const dx = x + (cols > 1 ? w / 2 - 4 : w - 12);
  const door = rectPath(dx, base - 12, 8, 12);
  wash(ctx, door, C.slate, null);
  line(ctx, ink, 1);
  ctx.stroke(door);
}

function drawTownPiece(ctx, kind, x, base, r, ink) {
  if (kind === "houses") {
    let w = 0;
    const n = 2 + Math.floor(r() * 3);
    for (let k = 0; k < n; k++) {
      const bw = r.range(30, 52);
      gableHouse(ctx, x + w, base, bw, r.range(26, 46), r, ink);
      w += bw + r.range(2, 8);
    }
    return w;
  }
  if (kind === "warehouse") {
    const w = 120;
    const hgt = 40;
    const body = rectPath(x, base - hgt, w, hgt);
    wash(ctx, body, C.paper, C.ash, { dir: "right", strength: 0.6, x, y: base - hgt, w, h: hgt });
    line(ctx, ink, 1.5);
    ctx.stroke(body);
    const roof = new Path2D();
    roof.moveTo(x - 4, base - hgt);
    roof.lineTo(x + 10, base - hgt - 14);
    roof.lineTo(x + w - 10, base - hgt - 14);
    roof.lineTo(x + w + 4, base - hgt);
    roof.closePath();
    wash(ctx, roof, C.ash, C.slate, { dir: "down", strength: 0.4, x, y: base - hgt - 14, w, h: 14 });
    ctx.stroke(roof);
    ctx.fillStyle = C.silver;
    ctx.fillRect(x + 20, base - hgt + 6, w - 40, 8); // blank sign band
    ctx.strokeRect(x + 20, base - hgt + 6, w - 40, 8);
    for (const dx of [14, 52, 90]) {
      ctx.fillStyle = C.slate;
      ctx.fillRect(x + dx, base - 22, 16, 22);
      ctx.strokeRect(x + dx, base - 22, 16, 22);
    }
    return w;
  }
  if (kind === "tower") {
    // Water tower on lattice legs.
    line(ctx, ink, 1.6);
    ctx.beginPath();
    ctx.moveTo(x, base);
    ctx.lineTo(x + 8, base - 70);
    ctx.moveTo(x + 40, base);
    ctx.lineTo(x + 32, base - 70);
    for (let k = 0; k < 3; k++) {
      const y0 = base - k * 23;
      ctx.moveTo(x + 2 + k * 2.6, y0);
      ctx.lineTo(x + 38 - (k + 1) * 2.6, y0 - 23);
      ctx.moveTo(x + 38 - k * 2.6, y0);
      ctx.lineTo(x + 2 + (k + 1) * 2.6, y0 - 23);
      ctx.moveTo(x + k * 2.6, y0 - 23);
      ctx.lineTo(x + 40 - k * 2.6, y0 - 23);
    }
    ctx.stroke();
    const tank = rectPath(x - 2, base - 104, 44, 34);
    wash(ctx, tank, C.paper, C.ash, { dir: "right", strength: 0.7, x: x - 2, y: base - 104, w: 44, h: 34 });
    ctx.stroke(tank);
    ctx.beginPath();
    for (let k = 1; k < 5; k++) {
      ctx.moveTo(x - 2 + k * 9, base - 104);
      ctx.lineTo(x - 2 + k * 9, base - 70);
    }
    ctx.stroke();
    const cone = new Path2D();
    cone.moveTo(x - 6, base - 104);
    cone.lineTo(x + 20, base - 124);
    cone.lineTo(x + 46, base - 104);
    cone.closePath();
    wash(ctx, cone, C.ash, C.slate, { dir: "right", strength: 0.5, x: x - 6, y: base - 124, w: 52, h: 20 });
    ctx.stroke(cone);
    return 48;
  }
  if (kind === "church") {
    gableHouse(ctx, x, base, 46, 40, r, ink);
    const sx = x + 16;
    const st = rectPath(sx, base - 80, 14, 40);
    wash(ctx, st, C.paper, C.ash, { dir: "right", strength: 0.6, x: sx, y: base - 80, w: 14, h: 40 });
    line(ctx, ink, 1.5);
    ctx.stroke(st);
    const spire = new Path2D();
    spire.moveTo(sx - 2, base - 80);
    spire.lineTo(sx + 7, base - 126);
    spire.lineTo(sx + 16, base - 80);
    spire.closePath();
    wash(ctx, spire, C.ash, C.slate, { dir: "right", strength: 0.5, x: sx, y: base - 126, w: 16, h: 46 });
    ctx.stroke(spire);
    ctx.beginPath();
    ctx.arc(sx + 7, base - 68, 3.5, 0, TAU);
    ctx.stroke();
    return 50;
  }
  if (kind === "factory") {
    gableHouse(ctx, x, base, 70, 34, r, ink);
    const st = rectPath(x + 74, base - 92, 10, 92);
    wash(ctx, st, C.ash, C.slate, { dir: "right", strength: 0.6, x: x + 74, y: base - 92, w: 10, h: 92 });
    line(ctx, ink, 1.4);
    ctx.stroke(st);
    for (let k = 0; k < 4; k++) {
      ctx.beginPath();
      ctx.arc(x + 80 + k * 10, base - 102 - k * 10, 6 + k * 3, 0, TAU);
      ctx.fillStyle = C.paper;
      ctx.fill();
      line(ctx, C.ash, 1.2);
      ctx.stroke();
    }
    return 90;
  }
  if (kind === "pier" || kind === "crane") {
    // A wharf on pilings reaching into the water, stacked with cargo.
    const w = kind === "crane" ? 150 : 120;
    const deckY = base + 6;
    line(ctx, ink, 1.5);
    ctx.fillStyle = C.slate;
    for (let px = x + 4; px < x + w; px += 18) {
      ctx.fillRect(px, deckY, 4, 22);
    }
    const deck = rectPath(x, deckY - 5, w, 6);
    wash(ctx, deck, C.silver, null);
    ctx.stroke(deck);
    // Crates and a barrel on the deck.
    for (let k = 0; k < 3; k++) {
      const cw = r.range(12, 18);
      const cx = x + 10 + k * 22;
      const cr = rectPath(cx, deckY - 5 - cw, cw, cw);
      wash(ctx, cr, C.paper, C.ash, { dir: "right", strength: 0.6, x: cx, y: deckY - 5 - cw, w: cw, h: cw });
      ctx.stroke(cr);
      ctx.beginPath();
      ctx.moveTo(cx, deckY - 5 - cw);
      ctx.lineTo(cx + cw, deckY - 5);
      ctx.moveTo(cx + cw, deckY - 5 - cw);
      ctx.lineTo(cx, deckY - 5);
      ctx.stroke();
    }
    if (kind === "crane") {
      const bx = x + w - 40;
      ctx.beginPath();
      ctx.moveTo(bx, deckY - 5);
      ctx.lineTo(bx + 6, deckY - 70);
      ctx.moveTo(bx + 18, deckY - 5);
      ctx.lineTo(bx + 12, deckY - 70);
      for (let k = 0; k < 5; k++) {
        ctx.moveTo(bx + 1 + k, deckY - 5 - k * 13);
        ctx.lineTo(bx + 17 - k, deckY - 18 - k * 13);
      }
      // Jib.
      ctx.moveTo(bx + 8, deckY - 70);
      ctx.lineTo(bx - 50, deckY - 96);
      ctx.moveTo(bx + 12, deckY - 62);
      ctx.lineTo(bx - 50, deckY - 96);
      for (let k = 1; k < 6; k++) {
        const u = k / 6;
        ctx.moveTo(bx + 8 - 58 * u, deckY - 70 - 26 * u);
        ctx.lineTo(bx + 12 - 62 * u, deckY - 62 - 34 * u);
      }
      // Hook line.
      ctx.moveTo(bx - 48, deckY - 95);
      ctx.lineTo(bx - 48, deckY - 50);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(bx - 48, deckY - 46, 4, 0, Math.PI);
      ctx.stroke();
      const cab = rectPath(bx - 2, deckY - 40, 22, 18);
      wash(ctx, cab, C.silver, C.ash, { dir: "right", strength: 0.5, x: bx, y: deckY - 40, w: 22, h: 18 });
      ctx.stroke(cab);
    }
    return w;
  }
  return 40;
}

// ---------------------------------------------------------------- river bands

function paintBand(res, top, bottom, parallax, size, seed) {
  const bw = 1600;
  const h = bottom - top;
  const lay = makeLayer(bw, h, res);
  const { ctx } = lay;
  const r = rng(seed * 31);
  // Water gets darker toward the viewer.
  const depth = (y) => (top + y - HORIZON) / (H - HORIZON);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  const shade = (d) => (d < 0.25 ? C.silver : d < 0.55 ? C.ash : C.slate);
  g.addColorStop(0, shade(depth(0)));
  g.addColorStop(1, shade(depth(h)));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, bw, h);
  if (top === HORIZON) {
    // Soft reflections of the far shore just below its waterline.
    for (let i = 0; i < 160; i++) {
      const x = r() * bw;
      const y = r() * 18;
      ctx.fillStyle = r() < 0.5 ? C.ash : C.paper;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(x, y, r.range(10, 40), 1.5);
    }
    ctx.globalAlpha = 1;
  }
  // Little white wave marks with a dark lip underneath, smaller with distance.
  const rows = Math.round(h / (size * 2.2));
  for (let row = 0; row < rows; row++) {
    const y = ((row + 0.5) * h) / rows + r.range(-2, 2);
    let s = size;
    for (let x = r() * 120; x < bw - s * 3; x += s * (r() < 0.3 ? r.range(3, 5) : r.range(8, 22))) {
      s = size * (0.6 + depth(y) * 0.6) * r.range(0.7, 1.35);
      ctx.lineCap = "round";
      ctx.strokeStyle = C.charcoal;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = Math.max(1, s * 0.16);
      ctx.beginPath();
      ctx.moveTo(x, y + s * 0.25);
      ctx.quadraticCurveTo(x + s * 0.6, y - s * 0.15, x + s * 1.2, y + s * 0.25);
      ctx.quadraticCurveTo(x + s * 1.8, y + s * 0.6, x + s * 2.4, y + s * 0.2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = C.paper;
      ctx.lineWidth = Math.max(1, s * 0.2);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + s * 0.6, y - s * 0.4, x + s * 1.2, y);
      ctx.quadraticCurveTo(x + s * 1.8, y + s * 0.35, x + s * 2.4, y - s * 0.05);
      ctx.stroke();
    }
  }
  paperTexture(ctx, bw, h, r, { strength: 1 });
  return { ...lay, top, parallax };
}

// ---------------------------------------------------------------- distant boats

function paintBoat(res) {
  // A little sidewheeler crossing the river far away.
  const lay = makeLayer(200, 120, res);
  const { ctx } = lay;
  const r = rng(808);
  const ink = C.charcoal;
  ctx.translate(10, 10);
  const hull = new Path2D();
  hull.moveTo(0, 82);
  hull.lineTo(176, 82);
  hull.quadraticCurveTo(172, 100, 150, 104);
  hull.lineTo(16, 104);
  hull.quadraticCurveTo(4, 98, 0, 82);
  hull.closePath();
  wash(ctx, hull, C.slate, C.ink, { dir: "down", strength: 0.5, x: 0, y: 82, w: 176, h: 22 });
  line(ctx, ink, 2);
  ctx.stroke(hull);
  ctx.fillStyle = C.paper;
  ctx.fillRect(4, 84, 168, 4);
  const cabin = rectPath(28, 58, 110, 24);
  wash(ctx, cabin, C.paper, C.ash, { dir: "right", strength: 0.5, x: 28, y: 58, w: 110, h: 24 });
  ctx.stroke(cabin);
  for (let k = 0; k < 7; k++) {
    ctx.fillStyle = C.slate;
    ctx.fillRect(34 + k * 15, 64, 7, 9);
  }
  const house = rectPath(92, 40, 36, 18);
  wash(ctx, house, C.paper, C.ash, { dir: "right", strength: 0.5, x: 92, y: 40, w: 36, h: 18 });
  ctx.stroke(house);
  windowPane(ctx, 98, 44, 9, 8, ink, 1);
  windowPane(ctx, 112, 44, 9, 8, ink, 1);
  const stack = rectPath(54, 16, 12, 42);
  wash(ctx, stack, C.ink, null);
  ctx.stroke(stack);
  ctx.fillStyle = C.paper;
  ctx.fillRect(54, 26, 12, 3);
  // Paddlewheel.
  ctx.beginPath();
  ctx.arc(88, 86, 20, 0, TAU);
  ctx.fillStyle = C.silver;
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  for (let k = 0; k < 8; k++) {
    const a = (k * TAU) / 8;
    ctx.moveTo(88, 86);
    ctx.lineTo(88 + Math.cos(a) * 20, 86 + Math.sin(a) * 20);
  }
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(88, 86, 5, 0, TAU);
  ctx.fillStyle = C.paper;
  ctx.fill();
  ctx.stroke();
  // Flag.
  line(ctx, ink, 1.5);
  ctx.beginPath();
  ctx.moveTo(150, 82);
  ctx.lineTo(150, 30);
  ctx.stroke();
  ctx.fillStyle = C.charcoal;
  ctx.fillRect(150, 30, 16, 11);
  paperTexture(ctx, 200, 120, r, { strength: 0.8 });
  return lay;
}

function paintSail(res) {
  const lay = makeLayer(90, 110, res);
  const { ctx } = lay;
  const r = rng(909);
  line(ctx, C.slate, 1.5);
  const sail = new Path2D();
  sail.moveTo(44, 6);
  sail.quadraticCurveTo(70, 50, 76, 82);
  sail.lineTo(44, 82);
  sail.closePath();
  wash(ctx, sail, C.paper, C.ash, { dir: "right", strength: 0.6, x: 44, y: 6, w: 34, h: 76 });
  ctx.stroke(sail);
  const jib = new Path2D();
  jib.moveTo(40, 14);
  jib.lineTo(40, 82);
  jib.lineTo(14, 82);
  jib.closePath();
  wash(ctx, jib, C.paper, C.ash, { dir: "left", strength: 0.4, x: 14, y: 14, w: 26, h: 68 });
  ctx.stroke(jib);
  const hull = new Path2D();
  hull.moveTo(6, 84);
  hull.lineTo(84, 84);
  hull.quadraticCurveTo(76, 98, 64, 98);
  hull.lineTo(18, 98);
  hull.closePath();
  wash(ctx, hull, C.slate, null);
  ctx.stroke(hull);
  paperTexture(ctx, 90, 110, r, { strength: 0.8 });
  return lay;
}

// ---------------------------------------------------------------- foreground

function paintFront(res) {
  // Big mooring posts in the very front, wrapped in rope, framing the view.
  const lay = makeLayer(FRONT_W, H - FRONT_TOP, res);
  const { ctx } = lay;
  const r = rng(91);
  const h = lay.h;
  for (let x = 300; x < FRONT_W - 200; x += r.range(900, 1400)) {
    const pw = 54;
    const top = r.range(64, 86);
    const post = new Path2D();
    post.moveTo(x, h + 4);
    post.lineTo(x, top + 10);
    post.quadraticCurveTo(x, top, x + 10, top - 2);
    post.lineTo(x + pw - 10, top - 2);
    post.quadraticCurveTo(x + pw, top, x + pw, top + 10);
    post.lineTo(x + pw, h + 4);
    post.closePath();
    wash(ctx, post, C.ash, C.ink, { dir: "right", strength: 0.75, x, y: top, w: pw, h: h - top });
    // Wood grain.
    line(ctx, C.charcoal, 1.2);
    ctx.beginPath();
    for (let k = 0; k < 5; k++) {
      const gx = x + 8 + k * 9 + r.range(-2, 2);
      ctx.moveTo(gx, top + 14);
      ctx.bezierCurveTo(gx + 3, top + 50, gx - 3, top + 90, gx + 1, h);
    }
    ctx.stroke();
    line(ctx, C.ink, 4);
    ctx.stroke(post);
    // Top end grain.
    ctx.beginPath();
    ctx.ellipse(x + pw / 2, top + 2, pw / 2 - 2, 6, 0, 0, TAU);
    ctx.fillStyle = C.silver;
    ctx.fill();
    line(ctx, C.ink, 3);
    ctx.stroke();
    line(ctx, C.ash, 1);
    ctx.beginPath();
    ctx.ellipse(x + pw / 2, top + 2, pw / 4, 3, 0, 0, TAU);
    ctx.stroke();
    // Rope wraps and a hanging loop.
    for (let k = 0; k < 4; k++) {
      const ry = top + 34 + k * 9;
      const rope = new Path2D();
      rope.moveTo(x - 3, ry);
      rope.quadraticCurveTo(x + pw / 2, ry + 7, x + pw + 3, ry);
      rope.lineTo(x + pw + 3, ry + 7);
      rope.quadraticCurveTo(x + pw / 2, ry + 14, x - 3, ry + 7);
      rope.closePath();
      wash(ctx, rope, C.silver, C.slate, { dir: "down", strength: 0.5, x, y: ry, w: pw, h: 14 });
      line(ctx, C.ink, 2);
      ctx.stroke(rope);
      line(ctx, C.ash, 1);
      ctx.beginPath();
      for (let t = 0; t < pw; t += 7) {
        ctx.moveTo(x + t, ry + 1);
        ctx.lineTo(x + t + 5, ry + 9);
      }
      ctx.stroke();
    }
    line(ctx, C.ink, 5);
    ctx.beginPath();
    ctx.moveTo(x + pw, top + 52);
    ctx.bezierCurveTo(x + pw + 40, top + 70, x + pw + 50, h - 10, x + pw + 10, h + 4);
    ctx.stroke();
    line(ctx, C.silver, 2.5);
    ctx.stroke();
  }
  paperTexture(ctx, FRONT_W, h, r, { strength: 1 });
  return lay;
}

// ---------------------------------------------------------------- per-frame drawing

function tile(ctx, lay, offset, y) {
  const w = lay.w;
  let x = -(((offset % w) + w) % w);
  for (; x < W; x += w) ctx.drawImage(lay.canvas, x, y, w, lay.h);
}

export function drawBackground(ctx, camX, g) {
  if (!L) paintAll();
  ctx.drawImage(L.sky.canvas, 0, 0, W, L.sky.h);

  // Clouds drift and squash on the beat.
  const span = 1300;
  const off = camX * 0.05 + g.time * 7;
  for (let i = -1; i < 3; i++) {
    const cell = Math.floor(off / span) + i;
    const hsh = Math.abs(Math.sin(cell * 91.7)) % 1;
    const cx = cell * span - off + hsh * 600;
    const cy = 10 + ((hsh * 7.3) % 1) * 120;
    const sc = 0.7 + ((hsh * 3.1) % 1) * 0.45;
    const k = 1 + g.beat * 0.05;
    const cl = L.clouds[((cell % 3) + 3) % 3];
    ctx.save();
    ctx.translate(cx + 220 * sc, cy + 160 * sc);
    ctx.scale(sc * k, sc / k);
    ctx.drawImage(cl.canvas, -220, -160, cl.w, cl.h);
    ctx.restore();
  }

  tile(ctx, L.hills, camX * 0.05, HILLS_TOP);
  tile(ctx, L.town, camX * 0.12, TOWN_TOP);
  for (const b of L.bands) tile(ctx, b, camX * b.parallax, b.top);

  // Distant boats on the far water.
  const bx = ((900 - camX * 0.16 + g.time * 14) % 2600 + 2600) % 2600 - 400;
  ctx.drawImage(L.boat.canvas, bx, HORIZON - 84 + 26 + Math.sin(g.time * 1.4) * 1.5, 150, 90);
  const sx = ((2100 - camX * 0.2 - g.time * 9) % 3000 + 3000) % 3000 - 300;
  ctx.drawImage(L.sail.canvas, sx, HORIZON - 40 + Math.sin(g.time * 1.1) * 1.5, 54, 66);

  drawGulls(ctx, camX, g);
}

function drawGulls(ctx, camX, g) {
  for (let i = 0; i < 3; i++) {
    const x = ((i * 520 + 200 - camX * 0.3 + g.time * (26 + i * 6)) % (W + 300) + W + 300) % (W + 300) - 150;
    const y = 120 + i * 46 + Math.sin(g.time * 0.7 + i * 2) * 14;
    gull(ctx, x, y, 0.8 + i * 0.12, Math.sin(g.time * 7 + i * 1.7));
  }
}

// A seagull in flight: white body, inked wings. flap is -1..1.
export function gull(ctx, x, y, s, flap) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  const wy = -8 * flap;
  ctx.beginPath();
  ctx.moveTo(-2, 0);
  ctx.quadraticCurveTo(-10, wy - 6, -22, wy);
  ctx.quadraticCurveTo(-12, wy + 2, -2, 4);
  ctx.moveTo(2, 0);
  ctx.quadraticCurveTo(10, wy - 6, 22, wy);
  ctx.quadraticCurveTo(12, wy + 2, 2, 4);
  ctx.fillStyle = C.paper;
  ctx.fill();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, 2, 6, 3.5, 0, 0, TAU);
  ctx.fillStyle = C.paper;
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = C.ink;
  ctx.beginPath();
  ctx.moveTo(-22, wy);
  ctx.lineTo(-17, wy - 1);
  ctx.lineTo(-18, wy + 2);
  ctx.closePath();
  ctx.moveTo(22, wy);
  ctx.lineTo(17, wy - 1);
  ctx.lineTo(18, wy + 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawForeground(ctx, camX, g) {
  if (!L) paintAll();
  // Near water over the submerged parts of barrels, pilings and the hull.
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = C.slate;
  ctx.fillRect(0, WATER + 8, W, H - WATER - 8);
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = C.charcoal;
  ctx.fillRect(0, WATER + 70, W, H - WATER - 70);
  ctx.globalAlpha = 1;
  // Wave marks on the near water, scattered irregularly, moving with the camera.
  const t = g.time;
  ctx.lineCap = "round";
  for (let row = 0; row < 4; row++) {
    const y0 = WATER + 26 + row * 26;
    const sp = 90 + row * 14;
    const off = camX * (1 + row * 0.08) + t * 16 * (row + 1);
    const first = Math.floor(off / sp) - 1;
    for (let cell = first; cell < first + W / sp + 3; cell++) {
      const hsh = Math.abs(Math.sin(cell * 12.9898 + row * 78.233) * 43758.5453) % 1;
      if (hsh < 0.3) continue;
      const x = cell * sp - off + hsh * sp * 0.7;
      const y = y0 + (hsh - 0.5) * 12;
      const s = (11 + row * 3) * (0.7 + hsh * 0.6);
      ctx.strokeStyle = C.ink;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y + 3);
      ctx.quadraticCurveTo(x + s * 0.6, y - s * 0.2 + 3, x + s * 1.2, y + 3);
      ctx.quadraticCurveTo(x + s * 1.8, y + s * 0.35 + 3, x + s * 2.4, y + 3);
      ctx.stroke();
      ctx.strokeStyle = C.paper;
      ctx.globalAlpha = 0.85;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + s * 0.6, y - s * 0.4, x + s * 1.2, y);
      ctx.quadraticCurveTo(x + s * 1.8, y + s * 0.35, x + s * 2.4, y);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  // Wavy surface line.
  const pts = [];
  for (let sx = -12; sx <= W + 12; sx += 12) {
    const wx = sx + camX;
    pts.push([sx, WATER + 8 + Math.sin(wx * 0.03 + t * 3) * 2.5 + Math.sin(wx * 0.011 - t * 1.7) * 1.5]);
  }
  ctx.strokeStyle = C.paper;
  ctx.lineWidth = 3;
  smoothPath(ctx, pts);
  ctx.stroke();
  tile(ctx, L.front, camX * 1.35, FRONT_TOP);
}

// A unified paper-and-watercolor finish over the whole illustrated frame:
// broad soft blooms, darker pooled edges and fine fibres. Painted once.
let finish = null;
export function drawPaperFinish(ctx) {
  if (!finish) {
    const lay = makeLayer(W, H, 1);
    const c = lay.ctx;
    const r = rng(2024);
    for (let i = 0; i < 70; i++) {
      const x = r() * W;
      const y = r() * H;
      const rad = 60 + r() * 220;
      const g = c.createRadialGradient(x, y, rad * 0.2, x, y, rad);
      const dark = r() < 0.6;
      g.addColorStop(0, dark ? "rgba(23,22,20,0.05)" : "rgba(248,246,240,0.06)");
      g.addColorStop(0.85, dark ? "rgba(23,22,20,0.035)" : "rgba(248,246,240,0.02)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = g;
      c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    // Pooled pigment toward the frame edges.
    const e = c.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, W * 0.62);
    e.addColorStop(0, "rgba(23,22,20,0)");
    e.addColorStop(1, "rgba(23,22,20,0.18)");
    c.fillStyle = e;
    c.fillRect(0, 0, W, H);
    // Paper fibres.
    c.strokeStyle = C.ink;
    c.lineWidth = 0.6;
    c.globalAlpha = 0.08;
    c.beginPath();
    for (let i = 0; i < 1400; i++) {
      const x = r() * W;
      const y = r() * H;
      const a = r() * TAU;
      const l = 2 + r() * 6;
      c.moveTo(x, y);
      c.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + 1, y + Math.sin(a) * l * 0.5 + 1, x + Math.cos(a) * l, y + Math.sin(a) * l);
    }
    c.stroke();
    finish = lay;
  }
  ctx.drawImage(finish.canvas, 0, 0, W, H);
}
