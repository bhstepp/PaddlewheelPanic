// Creaky Manor: a moonlit hall with tall arched windows, drapes and
// columns, a portrait gallery whose eyes follow you, cobwebs, a dark cellar
// below the floorboards, chandeliers to swing from, and the Captain riding
// a phantom train.
import { cached, plank, rope, layerRes, brush, woodGrain } from "../ink.js";
import { registerChaser } from "../../entities/chasers.js";
import { Chaser, captain } from "../../entities/chaser.js";
import { C, TAU, W, H, rng, makeLayer, wash, paperTexture, roughStroke, line, tile, drawMist } from "./common.js";

const HALL_W = 2400;
const GALLERY_W = 3000;
const GALLERY_TOP = 150;
const FRONT_W = 3400;

let L = null;

function paintAll() {
  const res = layerRes();
  const hall = paintHall(res);
  L = {
    hall: hall.lay,
    lit: hall.lit,
    gallery: paintGallery(res),
    webs: paintWebs(res),
    rail: paintRail(res),
  };
}

// ---------------------------------------------------------------- the far wall

function archPath(x, y, w, h) {
  const p = new Path2D();
  p.moveTo(x, y + h);
  p.lineTo(x, y + w / 2);
  p.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0);
  p.lineTo(x + w, y + h);
  p.closePath();
  return p;
}

function paintHall(res) {
  const lay = makeLayer(HALL_W, H, res);
  const lit = makeLayer(HALL_W, H, res);
  const { ctx } = lay;
  const r = rng(13);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, C.ink);
  g.addColorStop(0.35, C.charcoal);
  g.addColorStop(1, C.ink);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, HALL_W, H);
  // Damask wallpaper: faint repeating lozenges and fleurs.
  ctx.save();
  ctx.globalAlpha = 0.5;
  line(ctx, C.slate, 1.4);
  for (let y = 40; y < 560; y += 70) {
    for (let x = (y / 70) % 2 ? 35 : 0; x < HALL_W; x += 70) {
      ctx.beginPath();
      ctx.moveTo(x, y - 22);
      ctx.quadraticCurveTo(x + 14, y, x, y + 22);
      ctx.quadraticCurveTo(x - 14, y, x, y - 22);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y - 26, 3, 0, TAU);
      ctx.stroke();
    }
  }
  ctx.restore();
  // Windows between columns, each with the moonlit grounds outside.
  const winW = 190;
  const winTop = 70;
  const winH = 360;
  for (let wx = 210; wx < HALL_W; wx += 600) {
    const p = archPath(wx, winTop, winW, winH);
    // Night outside.
    ctx.save();
    ctx.clip(p);
    const sky = ctx.createLinearGradient(0, winTop, 0, winTop + winH);
    sky.addColorStop(0, C.slate);
    sky.addColorStop(1, C.ash);
    ctx.fillStyle = sky;
    ctx.fillRect(wx, winTop, winW, winH);
    const mx = wx + winW * r.range(0.3, 0.7);
    const my = winTop + r.range(70, 110);
    ctx.fillStyle = C.paper;
    ctx.beginPath();
    ctx.arc(mx, my, 30, 0, TAU);
    ctx.fill();
    ctx.fillStyle = C.silver;
    ctx.beginPath();
    ctx.arc(mx + 8, my - 4, 7, 0, TAU);
    ctx.arc(mx - 9, my + 9, 5, 0, TAU);
    ctx.fill();
    // Rolling grounds and a bare tree.
    ctx.fillStyle = C.charcoal;
    ctx.beginPath();
    ctx.moveTo(wx, winTop + winH);
    ctx.lineTo(wx, winTop + winH - 70);
    ctx.quadraticCurveTo(wx + winW * 0.5, winTop + winH - 120, wx + winW, winTop + winH - 80);
    ctx.lineTo(wx + winW, winTop + winH);
    ctx.fill();
    bareTree(ctx, wx + winW * r.range(0.2, 0.8), winTop + winH - 90, r.range(120, 170), r);
    ctx.restore();
    // Muntins and frame.
    line(ctx, C.ink, 7);
    ctx.beginPath();
    ctx.moveTo(wx + winW / 2, winTop);
    ctx.lineTo(wx + winW / 2, winTop + winH);
    for (let yy = winTop + 120; yy < winTop + winH; yy += 90) {
      ctx.moveTo(wx, yy);
      ctx.lineTo(wx + winW, yy);
    }
    ctx.stroke();
    roughStroke(ctx, p, 10, C.ink);
    roughStroke(ctx, p, 3, C.slate);
    // The lightning version of this window: bright panes only.
    lit.ctx.save();
    lit.ctx.clip(p);
    lit.ctx.fillStyle = C.paper;
    lit.ctx.fillRect(wx, winTop, winW, winH);
    lit.ctx.fillStyle = C.ink;
    lit.ctx.beginPath();
    lit.ctx.moveTo(wx, winTop + winH);
    lit.ctx.lineTo(wx, winTop + winH - 70);
    lit.ctx.quadraticCurveTo(wx + winW * 0.5, winTop + winH - 120, wx + winW, winTop + winH - 80);
    lit.ctx.lineTo(wx + winW, winTop + winH);
    lit.ctx.fill();
    lit.ctx.restore();
    // Heavy drapes with a tie-back, either side.
    for (const side of [-1, 1]) {
      const dx = side < 0 ? wx - 18 : wx + winW + 18;
      const d = new Path2D();
      d.moveTo(dx - side * 30, winTop - 30);
      d.lineTo(dx + side * 40, winTop - 30);
      d.bezierCurveTo(dx + side * 30, winTop + 120, dx - side * 10, winTop + 200, dx + side * 4, winTop + 250);
      d.bezierCurveTo(dx + side * 20, winTop + 300, dx + side * 30, winTop + 380, dx + side * 46, winTop + winH + 40);
      d.lineTo(dx - side * 30, winTop + winH + 40);
      d.closePath();
      wash(ctx, d, C.slate, C.ink, { dir: "right", strength: 0.7, x: dx - 40, y: winTop, w: 80, h: winH });
      ctx.save();
      ctx.clip(d);
      line(ctx, C.charcoal, 2);
      for (let k = -2; k <= 3; k++) {
        ctx.beginPath();
        ctx.moveTo(dx + k * 12, winTop - 30);
        ctx.quadraticCurveTo(dx + k * 6, winTop + 240, dx + k * 14 + side * 16, winTop + winH + 40);
        ctx.stroke();
      }
      ctx.restore();
      roughStroke(ctx, d, 2.4, C.ink);
      ctx.fillStyle = C.ash;
      ctx.beginPath();
      ctx.ellipse(dx + side * 4, winTop + 250, 10, 6, 0, 0, TAU);
      ctx.fill();
      line(ctx, C.ink, 1.6);
      ctx.stroke();
    }
    // Valance rod.
    ctx.fillStyle = C.ink;
    ctx.fillRect(wx - 60, winTop - 36, winW + 120, 10);
    for (const kx of [wx - 64, wx + winW + 64]) {
      ctx.beginPath();
      ctx.arc(kx, winTop - 31, 9, 0, TAU);
      ctx.fill();
    }
  }
  // Fluted columns between the windows.
  for (let cx = 510; cx < HALL_W; cx += 600) {
    const col = new Path2D();
    col.rect(cx - 34, 30, 68, 540);
    wash(ctx, col, C.slate, C.ink, { dir: "right", strength: 0.75, x: cx - 34, y: 0, w: 68, h: 1 });
    line(ctx, C.ink, 1.6);
    for (let k = -2; k <= 2; k++) {
      ctx.beginPath();
      ctx.moveTo(cx + k * 12, 60);
      ctx.lineTo(cx + k * 12, 540);
      ctx.stroke();
    }
    roughStroke(ctx, col, 2.6, C.ink);
    for (const [y, h] of [[18, 22], [548, 30]]) {
      const cap = new Path2D();
      cap.rect(cx - 46, y, 92, h);
      wash(ctx, cap, C.ash, C.ink, { dir: "down", strength: 0.6, x: cx - 46, y, w: 92, h });
      roughStroke(ctx, cap, 2.4, C.ink);
    }
  }
  // Wainscot and the dim floor line far behind the play floor.
  ctx.fillStyle = C.ink;
  ctx.fillRect(0, 560, HALL_W, H - 560);
  line(ctx, C.charcoal, 2);
  for (let x = 0; x < HALL_W; x += 120) ctx.strokeRect(x + 10, 574, 100, 60);
  paperTexture(ctx, HALL_W, H, r, { strength: 0.8, blot: 0.8 });
  return { lay, lit };
}

