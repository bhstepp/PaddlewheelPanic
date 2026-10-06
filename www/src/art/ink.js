// Hand-inked drawing kit: seeded randomness, wobbly pen lines, tapered brush
// strokes and cross-hatching. Detailed scenery is painted once with these into
// offscreen canvases, then reused every frame.
import { PALETTE as C } from "./palette.js";

export const TAU = Math.PI * 2;

// Small deterministic RNG so every painting looks the same each load.
export function rng(seed) {
  let a = seed >>> 0;
  const r = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  r.range = (lo, hi) => lo + r() * (hi - lo);
  r.pick = (arr) => arr[Math.floor(r() * arr.length)];
  return r;
}

// Offscreen canvas painted at `res` pixels per logical unit.
export function makeLayer(w, h, res) {
  const c = document.createElement("canvas");
  c.width = Math.ceil(w * res);
  c.height = Math.ceil(h * res);
  const ctx = c.getContext("2d");
  ctx.scale(res, res);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  return { canvas: c, ctx, w, h };
}

export function layerRes() {
  return Math.min(2, Math.max(1, window.devicePixelRatio || 1));
}

// Resample a polyline so it has a point every `step` units, with jitter.
function jitter(pts, amp, r, step = 8) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const d = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(1, Math.round(d / step));
    for (let k = 0; k < n; k++) {
      const u = k / n;
      out.push([x0 + (x1 - x0) * u + (r() - 0.5) * amp, y0 + (y1 - y0) * u + (r() - 0.5) * amp]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

// Smooth path through points (quadratic through midpoints).
export function smoothPath(ctx, pts, closed = false) {
  ctx.beginPath();
  if (pts.length < 3) {
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1]);
    if (closed) ctx.closePath();
    return;
  }
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const start = closed ? mid(pts[pts.length - 1], pts[0]) : pts[0];
  ctx.moveTo(start[0], start[1]);
  const n = closed ? pts.length : pts.length - 1;
  for (let i = closed ? 0 : 1; i < n; i++) {
    const p = pts[i];
    const m = mid(p, pts[(i + 1) % pts.length]);
    ctx.quadraticCurveTo(p[0], p[1], m[0], m[1]);
  }
  if (closed) ctx.closePath();
  else ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
}

// A slightly wobbly pen line.
export function pen(ctx, pts, r, { w = 2, color = C.ink, amp = 1.2, closed = false } = {}) {
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  smoothPath(ctx, jitter(closed ? [...pts, pts[0]] : pts, amp, r), false);
  ctx.stroke();
}

// A tapered brush stroke along a polyline: thin at the ends, full in the middle.
export function brush(ctx, pts, r, { w = 3, color = C.ink, amp = 0.8, taper = 1 } = {}) {
  const p = jitter(pts, amp, r, 5);
  if (p.length < 2) return;
  const left = [];
  const right = [];
  for (let i = 0; i < p.length; i++) {
    const a = p[Math.max(0, i - 1)];
    const b = p[Math.min(p.length - 1, i + 1)];
    let nx = -(b[1] - a[1]);
    let ny = b[0] - a[0];
    const len = Math.hypot(nx, ny) || 1;
    nx /= len;
    ny /= len;
    const u = i / (p.length - 1);
    const k = 1 - taper + taper * Math.sin(Math.PI * Math.min(1, Math.max(0, u))) ** 0.6;
    const hw = (w / 2) * Math.max(0.15, k) * (0.85 + r() * 0.3);
    left.push([p[i][0] + nx * hw, p[i][1] + ny * hw]);
    right.push([p[i][0] - nx * hw, p[i][1] - ny * hw]);
  }
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(left[0][0], left[0][1]);
  for (const q of left) ctx.lineTo(q[0], q[1]);
  for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]);
  ctx.closePath();
  ctx.fill();
}

