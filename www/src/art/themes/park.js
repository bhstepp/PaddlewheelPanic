// Jubilee Pier: a seaside amusement pier with a turning ferris wheel,
// coaster hills, big-top tents and pennants, a midway of striped booths,
// marquee-bulb boardwalk ledges that chase on the beat, trapezes, ferris
// gondola lifts, and the Captain thundering along in a roller-coaster car.
import { cached, plank, rope, layerRes, brush, piling } from "../ink.js";
import { CONFIG } from "../../config.js";
import { registerChaser } from "../../entities/chasers.js";
import { Chaser, captain } from "../../entities/chaser.js";
import { C, TAU, W, H, rng, makeLayer, wash, paperTexture, roughStroke, line, tile, paintSky, paintCloud, drawClouds } from "./common.js";

const FAR_W = 3000;
const FAR_TOP = 150;
const MID_W = 3200;
const MID_TOP = 260;
const WHEEL_SPAN = 2600;
const WATER = CONFIG.waterY;

let L = null;

function paintAll() {
  const res = layerRes();
  L = {
    sky: paintSky(res, 600, [[0, C.silver], [0.6, C.paper], [1, C.paper]], 15, (ctx) => {
      ctx.beginPath();
      ctx.arc(240, 110, 50, 0, TAU);
      ctx.fillStyle = C.paper;
      ctx.fill();
      line(ctx, C.ash, 3);
      ctx.setLineDash([14, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    }),
    clouds: [0, 1, 2].map((i) => paintCloud(res, 301 + i)),
    far: paintFar(res),
    wheel: paintWheel(res),
    gondola: paintGondola(res),
    mid: paintMidway(res),
    bunting: paintBunting(res),
  };
}

// ---------------------------------------------------------------- far: coaster and tents

function paintFar(res) {
  const h = 420;
  const lay = makeLayer(FAR_W, h, res);
  const { ctx } = lay;
  const r = rng(61);
  const base = 360;
  // Roller-coaster hills on a lattice of trestles.
  const track = [];
  for (let x = 0; x <= FAR_W; x += 20) {
    const y = base - 120 - Math.abs(Math.sin(x / 260)) * 120 * (0.6 + 0.4 * Math.sin(x / 900));
    track.push([x, y]);
  }
  line(ctx, C.ash, 1.6);
  ctx.beginPath();
  for (let i = 0; i < track.length; i += 2) {
    const [x, y] = track[i];
    ctx.moveTo(x, y);
    ctx.lineTo(x, base);
    if (i + 2 < track.length) {
      ctx.moveTo(x, y);
      ctx.lineTo(track[i + 2][0], base);
    }
  }
  ctx.stroke();
  line(ctx, C.slate, 4);
  ctx.beginPath();
  track.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  line(ctx, C.slate, 2);
  ctx.beginPath();
  track.forEach(([x, y], i) => (i ? ctx.lineTo(x, y + 10) : ctx.moveTo(x, y + 10)));
  ctx.stroke();
  // Big-top tents with striped canvas and pennants.
  for (let x = 300; x < FAR_W - 300; x += r.range(700, 1000)) {
    const tw = r.range(260, 340);
    const th = r.range(150, 190);
    const tent = new Path2D();
    tent.moveTo(x - tw / 2, base);
    tent.lineTo(x - tw / 2, base - th * 0.35);
    tent.quadraticCurveTo(x - tw * 0.2, base - th * 0.55, x, base - th);
    tent.quadraticCurveTo(x + tw * 0.2, base - th * 0.55, x + tw / 2, base - th * 0.35);
    tent.lineTo(x + tw / 2, base);
    tent.closePath();
    ctx.fillStyle = C.paper;
    ctx.fill(tent);
    ctx.save();
    ctx.clip(tent);
    ctx.fillStyle = C.ash;
    const n = 8;
    for (let k = 0; k < n; k += 2) {
      ctx.beginPath();
      ctx.moveTo(x, base - th);
      ctx.lineTo(x - tw / 2 + (k * tw) / n, base);
      ctx.lineTo(x - tw / 2 + ((k + 1) * tw) / n, base);
      ctx.closePath();
      ctx.fill();
    }
    const sh = ctx.createLinearGradient(x - tw / 2, 0, x + tw / 2, 0);
    sh.addColorStop(0, "rgba(23,22,20,0)");
    sh.addColorStop(1, "rgba(23,22,20,0.3)");
    ctx.fillStyle = sh;
    ctx.fillRect(x - tw / 2, base - th, tw, th);
    ctx.restore();
    roughStroke(ctx, tent, 2.2, C.slate);
    // Scalloped valance.
    ctx.fillStyle = C.slate;
    for (let k = 0; k < 10; k++) {
      ctx.beginPath();
      ctx.arc(x - tw / 2 + (k + 0.5) * (tw / 10), base - th * 0.35, tw / 20, 0, Math.PI);
      ctx.fill();
    }
    ctx.fillStyle = C.charcoal;
    ctx.fillRect(x - 18, base - 60, 36, 60);
    line(ctx, C.slate, 2);
    ctx.beginPath();
    ctx.moveTo(x, base - th);
    ctx.lineTo(x, base - th - 40);
    ctx.stroke();
    ctx.fillStyle = C.slate;
    ctx.beginPath();
    ctx.moveTo(x, base - th - 40);
    ctx.lineTo(x + 28, base - th - 32);
    ctx.lineTo(x, base - th - 24);
    ctx.fill();
  }
  ctx.fillStyle = C.ash;
  ctx.fillRect(0, base, FAR_W, h - base);
  paperTexture(ctx, FAR_W, h, r, { strength: 1 });
  // Distance haze.
  ctx.save();
  ctx.globalCompositeOperation = "source-atop";
  ctx.fillStyle = "rgba(248,246,240,0.35)";
  ctx.fillRect(0, 0, FAR_W, h);
  ctx.restore();
  return lay;
}

// ---------------------------------------------------------------- ferris wheel

const WHEEL_R = 210;

function paintWheel(res) {
  const s = WHEEL_R * 2 + 40;
  const lay = makeLayer(s, s, res);
  const { ctx } = lay;
  ctx.translate(s / 2, s / 2);
  line(ctx, C.slate, 5);
  for (const rr of [WHEEL_R, WHEEL_R - 18]) {
    ctx.beginPath();
    ctx.arc(0, 0, rr, 0, TAU);
    ctx.stroke();
  }
  line(ctx, C.slate, 2);
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * TAU;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * WHEEL_R, Math.sin(a) * WHEEL_R);
    ctx.stroke();
    // Cross-bracing between the rims.
    const b = ((k + 0.5) / 16) * TAU;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * WHEEL_R, Math.sin(a) * WHEEL_R);
    ctx.lineTo(Math.cos(b) * (WHEEL_R - 18), Math.sin(b) * (WHEEL_R - 18));
    ctx.stroke();
  }
  // Light bulbs around the rim.
  for (let k = 0; k < 48; k++) {
    const a = (k / 48) * TAU;
    ctx.fillStyle = k % 2 ? C.paper : C.silver;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * WHEEL_R, Math.sin(a) * WHEEL_R, 4, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = C.slate;
  ctx.beginPath();
  ctx.arc(0, 0, 18, 0, TAU);
  ctx.fill();
  return lay;
}