function bareTree(ctx, x, base, h, r) {
  const branch = (x0, y0, ang, len, w, depth) => {
    const x1 = x0 + Math.cos(ang) * len;
    const y1 = y0 + Math.sin(ang) * len;
    brush(ctx, [[x0, y0], [(x0 + x1) / 2 + r.range(-4, 4), (y0 + y1) / 2], [x1, y1]], r, { w, color: C.ink, taper: 0.6 });
    if (depth <= 0) return;
    branch(x1, y1, ang - r.range(0.3, 0.7), len * 0.7, w * 0.62, depth - 1);
    branch(x1, y1, ang + r.range(0.3, 0.7), len * 0.66, w * 0.6, depth - 1);
  };
  branch(x, base, -Math.PI / 2 + r.range(-0.1, 0.1), h * 0.42, 12, 4);
}

// ---------------------------------------------------------------- the portrait gallery

const PORTRAITS = [];

function paintGallery(res) {
  const h = H - GALLERY_TOP;
  const lay = makeLayer(GALLERY_W, h, res);
  const { ctx } = lay;
  const r = rng(31);
  PORTRAITS.length = 0;
  // Furniture stands just below the play floor so it sits behind it.
  const floor = 400;
  let x = 60;
  let i = 0;
  while (x < GALLERY_W - 300) {
    const kind = i % 4;
    if (kind === 0 || kind === 2) {
      // A gilt-framed portrait whose painted eyes are left blank (the pupils
      // are drawn live so they follow the hero).
      const pw = r.range(110, 150);
      const ph = pw * 1.3;
      const py = r.range(40, 90);
      portrait(ctx, x, py, pw, ph, r, kind === 2);
      PORTRAITS.push({ x: x + pw / 2, y: py + ph * 0.36 + GALLERY_TOP, sp: pw * 0.13 });
      x += pw + r.range(120, 200);
    } else if (kind === 1) {
      grandfatherClock(ctx, x, floor, r);
      x += 200;
    } else {
      bookcase(ctx, x, floor - 300, 200, 300, r);
      x += 280;
    }
    i++;
  }
  // A grand staircase sweeping up the back of the gallery.
  const sx = GALLERY_W - 260;
  for (let s = 0; s < 9; s++) {
    const st = new Path2D();
    st.rect(sx - s * 22, floor - s * 26, 240, 26);
    wash(ctx, st, C.slate, C.ink, { dir: "down", strength: 0.5, x: 0, y: floor - s * 26, w: 1, h: 26 });
    roughStroke(ctx, st, 1.6, C.ink);
  }
  line(ctx, C.ink, 3);
  ctx.beginPath();
  ctx.moveTo(sx + 230, floor - 40);
  ctx.lineTo(sx - 180, floor - 40 - 9 * 26);
  ctx.stroke();
  for (let s = 0; s < 9; s++) {
    ctx.beginPath();
    ctx.moveTo(sx + 220 - s * 45, floor - 40 - s * 26);
    ctx.lineTo(sx + 220 - s * 45, floor - s * 26);
    ctx.stroke();
  }
  paperTexture(ctx, GALLERY_W, h, r, { strength: 1 });
  // Haze it back so nothing reads as solid ground.
  ctx.save();
  ctx.globalCompositeOperation = "source-atop";
  ctx.fillStyle = "rgba(46,44,41,0.35)";
  ctx.fillRect(0, 0, GALLERY_W, h);
  ctx.restore();
  return lay;
}

function portrait(ctx, x, y, w, h, r, lady) {
  const frame = new Path2D();
  frame.rect(x - 12, y - 12, w + 24, h + 24);
  wash(ctx, frame, C.ash, C.ink, { dir: "right", strength: 0.6, x: x - 12, y, w: w + 24, h: 1 });
  roughStroke(ctx, frame, 2.6, C.ink);
  line(ctx, C.charcoal, 1.4);
  ctx.strokeRect(x - 6, y - 6, w + 12, h + 12);
  ctx.fillStyle = C.charcoal;
  ctx.fillRect(x, y, w, h);
  // The sitter: a stern bust.
  const cx = x + w / 2;
  const hy = y + h * 0.36;
  ctx.fillStyle = C.slate;
  ctx.beginPath();
  ctx.ellipse(cx, y + h + 6, w * 0.46, h * 0.36, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = C.silver;
  ctx.beginPath();
  ctx.ellipse(cx, hy, w * 0.22, w * 0.27, 0, 0, TAU);
  ctx.fill();
  line(ctx, C.ink, 1.6);
  ctx.stroke();
  if (lady) {
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    ctx.ellipse(cx, hy - w * 0.2, w * 0.27, w * 0.15, 0, Math.PI, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, hy - w * 0.33, w * 0.08, 0, TAU);
    ctx.fill();
  } else {
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.14, hy + w * 0.1);
    ctx.quadraticCurveTo(cx, hy + w * 0.04, cx + w * 0.14, hy + w * 0.1);
    ctx.quadraticCurveTo(cx, hy + w * 0.14, cx - w * 0.14, hy + w * 0.1);
    ctx.fill();
    ctx.fillRect(cx - w * 0.22, hy - w * 0.36, w * 0.44, w * 0.14);
    ctx.fillRect(cx - w * 0.16, hy - w * 0.62, w * 0.32, w * 0.3);
  }
  // Empty eye whites.
  ctx.fillStyle = C.paper;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(cx + s * w * 0.09, hy - w * 0.02, w * 0.055, w * 0.04, 0, 0, TAU);
    ctx.fill();
  }
  // Brush texture over the canvas.
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  line(ctx, "rgba(154,150,143,0.25)", 1);
  for (let k = 0; k < 30; k++) {
    const yy = y + r() * h;
    ctx.beginPath();
    ctx.moveTo(x, yy);
    ctx.lineTo(x + w, yy + r.range(-6, 6));
    ctx.stroke();
  }
  ctx.restore();
  // Picture wire.
  line(ctx, C.ink, 1.4);
  ctx.beginPath();
  ctx.moveTo(x + 10, y - 12);
  ctx.lineTo(x + w / 2, y - 50);
  ctx.lineTo(x + w - 10, y - 12);
  ctx.stroke();
}

