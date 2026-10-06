// Old-film effects drawn over everything: grain, scratches, flicker, vignette.
import { PALETTE as C } from "./palette.js";
import { CONFIG } from "../config.js";

const W = CONFIG.width;
const H = CONFIG.height;

let grainTile = null;
let grainPattern = null;
let vignette = null;
let scratches = [];
let patternCtx = null;

function makeGrain() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  for (let i = 0; i < 1400; i++) {
    g.fillStyle = Math.random() < 0.5 ? C.ink : C.paper;
    g.globalAlpha = 0.25 + Math.random() * 0.6;
    const s = Math.random() < 0.85 ? 1 : 2;
    g.fillRect((Math.random() * 128) | 0, (Math.random() * 128) | 0, s, s);
  }
  return c;
}

function makeVignette() {
  const c = document.createElement("canvas");
  c.width = W / 2;
  c.height = H / 2;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(W / 4, H / 4, H * 0.18, W / 4, H / 4, W * 0.32);
  grad.addColorStop(0, "rgba(23,22,20,0)");
  grad.addColorStop(0.7, "rgba(23,22,20,0.18)");
  grad.addColorStop(1, "rgba(23,22,20,0.62)");
  g.fillStyle = grad;
  g.fillRect(0, 0, W / 2, H / 2);
  return c;
}

export function drawFilm(ctx, dt, filter = "standard") {
  const f = CONFIG.film;

  if (f.grain) {
    if (!grainTile) grainTile = makeGrain();
    if (patternCtx !== ctx) {
      grainPattern = ctx.createPattern(grainTile, "repeat");
      patternCtx = ctx;
    }
    const ox = (Math.random() * 128) | 0;
    const oy = (Math.random() * 128) | 0;
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.translate(-ox, -oy);
    ctx.fillStyle = grainPattern;
    ctx.fillRect(0, 0, W + 128, H + 128);
    ctx.restore();
  }

  if (f.scratches) {
    scratches = scratches.filter((s) => (s.life -= dt) > 0);
    if (scratches.length < 2 && Math.random() < dt * 2.2) {
      scratches.push({ x: Math.random() * W, life: 0.05 + Math.random() * 0.15, light: Math.random() < 0.6, w: 1 + Math.random() * 1.5 });
    }
    for (const s of scratches) {
      s.x += (Math.random() - 0.5) * 3;
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = s.light ? C.paper : C.ink;
      ctx.fillRect(s.x, 0, s.w, H);
    }
    ctx.globalAlpha = 1;
  }

  if (f.flicker) {
    const v = (Math.random() - 0.5) * 0.06; // about ±3%
    ctx.globalAlpha = Math.abs(v);
    ctx.fillStyle = v > 0 ? C.paper : C.ink;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }

  if (f.vignette) {
    if (!vignette) vignette = makeVignette();
    ctx.drawImage(vignette, 0, 0, W, H);
  }
}