function paintGondola(res) {
  const lay = makeLayer(50, 50, res);
  const { ctx } = lay;
  ctx.translate(25, 6);
  line(ctx, C.slate, 2);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 10);
  ctx.stroke();
  const car = new Path2D();
  car.moveTo(-18, 10);
  car.lineTo(18, 10);
  car.lineTo(14, 34);
  car.lineTo(-14, 34);
  car.closePath();
  ctx.fillStyle = C.ash;
  ctx.fill(car);
  roughStroke(ctx, car, 1.6, C.slate);
  ctx.fillStyle = C.slate;
  ctx.fillRect(-16, 20, 32, 4);
  return lay;
}

function drawWheel(ctx, camX, g) {
  const off = camX * 0.06;
  const first = Math.floor((off - W) / WHEEL_SPAN);
  for (let k = first; k < first + 3; k++) {
    const cx = k * WHEEL_SPAN - off + 900;
    if (cx < -WHEEL_R - 60 || cx > W + WHEEL_R + 60) continue;
    const cy = 300;
    // A-frame legs.
    line(ctx, C.slate, 6);
    ctx.beginPath();
    ctx.moveTo(cx - 130, cy + WHEEL_R + 120);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx + 130, cy + WHEEL_R + 120);
    ctx.stroke();
    const spin = g.time * 0.12;
    const s = L.wheel.w;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(spin);
    ctx.drawImage(L.wheel.canvas, -s / 2, -s / 2, s, s);
    ctx.restore();
    // Chasing bulbs light up around the rim on the beat.
    const lit = Math.floor((g.beatCount ?? 0) * 2) % 4;
    ctx.fillStyle = C.paper;
    for (let b = lit; b < 48; b += 4) {
      const a = (b / 48) * TAU + spin;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * WHEEL_R, cy + Math.sin(a) * WHEEL_R, 6, 0, TAU);
      ctx.fill();
    }
    for (let k2 = 0; k2 < 8; k2++) {
      const a = (k2 / 8) * TAU + spin;
      ctx.drawImage(L.gondola.canvas, cx + Math.cos(a) * WHEEL_R - 25, cy + Math.sin(a) * WHEEL_R - 6, 50, 50);
    }
  }
}

// ---------------------------------------------------------------- midway booths

function stripes(ctx, x, y, w, h, n, a = C.paper, b = C.slate) {
  for (let k = 0; k < n; k++) {
    ctx.fillStyle = k % 2 ? b : a;
    ctx.fillRect(x + (k * w) / n, y, w / n + 0.5, h);
  }
}