function grandfatherClock(ctx, x, base, r) {
  const body = new Path2D();
  body.moveTo(x, base);
  body.lineTo(x, base - 230);
  body.lineTo(x + 20, base - 250);
  body.lineTo(x + 20, base - 320);
  body.quadraticCurveTo(x + 60, base - 370, x + 100, base - 320);
  body.lineTo(x + 100, base - 250);
  body.lineTo(x + 120, base - 230);
  body.lineTo(x + 120, base);
  body.closePath();
  wash(ctx, body, C.slate, C.ink, { dir: "right", strength: 0.7, x, y: 0, w: 120, h: 1 });
  roughStroke(ctx, body, 2.4, C.ink);
  ctx.fillStyle = C.silver;
  ctx.beginPath();
  ctx.arc(x + 60, base - 290, 28, 0, TAU);
  ctx.fill();
  line(ctx, C.ink, 2);
  ctx.stroke();
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * TAU;
    ctx.beginPath();
    ctx.moveTo(x + 60 + Math.cos(a) * 22, base - 290 + Math.sin(a) * 22);
    ctx.lineTo(x + 60 + Math.cos(a) * 26, base - 290 + Math.sin(a) * 26);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(x + 60, base - 290);
  ctx.lineTo(x + 60, base - 308);
  ctx.moveTo(x + 60, base - 290);
  ctx.lineTo(x + 74, base - 284);
  ctx.stroke();
  // Pendulum window.
  ctx.fillStyle = C.ink;
  ctx.fillRect(x + 30, base - 220, 60, 150);
  ctx.fillStyle = C.ash;
  ctx.beginPath();
  ctx.arc(x + 60, base - 100, 14, 0, TAU);
  ctx.fill();
  line(ctx, C.ash, 2);
  ctx.beginPath();
  ctx.moveTo(x + 60, base - 216);
  ctx.lineTo(x + 60, base - 100);
  ctx.stroke();
}

function bookcase(ctx, x, y, w, h, r) {
  const p = new Path2D();
  p.rect(x, y, w, h);
  wash(ctx, p, C.slate, C.ink, { dir: "right", strength: 0.6, x, y, w, h });
  roughStroke(ctx, p, 2.4, C.ink);
  for (let sy = y + 16; sy < y + h - 40; sy += 66) {
    ctx.fillStyle = C.ink;
    ctx.fillRect(x + 10, sy, w - 20, 54);
    let bx = x + 14;
    while (bx < x + w - 24) {
      const bw = r.range(9, 18);
      const bh = r.range(34, 52);
      const lean = r() < 0.1 ? r.range(-0.2, 0.2) : 0;
      ctx.save();
      ctx.translate(bx, sy + 54);
      ctx.rotate(lean);
      ctx.fillStyle = [C.ash, C.silver, C.charcoal, C.slate][Math.floor(r() * 4)];
      ctx.fillRect(0, -bh, bw, bh);
      line(ctx, C.ink, 1);
      ctx.strokeRect(0, -bh, bw, bh);
      ctx.restore();
      bx += bw + 1;
    }
    ctx.fillStyle = C.ash;
    ctx.fillRect(x + 6, sy + 54, w - 12, 8);
  }
}

// ---------------------------------------------------------------- foreground

function paintWebs(res) {
  const lay = makeLayer(FRONT_W, 220, res);
  const { ctx } = lay;
  const r = rng(71);
  for (let x = 200; x < FRONT_W - 300; x += r.range(700, 1100)) {
    // A drooping cobweb strung across the top of frame.
    const span = r.range(180, 300);
    line(ctx, "rgba(207,203,195,0.55)", 1.4);
    for (let k = 0; k < 5; k++) {
      const sag = 30 + k * 26;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.quadraticCurveTo(x + span / 2, sag * 1.6, x + span, 0);
      ctx.stroke();
    }
    for (let k = 0; k <= 6; k++) {
      ctx.beginPath();
      ctx.moveTo(x + span / 2, -10);
      ctx.lineTo(x + (span * k) / 6, 30 + Math.sin((k / 6) * Math.PI) * 140);
      ctx.stroke();
    }
    // A dangling spider.
    const sx = x + span * r.range(0.3, 0.7);
    const sy = r.range(120, 190);
    line(ctx, "rgba(207,203,195,0.7)", 1);
    ctx.beginPath();
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, sy);
    ctx.stroke();
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    ctx.ellipse(sx, sy + 8, 7, 9, 0, 0, TAU);
    ctx.fill();
    line(ctx, C.ink, 1.6);
    for (const s of [-1, 1]) {
      for (let k = 0; k < 4; k++) {
        ctx.beginPath();
        ctx.moveTo(sx, sy + 4 + k * 3);
        ctx.quadraticCurveTo(sx + s * 12, sy - 2 + k * 5, sx + s * 15, sy + 8 + k * 5);
        ctx.stroke();
      }
    }
  }
  return lay;
}

function paintRail(res) {
  // Banister spindles in the extreme foreground below the floor line.
  const h = 140;
  const lay = makeLayer(FRONT_W, h, res);
  const { ctx } = lay;
  const r = rng(73);
  for (let x0 = 300; x0 < FRONT_W - 600; x0 += r.range(1200, 1700)) {
    const len = r.range(380, 520);
    ctx.fillStyle = C.ink;
    ctx.fillRect(x0, 10, len, 18);
    for (let x = x0 + 12; x < x0 + len - 10; x += 34) {
      ctx.beginPath();
      ctx.moveTo(x - 6, 28);
      ctx.quadraticCurveTo(x - 14, 60, x - 4, 80);
      ctx.quadraticCurveTo(x - 12, 110, x - 6, h);
      ctx.lineTo(x + 6, h);
      ctx.quadraticCurveTo(x + 12, 110, x + 4, 80);
      ctx.quadraticCurveTo(x + 14, 60, x + 6, 28);
      ctx.fill();
    }
    ctx.fillRect(x0 - 16, 0, 30, h);
    ctx.beginPath();
    ctx.arc(x0 - 1, 0, 18, 0, TAU);
    ctx.fill();
  }
  return lay;
}

// ---------------------------------------------------------------- drawing

function flash(t) {
  // A soft lightning flicker every ten seconds or so (never a strobe).
  const k = t % 10.5;
  if (k > 0.5) return 0;
  return k < 0.12 ? 0.8 : k < 0.2 ? 0.2 : Math.max(0, 0.5 - (k - 0.2) * 1.6);
}

export function drawBackground(ctx, camX, g) {
  if (!L) paintAll();
  const off = camX * 0.12;
  tile(ctx, L.hall, off, 0);
  const f = flash(g.time);
  if (f > 0) {
    ctx.globalAlpha = f;
    tile(ctx, L.lit, off, 0);
    ctx.globalAlpha = 1;
  }
  const goff = camX * 0.38;
  tile(ctx, L.gallery, goff, GALLERY_TOP);
  // Painted pupils that follow the hero.
  const hx = g.hero.x - camX;
  const hy = g.hero.y - 60;
  const w = L.gallery.w;
  let base = -(((goff % w) + w) % w);
  for (; base < W; base += w) {
    for (const p of PORTRAITS) {
      const px = base + p.x;
      if (px < -100 || px > W + 100) continue;
      const a = Math.atan2(hy - p.y, hx - px);
      ctx.fillStyle = C.ink;
      for (const s of [-1, 1]) {
        const ex = px + s * p.sp * 0.7;
        ctx.beginPath();
        ctx.arc(ex + Math.cos(a) * p.sp * 0.22, p.y - 2 + Math.sin(a) * p.sp * 0.12, p.sp * 0.17, 0, TAU);
        ctx.fill();
      }
    }
  }
  if (f > 0) {
    ctx.fillStyle = `rgba(248,246,240,${f * 0.12})`;
    ctx.fillRect(0, 0, W, H);
  }
}

