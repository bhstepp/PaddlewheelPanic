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

// Projection-booth film filters, unlocked with film reels:
//   standard     grain, scratches, flicker and a vignette
//   clean        a calm picture: light grain, no flicker or scratches
//   nickelodeon  a worn print: heavy grain, dust, frame-line weave, more flicker
//   iris         a round iris around the action, like a silent-film close-up
export const FILTERS = [
  { id: "standard", name: "STANDARD", reels: 0 },
  { id: "clean", name: "CLEAN PRINT", reels: 0 },
  { id: "nickelodeon", name: "NICKELODEON", reels: 5 },
  { id: "iris", name: "IRIS", reels: 10 },
];

let dust = [];
let irisMask = null;

function makeIris() {
  const c = document.createElement("canvas");
  c.width = W / 2;
  c.height = H / 2;
  const g = c.getContext("2d");
  g.fillStyle = C.ink;
  g.fillRect(0, 0, W / 2, H / 2);
  g.globalCompositeOperation = "destination-out";
  g.save();
  g.translate(W / 4, H / 4);
  g.scale(1, (H / W) * 1.32);
  const grad = g.createRadialGradient(0, 0, W * 0.2, 0, 0, W * 0.27);
  grad.addColorStop(0, "rgba(0,0,0,1)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grad;
  g.fillRect(-W / 2, -W / 2, W, W);
  g.restore();
  return c;
}

// The iris mask goes over the picture but under the HUD, so it never hides
// the controls.
export function drawIris(ctx, filter) {
  if (filter !== "iris") return;
  if (!irisMask) irisMask = makeIris();
  ctx.drawImage(irisMask, 0, 0, W, H);
}

export function drawFilm(ctx, dt, filter = "standard") {
  const f = CONFIG.film;
  const clean = filter === "clean";
  const worn = filter === "nickelodeon";

  if (f.grain) {
    if (!grainTile) grainTile = makeGrain();
    if (patternCtx !== ctx) {
      grainPattern = ctx.createPattern(grainTile, "repeat");
      patternCtx = ctx;
    }
    const ox = (Math.random() * 128) | 0;
    const oy = (Math.random() * 128) | 0;
    ctx.save();
    ctx.globalAlpha = clean ? 0.07 : worn ? 0.26 : 0.16;
    ctx.translate(-ox, -oy);
    ctx.fillStyle = grainPattern;
    ctx.fillRect(0, 0, W + 128, H + 128);
    ctx.restore();
  }

  if (f.scratches && !clean) {
    scratches = scratches.filter((s) => (s.life -= dt) > 0);
    const max = worn ? 4 : 2;
    if (scratches.length < max && Math.random() < dt * (worn ? 5 : 2.2)) {
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

  if (worn) {
    // Dust and hairs on the gate, and the frame line weaving at the top.
    dust = dust.filter((d) => (d.life -= dt) > 0);
    if (Math.random() < dt * 10) dust.push({ x: Math.random() * W, y: Math.random() * H, r: 1 + Math.random() * 3, life: 0.04 + Math.random() * 0.08, hair: Math.random() < 0.2, a: Math.random() * 6 });
    ctx.fillStyle = C.ink;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = 0.7;
    for (const d of dust) {
      if (d.hair) {
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.quadraticCurveTo(d.x + Math.cos(d.a) * 20, d.y + Math.sin(d.a) * 20, d.x + 30, d.y + 12);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    const weave = 6 + Math.sin(performance.now() / 700) * 4 + Math.random() * 2;
    ctx.fillStyle = C.ink;
    ctx.fillRect(0, 0, W, weave);
  }

  if (f.flicker && !clean) {
    const v = (Math.random() - 0.5) * (worn ? 0.11 : 0.06);
    ctx.globalAlpha = Math.abs(v);
    ctx.fillStyle = v > 0 ? C.paper : C.ink;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }

  if (f.vignette && filter !== "iris") {
    if (!vignette) vignette = makeVignette();
    if (clean) ctx.globalAlpha = 0.6;
    ctx.drawImage(vignette, 0, 0, W, H);
    ctx.globalAlpha = 1;
  }
}