function booth(ctx, x, base, w, r, label) {
  const top = base - 200;
  // Counter and back.
  const back = new Path2D();
  back.rect(x, top + 40, w, 160);
  wash(ctx, back, C.charcoal, C.ink, { dir: "down", strength: 0.4, x: 0, y: top, w: 1, h: 200 });
  roughStroke(ctx, back, 2.2);
  // Shelves of prizes.
  for (let sy = top + 70; sy < base - 70; sy += 40) {
    ctx.fillStyle = C.ash;
    ctx.fillRect(x + 10, sy, w - 20, 4);
    for (let px = x + 20; px < x + w - 20; px += 24) {
      ctx.fillStyle = r() < 0.5 ? C.silver : C.paper;
      ctx.beginPath();
      ctx.arc(px, sy - 9, 8, 0, TAU);
      ctx.fill();
    }
  }
  const counter = new Path2D();
  counter.rect(x - 6, base - 70, w + 12, 70);
  stripes(ctx, x - 6, base - 70, w + 12, 70, Math.round(w / 18));
  roughStroke(ctx, counter, 2.4);
  // Scalloped striped awning.
  const aw = new Path2D();
  aw.moveTo(x - 20, top + 44);
  aw.lineTo(x + 10, top);
  aw.lineTo(x + w - 10, top);
  aw.lineTo(x + w + 20, top + 44);
  aw.closePath();
  ctx.save();
  ctx.clip(aw);
  stripes(ctx, x - 20, top, w + 40, 44, Math.round(w / 16), C.paper, C.ash);
  ctx.restore();
  roughStroke(ctx, aw, 2.4);
  for (let k = 0; k < Math.round(w / 22); k++) {
    const sx = x - 20 + (k + 0.5) * ((w + 40) / Math.round(w / 22));
    ctx.fillStyle = k % 2 ? C.ash : C.paper;
    ctx.beginPath();
    ctx.arc(sx, top + 44, (w + 40) / Math.round(w / 22) / 2, 0, Math.PI);
    ctx.fill();
    line(ctx, C.ink, 1.4);
    ctx.stroke();
  }
  // Sign board.
  const sign = new Path2D();
  sign.rect(x + w / 2 - 70, top - 40, 140, 34);
  wash(ctx, sign, C.paper, C.silver, { dir: "down", strength: 0.4, x: 0, y: top - 40, w: 1, h: 34 });
  roughStroke(ctx, sign, 2);
  ctx.fillStyle = C.ink;
  ctx.font = 'bold 16px Georgia, "Times New Roman", serif';
  ctx.textAlign = "center";
  ctx.fillText(label, x + w / 2, top - 17);
}

function highStriker(ctx, x, base) {
  const tower = new Path2D();
  tower.rect(x - 12, base - 300, 24, 300);
  wash(ctx, tower, C.paper, C.ash, { dir: "right", strength: 0.5, x: x - 12, y: 0, w: 24, h: 1 });
  roughStroke(ctx, tower, 2.2);
  line(ctx, C.ink, 1.4);
  for (let y = base - 280; y < base - 20; y += 26) {
    ctx.beginPath();
    ctx.moveTo(x - 12, y);
    ctx.lineTo(x - 4, y);
    ctx.stroke();
  }
  ctx.fillStyle = C.ink;
  ctx.beginPath();
  ctx.arc(x, base - 312, 16, 0, TAU);
  ctx.fill();
  ctx.fillStyle = C.paper;
  ctx.beginPath();
  ctx.arc(x, base - 312, 9, 0, TAU);
  ctx.fill();
  const pad = new Path2D();
  pad.rect(x - 34, base - 16, 68, 16);
  wash(ctx, pad, C.slate, C.ink, { dir: "down", strength: 0.5, x: 0, y: base - 16, w: 1, h: 16 });
  roughStroke(ctx, pad, 2);
}

function paintMidway(res) {
  const h = H - MID_TOP;
  const lay = makeLayer(MID_W, h, res);
  const { ctx } = lay;
  const r = rng(67);
  const base = 280;
  const labels = ["RING TOSS", "HOT CORN", "PRIZES", "BALL GAME", "TAFFY"];
  let i = 0;
  for (let x = 80; x < MID_W - 360; ) {
    if (i % 3 === 2) {
      highStriker(ctx, x + 40, base);
      x += 180;
    } else {
      const w = r.range(200, 260);
      booth(ctx, x, base, w, r, labels[i % labels.length]);
      x += w + r.range(90, 160);
    }
    i++;
  }
  // Boardwalk deck the booths stand on, with railing.
  ctx.fillStyle = C.ash;
  ctx.fillRect(0, base, MID_W, 30);
  line(ctx, C.ink, 1.4);
  for (let x = 0; x < MID_W; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, base);
    ctx.lineTo(x, base + 30);
    ctx.stroke();
  }
  ctx.fillStyle = C.charcoal;
  ctx.fillRect(0, base + 30, MID_W, h - base - 30);
  for (let x = 30; x < MID_W; x += 120) piling(ctx, x, base + 30, h, 18, r);
  paperTexture(ctx, MID_W, h, r, { strength: 1 });
  ctx.save();
  ctx.globalCompositeOperation = "source-atop";
  ctx.fillStyle = "rgba(207,203,195,0.5)";
  ctx.fillRect(0, 0, MID_W, h);
  ctx.restore();
  return lay;
}

function paintBunting(res) {
  // Pennant strings swagged across the top of the frame.
  const lay = makeLayer(2400, 160, res);
  const { ctx } = lay;
  for (let x0 = 0; x0 < 2400; x0 += 600) {
    const sag = 70;
    line(ctx, C.ink, 2);
    ctx.beginPath();
    ctx.moveTo(x0, 0);
    ctx.quadraticCurveTo(x0 + 300, sag * 2, x0 + 600, 0);
    ctx.stroke();
    for (let k = 1; k < 14; k++) {
      const u = k / 14;
      const px = x0 + u * 600;
      const py = 2 * (1 - u) * u * sag * 2;
      const f = new Path2D();
      f.moveTo(px - 14, py);
      f.lineTo(px + 14, py);
      f.lineTo(px, py + 34);
      f.closePath();
      ctx.fillStyle = [C.paper, C.ash, C.charcoal][k % 3];
      ctx.fill(f);
      roughStroke(ctx, f, 1.6);
    }
  }
  return lay;
}

// ---------------------------------------------------------------- drawing