export function drawForeground(ctx, camX, g) {
  if (!L) paintAll();
  drawMist(ctx, camX, g, { top: 620, color: "rgba(154,150,143," });
  tile(ctx, L.webs, camX * 1.2, 0);
  tile(ctx, L.rail, camX * 1.4, H - 120);
}

// ---------------------------------------------------------------- skins

function paintFloor(ctx, w, depth, seed) {
  const r = rng(seed);
  ctx.translate(8, 8);
  // Floorboards.
  for (let x = 0; x < w; ) {
    const bw = Math.min(w - x, r.range(70, 140));
    plank(ctx, x, 0, bw, 14, r, { fill: C.ash, line: 1.6, nails: true });
    x += bw;
  }
  // Carved molding.
  const mold = new Path2D();
  mold.rect(-4, 14, w + 8, 16);
  wash(ctx, mold, C.silver, C.ink, { dir: "down", strength: 0.5, x: 0, y: 14, w: 1, h: 16 });
  roughStroke(ctx, mold, 2, C.ink);
  line(ctx, C.ash, 1.2);
  for (let x = 6; x < w; x += 16) {
    ctx.beginPath();
    ctx.arc(x, 22, 3.4, 0, TAU);
    ctx.stroke();
  }
  // Cellar wall beneath: stone courses fading into the dark.
  const face = new Path2D();
  face.rect(4, 30, w - 8, depth - 30);
  const g = ctx.createLinearGradient(0, 30, 0, depth);
  g.addColorStop(0, C.slate);
  g.addColorStop(0.5, C.charcoal);
  g.addColorStop(1, C.ink);
  ctx.fillStyle = g;
  ctx.fill(face);
  ctx.save();
  ctx.clip(face);
  line(ctx, C.ink, 1.6);
  for (let y = 30, row = 0; y < depth; y += 26, row++) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    for (let x = row % 2 ? 0 : 30; x < w; x += 60) {
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + 26);
    }
    ctx.stroke();
  }
  // Wall-mounted joist ends under the boards.
  for (let x = 20; x < w - 20; x += 90) {
    ctx.fillStyle = C.ink;
    ctx.fillRect(x, 30, 16, 26);
  }
  ctx.restore();
  roughStroke(ctx, face, 2.6, C.ink);
  line(ctx, C.ink, 2.6);
  ctx.strokeRect(0, 0, w, 14);
}

function ledge(ctx, d) {
  const depth = H - d.y + 20;
  const spr = cached(`hh:floor:${d.x}:${d.w}`, d.w + 16, depth + 16, (c) => paintFloor(c, d.w, depth, d.x + 5));
  ctx.drawImage(spr.canvas, d.x - 8, d.y - 8, spr.w, spr.h);
}

function paintTrunk(ctx, w, h, seed, cracked) {
  const r = rng(seed);
  ctx.translate(5, 5);
  const p = new Path2D();
  p.moveTo(0, h);
  p.lineTo(0, 16);
  p.quadraticCurveTo(w / 2, -6, w, 16);
  p.lineTo(w, h);
  p.closePath();
  wash(ctx, p, C.ash, C.ink, { dir: "right", strength: 0.6, x: 0, y: 0, w, h });
  ctx.save();
  ctx.clip(p);
  woodGrain(ctx, 0, 10, w, h - 10, r, C.slate);
  // Straps and lid seam.
  ctx.fillStyle = C.charcoal;
  for (const sx of [w * 0.22, w * 0.7]) ctx.fillRect(sx, 0, 10, h);
  line(ctx, C.ink, 2);
  ctx.beginPath();
  ctx.moveTo(0, 24);
  ctx.lineTo(w, 24);
  ctx.stroke();
  if (cracked) {
    line(ctx, C.ink, 2.6);
    ctx.beginPath();
    ctx.moveTo(w * 0.5, 0);
    ctx.lineTo(w * 0.42, h * 0.4);
    ctx.lineTo(w * 0.58, h * 0.6);
    ctx.lineTo(w * 0.46, h);
    ctx.stroke();
  }
  ctx.restore();
  roughStroke(ctx, p, 2.8, C.ink);
  // Corner caps and the latch.
  ctx.fillStyle = C.silver;
  for (const [cx, cy] of [[0, h], [w, h]]) {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + (cx ? -12 : 12), cy);
    ctx.lineTo(cx, cy - 12);
    ctx.closePath();
    ctx.fill();
    line(ctx, C.ink, 1.4);
    ctx.stroke();
  }
  ctx.fillRect(w / 2 - 6, 20, 12, 12);
  line(ctx, C.ink, 1.6);
  ctx.strokeRect(w / 2 - 6, 20, 12, 12);
}

function block(ctx, b) {
  const spr = cached(`hh:trunk:${b.x}:${b.y}:${b.w}:${b.h}:${b.breakable}`, b.w + 10, b.h + 10, (c) =>
    paintTrunk(c, b.w, b.h, b.x + b.y, b.breakable),
  );
  ctx.drawImage(spr.canvas, b.x - 5, b.y - 5, spr.w, spr.h);
}

function crumble(ctx, c) {
  const spr = cached(`hh:crumble:${c.w}`, c.w + 12, 50, (k) => {
    const r = rng(c.w + 1);
    k.translate(6, 6);
    // Rotten boards with a broken, splintered end.
    for (let x = 0, i = 0; x < c.w; i++) {
      const bw = Math.min(c.w - x, c.w / 3);
      k.save();
      k.translate(x, 0);
      k.rotate((i - 1) * 0.015);
      plank(k, 0, 0, bw - 2, 14, r, { fill: C.slate, line: 1.6, nails: i !== 1 });
      k.restore();
      x += bw;
    }
    line(k, C.ink, 1.6);
    for (let n = 0; n < 4; n++) {
      const x = r.range(8, c.w - 8);
      k.beginPath();
      k.moveTo(x, 14);
      k.lineTo(x - 3, 24);
      k.lineTo(x + 2, 30);
      k.stroke();
    }
    k.fillStyle = C.ink;
    k.beginPath();
    k.ellipse(c.w * 0.5, 7, 7, 3, 0, 0, TAU);
    k.fill();
  });
  ctx.drawImage(spr.canvas, -c.w / 2 - 6, -6, spr.w, spr.h);
}

function hook(ctx, k, g) {
  // A candle chandelier; the hero grabs the iron ring hanging beneath it.
  const sw = Math.sin(g.time * 1.2 + k.x) * 3;
  const top = -20;
  const cy = k.y - 70;
  line(ctx, C.ink, 3);
  ctx.beginPath();
  for (let y = top; y < cy - 34; y += 12) {
    const x = k.x + (sw * (y - top)) / (k.y - top);
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + 8);
  }
  ctx.stroke();
  const cx = k.x + sw * 0.7;
  const spr = cached("hh:chandelier", 200, 110, paintChandelier);
  ctx.drawImage(spr.canvas, cx - 100, cy - 50, 200, 110);
  // Flickering flames.
  for (let i = 0; i < 5; i++) {
    const fx = cx - 72 + i * 36;
    const fy = cy - 34 + Math.abs(i - 2) * 6;
    const fl = 1 + Math.sin(g.time * 14 + i * 2.3 + k.x) * 0.15;
    const glow = ctx.createRadialGradient(fx, fy, 0, fx, fy, 26);
    glow.addColorStop(0, "rgba(248,246,240,0.45)");
    glow.addColorStop(1, "rgba(248,246,240,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(fx - 26, fy - 26, 52, 52);
    ctx.fillStyle = C.paper;
    ctx.beginPath();
    ctx.moveTo(fx, fy - 13 * fl);
    ctx.quadraticCurveTo(fx + 5, fy - 4, fx, fy);
    ctx.quadraticCurveTo(fx - 5, fy - 4, fx, fy - 13 * fl);
    ctx.fill();
    line(ctx, C.ink, 1.2);
    ctx.stroke();
  }
  line(ctx, C.ink, 3);
  ctx.beginPath();
  ctx.moveTo(cx, cy + 50);
  ctx.lineTo(k.x + sw, k.y - 13);
  ctx.stroke();
  const ring = new Path2D();
  ring.arc(k.x + sw, k.y, 13, 0, TAU);
  ring.arc(k.x + sw, k.y, 7, 0, TAU, true);
  wash(ctx, ring, C.ash, C.ink, { dir: "right", strength: 0.6, x: k.x - 13, y: k.y - 13, w: 26, h: 26 });
  roughStroke(ctx, ring, 2.4);
}

