// Shared painting helpers for zone themes: tiled parallax layers, skies,
// clouds, birds, rock and foliage shapes, and drifting mist.
import { PALETTE as C } from "../palette.js";
import { CONFIG } from "../../config.js";
import { TAU, rng, makeLayer, wash, paperTexture, roughStroke } from "../ink.js";

export const W = CONFIG.width;
export const H = CONFIG.height;

export function line(ctx, color, w) {
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
}

export function periodic(x, period, terms) {
  let y = 0;
  for (const [amp, k, ph] of terms) y += amp * Math.sin((x / period) * TAU * k + ph);
  return y;
}

// Draw a horizontally repeating layer at a parallax offset.
export function tile(ctx, lay, offset, y) {
  const w = lay.w;
  let x = -(((offset % w) + w) % w);
  for (; x < W; x += w) ctx.drawImage(lay.canvas, x, y, w, lay.h);
}

// A vertical-gradient sky with mottled paper grain. stops: [[0, color], ...]
export function paintSky(res, h, stops, seed = 7, extra = null) {
  const lay = makeLayer(W, h, res);
  const { ctx } = lay;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  for (const [k, c] of stops) g.addColorStop(k, c);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, h);
  extra?.(ctx);
  paperTexture(ctx, W, h, rng(seed), { strength: 1.4, blot: 1.6 });
  return lay;
}

// Puffy cloud with a broken ink outline and a soft gray belly.
export function paintCloud(res, seed, { fill = C.paper, belly = "rgba(154,150,143,0.75)", ink = C.charcoal } = {}) {
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
  ctx.save();
  line(ctx, ink, 5);
  ctx.setLineDash([18, 6, 4, 6]);
  ctx.stroke(path);
  ctx.restore();
  ctx.fillStyle = fill;
  ctx.fill(path);
  ctx.save();
  ctx.clip(path);
  const g = ctx.createLinearGradient(0, 90, 0, 160);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, belly);
  ctx.fillStyle = g;
  ctx.fillRect(0, 60, 440, 110);
  ctx.restore();
  paperTexture(ctx, 440, 200, r, { strength: 1.2 });
  return lay;
}

export function drawClouds(ctx, clouds, camX, g, { y0 = 10, spread = 120, speed = 7 } = {}) {
  const span = 1300;
  const off = camX * 0.05 + g.time * speed;
  for (let i = -1; i < 3; i++) {
    const cell = Math.floor(off / span) + i;
    const hsh = Math.abs(Math.sin(cell * 91.7)) % 1;
    const cx = cell * span - off + hsh * 600;
    const cy = y0 + ((hsh * 7.3) % 1) * spread;
    const sc = 0.7 + ((hsh * 3.1) % 1) * 0.45;
    const k = 1 + g.beat * 0.05;
    const cl = clouds[((cell % clouds.length) + clouds.length) % clouds.length];
    ctx.save();
    ctx.translate(cx + 220 * sc, cy + 160 * sc);
    ctx.scale(sc * k, sc / k);
    ctx.drawImage(cl.canvas, -220, -160, cl.w, cl.h);
    ctx.restore();
  }
}

// A rounded union of lobes with one inked silhouette, shaded underside.
export function blob(ctx, lobes, { fill = C.silver, ink = C.charcoal, lw = 1.6, shade = 0.38 } = {}) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const p = new Path2D();
  for (const [x, y, rx, ry] of lobes) {
    p.moveTo(x + rx, y);
    p.ellipse(x, y, rx, ry, 0, 0, TAU);
    minX = Math.min(minX, x - rx);
    maxX = Math.max(maxX, x + rx);
    minY = Math.min(minY, y - ry);
    maxY = Math.max(maxY, y + ry);
  }
  ctx.save();
  line(ctx, ink, lw * 2);
  ctx.stroke(p);
  ctx.restore();
  ctx.fillStyle = fill;
  ctx.fill(p);
  ctx.save();
  ctx.clip(p);
  const g = ctx.createLinearGradient(minX, minY, minX + (maxX - minX) * 0.6, maxY);
  g.addColorStop(0, "rgba(248,246,240,0.5)");
  g.addColorStop(0.45, "rgba(248,246,240,0)");
  g.addColorStop(1, `rgba(23,22,20,${shade})`);
  ctx.fillStyle = g;
  ctx.fillRect(minX, minY, maxX - minX, maxY - minY);
  ctx.restore();
  return p;
}

