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

// ---------------------------------------------------------------- detail kit

// Rough ink outline: a solid stroke plus a thinner, slightly offset second
// pass, so edges read as hand-inked rather than vector-perfect.
export function roughStroke(ctx, path, w = 3, color = C.ink) {
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.stroke(path);
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = Math.max(0.8, w * 0.35);
  ctx.translate(0.7, 0.9);
  ctx.stroke(path);
  ctx.restore();
}

// A weathered board: base tone, grain lines that sweep around knots, nail
// heads, an occasional crack, a highlight edge and a shadowed lower edge.
// horizontal = grain runs left-right.
export function plank(ctx, x, y, w, h, r, { fill = C.silver, horizontal = true, nails = true, line = 2, dark = C.charcoal } = {}) {
  const p = new Path2D();
  p.rect(x, y, w, h);
  ctx.fillStyle = fill;
  ctx.fill(p);
  ctx.save();
  ctx.clip(p);
  // Tonal variation along the board.
  const g = horizontal ? ctx.createLinearGradient(0, y, 0, y + h) : ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, "rgba(248,246,240,0.35)");
  g.addColorStop(0.35, "rgba(248,246,240,0)");
  g.addColorStop(0.75, "rgba(23,22,20,0.08)");
  g.addColorStop(1, "rgba(23,22,20,0.32)");
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  for (let i = 0; i < (w * h) / 900; i++) {
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = r() < 0.5 ? C.ink : C.paper;
    const bx = x + r() * w;
    const by = y + r() * h;
    ctx.beginPath();
    ctx.ellipse(bx, by, horizontal ? 8 + r() * 20 : 2 + r() * 3, horizontal ? 1.5 + r() * 2 : 8 + r() * 20, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Grain.
  const len = horizontal ? w : h;
  const across = horizontal ? h : w;
  const knots = [];
  for (let i = 0; i < len / 70; i++) if (r() < 0.6) knots.push([r() * len, across * (0.3 + r() * 0.4), 2 + r() * 2.5]);
  ctx.strokeStyle = C.ash;
  ctx.lineWidth = 0.9;
  const lines = Math.max(2, Math.round(across / 3.2));
  ctx.beginPath();
  for (let k = 0; k < lines; k++) {
    const base = ((k + 0.5) / lines) * across + (r() - 0.5);
    let started = false;
    for (let t = 0; t <= len; t += 6) {
      let off = base + Math.sin(t * 0.02 + k) * 0.6;
      for (const [kx, ky, kr] of knots) {
        const d = Math.abs(t - kx);
        if (d < kr * 6) off += (base < ky ? -1 : 1) * Math.cos((d / (kr * 6)) * Math.PI / 2) * kr * 1.2;
      }
      const px = horizontal ? x + t : x + off;
      const py = horizontal ? y + off : y + t;
      if (!started || r() < 0.04) {
        ctx.moveTo(px, py);
        started = true;
      } else ctx.lineTo(px, py);
    }
  }
  ctx.stroke();
  for (const [kx, ky, kr] of knots) {
    const px = horizontal ? x + kx : x + ky;
    const py = horizontal ? y + ky : y + kx;
    ctx.fillStyle = C.slate;
    ctx.beginPath();
    ctx.ellipse(px, py, horizontal ? kr * 1.6 : kr, horizontal ? kr : kr * 1.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = C.ash;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.ellipse(px, py, horizontal ? kr * 2.6 : kr * 1.7, horizontal ? kr * 1.7 : kr * 2.6, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  // A crack from one end.
  if (r() < 0.35) {
    ctx.strokeStyle = dark;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    const c0 = across * (0.3 + r() * 0.4);
    const clen = len * (0.12 + r() * 0.2);
    const fromEnd = r() < 0.5;
    for (let t = 0; t <= clen; t += 4) {
      const tt = fromEnd ? len - t : t;
      const cc = c0 + Math.sin(t * 0.3) * 0.8;
      const px = horizontal ? x + tt : x + cc;
      const py = horizontal ? y + cc : y + tt;
      if (t === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  // Highlight edge and shadowed edge.
  ctx.fillStyle = C.paper;
  ctx.globalAlpha = 0.7;
  if (horizontal) ctx.fillRect(x, y, w, 1.6);
  else ctx.fillRect(x, y, 1.6, h);
  ctx.globalAlpha = 1;
  ctx.restore();
  // Nail heads near the ends.
  if (nails) {
    ctx.fillStyle = C.ink;
    const spots = horizontal
      ? [[x + 6, y + h * 0.3], [x + 6, y + h * 0.72], [x + w - 6, y + h * 0.3], [x + w - 6, y + h * 0.72]]
      : [[x + w * 0.3, y + 6], [x + w * 0.72, y + 6], [x + w * 0.3, y + h - 6], [x + w * 0.72, y + h - 6]];
    for (const [nx, ny] of spots) {
      ctx.beginPath();
      ctx.arc(nx, ny, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  roughStroke(ctx, p, line, C.ink);
}

// Twisted rope along a polyline, with strand ticks.
export function rope(ctx, pts, w = 6) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = w + 2.5;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1]);
  ctx.stroke();
  ctx.strokeStyle = C.silver;
  ctx.lineWidth = w;
  ctx.stroke();
  ctx.strokeStyle = C.slate;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const d = Math.hypot(x1 - x0, y1 - y0);
    const nx = -(y1 - y0) / (d || 1);
    const ny = (x1 - x0) / (d || 1);
    for (let t = 0; t < d; t += w * 0.7) {
      const u = t / d;
      const cx = x0 + (x1 - x0) * u;
      const cy = y0 + (y1 - y0) * u;
      ctx.moveTo(cx - nx * w * 0.45 - (x1 - x0) / d * w * 0.2, cy - ny * w * 0.45 - (y1 - y0) / d * w * 0.2);
      ctx.lineTo(cx + nx * w * 0.45 + (x1 - x0) / d * w * 0.2, cy + ny * w * 0.45 + (y1 - y0) / d * w * 0.2);
    }
  }
  ctx.stroke();
  ctx.restore();
}

// A round wooden piling seen from the side: highlight, core, shadow, bark
// ticks and an end-grain cap.
export function piling(ctx, cx, top, bottom, w, r, { cap = true } = {}) {
  const x = cx - w / 2;
  const p = new Path2D();
  p.rect(x, top, w, bottom - top);
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, C.ash);
  g.addColorStop(0.3, C.silver);
  g.addColorStop(0.55, C.ash);
  g.addColorStop(1, C.charcoal);
  ctx.fillStyle = g;
  ctx.fill(p);
  ctx.save();
  ctx.clip(p);
  ctx.strokeStyle = C.slate;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let y = top + 4; y < bottom; y += 5 + r() * 6) {
    const bx = x + r() * w;
    ctx.moveTo(bx, y);
    ctx.lineTo(bx + r() * 3 - 1.5, y + 4 + r() * 8);
  }
  for (let k = 0; k < 3; k++) {
    const gx = x + w * (0.2 + k * 0.28) + r() * 2;
    ctx.moveTo(gx, top);
    ctx.bezierCurveTo(gx + 2, top + (bottom - top) * 0.3, gx - 2, top + (bottom - top) * 0.7, gx + 1, bottom);
  }
  ctx.stroke();
  ctx.restore();
  roughStroke(ctx, p, 2.4);
  if (cap) {
    const e = new Path2D();
    e.ellipse(cx, top, w / 2, w * 0.18, 0, 0, Math.PI * 2);
    ctx.fillStyle = C.silver;
    ctx.fill(e);
    ctx.strokeStyle = C.ash;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.ellipse(cx, top, w * 0.3, w * 0.1, 0, 0, Math.PI * 2);
    ctx.ellipse(cx, top, w * 0.14, w * 0.05, 0, 0, Math.PI * 2);
    ctx.stroke();
    roughStroke(ctx, e, 2);
  }
}