function paintChandelier(c) {
  c.translate(100, 50);
  // Central stem and bowl.
  const bowl = new Path2D();
  bowl.moveTo(-26, 10);
  bowl.quadraticCurveTo(0, 50, 26, 10);
  bowl.closePath();
  wash(c, bowl, C.ash, C.ink, { dir: "right", strength: 0.6, x: -26, y: 10, w: 52, h: 30 });
  roughStroke(c, bowl, 2.4);
  c.fillStyle = C.ink;
  c.fillRect(-4, -46, 8, 58);
  c.beginPath();
  c.arc(0, -46, 7, 0, TAU);
  c.fill();
  // Five scrolled arms with candle cups and wax candles.
  for (let i = 0; i < 5; i++) {
    const ax = -72 + i * 36;
    const ay = -18 + Math.abs(i - 2) * 6;
    line(c, C.ink, 4);
    c.beginPath();
    c.moveTo(0, 10);
    c.quadraticCurveTo(ax * 0.5, 30, ax, ay + 6);
    c.stroke();
    c.fillStyle = C.ash;
    c.beginPath();
    c.ellipse(ax, ay + 6, 9, 4, 0, 0, TAU);
    c.fill();
    line(c, C.ink, 1.6);
    c.stroke();
    const cand = new Path2D();
    cand.rect(ax - 4, ay - 16, 8, 20);
    wash(c, cand, C.paper, C.ash, { dir: "right", strength: 0.6, x: ax - 4, y: 0, w: 8, h: 1 });
    roughStroke(c, cand, 1.6);
    c.fillStyle = C.paper;
    c.beginPath();
    c.arc(ax + 3, ay - 12, 2.5, 0, TAU);
    c.fill();
  }
  // Crystal drops.
  c.fillStyle = C.silver;
  line(c, C.ink, 1);
  for (let i = -3; i <= 3; i++) {
    c.beginPath();
    c.ellipse(i * 12, 30 - Math.abs(i) * 3, 3, 5, 0, 0, TAU);
    c.fill();
    c.stroke();
  }
}

function lift(ctx, l) {
  // A dumbwaiter cage hauled on two ropes from a pulley.
  for (const cx of [l.x + 14, l.x + l.w - 14]) rope(ctx, [[cx, -20], [cx, l.y - 4]], 3);
  const spr = cached(`hh:lift:${l.w}`, l.w + 8, 40, (c) => {
    const r = rng(l.w + 9);
    c.translate(4, 4);
    plank(c, 0, 0, l.w, 12, r, { fill: C.ash, line: 2 });
    const box = new Path2D();
    box.rect(6, 12, l.w - 12, 18);
    wash(c, box, C.slate, C.ink, { dir: "down", strength: 0.6, x: 0, y: 12, w: 1, h: 18 });
    roughStroke(c, box, 2);
    line(c, C.ink, 1.4);
    for (let x = 16; x < l.w - 10; x += 18) {
      c.beginPath();
      c.moveTo(x, 12);
      c.lineTo(x, 30);
      c.stroke();
    }
  });
  ctx.drawImage(spr.canvas, l.x - 4, l.y - 4, spr.w, spr.h);
}

function beat(ctx, b, g) {
  // A flying carpet that only appears on its beats.
  const { x, y, w } = b;
  ctx.save();
  line(ctx, C.ash, 2);
  ctx.setLineDash([8, 7]);
  ctx.strokeRect(x, y, w, 16);
  ctx.setLineDash([]);
  if (b.vis > 0.02) {
    ctx.globalAlpha = b.vis;
    const spr = cached(`hh:rug:${w}`, w + 40, 44, (c) => paintRug(c, w));
    const wave = Math.sin(g.time * 6 + x) * 2;
    ctx.translate(x + w / 2, y + 8 + wave);
    ctx.scale(0.85 + b.vis * 0.15, 0.85 + b.vis * 0.15);
    ctx.drawImage(spr.canvas, -w / 2 - 20, -14, spr.w, spr.h);
  }
  ctx.restore();
}

function paintRug(c, w) {
  const r = rng(w + 3);
  c.translate(20, 6);
  const p = new Path2D();
  p.moveTo(0, 4);
  p.quadraticCurveTo(w * 0.3, -2, w * 0.5, 3);
  p.quadraticCurveTo(w * 0.7, 8, w, 2);
  p.lineTo(w, 18);
  p.quadraticCurveTo(w * 0.7, 24, w * 0.5, 19);
  p.quadraticCurveTo(w * 0.3, 14, 0, 20);
  p.closePath();
  wash(c, p, C.slate, C.ink, { dir: "down", strength: 0.5, x: 0, y: 0, w, h: 22 });
  c.save();
  c.clip(p);
  line(c, C.silver, 1.6);
  c.strokeRect(5, 4, w - 10, 13);
  c.fillStyle = C.ash;
  for (let x = 16; x < w - 10; x += 22) {
    c.beginPath();
    c.moveTo(x, 6);
    c.lineTo(x + 6, 11);
    c.lineTo(x, 16);
    c.lineTo(x - 6, 11);
    c.closePath();
    c.fill();
  }
  c.restore();
  roughStroke(c, p, 2.4);
  line(c, C.ash, 2);
  for (const ex of [0, w]) {
    for (let k = 0; k < 4; k++) {
      c.beginPath();
      c.moveTo(ex, 6 + k * 4);
      c.lineTo(ex + (ex ? 1 : -1) * r.range(10, 16), 7 + k * 4);
      c.stroke();
    }
  }
}