// Soft tonal shading inside the current clip region. (This used to draw
// hatch lines; the storybook style uses watercolor-like washes instead.)
// The wash fades in along the hatch angle so shapes keep a sense of form.
export function hatch(ctx, x, y, w, h, r, { angle = -0.9, color = C.ink, density = 1, gap = 6 } = {}) {
  const ca = Math.cos(angle + Math.PI / 2);
  const sa = Math.sin(angle + Math.PI / 2);
  const cx = x + w / 2;
  const cy = y + h / 2;
  const d = Math.hypot(w, h) / 2;
  const g = ctx.createLinearGradient(cx - ca * d, cy - sa * d, cx + ca * d, cy + sa * d);
  const a = Math.min(0.6, 0.32 * density * (6 / Math.max(2.5, gap)) ** 0.5);
  g.addColorStop(0, hexA(color, a * 0.55));
  g.addColorStop(1, hexA(color, a));
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a.toFixed(3)})`;
}

// Fill a path, hatch its shadow side, then ink its outline.
export function inkShape(ctx, path, r, { fill = C.silver, line = 2.5, shade = null, bounds = null, outline = C.ink } = {}) {
  ctx.fillStyle = fill;
  ctx.fill(path);
  if (shade && bounds) {
    ctx.save();
    ctx.clip(path);
    if (shade.clip) {
      ctx.clip(shade.clip);
    }
    hatch(ctx, bounds[0], bounds[1], bounds[2], bounds[3], r, shade);
    ctx.restore();
  }
  if (line > 0) {
    ctx.strokeStyle = outline;
    ctx.lineWidth = line;
    ctx.stroke(path);
  }
}

// Scribbled foliage clump: a cloud of small inked scallops around a center.
export function foliage(ctx, cx, cy, rx, ry, r, { fill = C.ash, dark = C.slate, line = C.ink, lw = 1.8 } = {}) {
  const lobes = [];
  const n = Math.round(10 + (rx + ry) / 6);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + r() * 0.3;
    lobes.push([cx + Math.cos(a) * rx * (0.75 + r() * 0.25), cy + Math.sin(a) * ry * (0.75 + r() * 0.25), (rx + ry) * (0.16 + r() * 0.08)]);
  }
  // Outline pass, then fill, so only the silhouette is inked.
  ctx.strokeStyle = line;
  ctx.lineWidth = lw * 2;
  for (const [x, y, rr] of lobes) {
    ctx.beginPath();
    ctx.arc(x, y, rr, 0, TAU);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx * 0.85, ry * 0.85, 0, 0, TAU);
  ctx.stroke();
  ctx.fillStyle = fill;
  for (const [x, y, rr] of lobes) {
    ctx.beginPath();
    ctx.arc(x, y, rr, 0, TAU);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx * 0.85, ry * 0.85, 0, 0, TAU);
  ctx.fill();
  // Shadowed underside, hatched.
  ctx.save();
  ctx.beginPath();
  for (const [x, y, rr] of lobes) {
    ctx.moveTo(x + rr, y);
    ctx.arc(x, y, rr, 0, TAU);
  }
  ctx.ellipse(cx, cy, rx * 0.85, ry * 0.85, 0, 0, TAU);
  ctx.clip();
  ctx.beginPath();
  ctx.ellipse(cx + rx * 0.1, cy + ry * 0.55, rx * 1.1, ry * 0.7, 0, 0, TAU);
  ctx.clip();
  hatch(ctx, cx - rx * 1.3, cy - ry, rx * 2.6, ry * 2.2, r, { gap: 3.5, lw: 1, color: dark, angle: -0.8 });
  ctx.restore();
  // Leaf tick marks.
  ctx.strokeStyle = line;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  for (let i = 0; i < n * 1.4; i++) {
    const a = r() * TAU;
    const d = r() * 0.7;
    const x = cx + Math.cos(a) * rx * d;
    const y = cy + Math.sin(a) * ry * d - ry * 0.1;
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + 3, y - 3, x + 6, y - 1);
  }
  ctx.stroke();
}

// Wood grain lines along a horizontal board.
export function woodGrain(ctx, x, y, w, h, r, color = C.ash) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  const lines = Math.max(1, Math.round(h / 5));
  for (let i = 0; i < lines; i++) {
    let yy = y + ((i + 0.5) * h) / lines + (r() - 0.5) * 2;
    let xx = x + r() * 10;
    ctx.moveTo(xx, yy);
    while (xx < x + w - 6) {
      const seg = 12 + r() * 30;
      xx = Math.min(x + w - 4, xx + seg);
      yy += (r() - 0.5) * 1.4;
      ctx.lineTo(xx, yy);
      if (r() < 0.12) {
        // a knot
        ctx.moveTo(xx + 4, yy);
        ctx.ellipse(xx, yy, 4, 1.8, 0, 0, TAU);
        ctx.moveTo(xx + 5, yy);
      }
    }
  }
  ctx.stroke();
}

// Sprite cache: paint once on first use, reuse after. Least-recently-used
// entries are dropped beyond `max` so long levels don't hold every sprite.
const cache = new Map();
export function cached(key, w, h, paint, max = 48) {
  let e = cache.get(key);
  if (e) {
    cache.delete(key);
    cache.set(key, e);
    return e;
  }
  e = makeLayer(w, h, layerRes());
  paint(e.ctx, e);
  e.ctx.setTransform(layerRes(), 0, 0, layerRes(), 0, 0);
  paperTexture(e.ctx, w, h, rng(key.length * 977 + w), { strength: 1 });
  cache.set(key, e);
  while (cache.size > max) cache.delete(cache.keys().next().value);
  return e;
}

// Watercolor-style wash: fill a path, then lay a soft darker gradient over one
// side (dir: "down", "right", "left") instead of hard hatching.
export function wash(ctx, path, fill, shade, { dir = "down", strength = 0.45, x = 0, y = 0, w = 100, h = 100 } = {}) {
  ctx.fillStyle = fill;
  ctx.fill(path);
  if (!shade) return;
  let g;
  if (dir === "down") g = ctx.createLinearGradient(0, y, 0, y + h);
  else if (dir === "right") g = ctx.createLinearGradient(x, 0, x + w, 0);
  else g = ctx.createLinearGradient(x + w, 0, x, 0);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(0.45, "rgba(0,0,0,0)");
  g.addColorStop(1, shade);
  ctx.save();
  ctx.clip(path);
  ctx.globalAlpha = strength;
  ctx.fillStyle = g;
  ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  ctx.restore();
}

// Mottled watercolor-paper texture laid over whatever is already painted
// (only where there is paint), so every layer shares the same paper grain.
export function paperTexture(ctx, w, h, r, { strength = 1, blot = 1 } = {}) {
  ctx.save();
  ctx.globalCompositeOperation = "source-atop";
  // Soft blotches.
  for (let i = 0; i < (w * h) / 9000 * blot; i++) {
    const x = r() * w;
    const y = r() * h;
    const rad = 20 + r() * 70;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    const dark = r() < 0.55;
    g.addColorStop(0, dark ? "rgba(23,22,20,0.06)" : "rgba(248,246,240,0.08)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalAlpha = strength;
    ctx.fillStyle = g;
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // Fine fibres and speckle.
  ctx.globalAlpha = 0.08 * strength;
  ctx.fillStyle = C.ink;
  for (let i = 0; i < (w * h) / 220; i++) ctx.fillRect(r() * w, r() * h, 1, 1);
  ctx.fillStyle = C.paper;
  ctx.globalAlpha = 0.12 * strength;
  for (let i = 0; i < (w * h) / 260; i++) ctx.fillRect(r() * w, r() * h, 1, 1);
  ctx.restore();
}