function drawLagoon(ctx, camX, g) {
  const t = g.time;
  const grad = ctx.createLinearGradient(0, WATER, 0, H);
  grad.addColorStop(0, C.ash);
  grad.addColorStop(0.4, C.slate);
  grad.addColorStop(1, C.charcoal);
  ctx.fillStyle = grad;
  ctx.fillRect(0, WATER, W, H - WATER);
  // Reflected bulb glints.
  for (let i = 0; i < 14; i++) {
    const sp = 140;
    const x = ((i * 97 - camX * 0.9) % (W + sp) + W + sp) % (W + sp) - sp / 2;
    const y = WATER + 20 + (i % 4) * 22;
    ctx.fillStyle = `rgba(248,246,240,${0.25 + 0.2 * Math.sin(t * 3 + i)})`;
    ctx.beginPath();
    ctx.ellipse(x, y, 18 + (i % 3) * 8, 2, 0, 0, TAU);
    ctx.fill();
  }
  line(ctx, C.paper, 2.4);
  for (let row = 0; row < 3; row++) {
    const y = WATER + 30 + row * 30;
    const sp = 110 + row * 30;
    const off = camX * (1 + row * 0.08) + t * 20;
    for (let x = -(off % sp) - sp; x < W + sp; x += sp) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 12, y - 6, x + 24, y);
      ctx.stroke();
    }
  }
  line(ctx, C.paper, 3);
  ctx.beginPath();
  for (let sx = 0; sx <= W; sx += 16) {
    const y = WATER + 4 + Math.sin((sx + camX) * 0.03 + t * 3) * 2.5;
    if (sx) ctx.lineTo(sx, y);
    else ctx.moveTo(sx, y);
  }
  ctx.stroke();
}

export function drawBackground(ctx, camX, g) {
  if (!L) paintAll();
  ctx.drawImage(L.sky.canvas, 0, 0, W, L.sky.h);
  drawClouds(ctx, L.clouds, camX, g, { y0: 0, spread: 80, speed: 9 });
  drawWheel(ctx, camX, g);
  tile(ctx, L.far, camX * 0.12, FAR_TOP);
  tile(ctx, L.mid, camX * 0.35, MID_TOP);
}

export function drawForeground(ctx, camX, g) {
  if (!L) paintAll();
  drawLagoon(ctx, camX, g);
  tile(ctx, L.bunting, camX * 1.2, -6);
}

// ---------------------------------------------------------------- skins

function paintBoardwalk(ctx, w, depth, seed) {
  const r = rng(seed);
  ctx.translate(8, 8);
  // Deck boards.
  for (let x = 0; x < w; ) {
    const bw = Math.min(w - x, r.range(60, 110));
    plank(ctx, x, 0, bw, 14, r, { fill: C.silver, line: 1.6 });
    x += bw;
  }
  // Striped skirting board where the marquee bulbs hang.
  const skirt = new Path2D();
  skirt.rect(-4, 14, w + 8, 26);
  ctx.save();
  ctx.clip(skirt);
  stripes(ctx, -4, 14, w + 8, 26, Math.max(4, Math.round((w + 8) / 24)), C.paper, C.ash);
  ctx.restore();
  roughStroke(ctx, skirt, 2.4);
  // Pilings into the lagoon with cross bracing.
  const step = 110;
  const pts = [];
  for (let x = 14; x < w - 10; x += step) pts.push(x);
  pts.push(w - 14);
  line(ctx, C.charcoal, 4);
  for (let i = 0; i < pts.length - 1; i++) {
    ctx.beginPath();
    ctx.moveTo(pts[i], 40);
    ctx.lineTo(pts[i + 1], depth - 30);
    ctx.moveTo(pts[i + 1], 40);
    ctx.lineTo(pts[i], depth - 30);
    ctx.stroke();
  }
  for (const px of pts) piling(ctx, px, 40, depth, 22, r);
  line(ctx, C.ink, 2.6);
  ctx.strokeRect(0, 0, w, 14);
}