function ghost(ctx, o, g) {
  // A bedsheet spook with a trailing hem and floppy sleeves.
  const t = g.time;
  ctx.save();
  ctx.globalAlpha = o.stun > 0 ? 0.3 : 0.9;
  ctx.translate(o.x, o.cy);
  const p = new Path2D();
  p.moveTo(-24, 24);
  p.bezierCurveTo(-30, -6, -18, -36, 0, -36);
  p.bezierCurveTo(18, -36, 30, -6, 24, 24);
  for (let i = 0; i <= 5; i++) {
    const xx = 24 - i * 9.6;
    p.quadraticCurveTo(xx - 4.8, 34 + Math.sin(t * 7 + i) * 5, xx - 9.6, 24);
  }
  p.closePath();
  const glow = ctx.createRadialGradient(0, 0, 10, 0, 0, 60);
  glow.addColorStop(0, "rgba(248,246,240,0.25)");
  glow.addColorStop(1, "rgba(248,246,240,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(-60, -60, 120, 120);
  wash(ctx, p, C.paper, C.ash, { dir: "right", strength: 0.7, x: -30, y: -36, w: 60, h: 70 });
  roughStroke(ctx, p, 2.6);
  // Sleeves waving.
  line(ctx, C.ink, 2.4);
  for (const s of [-1, 1]) {
    const wv = Math.sin(t * 5 + s) * 6;
    ctx.beginPath();
    ctx.moveTo(s * 22, -2);
    ctx.quadraticCurveTo(s * 38, -8 + wv, s * 42, 6 + wv);
    ctx.stroke();
  }
  ctx.fillStyle = C.ink;
  if (o.stun > 0) {
    line(ctx, C.ink, 2);
    for (const ex of [-9, 9]) {
      ctx.beginPath();
      ctx.moveTo(ex - 5, -16);
      ctx.lineTo(ex + 5, -8);
      ctx.moveTo(ex + 5, -16);
      ctx.lineTo(ex - 5, -8);
      ctx.stroke();
    }
  } else {
    for (const ex of [-9, 9]) {
      ctx.beginPath();
      ctx.ellipse(ex, -13, 5, 8, 0, 0, TAU);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.ellipse(0, 7, 8, 7 + Math.sin(t * 5) * 2, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- decos

function flame(ctx, x, y, t, s = 1) {
  const fl = 1 + Math.sin(t * 13 + x) * 0.15;
  const glow = ctx.createRadialGradient(x, y, 0, x, y, 30 * s);
  glow.addColorStop(0, "rgba(248,246,240,0.4)");
  glow.addColorStop(1, "rgba(248,246,240,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(x - 30 * s, y - 30 * s, 60 * s, 60 * s);
  ctx.fillStyle = C.paper;
  ctx.beginPath();
  ctx.moveTo(x, y - 14 * fl * s);
  ctx.quadraticCurveTo(x + 5 * s, y - 4 * s, x, y);
  ctx.quadraticCurveTo(x - 5 * s, y - 4 * s, x, y - 14 * fl * s);
  ctx.fill();
  line(ctx, C.ink, 1.2);
  ctx.stroke();
}

function decoCandelabra(ctx, d, g) {
  const spr = cached("hh:candelabra", 110, 200, (c) => {
    c.translate(55, 196);
    const base = new Path2D();
    base.moveTo(-30, 0);
    base.quadraticCurveTo(-24, -16, -6, -20);
    base.lineTo(-5, -110);
    base.lineTo(5, -110);
    base.lineTo(6, -20);
    base.quadraticCurveTo(24, -16, 30, 0);
    base.closePath();
    wash(c, base, C.ash, C.ink, { dir: "right", strength: 0.6, x: -30, y: -110, w: 60, h: 110 });
    roughStroke(c, base, 2.4);
    line(c, C.ink, 5);
    c.beginPath();
    c.moveTo(0, -110);
    c.lineTo(0, -150);
    c.moveTo(0, -110);
    c.quadraticCurveTo(-40, -110, -40, -140);
    c.moveTo(0, -110);
    c.quadraticCurveTo(40, -110, 40, -140);
    c.stroke();
    for (const [cx, cy] of [[-40, -140], [0, -150], [40, -140]]) {
      const cand = new Path2D();
      cand.rect(cx - 5, cy - 26, 10, 26);
      wash(c, cand, C.paper, C.ash, { dir: "right", strength: 0.6, x: cx - 5, y: 0, w: 10, h: 1 });
      roughStroke(c, cand, 1.8);
      c.fillStyle = C.paper;
      c.beginPath();
      c.arc(cx + 4, cy - 22, 3, 0, TAU);
      c.fill();
    }
  });
  ctx.drawImage(spr.canvas, d.x - 55, d.y - 196, 110, 200);
  for (const [cx, cy] of [[-40, -166], [0, -176], [40, -166]]) flame(ctx, d.x + cx, d.y + cy - 2, g.time);
}

function decoArmor(ctx, d) {
  const spr = cached("hh:armor", 120, 230, (c) => {
    const r = rng(41);
    c.translate(60, 226);
    const plate = (path) => {
      wash(c, path, C.silver, C.ink, { dir: "right", strength: 0.65, x: -40, y: -220, w: 80, h: 1 });
      roughStroke(c, path, 2.2);
    };
    // Plinth.
    const pl = new Path2D();
    pl.rect(-44, -16, 88, 16);
    wash(c, pl, C.slate, C.ink, { dir: "down", strength: 0.5, x: 0, y: -16, w: 1, h: 16 });
    roughStroke(c, pl, 2);
    // Legs and sabatons.
    for (const s of [-1, 1]) {
      const leg = new Path2D();
      leg.rect(s * 14 - 9, -96, 18, 80);
      plate(leg);
      const foot = new Path2D();
      foot.ellipse(s * 14 + s * 6, -18, 16, 7, 0, Math.PI, 0);
      plate(foot);
    }
    // Torso.
    const t = new Path2D();
    t.moveTo(-30, -170);
    t.quadraticCurveTo(0, -180, 30, -170);
    t.lineTo(24, -96);
    t.lineTo(-24, -96);
    t.closePath();
    plate(t);
    line(c, C.ash, 1.4);
    c.beginPath();
    c.moveTo(0, -176);
    c.lineTo(0, -100);
    c.stroke();
    // Pauldrons, arms, gauntlets.
    for (const s of [-1, 1]) {
      const pa = new Path2D();
      pa.ellipse(s * 32, -166, 15, 11, 0, 0, TAU);
      plate(pa);
      const arm = new Path2D();
      arm.rect(s * 34 - 7, -156, 14, 60);
      plate(arm);
    }
    // Helm with a visor slit and a plume.
    const helm = new Path2D();
    helm.moveTo(-18, -178);
    helm.lineTo(-18, -200);
    helm.quadraticCurveTo(0, -226, 18, -200);
    helm.lineTo(18, -178);
    helm.closePath();
    plate(helm);
    c.fillStyle = C.ink;
    c.fillRect(-14, -198, 28, 5);
    brush(c, [[4, -214], [16, -224], [30, -220], [36, -206]], r, { w: 8, color: C.ash, taper: 0.4 });
    // A halberd.
    line(c, C.ink, 4);
    c.beginPath();
    c.moveTo(46, -20);
    c.lineTo(46, -224);
    c.stroke();
    const blade = new Path2D();
    blade.moveTo(46, -224);
    blade.quadraticCurveTo(70, -210, 64, -186);
    blade.lineTo(46, -192);
    blade.closePath();
    plate(blade);
  });
  ctx.drawImage(spr.canvas, d.x - 60, d.y - 226, 120, 230);
}

function decoClock(ctx, d, g) {
  const spr = cached("hh:clock", 130, 380, (c) => grandfatherClock(c, 5, 376, rng(5)));
  ctx.drawImage(spr.canvas, d.x - 65, d.y - 376, 130, 380);
  // The pendulum swings on the beat.
  const a = Math.sin((g.beatPhase ?? 0) * Math.PI) * 0.25 * (Math.floor(g.beatCount ?? 0) % 2 ? 1 : -1);
  ctx.save();
  ctx.translate(d.x, d.y - 216);
  ctx.rotate(a);
  line(ctx, C.ash, 2);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 108);
  ctx.stroke();
  ctx.fillStyle = C.silver;
  ctx.beginPath();
  ctx.arc(0, 112, 12, 0, TAU);
  ctx.fill();
  line(ctx, C.ink, 1.6);
  ctx.stroke();
  ctx.restore();
}

function decoPumpkin(ctx, d, g) {
  const spr = cached("hh:pumpkin", 80, 70, (c) => {
    c.translate(40, 66);
    const p = new Path2D();
    for (const [ox, rx] of [[-14, 16], [14, 16], [0, 18]]) p.ellipse(ox, -22, rx, 22, 0, 0, TAU);
    wash(c, p, C.ash, C.ink, { dir: "right", strength: 0.6, x: -30, y: -44, w: 60, h: 44 });
    roughStroke(c, p, 2.2);
    brush(c, [[0, -42], [2, -52], [8, -56]], rng(3), { w: 5, color: C.ink });
    c.fillStyle = C.ink;
    for (const s of [-1, 1]) {
      c.beginPath();
      c.moveTo(s * 13, -30);
      c.lineTo(s * 5, -24);
      c.lineTo(s * 17, -22);
      c.closePath();
      c.fill();
    }
    c.beginPath();
    c.moveTo(-14, -14);
    c.lineTo(-7, -9);
    c.lineTo(0, -14);
    c.lineTo(7, -9);
    c.lineTo(14, -14);
    c.quadraticCurveTo(0, 0, -14, -14);
    c.fill();
  });
  ctx.drawImage(spr.canvas, d.x - 40, d.y - 66, 80, 70);
  // Candle glow from inside.
  const k = 0.25 + Math.sin(g.time * 11 + d.x) * 0.06;
  const glow = ctx.createRadialGradient(d.x, d.y - 22, 0, d.x, d.y - 22, 40);
  glow.addColorStop(0, `rgba(248,246,240,${k})`);
  glow.addColorStop(1, "rgba(248,246,240,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(d.x - 40, d.y - 62, 80, 80);
}

function decoTrunks(ctx, d) {
  const spr = cached(`hh:trunks:${d.flip}`, 160, 140, (c) => {
    c.save();
    c.translate(d.flip ? 70 : 10, 56);
    paintTrunk(c, 76, 76, 3, false);
    c.restore();
    c.save();
    c.translate(d.flip ? 6 : 86, 86);
    paintTrunk(c, 60, 46, 4, false);
    c.restore();
    // A hatbox on top.
    c.save();
    c.translate(d.flip ? 90 : 30, 30);
    const hb = new Path2D();
    hb.ellipse(0, 26, 26, 8, 0, 0, TAU);
    hb.rect(-26, 6, 52, 20);
    hb.ellipse(0, 6, 26, 8, 0, 0, TAU);
    wash(c, hb, C.silver, C.ink, { dir: "right", strength: 0.5, x: -26, y: 0, w: 52, h: 1 });
    roughStroke(c, hb, 2);
    c.restore();
  });
  ctx.drawImage(spr.canvas, d.x - 80, d.y - 136, 160, 140);
}

function decoDoor(ctx, d, g) {
  // The way out: an arched double door with a lit lamp.
  const spr = cached("hh:door", 320, 300, (c) => {
    const r = rng(17);
    c.translate(10, 296);
    const wall = new Path2D();
    wall.rect(0, -280, 300, 280);
    wash(c, wall, C.slate, C.ink, { dir: "right", strength: 0.5, x: 0, y: 0, w: 300, h: 1 });
    c.save();
    c.clip(wall);
    line(c, C.charcoal, 1.6);
    for (let y = -280, row = 0; y < 0; y += 28, row++) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(300, y);
      for (let x = row % 2 ? 0 : 35; x < 300; x += 70) {
        c.moveTo(x, y);
        c.lineTo(x, y + 28);
      }
      c.stroke();
    }
    c.restore();
    roughStroke(c, wall, 3);
    const arch = archPath(80, -230, 140, 230);
    c.save();
    c.clip(arch);
    for (let x = 80; x < 220; x += 70) {
      for (let k = 0; k < 4; k++) plank(c, x + (k * 70) / 4, -240, 70 / 4, 240, r, { fill: C.ash, horizontal: false, nails: false, line: 1.4 });
    }
    c.restore();
    roughStroke(c, arch, 4);
    line(c, C.ink, 3);
    c.beginPath();
    c.moveTo(150, -230);
    c.lineTo(150, 0);
    c.stroke();
    c.fillStyle = C.ink;
    for (const kx of [138, 162]) {
      c.beginPath();
      c.arc(kx, -110, 6, 0, TAU);
      c.fill();
    }
    for (const hy of [-180, -40]) {
      c.fillRect(84, hy, 50, 8);
      c.fillRect(166, hy, 50, 8);
    }
    // Keystone and lamp bracket.
    const ks = new Path2D();
    ks.moveTo(138, -248);
    ks.lineTo(162, -248);
    ks.lineTo(156, -228);
    ks.lineTo(144, -228);
    ks.closePath();
    wash(c, ks, C.silver, C.ink, { dir: "down", strength: 0.4, x: 0, y: -248, w: 1, h: 20 });
    roughStroke(c, ks, 2);
    line(c, C.ink, 3);
    c.beginPath();
    c.moveTo(250, -170);
    c.lineTo(250, -150);
    c.lineTo(270, -150);
    c.stroke();
    const lamp = new Path2D();
    lamp.rect(258, -150, 24, 34);
    wash(c, lamp, C.paper, C.ash, { dir: "down", strength: 0.5, x: 0, y: -150, w: 1, h: 34 });
    roughStroke(c, lamp, 2);
  });
  ctx.drawImage(spr.canvas, d.x - 10, d.y - 296, 320, 300);
  flame(ctx, d.x + 270, d.y - 128, g.time, 0.8);
}

function bat(ctx, x, y, t, fly, gx = 0, gy = 0) {
  ctx.save();
  ctx.fillStyle = C.ink;
  if (fly) {
    ctx.translate(x + gx, y - 30 + gy);
    const f = Math.sin(fly * 22) * 10;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-10, -4 - f * 0.3);
    ctx.lineTo(-26, -f);
    ctx.lineTo(-22, 4 - f * 0.3);
    ctx.lineTo(-16, 2);
    ctx.lineTo(-10, 6);
    ctx.lineTo(0, 4);
    ctx.lineTo(10, 6);
    ctx.lineTo(16, 2);
    ctx.lineTo(22, 4 - f * 0.3);
    ctx.lineTo(26, -f);
    ctx.lineTo(10, -4 - f * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, TAU);
    ctx.fill();
    ctx.restore();
    return;
  }
  // Folded up, sitting on the floor with big ears and white eyes.
  const bob = Math.sin(t * 2 + x) * 1;
  ctx.translate(x, y + 20 + bob);
  ctx.beginPath();
  ctx.ellipse(0, -14, 11, 15, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-9, -24);
  ctx.lineTo(-12, -38);
  ctx.lineTo(-3, -28);
  ctx.moveTo(9, -24);
  ctx.lineTo(12, -38);
  ctx.lineTo(3, -28);
  ctx.fill();
  ctx.fillStyle = C.paper;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(s * 4, -20, 2.6, 3.4, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function decoBat(ctx, d, g) {
  if (d.fly && d.fly > 4) return;
  bat(ctx, d.x, d.y, g.time, d.fly, d.gx, d.gy);
}

// ---------------------------------------------------------------- the phantom train

class GhostTrain extends Chaser {
  smokeOrigins() {
    return [[-150, -250]];
  }

  smokeColor(p) {
    return p.life < 0.5 ? C.silver : C.paper;
  }

  paint(ctx, g) {
    const t = g.time;
    // Rails and sleepers.
    ctx.fillStyle = C.charcoal;
    line(ctx, C.ink, 2);
    for (let x = -900 - ((this.wheel * 12) % 60); x < 60; x += 60) {
      ctx.fillRect(x, -4, 34, 9);
      ctx.strokeRect(x, -4, 34, 9);
    }
    line(ctx, C.slate, 4);
    ctx.beginPath();
    ctx.moveTo(-900, -6);
    ctx.lineTo(60, -6);
    ctx.stroke();
    // A ghostly halo behind the engine.
    const glow = ctx.createRadialGradient(-200, -130, 40, -200, -130, 340);
    glow.addColorStop(0, "rgba(248,246,240,0.18)");
    glow.addColorStop(1, "rgba(248,246,240,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(-560, -470, 720, 480);
    ctx.save();
    ctx.globalAlpha = 0.86 + Math.sin(t * 3) * 0.06;
    const spr = cached("hh:train", 540, 320, paintTrain);
    ctx.drawImage(spr.canvas, -500, -300, 540, 320);
    ctx.restore();
    captain(ctx, -360, -170, t, 1.1);
    // Headlamp beam.
    const beam = ctx.createLinearGradient(20, 0, 260, 0);
    beam.addColorStop(0, "rgba(248,246,240,0.35)");
    beam.addColorStop(1, "rgba(248,246,240,0)");
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(10, -190);
    ctx.lineTo(260, -250);
    ctx.lineTo(260, -90);
    ctx.lineTo(10, -170);
    ctx.closePath();
    ctx.fill();
    // Wheels with spinning spokes.
    for (const wx of [-400, -300, -170, -60]) {
      ctx.save();
      ctx.translate(wx, -28);
      ctx.rotate(this.wheel);
      ctx.beginPath();
      ctx.arc(0, 0, 26, 0, TAU);
      ctx.fillStyle = C.slate;
      ctx.fill();
      line(ctx, C.ink, 3);
      ctx.stroke();
      line(ctx, C.silver, 2.4);
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos((k * TAU) / 6) * 22, Math.sin((k * TAU) / 6) * 22);
      }
      ctx.stroke();
      ctx.restore();
    }
    line(ctx, C.ink, 5);
    ctx.beginPath();
    const crank = this.wheel;
    ctx.moveTo(-170 + Math.cos(crank) * 14, -28 + Math.sin(crank) * 14);
    ctx.lineTo(-60 + Math.cos(crank) * 14, -28 + Math.sin(crank) * 14);
    ctx.stroke();
    // Wispy tail trailing off the back.
    ctx.fillStyle = "rgba(248,246,240,0.3)";
    for (let i = 0; i < 5; i++) {
      const wx = -520 - i * 50;
      const wy = -120 + Math.sin(t * 4 + i) * 16;
      ctx.beginPath();
      ctx.ellipse(wx, wy, 40 - i * 6, 24 - i * 3, 0, 0, TAU);
      ctx.fill();
    }
    if (this.tootT > 0) {
      const k = 1 - this.tootT / 0.7;
      ctx.fillStyle = C.paper;
      ctx.strokeStyle = C.ash;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(-110 - i * 14, -310 - k * 40 - i * 10, 10 + k * 16, 0, TAU);
        ctx.fill();
        ctx.stroke();
      }
    }
  }
}

function paintTrain(c) {
  c.translate(500, 300);
  // Cab.
  const cab = new Path2D();
  cab.moveTo(-480, -60);
  cab.lineTo(-480, -230);
  cab.quadraticCurveTo(-400, -260, -300, -236);
  cab.lineTo(-300, -60);
  cab.closePath();
  wash(c, cab, C.silver, C.ash, { dir: "right", strength: 0.7, x: -480, y: 0, w: 180, h: 1 });
  roughStroke(c, cab, 3);
  c.fillStyle = C.charcoal;
  c.fillRect(-450, -200, 120, 80);
  line(c, C.ink, 2);
  c.strokeRect(-450, -200, 120, 80);
  // Boiler.
  const boiler = new Path2D();
  boiler.moveTo(-300, -80);
  boiler.lineTo(-300, -180);
  boiler.lineTo(-10, -180);
  boiler.quadraticCurveTo(14, -130, -10, -80);
  boiler.closePath();
  wash(c, boiler, C.paper, C.ash, { dir: "down", strength: 0.8, x: 0, y: -180, w: 1, h: 100 });
  roughStroke(c, boiler, 3.2);
  line(c, C.ash, 2);
  for (const bx of [-240, -170, -100]) {
    c.beginPath();
    c.moveTo(bx, -180);
    c.lineTo(bx, -80);
    c.stroke();
  }
  // Smokestack, dome and bell.
  const stack = new Path2D();
  stack.moveTo(-170, -180);
  stack.lineTo(-160, -250);
  stack.lineTo(-184, -270);
  stack.lineTo(-116, -270);
  stack.lineTo(-140, -250);
  stack.lineTo(-130, -180);
  stack.closePath();
  wash(c, stack, C.silver, C.slate, { dir: "right", strength: 0.6, x: -184, y: 0, w: 68, h: 1 });
  roughStroke(c, stack, 2.6);
  const dome = new Path2D();
  dome.ellipse(-230, -180, 26, 22, 0, Math.PI, 0);
  wash(c, dome, C.silver, C.slate, { dir: "right", strength: 0.6, x: -256, y: 0, w: 52, h: 1 });
  roughStroke(c, dome, 2.4);
  // Headlamp.
  const lamp = new Path2D();
  lamp.rect(-40, -224, 40, 34);
  wash(c, lamp, C.silver, C.ash, { dir: "down", strength: 0.5, x: 0, y: -224, w: 1, h: 34 });
  roughStroke(c, lamp, 2.4);
  c.fillStyle = C.paper;
  c.beginPath();
  c.arc(-4, -207, 12, 0, TAU);
  c.fill();
  line(c, C.ink, 2);
  c.stroke();
  // Cowcatcher.
  const cow = new Path2D();
  cow.moveTo(-14, -80);
  cow.lineTo(40, -14);
  cow.lineTo(-14, -14);
  cow.closePath();
  wash(c, cow, C.ash, C.ink, { dir: "down", strength: 0.4, x: 0, y: -80, w: 1, h: 66 });
  c.save();
  c.clip(cow);
  line(c, C.ink, 2);
  for (let x = -14; x < 40; x += 10) {
    c.beginPath();
    c.moveTo(x, -80);
    c.lineTo(x + 6, -14);
    c.stroke();
  }
  c.restore();
  roughStroke(c, cow, 2.4);
  // Frame.
  c.fillStyle = C.charcoal;
  c.fillRect(-490, -64, 480, 18);
  line(c, C.ink, 2.4);
  c.strokeRect(-490, -64, 480, 18);
}

registerChaser("ghosttrain", GhostTrain);

export default {
  id: "haunted",
  name: "Creaky Manor",
  decoKinds: ["candelabra", "armor", "pumpkin", "clock"],
  perch: "bat",
  landingSign: "THE BACK DOOR",
  fall: { fx: "dust", text: "EEK!" },
  chaser: "ghosttrain",
  drawBackground,
  drawForeground,
  skins: { ledge, block, crumble, hook, lift, beat, ghost },
  decos: {
    candelabra: decoCandelabra,
    armor: decoArmor,
    clock: decoClock,
    pumpkin: decoPumpkin,
    stack: decoTrunks,
    shed: decoDoor,
    bat: decoBat,
  },
};