// A pine tree: stacked inked tiers with a shaded side.
export function pine(ctx, x, base, h, r, { fill = C.slate, ink = C.ink, lw = 1.6 } = {}) {
  const tiers = 4;
  ctx.fillStyle = C.charcoal;
  ctx.fillRect(x - 3, base - h * 0.18, 6, h * 0.18);
  for (let i = 0; i < tiers; i++) {
    const tb = base - h * 0.12 - (i * h * 0.78) / tiers;
    const tw = (h * 0.42 * (tiers - i)) / tiers;
    const th = h * 0.36;
    const p = new Path2D();
    p.moveTo(x - tw, tb);
    p.quadraticCurveTo(x - tw * 0.3, tb - th * 0.4, x, tb - th);
    p.quadraticCurveTo(x + tw * 0.3, tb - th * 0.4, x + tw, tb);
    p.quadraticCurveTo(x, tb - th * 0.12, x - tw, tb);
    p.closePath();
    wash(ctx, p, fill, C.ink, { dir: "right", strength: 0.45, x: x - tw, y: tb - th, w: tw * 2, h: th });
    line(ctx, ink, lw);
    ctx.stroke(p);
  }
}

// A perched black bird (crow) or, when flying, a flapping silhouette.
export function crow(ctx, x, y, t, fly, gx = 0, gy = 0) {
  ctx.save();
  if (fly) {
    ctx.translate(x + gx, y - 24 + gy);
    const f = Math.sin(fly * 16) * 9;
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    ctx.moveTo(-24, -f);
    ctx.quadraticCurveTo(-10, -8 - f * 0.4, 0, 0);
    ctx.quadraticCurveTo(10, -8 - f * 0.4, 24, -f);
    ctx.quadraticCurveTo(10, 2, 0, 6);
    ctx.quadraticCurveTo(-10, 2, -24, -f);
    ctx.fill();
    ctx.restore();
    return;
  }
  const bob = Math.sin(t * 2 + x) * 1.2;
  ctx.translate(x, y + bob);
  line(ctx, C.ink, 2);
  ctx.beginPath();
  ctx.moveTo(-3, -9);
  ctx.lineTo(-4, 0);
  ctx.moveTo(3, -9);
  ctx.lineTo(4, 0);
  ctx.stroke();
  const body = new Path2D();
  body.moveTo(-20, -14);
  body.bezierCurveTo(-14, -28, 8, -30, 12, -20);
  body.bezierCurveTo(14, -12, 4, -8, -6, -9);
  body.lineTo(-26, -8);
  body.closePath();
  ctx.fillStyle = C.ink;
  ctx.fill(body);
  ctx.beginPath();
  ctx.arc(11, -28, 7.5, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(17, -30);
  ctx.lineTo(28, -26);
  ctx.lineTo(17, -24);
  ctx.closePath();
  ctx.fillStyle = C.slate;
  ctx.fill();
  ctx.fillStyle = C.paper;
  ctx.beginPath();
  ctx.arc(13, -30, 2, 0, TAU);
  ctx.fill();
  ctx.restore();
}

// Drifting mist over a chasm or a cellar floor.
export function drawMist(ctx, camX, g, { top = 610, color = "rgba(207,203,195,", dark = "rgba(23,22,20," } = {}) {
  const grad = ctx.createLinearGradient(0, top - 30, 0, H);
  grad.addColorStop(0, `${dark}0)`);
  grad.addColorStop(1, `${dark}0.85)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, top - 30, W, H - top + 30);
  for (let i = 0; i < 9; i++) {
    const sp = 260;
    const x = ((i * 173 - camX * 0.9 - g.time * (10 + i * 2)) % (W + sp) + W + sp) % (W + sp) - sp / 2;
    const y = top + 30 + (i % 3) * 26;
    const r = 70 + (i % 4) * 20;
    const m = ctx.createRadialGradient(x, y, 0, x, y, r);
    m.addColorStop(0, `${color}0.35)`);
    m.addColorStop(1, `${color}0)`);
    ctx.fillStyle = m;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
}

export { C, TAU, rng, makeLayer, wash, paperTexture, roughStroke };
