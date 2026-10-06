// Switchback Mountains: snowy peaks, pine ridges, rock pillars with a
// waterfall and a mine trestle, mist in the chasm below, rock-shelf ledges,
// boulders, and the Captain in a runaway steam mine cart.
import { CONFIG } from "../../config.js";
import { cached, plank, rope, layerRes, brush } from "../ink.js";
import { registerChaser } from "../../entities/chasers.js";
import { Chaser, captain } from "../../entities/chaser.js";
import {
  C, TAU, W, H, rng, makeLayer, wash, paperTexture, roughStroke, line, periodic, tile, paintSky, paintCloud, drawClouds, blob, pine, crow, drawMist,
} from "./common.js";

const PEAKS_W = 3200;
const PEAKS_TOP = 110;
const RIDGE_W = 3400;
const RIDGE_TOP = 300;
const CLIFF_W = 3800;
const CLIFF_TOP = 170;
const FRONT_W = 3600;
const FRONT_TOP = 470;

let L = null;

function paintAll() {
  const res = layerRes();
  L = {
    sky: paintSky(res, 560, [[0, C.ash], [0.5, C.silver], [1, C.paper]], 11, (ctx) => {
      ctx.beginPath();
      ctx.arc(980, 100, 46, 0, TAU);
      ctx.fillStyle = C.paper;
      ctx.fill();
      line(ctx, C.ash, 3);
      ctx.setLineDash([14, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    }),
    clouds: [0, 1, 2].map((i) => paintCloud(res, 201 + i)),
    peaks: paintPeaks(res),
    ridge: paintRidge(res),
    cliffs: paintCliffs(res),
    front: paintFront(res),
  };
}

// ---------------------------------------------------------------- far peaks

function paintPeaks(res) {
  const h = 430;
  const lay = makeLayer(PEAKS_W, h, res);
  const { ctx } = lay;
  const r = rng(21);
  const base = 330;
  // Jagged skyline: peaks with notches, returning to the base at both ends.
  const pts = [[0, base]];
  const peaks = [];
  for (let x = 140; x < PEAKS_W - 140; x += r.range(220, 340)) {
    const ph = r.range(130, 270);
    const lw = r.range(110, 170);
    const rw = r.range(110, 170);
    pts.push([x - lw, base - r.range(20, 60)]);
    pts.push([x - lw * 0.4, base - ph * 0.6]);
    pts.push([x, base - ph]);
    pts.push([x + rw * 0.35, base - ph * 0.7]);
    pts.push([x + rw * 0.55, base - ph * 0.62]);
    pts.push([x + rw, base - r.range(20, 70)]);
    peaks.push({ x, ph, lw, rw });
  }
  pts.push([PEAKS_W, base]);
  const p = new Path2D();
  p.moveTo(0, h);
  for (const [x, y] of pts) p.lineTo(x, y);
  p.lineTo(PEAKS_W, h);
  p.closePath();
  ctx.fillStyle = C.silver;
  ctx.fill(p);
  ctx.save();
  ctx.clip(p);
  for (const pk of peaks) {
    // Shadow face on the right of each peak.
    ctx.fillStyle = "rgba(92,89,85,0.35)";
    ctx.beginPath();
    ctx.moveTo(pk.x, base - pk.ph);
    ctx.lineTo(pk.x + pk.rw, base);
    ctx.lineTo(pk.x + pk.rw * 0.1, base);
    ctx.closePath();
    ctx.fill();
    // Snow cap with a ragged lower edge.
    const cap = new Path2D();
    const top = base - pk.ph;
    cap.moveTo(pk.x - pk.lw * 0.32, top + pk.ph * 0.45);
    cap.lineTo(pk.x, top);
    cap.lineTo(pk.x + pk.rw * 0.3, top + pk.ph * 0.36);
    for (let k = 0; k < 5; k++) {
      const u = 1 - k / 5;
      cap.lineTo(pk.x - pk.lw * 0.32 + (pk.rw * 0.3 + pk.lw * 0.32) * u, top + pk.ph * (0.36 + (k % 2 ? 0.12 : 0.02)));
    }
    cap.closePath();
    ctx.fillStyle = C.paper;
    ctx.fill(cap);
    line(ctx, C.ash, 1.2);
    ctx.stroke(cap);
    // Rock striations.
    line(ctx, C.ash, 1);
    for (let k = 0; k < 6; k++) {
      const yy = top + pk.ph * (0.5 + k * 0.08);
      ctx.beginPath();
      ctx.moveTo(pk.x + r.range(-20, 20), yy);
      ctx.lineTo(pk.x + r.range(30, 70), yy + r.range(10, 26));
      ctx.stroke();
    }
  }
  ctx.restore();
  line(ctx, C.slate, 2);
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  paperTexture(ctx, PEAKS_W, h, r, { strength: 1.1 });
  return lay;
}

// ---------------------------------------------------------------- forested ridges

function paintRidge(res) {
  const h = 320;
  const lay = makeLayer(RIDGE_W, h, res);
  const { ctx } = lay;
  const r = rng(33);
  const top = (x) => 90 + periodic(x, RIDGE_W, [[30, 2, 0.3], [18, 5, 1.2], [8, 11, 2.4]]);
  const p = new Path2D();
  p.moveTo(0, h);
  for (let x = 0; x <= RIDGE_W; x += 12) p.lineTo(x, top(x));
  p.lineTo(RIDGE_W, h);
  p.closePath();
  wash(ctx, p, C.ash, C.slate, { dir: "down", strength: 0.5, x: 0, y: 40, w: RIDGE_W, h: h - 40 });
  line(ctx, C.slate, 2);
  ctx.beginPath();
  for (let x = 0; x <= RIDGE_W; x += 12) ctx[x ? "lineTo" : "moveTo"](x, top(x));
  ctx.stroke();
  // Pines along the crest and scattered down the slope.
  for (let x = 10; x < RIDGE_W - 10; x += r.range(16, 34)) {
    pine(ctx, x, top(x) + 6, r.range(28, 48), r, { fill: C.slate, ink: C.charcoal, lw: 1.2 });
  }
  for (let i = 0; i < 90; i++) {
    const x = r.range(20, RIDGE_W - 20);
    pine(ctx, x, top(x) + r.range(40, 160), r.range(26, 40), r, { fill: C.slate, ink: C.charcoal, lw: 1.1 });
  }
  paperTexture(ctx, RIDGE_W, h, r, { strength: 1 });
  return lay;
}

// ---------------------------------------------------------------- rock pillars, waterfall, mine

function rockPillar(ctx, x, w, top, bottom, r, fill = C.silver) {
  const pts = [];
  const steps = 8;
  for (let i = 0; i <= steps; i++) pts.push([x + r.range(-10, 6) + (i / steps) * 10, top + ((bottom - top) * i) / steps]);
  const rpts = [];
  for (let i = steps; i >= 0; i--) rpts.push([x + w + r.range(-6, 10) - (i / steps) * 10, top + ((bottom - top) * i) / steps]);
  const p = new Path2D();
  p.moveTo(x + 10, top - 6);
  p.quadraticCurveTo(x + w / 2, top - 22, x + w - 10, top - 6);
  for (const [px, py] of rpts.reverse()) p.lineTo(px, py);
  for (const [px, py] of pts.reverse()) p.lineTo(px, py);
  p.closePath();
  wash(ctx, p, fill, C.ink, { dir: "right", strength: 0.6, x, y: top, w, h: bottom - top });
  ctx.save();
  ctx.clip(p);
  line(ctx, C.ash, 1.2);
  for (let yy = top + 14; yy < bottom; yy += r.range(14, 26)) {
    ctx.beginPath();
    ctx.moveTo(x, yy);
    ctx.bezierCurveTo(x + w * 0.3, yy + r.range(-4, 4), x + w * 0.7, yy + r.range(-4, 4), x + w, yy + r.range(-3, 3));
    ctx.stroke();
  }
  line(ctx, C.slate, 1.4);
  for (let k = 0; k < w / 30; k++) {
    let cx = x + r.range(10, w - 10);
    let cy = top + r.range(10, (bottom - top) * 0.7);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    for (let s = 0; s < 4; s++) {
      cx += r.range(-8, 8);
      cy += r.range(8, 18);
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }
  // Grassy cap.
  ctx.fillStyle = C.ash;
  ctx.fillRect(x - 10, top - 26, w + 20, 14);
  ctx.restore();
  roughStroke(ctx, p, 2.2, C.charcoal);
  for (let gx = x + 6; gx < x + w - 6; gx += r.range(6, 12)) brush(ctx, [[gx, top - 8], [gx + r.range(-2, 3), top - 8 - r.range(4, 9)]], r, { w: 2, color: C.charcoal });
  return p;
}

function paintCliffs(res) {
  const h = H - CLIFF_TOP;
  const lay = makeLayer(CLIFF_W, h, res);
  const { ctx } = lay;
  const r = rng(57);
  // The canyon behind darkens toward the bottom.
  const g = ctx.createLinearGradient(0, 260, 0, h);
  g.addColorStop(0, "rgba(46,44,41,0)");
  g.addColorStop(1, "rgba(46,44,41,0.95)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 260, CLIFF_W, h - 260);
  const pillars = [];
  for (let x = 80; x < CLIFF_W - 260; x += r.range(420, 640)) pillars.push([x, r.range(140, 220), r.range(110, 190)]);
  pillars.forEach(([x, w, top], i) => {
    rockPillar(ctx, x, w, top, h + 10, r);
    if (i % 3 === 1) {
      // Waterfall pouring off the top into the canyon mist.
      const wx = x + w * 0.35;
      ctx.save();
      const fall = new Path2D();
      fall.rect(wx, top - 10, 34, h - top);
      ctx.fillStyle = C.paper;
      ctx.globalAlpha = 0.85;
      ctx.fill(fall);
      ctx.globalAlpha = 1;
      line(ctx, C.ash, 1.4);
      for (let k = 0; k < 5; k++) {
        ctx.beginPath();
        ctx.moveTo(wx + 4 + k * 7, top);
        ctx.lineTo(wx + 4 + k * 7 + r.range(-2, 2), h);
        ctx.stroke();
      }
      ctx.restore();
    }
    if (i % 3 === 2) {
      // Mine entrance framed with timbers.
      const mx = x + w * 0.3;
      const my = top + 90;
      ctx.fillStyle = C.ink;
      ctx.beginPath();
      ctx.moveTo(mx, my + 70);
      ctx.lineTo(mx, my + 12);
      ctx.quadraticCurveTo(mx + 30, my - 8, mx + 60, my + 12);
      ctx.lineTo(mx + 60, my + 70);
      ctx.closePath();
      ctx.fill();
      for (const tx of [mx - 6, mx + 58]) {
        ctx.fillStyle = C.ash;
        ctx.fillRect(tx, my + 4, 8, 66);
        line(ctx, C.ink, 1.6);
        ctx.strokeRect(tx, my + 4, 8, 66);
      }
      ctx.fillStyle = C.ash;
      ctx.fillRect(mx - 10, my - 2, 80, 9);
      ctx.strokeRect(mx - 10, my - 2, 80, 9);
    }
  });
  // A timber trestle with a mine track between two pillars.
  for (let i = 0; i < pillars.length - 1; i += 2) {
    const [ax, aw, at] = pillars[i];
    const [bx] = pillars[i + 1];
    const y = at + 40;
    const x0 = ax + aw - 10;
    const x1 = bx + 10;
    line(ctx, C.charcoal, 2.4);
    ctx.beginPath();
    for (let x = x0; x < x1; x += 34) {
      ctx.moveTo(x, y);
      ctx.lineTo(x + 17, y + 60);
      ctx.lineTo(x + 34, y);
      ctx.moveTo(x + 17, y + 60);
      ctx.lineTo(x + 17, h);
    }
    ctx.stroke();
    ctx.fillStyle = C.ash;
    ctx.fillRect(x0, y - 8, x1 - x0, 8);
    line(ctx, C.ink, 1.6);
    ctx.strokeRect(x0, y - 8, x1 - x0, 8);
    ctx.beginPath();
    ctx.moveTo(x0, y - 11);
    ctx.lineTo(x1, y - 11);
    ctx.stroke();
  }
  paperTexture(ctx, CLIFF_W, h, r, { strength: 1.1 });
  // Aerial haze so the far cliffs never read as platforms you can stand on.
  ctx.save();
  ctx.globalCompositeOperation = "source-atop";
  const haze = ctx.createLinearGradient(0, 0, 0, h);
  haze.addColorStop(0, "rgba(207,203,195,0.42)");
  haze.addColorStop(1, "rgba(207,203,195,0.18)");
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, CLIFF_W, h);
  ctx.restore();
  return lay;
}

// ---------------------------------------------------------------- foreground pines

function paintFront(res) {
  const h = H - FRONT_TOP;
  const lay = makeLayer(FRONT_W, h, res);
  const { ctx } = lay;
  const r = rng(91);
  for (let x = 400; x < FRONT_W - 200; x += r.range(900, 1400)) {
    pine(ctx, x, h + 30, r.range(200, 260), r, { fill: C.charcoal, ink: C.ink, lw: 2.4 });
    pine(ctx, x + 70, h + 30, r.range(150, 200), r, { fill: C.charcoal, ink: C.ink, lw: 2.2 });
  }
  return lay;
}

export function drawBackground(ctx, camX, g) {
  if (!L) paintAll();
  ctx.drawImage(L.sky.canvas, 0, 0, W, L.sky.h);
  drawClouds(ctx, L.clouds, camX, g, { y0: 0, spread: 90 });
  tile(ctx, L.peaks, camX * 0.04, PEAKS_TOP);
  tile(ctx, L.ridge, camX * 0.12, RIDGE_TOP);
  tile(ctx, L.cliffs, camX * 0.3, CLIFF_TOP);
}

export function drawForeground(ctx, camX, g) {
  if (!L) paintAll();
  drawMist(ctx, camX, g, { top: 640 });
  tile(ctx, L.front, camX * 1.35, FRONT_TOP);
}

// ---------------------------------------------------------------- skins

function paintRockLedge(ctx, w, depth, seed) {
  const r = rng(seed);
  ctx.translate(10, 8);
  const p = new Path2D();
  p.moveTo(-4, 2);
  for (let x = 0; x <= w; x += 20) p.lineTo(x, r.range(-1.5, 1.5));
  p.lineTo(w + 4, 2);
  let y = 2;
  for (; y < depth; y += 24) p.lineTo(w + 4 - Math.min(14, y * 0.08) + r.range(-5, 5), y);
  p.lineTo(w - 10, depth + 10);
  p.lineTo(10, depth + 10);
  for (y = depth; y > 2; y -= 24) p.lineTo(-4 + Math.min(14, y * 0.08) + r.range(-5, 5), y);
  p.closePath();
  const g = ctx.createLinearGradient(0, 0, 0, depth);
  g.addColorStop(0, C.silver);
  g.addColorStop(0.5, C.ash);
  g.addColorStop(1, C.charcoal);
  ctx.fillStyle = g;
  ctx.fill(p);
  ctx.save();
  ctx.clip(p);
  // Shadowed right side, strata, cracks and embedded stones.
  const sg = ctx.createLinearGradient(w * 0.6, 0, w, 0);
  sg.addColorStop(0, "rgba(23,22,20,0)");
  sg.addColorStop(1, "rgba(23,22,20,0.35)");
  ctx.fillStyle = sg;
  ctx.fillRect(0, 0, w + 10, depth + 10);
  line(ctx, C.slate, 1.2);
  for (let yy = 26; yy < depth; yy += r.range(16, 28)) {
    ctx.beginPath();
    ctx.moveTo(-4, yy);
    for (let x = 0; x <= w + 8; x += 30) ctx.lineTo(x, yy + r.range(-3, 3));
    ctx.stroke();
  }
  line(ctx, C.ink, 1.4);
  for (let k = 0; k < Math.max(2, w / 70); k++) {
    let cx = r.range(10, w - 10);
    let cy = r.range(14, 60);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    for (let s = 0; s < 5; s++) {
      cx += r.range(-9, 9);
      cy += r.range(8, 16);
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }
  for (let k = 0; k < w / 50; k++) {
    const sx = r.range(10, w - 10);
    const sy = r.range(30, Math.min(depth - 20, 150));
    const rs = r.range(5, 12);
    const st = new Path2D();
    st.ellipse(sx, sy, rs * 1.3, rs, r.range(-0.4, 0.4), 0, TAU);
    wash(ctx, st, C.silver, C.ink, { dir: "right", strength: 0.5, x: sx - rs * 1.3, y: sy - rs, w: rs * 2.6, h: rs * 2 });
    line(ctx, C.slate, 1.2);
    ctx.stroke(st);
  }
  // Grass and moss on the top lip.
  ctx.fillStyle = C.ash;
  ctx.fillRect(-6, -2, w + 12, 9);
  ctx.restore();
  roughStroke(ctx, p, 3, C.ink);
  for (let gx = 2; gx < w - 2; gx += r.range(5, 11)) {
    brush(ctx, [[gx, 1], [gx + r.range(-3, 4), -r.range(5, 11)]], r, { w: 2.4, color: C.charcoal });
  }
  for (let k = 0; k < w / 120; k++) {
    const fx = r.range(20, w - 20);
    ctx.fillStyle = C.paper;
    for (let a = 0; a < 5; a++) {
      ctx.beginPath();
      ctx.arc(fx + Math.cos((a * TAU) / 5) * 3, -8 + Math.sin((a * TAU) / 5) * 3, 2.2, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    ctx.arc(fx, -8, 1.4, 0, TAU);
    ctx.fill();
  }
}

function ledge(ctx, d, g) {
  const depth = H - d.y + 20;
  const spr = cached(`mtn:ledge:${d.x}:${d.w}`, d.w + 20, depth + 30, (c) => paintRockLedge(c, d.w, depth, d.x + 3));
  ctx.drawImage(spr.canvas, d.x - 10, d.y - 8, spr.w, spr.h);
}

function paintBoulder(ctx, w, h, seed, cracked) {
  const r = rng(seed);
  ctx.translate(6, 6);
  const p = new Path2D();
  const n = 9;
  for (let i = 0; i <= n; i++) {
    const a = Math.PI + (i / n) * Math.PI;
    const rx = (w / 2) * r.range(0.9, 1.05);
    const ry = h * r.range(0.92, 1.02);
    const px = w / 2 + Math.cos(a) * rx;
    const py = h + Math.sin(a) * ry;
    if (i === 0) p.moveTo(px, h);
    p.lineTo(px, Math.min(h, py));
  }
  p.lineTo(w, h);
  p.closePath();
  wash(ctx, p, C.silver, C.ink, { dir: "right", strength: 0.6, x: 0, y: 0, w, h });
  ctx.save();
  ctx.clip(p);
  line(ctx, C.ash, 1.2);
  for (let k = 0; k < 4; k++) {
    ctx.beginPath();
    ctx.moveTo(r.range(0, w), r.range(h * 0.3, h));
    ctx.quadraticCurveTo(r.range(0, w), r.range(0, h), r.range(0, w), r.range(h * 0.2, h));
    ctx.stroke();
  }
  if (cracked) {
    line(ctx, C.ink, 2.4);
    ctx.beginPath();
    let cx = w * 0.5;
    let cy = 6;
    ctx.moveTo(cx, cy);
    for (let s = 0; s < 6; s++) {
      cx += r.range(-14, 14);
      cy += h / 6;
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
    line(ctx, C.paper, 1);
    ctx.stroke();
  }
  ctx.restore();
  roughStroke(ctx, p, 3, C.ink);
}

function block(ctx, b) {
  const spr = cached(`mtn:block:${b.x}:${b.y}:${b.w}:${b.h}`, b.w + 12, b.h + 12, (c) => paintBoulder(c, b.w, b.h, b.x + b.y, b.breakable));
  ctx.drawImage(spr.canvas, b.x - 6, b.y - 6, spr.w, spr.h);
}

function crumble(ctx, c) {
  // Drawn centred at the slab's top middle (the entity translates for us).
  const spr = cached(`mtn:crumble:${c.w}`, c.w + 12, 70, (k) => {
    k.translate(6, 6);
    const r = rng(c.w);
    const p = new Path2D();
    p.moveTo(0, 0);
    p.lineTo(c.w, 0);
    p.lineTo(c.w - 10, 30);
    p.lineTo(c.w * 0.6, 50);
    p.lineTo(c.w * 0.3, 44);
    p.lineTo(8, 28);
    p.closePath();
    wash(k, p, C.ash, C.ink, { dir: "down", strength: 0.5, x: 0, y: 0, w: c.w, h: 50 });
    k.save();
    k.clip(p);
    line(k, C.ink, 1.8);
    k.beginPath();
    k.moveTo(c.w * 0.45, 0);
    k.lineTo(c.w * 0.52, 14);
    k.lineTo(c.w * 0.4, 26);
    k.lineTo(c.w * 0.55, 44);
    k.stroke();
    k.fillStyle = C.ash;
    k.fillRect(0, 0, c.w, 6);
    k.restore();
    roughStroke(k, p, 2.6);
    for (let gx = 4; gx < c.w - 4; gx += r.range(6, 12)) brush(k, [[gx, 1], [gx + r.range(-3, 3), -r.range(4, 9)]], r, { w: 2, color: C.charcoal });
  });
  ctx.drawImage(spr.canvas, -c.w / 2 - 6, -6, spr.w, spr.h);
}

function hook(ctx, k, g) {
  // A rope hanging from a gnarled branch reaching in from above.
  const { x, y } = k;
  const sw = Math.sin(g.time * 1.5 + x) * 3;
  const spr = cached("mtn:branch", 260, 120, (c) => {
    const r = rng(4);
    brush(c, [[250, 10], [180, 40], [120, 52], [60, 70], [10, 78]], r, { w: 16, color: C.ink, taper: 0.6 });
    brush(c, [[250, 10], [180, 40], [120, 52], [60, 70], [10, 78]], r, { w: 9, color: C.slate, taper: 0.6 });
    brush(c, [[150, 46], [130, 20], [110, 8]], r, { w: 7, color: C.ink, taper: 0.8 });
    for (let i = 0; i < 6; i++) pine(c, 40 + i * 32, 80 + (i % 2) * 6, 26, r, { fill: C.slate, ink: C.ink, lw: 1.2 });
  });
  ctx.drawImage(spr.canvas, x - 30, Math.min(40, y - 200), 260, 120);
  rope(ctx, [[x, Math.min(40, y - 200) + 74], [x + sw * 0.5, (y + 40) / 2], [x + sw, y - 12]], 5);
  const ring = new Path2D();
  ring.arc(x + sw, y, 13, 0, TAU);
  ring.arc(x + sw, y, 7, 0, TAU, true);
  wash(ctx, ring, C.ash, C.ink, { dir: "right", strength: 0.6, x: x - 13, y: y - 13, w: 26, h: 26 });
  roughStroke(ctx, ring, 2.4);
}

function lift(ctx, l) {
  // A mine elevator cage platform on two cables.
  line(ctx, C.ink, 2.4);
  for (const cx of [l.x + 12, l.x + l.w - 12]) {
    ctx.beginPath();
    ctx.moveTo(cx, -20);
    ctx.lineTo(cx, l.y);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(l.x + 12, l.y - 40);
  ctx.lineTo(l.x + l.w - 12, l.y - 40);
  ctx.stroke();
  const spr = cached(`mtn:lift:${l.w}`, l.w + 8, 36, (c) => {
    const r = rng(l.w);
    c.translate(4, 4);
    plank(c, 0, 0, l.w, 12, r, { fill: C.ash, line: 2 });
    c.fillStyle = C.charcoal;
    c.fillRect(4, 12, l.w - 8, 10);
    line(c, C.ink, 1.6);
    c.strokeRect(4, 12, l.w - 8, 10);
    for (let x = 10; x < l.w - 4; x += 20) {
      c.fillStyle = C.silver;
      c.beginPath();
      c.arc(x, 17, 1.8, 0, TAU);
      c.fill();
    }
  });
  ctx.drawImage(spr.canvas, l.x - 4, l.y - 4, spr.w, spr.h);
}

// ---------------------------------------------------------------- decos

function decoPine(ctx, d) {
  const spr = cached("mtn:pine", 120, 180, (c) => pine(c, 60, 176, 160, rng(8), { fill: C.slate, ink: C.ink, lw: 2 }));
  ctx.drawImage(spr.canvas, d.x - 60, d.y - 176, 120, 180);
}

function decoSign(ctx, d) {
  const spr = cached("mtn:sign", 140, 130, (c) => {
    const r = rng(9);
    plank(c, 64, 30, 12, 98, r, { fill: C.ash, horizontal: false, nails: false, line: 2 });
    c.save();
    c.translate(70, 40);
    c.rotate(-0.05);
    const a = new Path2D();
    a.moveTo(-60, -16);
    a.lineTo(44, -16);
    a.lineTo(62, 0);
    a.lineTo(44, 16);
    a.lineTo(-60, 16);
    a.closePath();
    wash(c, a, C.silver, C.ink, { dir: "down", strength: 0.4, x: -60, y: -16, w: 122, h: 32 });
    roughStroke(c, a, 2.4);
    c.fillStyle = C.ink;
    c.font = 'bold 14px Georgia, "Times New Roman", serif';
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText("THE PASS", 0, 1);
    c.restore();
  });
  ctx.drawImage(spr.canvas, d.x - 70, d.y - 126, 140, 130);
}

function decoLantern(ctx, d, g) {
  const spr = cached("mtn:lantern", 80, 150, (c) => {
    const r = rng(10);
    plank(c, 34, 30, 12, 118, r, { fill: C.ash, horizontal: false, nails: false, line: 2 });
    line(c, C.ink, 3);
    c.beginPath();
    c.moveTo(40, 34);
    c.lineTo(62, 34);
    c.lineTo(62, 44);
    c.stroke();
  });
  ctx.drawImage(spr.canvas, d.x - 40, d.y - 146, 80, 150);
  const sw = Math.sin(g.time * 2 + d.x) * 0.1;
  ctx.save();
  ctx.translate(d.x + 22, d.y - 102);
  ctx.rotate(sw);
  const glass = new Path2D();
  glass.rect(-9, 6, 18, 22);
  wash(ctx, glass, C.paper, C.silver, { dir: "right", strength: 0.6, x: -9, y: 6, w: 18, h: 22 });
  line(ctx, C.ink, 2);
  ctx.stroke(glass);
  ctx.fillStyle = C.charcoal;
  ctx.beginPath();
  ctx.moveTo(-11, 6);
  ctx.lineTo(0, -2);
  ctx.lineTo(11, 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillRect(-10, 28, 20, 5);
  ctx.restore();
}

function decoCairn(ctx, d) {
  const spr = cached("mtn:cairn", 70, 80, (c) => {
    const stones = [[35, 66, 26, 12], [33, 48, 20, 10], [37, 32, 15, 9], [35, 18, 10, 7]];
    for (const [x, y, rx, ry] of stones) blob(c, [[x, y, rx, ry]], { fill: C.silver, ink: C.ink, lw: 1.4 });
  });
  ctx.drawImage(spr.canvas, d.x - 35, d.y - 78, 70, 80);
}

function decoLogs(ctx, d) {
  const spr = cached("mtn:logs", 160, 110, (c) => {
    const r = rng(12);
    const logs = [[20, 92], [60, 92], [100, 92], [140, 92], [40, 62], [80, 62], [120, 62], [60, 32], [100, 32]];
    for (const [x, y] of logs) {
      const p = new Path2D();
      p.arc(x, y, 17, 0, TAU);
      wash(c, p, C.silver, C.slate, { dir: "right", strength: 0.5, x: x - 17, y: y - 17, w: 34, h: 34 });
      roughStroke(c, p, 2.2);
      line(c, C.ash, 1);
      for (const rr of [5, 10]) {
        c.beginPath();
        c.arc(x + r.range(-1, 1), y, rr, 0, TAU);
        c.stroke();
      }
    }
  });
  ctx.drawImage(spr.canvas, d.x - 80, d.y - 108, 160, 110);
}

function decoShack(ctx, d) {
  const spr = cached("mtn:shack", 300, 260, (c) => {
    const r = rng(14);
    c.translate(20, 250);
    for (let x = 0; x < 220; x += 22) plank(c, x, -150, 22, 150, r, { fill: x % 44 ? C.silver : C.ash, horizontal: false, line: 1.6 });
    const door = new Path2D();
    door.rect(30, -100, 52, 100);
    wash(c, door, C.charcoal, null);
    roughStroke(c, door, 2.4);
    const win = new Path2D();
    win.rect(130, -112, 56, 42);
    wash(c, win, C.slate, null);
    roughStroke(c, win, 2.4);
    line(c, C.ink, 2);
    c.beginPath();
    c.moveTo(158, -112);
    c.lineTo(158, -70);
    c.moveTo(130, -91);
    c.lineTo(186, -91);
    c.stroke();
    const roof = new Path2D();
    roof.moveTo(-18, -146);
    roof.lineTo(110, -222);
    roof.lineTo(238, -146);
    roof.closePath();
    wash(c, roof, C.slate, C.ink, { dir: "down", strength: 0.5, x: -18, y: -222, w: 256, h: 76 });
    c.save();
    c.clip(roof);
    line(c, C.ash, 1.2);
    for (let yy = -220; yy < -140; yy += 9) {
      c.beginPath();
      c.moveTo(-20, yy);
      c.lineTo(240, yy);
      c.stroke();
    }
    c.restore();
    roughStroke(c, roof, 3);
    // Pickaxe leaning by the door.
    line(c, C.ink, 4);
    c.beginPath();
    c.moveTo(96, -4);
    c.lineTo(110, -70);
    c.stroke();
    c.beginPath();
    c.moveTo(96, -74);
    c.quadraticCurveTo(112, -82, 126, -66);
    c.stroke();
  });
  ctx.drawImage(spr.canvas, d.x - 20, d.y - 250, 300, 260);
}

function decoCrow(ctx, d, g) {
  if (d.fly && d.fly > 4) return;
  crow(ctx, d.x, d.y, g.time, d.fly, d.gx, d.gy);
}

// ---------------------------------------------------------------- the runaway mine cart

class MineCart extends Chaser {
  smokeOrigins() {
    return [[-250, -230]];
  }

  paint(ctx, g) {
    const t = g.time;
    // Track on a trestle.
    ctx.fillStyle = C.charcoal;
    line(ctx, C.ink, 2);
    for (let x = -900 - ((this.wheel * 12) % 60); x < 60; x += 60) {
      ctx.fillRect(x, -6, 34, 10);
      ctx.strokeRect(x, -6, 34, 10);
    }
    line(ctx, C.ink, 4);
    ctx.beginPath();
    ctx.moveTo(-900, -8);
    ctx.lineTo(60, -8);
    ctx.stroke();
    line(ctx, C.charcoal, 2.4);
    ctx.beginPath();
    for (let x = -900 - ((this.wheel * 12) % 80); x < 60; x += 80) {
      ctx.moveTo(x, 4);
      ctx.lineTo(x + 40, 120);
      ctx.lineTo(x + 80, 4);
    }
    ctx.stroke();
    const spr = cached("mtn:cart", 520, 320, paintCart);
    ctx.drawImage(spr.canvas, -480, -300, 520, 320);
    captain(ctx, -120, -150, t, 1.15);
    // Wheels.
    for (const wx of [-380, -280, -150, -50]) {
      ctx.save();
      ctx.translate(wx, -30);
      ctx.rotate(this.wheel);
      ctx.beginPath();
      ctx.arc(0, 0, 24, 0, TAU);
      ctx.fillStyle = C.charcoal;
      ctx.fill();
      line(ctx, C.ink, 3);
      ctx.stroke();
      line(ctx, C.ash, 2.5);
      ctx.beginPath();
      for (let k = 0; k < 4; k++) {
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos((k * TAU) / 4) * 20, Math.sin((k * TAU) / 4) * 20);
      }
      ctx.stroke();
      ctx.restore();
    }
    // Sparks off the rails.
    ctx.fillStyle = C.paper;
    for (let i = 0; i < 6; i++) {
      const a = (t * 20 + i * 1.7) % 1;
      ctx.globalAlpha = 1 - a;
      ctx.beginPath();
      ctx.arc(-30 + a * 60 + i * 4, -6 - a * 30 - (i % 3) * 6, 2.2, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (this.tootT > 0) {
      const k = 1 - this.tootT / 0.7;
      ctx.fillStyle = C.paper;
      ctx.strokeStyle = C.ash;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(-220 - i * 14, -320 - k * 40 - i * 10, 10 + k * 16, 0, TAU);
        ctx.fill();
        ctx.stroke();
      }
    }
  }
}

function paintCart(c) {
  const r = rng(77);
  c.translate(480, 300);
  // Little steam engine pushing at the back: boiler and stack.
  const boiler = new Path2D();
  boiler.rect(-470, -170, 150, 110);
  wash(c, boiler, C.slate, C.ink, { dir: "down", strength: 0.5, x: -470, y: -170, w: 150, h: 110 });
  roughStroke(c, boiler, 3);
  c.fillStyle = C.ink;
  c.fillRect(-280, -290, 30, 130);
  c.fillRect(-292, -300, 54, 16);
  line(c, C.ash, 2);
  for (let y = -160; y < -64; y += 22) {
    c.beginPath();
    c.moveTo(-470, y);
    c.lineTo(-320, y);
    c.stroke();
  }
  const cab = new Path2D();
  cab.rect(-320, -210, 90, 150);
  wash(c, cab, C.ash, C.ink, { dir: "right", strength: 0.5, x: -320, y: -210, w: 90, h: 150 });
  roughStroke(c, cab, 3);
  // The ore cart itself: riveted iron tub, wider at the top.
  const tub = new Path2D();
  tub.moveTo(-230, -160);
  tub.lineTo(20, -160);
  tub.lineTo(0, -46);
  tub.lineTo(-210, -46);
  tub.closePath();
  wash(c, tub, C.ash, C.ink, { dir: "right", strength: 0.6, x: -230, y: -160, w: 250, h: 114 });
  c.save();
  c.clip(tub);
  line(c, C.slate, 1.4);
  for (let y = -150; y < -50; y += 26) {
    c.beginPath();
    c.moveTo(-240, y);
    c.lineTo(30, y);
    c.stroke();
  }
  c.fillStyle = C.ink;
  for (let x = -220; x < 10; x += 22) {
    for (const y of [-152, -56]) {
      c.beginPath();
      c.arc(x + r.range(-1, 1), y, 2.4, 0, TAU);
      c.fill();
    }
  }
  c.restore();
  roughStroke(c, tub, 4);
  c.fillStyle = C.silver;
  c.fillRect(-236, -168, 262, 10);
  line(c, C.ink, 2.4);
  c.strokeRect(-236, -168, 262, 10);
  c.fillStyle = C.charcoal;
  c.fillRect(-470, -60, 490, 18);
  c.strokeRect(-470, -60, 490, 18);
}

registerChaser("minecart", MineCart);

export default {
  id: "mountains",
  name: "Switchback Mountains",
  decoKinds: ["pine", "sign", "lantern", "cairn"],
  perch: "crow",
  landingSign: "THE MOUNTAIN PASS",
  fall: { fx: "dust", text: "WHOOPS!" },
  chaser: "minecart",
  drawBackground,
  drawForeground,
  skins: { ledge, block, crumble, hook, lift },
  decos: {
    pine: decoPine,
    sign: decoSign,
    lantern: decoLantern,
    cairn: decoCairn,
    stack: decoLogs,
    shed: decoShack,
    crow: decoCrow,
  },
};
