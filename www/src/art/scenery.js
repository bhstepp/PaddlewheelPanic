// Parallax scenery, back to front: sky, sun, clouds, far hills, tree line,
// river; then (after the gameplay layer) foreground water and ripples.
import { PALETTE as C } from "./palette.js";
import { TAU, puff } from "./draw.js";
import { CONFIG } from "../config.js";

const W = CONFIG.width;
const H = CONFIG.height;
const WATER = CONFIG.waterY;

const hash = (i) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

let skyGrad = null;
let skyCtx = null;

export function drawBackground(ctx, camX, g) {
  // Sky.
  if (skyCtx !== ctx) {
    skyGrad = ctx.createLinearGradient(0, 0, 0, WATER);
    skyGrad.addColorStop(0, C.silver);
    skyGrad.addColorStop(1, C.paper);
    skyCtx = ctx;
  }
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, WATER);

  drawSun(ctx, g);
  drawClouds(ctx, camX, g);
  drawHills(ctx, camX);
  drawTrees(ctx, camX, g);
  drawRiver(ctx, camX, g);
}

function drawSun(ctx, g) {
  const x = 1040;
  const y = 120;
  const s = 1 + g.beat * 0.05;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(g.time * 0.15);
  ctx.fillStyle = C.paper;
  ctx.strokeStyle = C.ash;
  ctx.lineWidth = 3;
  for (let i = 0; i < 12; i++) {
    ctx.rotate(TAU / 12);
    ctx.beginPath();
    ctx.moveTo(-9, -66);
    ctx.quadraticCurveTo(0, -102 * s, 9, -66);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
  ctx.beginPath();
  ctx.arc(x, y, 56 * s, 0, TAU);
  ctx.fillStyle = C.paper;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = C.ash;
  ctx.stroke();
}

function drawClouds(ctx, camX, g) {
  const span = 1900;
  const off = camX * 0.08 + g.time * 10;
  for (let i = -1; i < 4; i++) {
    const cell = Math.floor(off / span) + i;
    const cx = cell * span - off + hash(cell) * 900 + 100;
    const cy = 70 + hash(cell + 9) * 150;
    const sc = 0.8 + hash(cell + 3) * 0.5;
    for (let j = 0; j < 2; j++) {
      const x = cx + j * 900;
      const k = 1 + g.beat * 0.06;
      ctx.save();
      ctx.translate(x, cy);
      ctx.scale(sc * k, (sc * 1) / k);
      puff(ctx, [[0, 0, 34], [36, -14, 42], [78, -4, 36], [108, 8, 26], [-30, 10, 24], [44, 16, 30]], C.paper, 2.5, C.ash);
      ctx.restore();
    }
  }
}

function hillY(x) {
  return 470 - 40 * Math.sin(x * 0.0021) - 26 * Math.sin(x * 0.0053 + 1.3) - 12 * Math.sin(x * 0.011 + 4);
}

function drawHills(ctx, camX) {
  const off = camX * 0.15;
  ctx.beginPath();
  ctx.moveTo(0, WATER);
  for (let sx = 0; sx <= W + 20; sx += 20) ctx.lineTo(sx, hillY(sx + off));
  ctx.lineTo(W, WATER);
  ctx.closePath();
  ctx.fillStyle = C.silver;
  ctx.fill();
  ctx.strokeStyle = C.ash;
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawTrees(ctx, camX, g) {
  const off = camX * 0.4;
  const spacing = 92;
  const first = Math.floor((off - 120) / spacing);
  const last = Math.floor((off + W + 120) / spacing);
  // Riverbank strip.
  ctx.fillStyle = C.ash;
  ctx.fillRect(0, WATER - 34, W, 34);
  ctx.strokeStyle = C.slate;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, WATER - 34);
  ctx.lineTo(W, WATER - 34);
  ctx.stroke();
  for (let i = first; i <= last; i++) {
    if (hash(i * 3.1) < 0.18) continue; // gaps in the tree line
    const x = i * spacing - off + hash(i) * 40;
    const h = 70 + hash(i + 50) * 70;
    const r = 26 + hash(i + 80) * 16;
    const base = WATER - 34;
    const sway = Math.sin(g.time * 1.3 + i) * 4;
    const k = 1 + g.beat * 0.08;
    ctx.save();
    ctx.translate(x, base);
    ctx.scale(1 / Math.sqrt(k), k);
    // Bendy rubber-hose trunk.
    ctx.strokeStyle = C.slate;
    ctx.lineWidth = 9;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-10 + sway, -h * 0.5, sway, -h);
    ctx.stroke();
    ctx.strokeStyle = C.ash;
    ctx.lineWidth = 4;
    ctx.stroke();
    puff(ctx, [[sway, -h - r * 0.4, r], [sway - r * 0.8, -h + r * 0.1, r * 0.75], [sway + r * 0.8, -h + r * 0.1, r * 0.75]], C.ash, 2, C.slate);
    ctx.restore();
  }
}

function drawRiver(ctx, camX, g) {
  ctx.fillStyle = C.slate;
  ctx.fillRect(0, WATER, W, H - WATER);
  ctx.fillStyle = C.charcoal;
  ctx.fillRect(0, WATER + 70, W, H - WATER - 70);
  // Glinting wave dashes drifting with the current.
  ctx.strokeStyle = C.ash;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  const off = camX * 0.9 + g.time * 30;
  ctx.beginPath();
  for (let row = 0; row < 3; row++) {
    const y = WATER + 20 + row * 22;
    const sp = 170 + row * 40;
    for (let i = Math.floor(off / sp) - 1; i < (off + W) / sp + 1; i++) {
      const x = i * sp - off + hash(i + row * 100) * 80;
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 14, y - 6, x + 28, y);
    }
  }
  ctx.stroke();
}

export function drawForeground(ctx, camX, g) {
  // Front water: hides the submerged parts of barrels, pilings and the hull.
  ctx.globalAlpha = 0.86;
  ctx.fillStyle = C.slate;
  ctx.fillRect(0, WATER + 8, W, H - WATER - 8);
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = C.charcoal;
  ctx.fillRect(0, WATER + 76, W, H - WATER - 76);
  ctx.globalAlpha = 1;
  // Wavy surface line.
  ctx.strokeStyle = C.paper;
  ctx.lineWidth = 3;
  ctx.beginPath();
  const t = g.time;
  for (let sx = 0; sx <= W; sx += 12) {
    const wx = sx + camX;
    const y = WATER + 8 + Math.sin(wx * 0.03 + t * 3) * 2.5;
    if (sx === 0) ctx.moveTo(sx, y);
    else ctx.lineTo(sx, y);
  }
  ctx.stroke();
  // Foreground ripples (faster parallax).
  ctx.strokeStyle = C.ash;
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  const off = camX * 1.3 + t * 50;
  const sp = 260;
  ctx.beginPath();
  for (let i = Math.floor(off / sp) - 1; i < (off + W) / sp + 1; i++) {
    const x = i * sp - off + hash(i + 7) * 120;
    const y = 690 + hash(i + 13) * 18;
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + 22, y - 8, x + 44, y);
    ctx.quadraticCurveTo(x + 66, y + 8, x + 88, y);
  }
  ctx.stroke();
}