function ledge(ctx, d, g) {
  const depth = WATER - d.y + 50;
  const spr = cached(`pk:walk:${d.x}:${d.w}`, d.w + 16, depth + 16, (c) => paintBoardwalk(c, d.w, depth, d.x + 11));
  ctx.drawImage(spr.canvas, d.x - 8, d.y - 8, spr.w, spr.h);
  // Marquee bulbs along the skirt chase with the music.
  const step = 24;
  const lit = Math.floor((g.beatCount ?? 0) * 2) % 3;
  for (let k = 0, x = d.x + 12; x < d.x + d.w - 6; x += step, k++) {
    const on = (k + lit) % 3 === 0;
    if (on) {
      const glow = ctx.createRadialGradient(x, d.y + 27, 0, x, d.y + 27, 16);
      glow.addColorStop(0, "rgba(248,246,240,0.8)");
      glow.addColorStop(1, "rgba(248,246,240,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(x - 16, d.y + 11, 32, 32);
    }
    ctx.fillStyle = on ? C.paper : C.slate;
    ctx.beginPath();
    ctx.arc(x, d.y + 27, 4.5, 0, TAU);
    ctx.fill();
    line(ctx, C.ink, 1.4);
    ctx.stroke();
  }
}

function paintPedestal(ctx, w, h, cracked) {
  ctx.translate(5, 5);
  // A circus drum pedestal with a star band.
  const body = new Path2D();
  body.moveTo(0, 8);
  body.lineTo(0, h - 6);
  body.ellipse(w / 2, h - 6, w / 2, 6, 0, Math.PI, 0, true);
  body.lineTo(w, 8);
  body.closePath();
  ctx.save();
  ctx.clip(body);
  stripes(ctx, 0, 0, w, h, Math.max(4, Math.round(w / 12)), C.paper, C.ash);
  ctx.fillStyle = C.charcoal;
  ctx.fillRect(0, h * 0.38, w, h * 0.26);
  ctx.fillStyle = C.paper;
  for (let sx = w / 6; sx < w; sx += w / 3) star5(ctx, sx, h * 0.51, h * 0.1);
  const sh = ctx.createLinearGradient(0, 0, w, 0);
  sh.addColorStop(0, "rgba(248,246,240,0.3)");
  sh.addColorStop(0.5, "rgba(248,246,240,0)");
  sh.addColorStop(1, "rgba(23,22,20,0.35)");
  ctx.fillStyle = sh;
  ctx.fillRect(0, 0, w, h);
  if (cracked) {
    line(ctx, C.ink, 2.6);
    ctx.beginPath();
    ctx.moveTo(w * 0.4, 0);
    ctx.lineTo(w * 0.52, h * 0.35);
    ctx.lineTo(w * 0.4, h * 0.6);
    ctx.lineTo(w * 0.55, h);
    ctx.stroke();
  }
  ctx.restore();
  roughStroke(ctx, body, 2.8);
  const lid = new Path2D();
  lid.ellipse(w / 2, 8, w / 2, 7, 0, 0, TAU);
  wash(ctx, lid, C.silver, C.ash, { dir: "down", strength: 0.5, x: 0, y: 1, w: 1, h: 14 });
  roughStroke(ctx, lid, 2.4);
}

function star5(ctx, x, y, s) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? s * 0.45 : s;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

function block(ctx, b) {
  const spr = cached(`pk:ped:${b.x}:${b.y}:${b.w}:${b.h}:${b.breakable}`, b.w + 10, b.h + 10, (c) =>
    paintPedestal(c, b.w, b.h, b.breakable),
  );
  ctx.drawImage(spr.canvas, b.x - 5, b.y - 5, spr.w, spr.h);
}

function crumble(ctx, c) {
  // A rickety striped plank propped on a sawhorse.
  const spr = cached(`pk:plank:${c.w}`, c.w + 12, 60, (k) => {
    k.translate(6, 6);
    const p = new Path2D();
    p.rect(0, 0, c.w, 14);
    k.save();
    k.clip(p);
    stripes(k, 0, 0, c.w, 14, Math.round(c.w / 20), C.paper, C.ash);
    k.restore();
    roughStroke(k, p, 2.4);
    line(k, C.ink, 1.6);
    k.beginPath();
    k.moveTo(c.w * 0.48, 0);
    k.lineTo(c.w * 0.52, 7);
    k.lineTo(c.w * 0.47, 14);
    k.stroke();
    // Wobbly sawhorse legs.
    line(k, C.charcoal, 4);
    k.beginPath();
    k.moveTo(c.w * 0.3, 14);
    k.lineTo(c.w * 0.22, 46);
    k.moveTo(c.w * 0.3, 14);
    k.lineTo(c.w * 0.4, 46);
    k.moveTo(c.w * 0.7, 14);
    k.lineTo(c.w * 0.62, 46);
    k.moveTo(c.w * 0.7, 14);
    k.lineTo(c.w * 0.8, 44);
    k.stroke();
  });
  ctx.drawImage(spr.canvas, -c.w / 2 - 6, -6, spr.w, spr.h);
}

function hook(ctx, k, g) {
  // A circus trapeze: two ropes to a bar; the hero grabs the bar.
  const sw = Math.sin(g.time * 1.6 + k.x) * 4;
  const bx = k.x + sw;
  rope(ctx, [[k.x - 34, -20], [bx - 30 + sw * 0.2, k.y * 0.5], [bx - 28, k.y]], 3.5);
  rope(ctx, [[k.x + 34, -20], [bx + 30 + sw * 0.2, k.y * 0.5], [bx + 28, k.y]], 3.5);
  const bar = new Path2D();
  bar.rect(bx - 36, k.y - 4, 72, 9);
  wash(ctx, bar, C.silver, C.ink, { dir: "down", strength: 0.5, x: 0, y: k.y - 4, w: 1, h: 9 });
  roughStroke(ctx, bar, 2.4);
  // Taped grip in the middle.
  ctx.fillStyle = C.charcoal;
  for (let x = -10; x <= 10; x += 5) ctx.fillRect(bx + x - 1.5, k.y - 4, 3, 9);
}

function lift(ctx, l) {
  // A ferris-wheel gondola car hung from a gantry arm.
  const cx = l.x + l.w / 2;
  line(ctx, C.ink, 4);
  ctx.beginPath();
  ctx.moveTo(cx, -20);
  ctx.lineTo(cx, l.y - 70);
  ctx.stroke();
  const spr = cached(`pk:gondola:${l.w}`, l.w + 16, 110, (c) => {
    c.translate(8, 70);
    const canopy = new Path2D();
    canopy.moveTo(l.w / 2, -68);
    canopy.quadraticCurveTo(l.w * 0.9, -60, l.w, -42);
    canopy.lineTo(0, -42);
    canopy.quadraticCurveTo(l.w * 0.1, -60, l.w / 2, -68);
    canopy.closePath();
    c.save();
    c.clip(canopy);
    stripes(c, 0, -70, l.w, 30, 8, C.paper, C.ash);
    c.restore();
    roughStroke(c, canopy, 2.2);
    line(c, C.ink, 3);
    c.beginPath();
    c.moveTo(8, -42);
    c.lineTo(8, 0);
    c.moveTo(l.w - 8, -42);
    c.lineTo(l.w - 8, 0);
    c.stroke();
    const tub = new Path2D();
    tub.moveTo(0, 0);
    tub.lineTo(l.w, 0);
    tub.lineTo(l.w - 10, 30);
    tub.lineTo(10, 30);
    tub.closePath();
    wash(c, tub, C.slate, C.ink, { dir: "down", strength: 0.5, x: 0, y: 0, w: 1, h: 30 });
    roughStroke(c, tub, 2.6);
    c.fillStyle = C.paper;
    for (let x = 20; x < l.w - 14; x += 22) star5(c, x, 15, 6);
  });
  ctx.drawImage(spr.canvas, l.x - 8, l.y - 70, spr.w, spr.h);
}

function beat(ctx, b) {
  // A marquee sign platform whose bulbs blink on with its beats.
  const { x, y, w } = b;
  ctx.save();
  line(ctx, C.ash, 2);
  ctx.setLineDash([8, 7]);
  ctx.strokeRect(x, y, w, 18);
  ctx.setLineDash([]);
  if (b.vis > 0.02) {
    ctx.globalAlpha = b.vis;
    const spr = cached(`pk:marquee:${w}`, w + 12, 34, (c) => {
      c.translate(6, 6);
      const p = new Path2D();
      p.rect(0, 0, w, 20);
      wash(c, p, C.charcoal, C.ink, { dir: "down", strength: 0.4, x: 0, y: 0, w: 1, h: 20 });
      roughStroke(c, p, 2.4);
    });
    ctx.drawImage(spr.canvas, x - 6, y - 6, spr.w, spr.h);
    for (let bx = x + 10; bx < x + w - 4; bx += 16) {
      const glow = ctx.createRadialGradient(bx, y + 10, 0, bx, y + 10, 12);
      glow.addColorStop(0, "rgba(248,246,240,0.7)");
      glow.addColorStop(1, "rgba(248,246,240,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(bx - 12, y - 2, 24, 24);
      ctx.fillStyle = C.paper;
      ctx.beginPath();
      ctx.arc(bx, y + 10, 4, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

// ---------------------------------------------------------------- decos

function decoPopcorn(ctx, d) {
  const spr = cached("pk:popcorn", 140, 200, (c) => {
    const r = rng(71);
    c.translate(70, 196);
    // Cart on spoked wheels with a glass case full of popcorn.
    const base = new Path2D();
    base.rect(-56, -80, 112, 50);
    c.save();
    c.clip(base);
    stripes(c, -56, -80, 112, 50, 8, C.paper, C.ash);
    c.restore();
    roughStroke(c, base, 2.4);
    const glass = new Path2D();
    glass.rect(-48, -150, 96, 70);
    c.fillStyle = "rgba(248,246,240,0.6)";
    c.fill(glass);
    c.save();
    c.clip(glass);
    for (let i = 0; i < 70; i++) {
      c.fillStyle = r() < 0.5 ? C.paper : C.silver;
      c.beginPath();
      c.arc(r.range(-46, 46), -84 - r() * r() * 40, r.range(3, 5), 0, TAU);
      c.fill();
    }
    c.restore();
    roughStroke(c, glass, 2.4);
    const roof = new Path2D();
    roof.moveTo(-60, -150);
    roof.lineTo(0, -184);
    roof.lineTo(60, -150);
    roof.closePath();
    wash(c, roof, C.charcoal, C.ink, { dir: "right", strength: 0.4, x: -60, y: 0, w: 120, h: 1 });
    roughStroke(c, roof, 2.4);
    c.fillStyle = C.ink;
    c.beginPath();
    c.arc(0, -190, 6, 0, TAU);
    c.fill();
    for (const wx of [-36, 36]) {
      c.beginPath();
      c.arc(wx, -18, 18, 0, TAU);
      c.fillStyle = C.ash;
      c.fill();
      line(c, C.ink, 2.6);
      c.stroke();
      line(c, C.ink, 1.4);
      c.beginPath();
      for (let k = 0; k < 6; k++) {
        c.moveTo(wx, -18);
        c.lineTo(wx + Math.cos((k * TAU) / 6) * 16, -18 + Math.sin((k * TAU) / 6) * 16);
      }
      c.stroke();
    }
  });
  ctx.drawImage(spr.canvas, d.x - 70, d.y - 196, 140, 200);
}

function decoBalloons(ctx, d, g) {
  // A post with a bunch of balloons tugging at their strings.
  line(ctx, C.ink, 5);
  ctx.beginPath();
  ctx.moveTo(d.x, d.y);
  ctx.lineTo(d.x, d.y - 90);
  ctx.stroke();
  const bs = [[-34, -190], [0, -214], [34, -186], [-16, -164], [20, -158]];
  bs.forEach(([bx, by], i) => {
    const sw = Math.sin(g.time * 1.8 + i * 1.3) * 5;
    const x = d.x + bx + sw;
    const y = d.y + by + Math.cos(g.time * 1.4 + i) * 3;
    line(ctx, C.ink, 1.2);
    ctx.beginPath();
    ctx.moveTo(d.x, d.y - 90);
    ctx.quadraticCurveTo((d.x + x) / 2 + sw, (d.y - 90 + y) / 2, x, y + 22);
    ctx.stroke();
    const b = new Path2D();
    b.ellipse(x, y, 17, 21, 0, 0, TAU);
    wash(ctx, b, [C.paper, C.ash, C.silver, C.slate, C.paper][i], C.ink, { dir: "right", strength: 0.4, x: x - 17, y: 0, w: 34, h: 1 });
    roughStroke(ctx, b, 2);
    ctx.fillStyle = "rgba(248,246,240,0.7)";
    ctx.beginPath();
    ctx.ellipse(x - 6, y - 8, 4, 6, -0.4, 0, TAU);
    ctx.fill();
  });
}

function decoStriker(ctx, d) {
  const spr = cached("pk:striker", 120, 360, (c) => {
    c.translate(60, 356);
    highStriker(c, 0, 0);
    // A mallet leaning on it.
    line(c, C.ink, 5);
    c.beginPath();
    c.moveTo(30, 0);
    c.lineTo(46, -90);
    c.stroke();
    const head = new Path2D();
    head.rect(30, -112, 34, 22);
    wash(c, head, C.ash, C.ink, { dir: "down", strength: 0.5, x: 0, y: -112, w: 1, h: 22 });
    roughStroke(c, head, 2);
  });
  ctx.drawImage(spr.canvas, d.x - 60, d.y - 356, 120, 360);
}

function decoTicket(ctx, d) {
  const spr = cached("pk:ticket", 130, 220, (c) => {
    c.translate(65, 216);
    const box = new Path2D();
    box.rect(-46, -150, 92, 150);
    c.save();
    c.clip(box);
    stripes(c, -46, -150, 92, 150, 6, C.paper, C.ash);
    c.restore();
    roughStroke(c, box, 2.6);
    c.fillStyle = C.charcoal;
    c.fillRect(-34, -130, 68, 50);
    line(c, C.ink, 2);
    c.strokeRect(-34, -130, 68, 50);
    const dome = new Path2D();
    dome.moveTo(-54, -150);
    dome.quadraticCurveTo(0, -214, 54, -150);
    dome.closePath();
    wash(c, dome, C.slate, C.ink, { dir: "right", strength: 0.5, x: -54, y: 0, w: 108, h: 1 });
    roughStroke(c, dome, 2.4);
    c.fillStyle = C.paper;
    c.fillRect(-40, -70, 80, 20);
    line(c, C.ink, 1.6);
    c.strokeRect(-40, -70, 80, 20);
    c.fillStyle = C.ink;
    c.font = 'bold 13px Georgia, "Times New Roman", serif';
    c.textAlign = "center";
    c.fillText("TICKETS", 0, -55);
  });
  ctx.drawImage(spr.canvas, d.x - 65, d.y - 216, 130, 220);
}

function decoBottles(ctx, d) {
  // A milk-bottle toss pyramid on a striped crate.
  const spr = cached(`pk:bottles:${d.flip}`, 150, 140, (c) => {
    c.translate(75, 136);
    const crate = new Path2D();
    crate.rect(-60, -50, 120, 50);
    c.save();
    c.clip(crate);
    stripes(c, -60, -50, 120, 50, 8, C.paper, C.ash);
    c.restore();
    roughStroke(c, crate, 2.4);
    const bottle = (bx, by) => {
      const p = new Path2D();
      p.moveTo(bx - 9, by);
      p.lineTo(bx - 9, by - 18);
      p.quadraticCurveTo(bx - 9, by - 24, bx - 4, by - 28);
      p.lineTo(bx - 4, by - 34);
      p.lineTo(bx + 4, by - 34);
      p.lineTo(bx + 4, by - 28);
      p.quadraticCurveTo(bx + 9, by - 24, bx + 9, by - 18);
      p.lineTo(bx + 9, by);
      p.closePath();
      wash(c, p, C.paper, C.ash, { dir: "right", strength: 0.6, x: bx - 9, y: 0, w: 18, h: 1 });
      roughStroke(c, p, 1.8);
    };
    for (const bx of [-20, 0, 20]) bottle(bx, -50);
    for (const bx of [-10, 10]) bottle(bx, -84);
    bottle(0, -118);
  });
  ctx.drawImage(spr.canvas, d.x - 75, d.y - 136, 150, 140);
}

function decoGate(ctx, d) {
  // The way out: the pier's arched entrance with a lettered sign.
  const spr = cached("pk:gate", 340, 320, (c) => {
    const r = rng(79);
    c.translate(20, 316);
    for (const px of [0, 280]) {
      const post = new Path2D();
      post.rect(px, -260, 24, 260);
      c.save();
      c.clip(post);
      stripes(c, px, -260, 24, 260, 2, C.paper, C.ash);
      c.restore();
      roughStroke(c, post, 2.6);
      c.fillStyle = C.ink;
      c.beginPath();
      c.arc(px + 12, -268, 14, 0, TAU);
      c.fill();
    }
    const arch = new Path2D();
    arch.moveTo(0, -230);
    arch.quadraticCurveTo(152, -330, 304, -230);
    arch.lineTo(304, -200);
    arch.quadraticCurveTo(152, -290, 0, -200);
    arch.closePath();
    wash(c, arch, C.paper, C.ash, { dir: "down", strength: 0.4, x: 0, y: -300, w: 1, h: 100 });
    roughStroke(c, arch, 2.6);
    c.fillStyle = C.ink;
    for (let k = 1; k < 12; k++) {
      const u = k / 12;
      const x = u * 304;
      const y = (1 - u) * (1 - u) * -215 + 2 * (1 - u) * u * -310 + u * u * -215;
      c.beginPath();
      c.arc(x, y, 3.5, 0, TAU);
      c.fill();
    }
    plank(c, 40, -160, 224, 14, r, { fill: C.ash, line: 1.6, nails: false });
  });
  ctx.drawImage(spr.canvas, d.x - 20, d.y - 316, 340, 320);
}

// ---------------------------------------------------------------- the coaster car

class Coaster extends Chaser {
  smokeOrigins() {
    return [];
  }

  paint(ctx, g) {
    const t = g.time;
    // Coaster track on a lattice trestle rising out of the lagoon.
    line(ctx, C.charcoal, 3);
    ctx.beginPath();
    for (let x = -900 - ((this.wheel * 12) % 70); x < 80; x += 70) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 35, 80);
      ctx.lineTo(x + 70, 0);
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 120);
    }
    ctx.stroke();
    ctx.fillStyle = C.ash;
    ctx.fillRect(-900, -8, 980, 10);
    line(ctx, C.ink, 2);
    ctx.strokeRect(-900, -8, 980, 10);
    // Three cars, the Captain riding in the front one.
    const bob = (i) => Math.sin(t * 10 + i) * 2;
    for (let i = 2; i >= 0; i--) {
      const x0 = -150 - i * 170;
      ctx.save();
      ctx.translate(x0, bob(i));
      const spr = cached("pk:car", 180, 120, paintCar);
      ctx.drawImage(spr.canvas, -90, -116, 180, 120);
      if (i === 0) captain(ctx, 0, -110, t, 1.05);
      else {
        // Panicked riders with arms up.
        ctx.fillStyle = C.ink;
        ctx.beginPath();
        ctx.arc(0, -96, 12, 0, TAU);
        ctx.fill();
        line(ctx, C.ink, 4);
        ctx.beginPath();
        ctx.moveTo(-10, -84);
        ctx.lineTo(-22, -116 + Math.sin(t * 8 + i) * 4);
        ctx.moveTo(10, -84);
        ctx.lineTo(22, -116 + Math.cos(t * 8 + i) * 4);
        ctx.stroke();
      }
      for (const wx of [-50, 50]) {
        ctx.save();
        ctx.translate(wx, -12);
        ctx.rotate(this.wheel);
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, TAU);
        ctx.fillStyle = C.charcoal;
        ctx.fill();
        line(ctx, C.ink, 2.4);
        ctx.stroke();
        line(ctx, C.ash, 2);
        ctx.beginPath();
        ctx.moveTo(-9, 0);
        ctx.lineTo(9, 0);
        ctx.moveTo(0, -9);
        ctx.lineTo(0, 9);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }
    // Speed lines.
    line(ctx, C.ash, 2);
    for (let i = 0; i < 4; i++) {
      const y = -110 + i * 26;
      const k = (t * 3 + i * 0.3) % 1;
      ctx.beginPath();
      ctx.moveTo(-700 - k * 160, y);
      ctx.lineTo(-620 - k * 160, y);
      ctx.stroke();
    }
    if (this.tootT > 0) {
      // A clanging bell instead of a whistle.
      const k = this.tootT / 0.7;
      line(ctx, C.ink, 2.4);
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(-150, -190, 20 + i * 12 + (1 - k) * 20, -0.9, -0.2);
        ctx.stroke();
      }
    }
  }
}

function paintCar(c) {
  c.translate(90, 116);
  const body = new Path2D();
  body.moveTo(-80, -20);
  body.lineTo(-80, -70);
  body.quadraticCurveTo(-70, -84, -50, -80);
  body.lineTo(60, -80);
  body.quadraticCurveTo(88, -78, 84, -20);
  body.closePath();
  c.save();
  c.clip(body);
  stripes(c, -80, -90, 170, 70, 9, C.paper, C.ash);
  const sh = c.createLinearGradient(0, -80, 0, -20);
  sh.addColorStop(0, "rgba(248,246,240,0.2)");
  sh.addColorStop(1, "rgba(23,22,20,0.35)");
  c.fillStyle = sh;
  c.fillRect(-80, -90, 170, 70);
  c.restore();
  roughStroke(c, body, 3);
  c.fillStyle = C.charcoal;
  c.fillRect(-84, -26, 172, 10);
  line(c, C.ink, 2);
  c.strokeRect(-84, -26, 172, 10);
  // Grab bar.
  line(c, C.ink, 3);
  c.beginPath();
  c.moveTo(-40, -80);
  c.lineTo(-30, -96);
  c.lineTo(40, -96);
  c.lineTo(50, -80);
  c.stroke();
}

registerChaser("coaster", Coaster);

export default {
  id: "park",
  name: "Jubilee Pier",
  decoKinds: ["popcorn", "balloons", "ticket", "striker"],
  perch: "gull",
  landingSign: "THE GRAND FINALE",
  fall: { fx: "splash", text: "SPLASH!" },
  chaser: "coaster",
  drawBackground,
  drawForeground,
  skins: { ledge, block, crumble, hook, lift, beat },
  decos: {
    popcorn: decoPopcorn,
    balloons: decoBalloons,
    ticket: decoTicket,
    striker: decoStriker,
    stack: decoBottles,
    shed: decoGate,
  },
};
