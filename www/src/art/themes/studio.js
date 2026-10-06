// Inkwell Studio: a cartoon studio loft with north-light skylights, pinned
// model sheets, drying cels on a line, rows of animation desks, a flood of
// spilled ink below, desk-top ledges with ruler edges, paint tins, living
// ink blots, and the Captain at the wheel of a steam paint roller.
import { cached, plank, rope, layerRes, brush, woodGrain } from "../ink.js";
import { CONFIG } from "../../config.js";
import { registerChaser } from "../../entities/chasers.js";
import { Chaser, captain } from "../../entities/chaser.js";
import { C, TAU, W, H, rng, makeLayer, wash, paperTexture, roughStroke, line, tile } from "./common.js";

const WALL_W = 2600;
const DESK_W = 3000;
const DESK_TOP = 250;
const FRONT_W = 3400;

let L = null;

function paintAll() {
  const res = layerRes();
  L = {
    wall: paintWall(res),
    desks: paintDesks(res),
    front: paintFront(res),
  };
}

// ---------------------------------------------------------------- back wall

function sketch(ctx, x, y, w, h, r, kind) {
  // A pinned sheet of animation paper with a rough pencil drawing.
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(r.range(-0.06, 0.06));
  const p = new Path2D();
  p.rect(-w / 2, -h / 2, w, h);
  wash(ctx, p, C.paper, C.silver, { dir: "down", strength: 0.5, x: 0, y: -h / 2, w: 1, h });
  roughStroke(ctx, p, 1.6, C.slate);
  // Peg holes.
  ctx.fillStyle = C.charcoal;
  for (const px of [-w * 0.3, 0, w * 0.3]) {
    ctx.beginPath();
    ctx.ellipse(px, h / 2 - 8, px ? 5 : 3, 2.4, 0, 0, TAU);
    ctx.fill();
  }
  // Pushpin.
  ctx.fillStyle = C.ink;
  ctx.beginPath();
  ctx.arc(0, -h / 2 + 8, 4.5, 0, TAU);
  ctx.fill();
  line(ctx, C.ash, 1.2);
  const s = Math.min(w, h) / 100;
  if (kind === 0) {
    // Construction circles for a round critter, with action lines.
    for (const [cx, cy, rr] of [[-8, -10, 24], [10, 20, 16], [-24, -30, 9], [8, -34, 9]]) {
      ctx.beginPath();
      ctx.arc(cx * s, cy * s, rr * s, 0, TAU);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(-30 * s, 30 * s);
    ctx.quadraticCurveTo(0, 0, 30 * s, -40 * s);
    ctx.stroke();
  } else if (kind === 1) {
    // A bouncing-ball arc with squash and stretch.
    for (let i = 0; i < 5; i++) {
      const u = i / 4;
      const bx = (-36 + u * 72) * s;
      const by = (30 - Math.abs(Math.sin(u * Math.PI * 1.5)) * 60) * s;
      ctx.beginPath();
      ctx.ellipse(bx, by, 8 * s * (i % 2 ? 0.8 : 1.2), 8 * s * (i % 2 ? 1.2 : 0.8), 0, 0, TAU);
      ctx.stroke();
    }
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(-36 * s, 30 * s);
    ctx.quadraticCurveTo(-18 * s, -60 * s, 0, 30 * s);
    ctx.quadraticCurveTo(18 * s, -40 * s, 36 * s, 30 * s);
    ctx.stroke();
    ctx.setLineDash([]);
  } else {
    // A walk cycle in stick figures.
    for (let i = 0; i < 3; i++) {
      const fx = (-30 + i * 30) * s;
      ctx.beginPath();
      ctx.arc(fx, -26 * s, 6 * s, 0, TAU);
      ctx.moveTo(fx, -20 * s);
      ctx.lineTo(fx + 2 * s, 6 * s);
      ctx.lineTo(fx - (8 - i * 8) * s, 28 * s);
      ctx.moveTo(fx + 2 * s, 6 * s);
      ctx.lineTo(fx + (8 - i * 8) * s, 28 * s);
      ctx.moveTo(fx - 10 * s, -8 * s);
      ctx.lineTo(fx + 10 * s, -10 * s);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function paintWall(res) {
  const lay = makeLayer(WALL_W, H, res);
  const { ctx } = lay;
  const r = rng(19);
  // Plaster wall, lighter near the skylights.
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, C.ash);
  g.addColorStop(0.5, C.silver);
  g.addColorStop(1, C.ash);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, WALL_W, H);
  // Sloped ceiling with skylights and roof trusses.
  ctx.fillStyle = C.slate;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(WALL_W, 0);
  ctx.lineTo(WALL_W, 120);
  for (let x = WALL_W; x >= 0; x -= 650) {
    ctx.lineTo(x, 120);
    ctx.lineTo(x - 325, 60);
  }
  ctx.lineTo(0, 120);
  ctx.closePath();
  ctx.fill();
  for (let x = 120; x < WALL_W; x += 650) {
    // Skylight: a slanted glazed frame pouring light down.
    const sk = new Path2D();
    sk.moveTo(x, 104);
    sk.lineTo(x + 40, 26);
    sk.lineTo(x + 360, 26);
    sk.lineTo(x + 320, 104);
    sk.closePath();
    ctx.fillStyle = C.paper;
    ctx.fill(sk);
    line(ctx, C.ink, 4);
    ctx.stroke(sk);
    line(ctx, C.ink, 2.4);
    for (let k = 1; k < 5; k++) {
      ctx.beginPath();
      ctx.moveTo(x + (k * 320) / 5, 104);
      ctx.lineTo(x + 40 + (k * 320) / 5, 26);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(x + 20, 65);
    ctx.lineTo(x + 340, 65);
    ctx.stroke();
    // Shafts of light.
    const beam = ctx.createLinearGradient(0, 104, 0, 600);
    beam.addColorStop(0, "rgba(248,246,240,0.55)");
    beam.addColorStop(1, "rgba(248,246,240,0)");
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(x, 104);
    ctx.lineTo(x + 320, 104);
    ctx.lineTo(x + 470, 600);
    ctx.lineTo(x + 120, 600);
    ctx.closePath();
    ctx.fill();
  }
  // Truss beams.
  ctx.fillStyle = C.charcoal;
  ctx.fillRect(0, 116, WALL_W, 14);
  line(ctx, C.ink, 2);
  ctx.strokeRect(-2, 116, WALL_W + 4, 14);
  // Wainscot boards along the bottom.
  for (let x = 0; x < WALL_W; x += 46) plank(ctx, x, 470, 46, 250, r, { fill: C.ash, horizontal: false, nails: false, line: 1.4 });
  ctx.fillStyle = C.slate;
  ctx.fillRect(0, 462, WALL_W, 12);
  // Model sheets pinned in clusters.
  for (let x = 40; x < WALL_W - 200; x += r.range(260, 420)) {
    const n = 1 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) sketch(ctx, x + i * 84, r.range(170, 230) + (i % 2) * 70, 76, 96, r, Math.floor(r() * 3));
  }
  // A clothesline of drying cels with clothespegs.
  for (let x0 = 300; x0 < WALL_W - 500; x0 += 1300) {
    const span = 560;
    line(ctx, C.ink, 1.6);
    ctx.beginPath();
    ctx.moveTo(x0, 150);
    ctx.quadraticCurveTo(x0 + span / 2, 190, x0 + span, 150);
    ctx.stroke();
    for (let k = 1; k < 6; k++) {
      const cx = x0 + (k * span) / 6;
      const cy = 150 + Math.sin((k / 6) * Math.PI) * 20;
      const cel = new Path2D();
      cel.rect(cx - 30, cy, 60, 46);
      ctx.fillStyle = "rgba(248,246,240,0.55)";
      ctx.fill(cel);
      line(ctx, C.slate, 1.2);
      ctx.stroke(cel);
      // A painted figure on the cel.
      ctx.fillStyle = C.ink;
      ctx.beginPath();
      ctx.arc(cx + r.range(-8, 8), cy + 22, 7, 0, TAU);
      ctx.fill();
      ctx.fillStyle = C.charcoal;
      ctx.fillRect(cx - 3, cy - 6, 6, 12);
    }
  }
  paperTexture(ctx, WALL_W, H, r, { strength: 1.2, blot: 1.2 });
  return lay;
}

// ---------------------------------------------------------------- animation desks

function paintDesks(res) {
  const h = H - DESK_TOP;
  const lay = makeLayer(DESK_W, h, res);
  const { ctx } = lay;
  const r = rng(29);
  const top = 150;
  for (let x = 40; x < DESK_W - 300; x += r.range(380, 520)) {
    // Slanted desk with a glowing disc.
    const desk = new Path2D();
    desk.moveTo(x, top + 70);
    desk.lineTo(x + 30, top);
    desk.lineTo(x + 250, top);
    desk.lineTo(x + 270, top + 70);
    desk.closePath();
    wash(ctx, desk, C.slate, C.ink, { dir: "down", strength: 0.5, x: 0, y: top, w: 1, h: 70 });
    roughStroke(ctx, desk, 2.4);
    const disc = new Path2D();
    disc.ellipse(x + 140, top + 34, 70, 26, 0, 0, TAU);
    const dg = ctx.createRadialGradient(x + 140, top + 34, 4, x + 140, top + 34, 70);
    dg.addColorStop(0, C.paper);
    dg.addColorStop(1, C.silver);
    ctx.fillStyle = dg;
    ctx.fill(disc);
    roughStroke(ctx, disc, 2);
    line(ctx, C.ash, 1);
    ctx.beginPath();
    ctx.moveTo(x + 100, top + 40);
    ctx.lineTo(x + 180, top + 40);
    ctx.stroke();
    // Legs and a cabinet.
    ctx.fillStyle = C.charcoal;
    ctx.fillRect(x + 14, top + 70, 14, h - top - 70);
    ctx.fillRect(x + 242, top + 70, 14, h - top - 70);
    const cab = new Path2D();
    cab.rect(x + 160, top + 80, 90, 120);
    wash(ctx, cab, C.slate, C.ink, { dir: "right", strength: 0.5, x: x + 160, y: 0, w: 90, h: 1 });
    roughStroke(ctx, cab, 2);
    for (let d = 0; d < 3; d++) {
      line(ctx, C.ink, 1.4);
      ctx.strokeRect(x + 166, top + 86 + d * 38, 78, 32);
      ctx.fillStyle = C.silver;
      ctx.fillRect(x + 196, top + 100 + d * 38, 18, 4);
    }
    // Desk lamp on a jointed arm.
    line(ctx, C.ink, 4);
    ctx.beginPath();
    ctx.moveTo(x + 40, top);
    ctx.lineTo(x + 20, top - 80);
    ctx.lineTo(x + 80, top - 120);
    ctx.stroke();
    const shade = new Path2D();
    shade.moveTo(x + 70, top - 130);
    shade.lineTo(x + 110, top - 100);
    shade.lineTo(x + 86, top - 84);
    shade.closePath();
    wash(ctx, shade, C.ink, null);
    // A stool.
    const sx = x + 300;
    ctx.fillStyle = C.charcoal;
    ctx.fillRect(sx - 30, top + 60, 60, 12);
    line(ctx, C.charcoal, 5);
    ctx.beginPath();
    ctx.moveTo(sx - 24, top + 72);
    ctx.lineTo(sx - 34, h);
    ctx.moveTo(sx + 24, top + 72);
    ctx.lineTo(sx + 34, h);
    ctx.stroke();
  }
  paperTexture(ctx, DESK_W, h, r, { strength: 1 });
  ctx.save();
  ctx.globalCompositeOperation = "source-atop";
  ctx.fillStyle = "rgba(207,203,195,0.6)";
  ctx.fillRect(0, 0, DESK_W, h);
  ctx.restore();
  return lay;
}

// ---------------------------------------------------------------- foreground

function paintFront(res) {
  // Giant pencils and brushes standing in the ink at the bottom edge.
  const h = 300;
  const lay = makeLayer(FRONT_W, h, res);
  const { ctx } = lay;
  const r = rng(37);
  for (let x = 300; x < FRONT_W - 200; x += r.range(1000, 1500)) {
    for (let k = 0; k < 2; k++) {
      const px = x + k * 70;
      const len = r.range(100, 150);
      ctx.save();
      ctx.translate(px, h);
      ctx.rotate(r.range(-0.15, 0.15));
      if (k === 0) {
        // Pencil.
        const body = new Path2D();
        body.rect(-14, -len, 28, len);
        wash(ctx, body, C.charcoal, C.ink, { dir: "right", strength: 0.6, x: -14, y: 0, w: 28, h: 1 });
        roughStroke(ctx, body, 2.6);
        line(ctx, C.ink, 1.4);
        ctx.beginPath();
        ctx.moveTo(-5, -len);
        ctx.lineTo(-5, 0);
        ctx.moveTo(5, -len);
        ctx.lineTo(5, 0);
        ctx.stroke();
        const tip = new Path2D();
        tip.moveTo(-14, -len);
        tip.lineTo(0, -len - 44);
        tip.lineTo(14, -len);
        tip.closePath();
        wash(ctx, tip, C.ash, C.ink, { dir: "right", strength: 0.6, x: -14, y: 0, w: 28, h: 1 });
        roughStroke(ctx, tip, 2.4);
        ctx.fillStyle = C.ink;
        ctx.beginPath();
        ctx.moveTo(-5, -len - 30);
        ctx.lineTo(0, -len - 44);
        ctx.lineTo(5, -len - 30);
        ctx.fill();
      } else {
        // Brush with an inked tip.
        const body = new Path2D();
        body.rect(-8, -len, 16, len);
        wash(ctx, body, C.ash, C.ink, { dir: "right", strength: 0.6, x: -8, y: 0, w: 16, h: 1 });
        roughStroke(ctx, body, 2.4);
        const fer = new Path2D();
        fer.rect(-10, -len - 30, 20, 30);
        wash(ctx, fer, C.silver, C.ink, { dir: "right", strength: 0.6, x: -10, y: 0, w: 20, h: 1 });
        roughStroke(ctx, fer, 2.2);
        ctx.fillStyle = C.ink;
        ctx.beginPath();
        ctx.moveTo(-11, -len - 30);
        ctx.quadraticCurveTo(-14, -len - 60, 0, -len - 84);
        ctx.quadraticCurveTo(14, -len - 60, 11, -len - 30);
        ctx.fill();
      }
      ctx.restore();
    }
  }
  return lay;
}

function drawInk(ctx, camX, g) {
  // The spilled ink flood: glossy black with drifting highlights.
  const top = CONFIG.waterY;
  ctx.fillStyle = C.ink;
  ctx.fillRect(0, top, W, H - top);
  const off = camX * 0.9 + g.time * 18;
  line(ctx, C.slate, 2);
  for (let row = 0; row < 4; row++) {
    const y = top + 14 + row * 26;
    const sp = 120 + row * 40;
    for (let x = -(off % sp) - sp; x < W + sp; x += sp) {
      const wob = Math.sin(g.time * 2 + x * 0.02 + row) * 3;
      ctx.beginPath();
      ctx.moveTo(x, y + wob);
      ctx.quadraticCurveTo(x + sp * 0.2, y - 4 + wob, x + sp * 0.4, y + wob);
      ctx.stroke();
    }
  }
  // Bright gloss streaks.
  ctx.fillStyle = "rgba(248,246,240,0.35)";
  for (let i = 0; i < 6; i++) {
    const sp = 300;
    const x = ((i * 211 - camX * 0.9 - g.time * 12) % (W + sp) + W + sp) % (W + sp) - sp / 2;
    ctx.beginPath();
    ctx.ellipse(x, top + 8 + (i % 3) * 10, 40 + (i % 2) * 30, 2.2, 0, 0, TAU);
    ctx.fill();
  }
  line(ctx, C.ink, 3);
  ctx.beginPath();
  ctx.moveTo(0, top);
  ctx.lineTo(W, top);
  ctx.stroke();
}

export function drawBackground(ctx, camX, g) {
  if (!L) paintAll();
  tile(ctx, L.wall, camX * 0.1, 0);
  tile(ctx, L.desks, camX * 0.35, DESK_TOP);
  // Dust motes drifting in the skylight beams.
  ctx.fillStyle = "rgba(248,246,240,0.7)";
  for (let i = 0; i < 24; i++) {
    const x = ((i * 157 + g.time * (6 + (i % 5))) % (W + 40)) - 20;
    const y = 140 + ((i * 89 + Math.sin(g.time * 0.7 + i) * 30) % 380);
    ctx.beginPath();
    ctx.arc(x, y, 1.4 + (i % 3) * 0.6, 0, TAU);
    ctx.fill();
  }
}

export function drawForeground(ctx, camX, g) {
  if (!L) paintAll();
  drawInk(ctx, camX, g);
  tile(ctx, L.front, camX * 1.35, H - 300);
}

// ---------------------------------------------------------------- skins

function paintDesk(ctx, w, depth, seed) {
  // A drafting-desk top with a brass-edged ruler lip, a sheet of paper and
  // stout legs going down into the ink.
  const r = rng(seed);
  ctx.translate(8, 8);
  const top = new Path2D();
  top.rect(0, 0, w, 22);
  wash(ctx, top, C.ash, C.ink, { dir: "down", strength: 0.4, x: 0, y: 0, w: 1, h: 22 });
  ctx.save();
  ctx.clip(top);
  woodGrain(ctx, 0, 0, w, 22, r, C.slate);
  ctx.restore();
  roughStroke(ctx, top, 2.6);
  // Ruler edge with tick marks.
  const ruler = new Path2D();
  ruler.rect(-4, 22, w + 8, 14);
  wash(ctx, ruler, C.silver, C.ash, { dir: "down", strength: 0.5, x: 0, y: 22, w: 1, h: 14 });
  roughStroke(ctx, ruler, 2);
  line(ctx, C.ink, 1.2);
  for (let x = 4, i = 0; x < w; x += 8, i++) {
    ctx.beginPath();
    ctx.moveTo(x, 22);
    ctx.lineTo(x, 22 + (i % 8 === 0 ? 9 : i % 4 === 0 ? 6 : 3.5));
    ctx.stroke();
  }
  // Paper sheets on the desk top, slightly askew.
  for (let x = 20; x < w - 100; x += r.range(140, 260)) {
    ctx.save();
    ctx.translate(x, 0);
    ctx.rotate(r.range(-0.02, 0.02));
    ctx.fillStyle = C.paper;
    ctx.fillRect(0, -3, r.range(70, 110), 5);
    line(ctx, C.slate, 1);
    ctx.strokeRect(0, -3, 90, 5);
    ctx.restore();
  }
  // Apron and legs.
  const apron = new Path2D();
  apron.rect(10, 36, w - 20, 30);
  wash(ctx, apron, C.slate, C.ink, { dir: "down", strength: 0.6, x: 0, y: 36, w: 1, h: 30 });
  roughStroke(ctx, apron, 2.2);
  const legs = [16, w - 40];
  if (w > 420) for (let x = 260; x < w - 200; x += 260) legs.push(x);
  for (const lx of legs) {
    const leg = new Path2D();
    leg.moveTo(lx, 66);
    leg.lineTo(lx + 24, 66);
    leg.lineTo(lx + 20, depth);
    leg.lineTo(lx + 4, depth);
    leg.closePath();
    wash(ctx, leg, C.slate, C.ink, { dir: "right", strength: 0.7, x: lx, y: 0, w: 24, h: 1 });
    roughStroke(ctx, leg, 2.2);
  }
  // Ink drips down the apron.
  ctx.fillStyle = C.ink;
  for (let k = 0; k < w / 120; k++) {
    const dx = r.range(20, w - 20);
    const dl = r.range(8, 26);
    ctx.beginPath();
    ctx.moveTo(dx - 4, 36);
    ctx.lineTo(dx - 3, 36 + dl);
    ctx.arc(dx, 36 + dl, 3, Math.PI, 0, true);
    ctx.lineTo(dx + 4, 36);
    ctx.fill();
  }
}

function ledge(ctx, d) {
  const depth = CONFIG.waterY - d.y + 20;
  const spr = cached(`st:desk:${d.x}:${d.w}`, d.w + 16, depth + 16, (c) => paintDesk(c, d.w, depth, d.x + 7));
  ctx.drawImage(spr.canvas, d.x - 8, d.y - 8, spr.w, spr.h);
}

function paintTin(ctx, w, h, seed, dented) {
  const r = rng(seed);
  ctx.translate(5, 5);
  const body = new Path2D();
  body.moveTo(0, 8);
  body.lineTo(0, h - 6);
  body.ellipse(w / 2, h - 6, w / 2, 6, 0, Math.PI, 0, true);
  body.lineTo(w, 8);
  body.closePath();
  wash(ctx, body, C.silver, C.ink, { dir: "right", strength: 0.65, x: 0, y: 0, w, h: 1 });
  ctx.save();
  ctx.clip(body);
  // Label band with a brush swoosh and drips of paint from the rim.
  ctx.fillStyle = C.paper;
  ctx.fillRect(0, h * 0.3, w, h * 0.42);
  brush(ctx, [[w * 0.15, h * 0.58], [w * 0.4, h * 0.42], [w * 0.7, h * 0.56], [w * 0.88, h * 0.4]], r, { w: 6, color: C.charcoal, taper: 0.5 });
  ctx.fillStyle = C.charcoal;
  for (let k = 0; k < 4; k++) {
    const dx = r.range(6, w - 6);
    const dl = r.range(10, h * 0.4);
    ctx.fillRect(dx - 3, 6, 6, dl);
    ctx.beginPath();
    ctx.arc(dx, 6 + dl, 3, 0, TAU);
    ctx.fill();
  }
  if (dented) {
    line(ctx, C.ink, 2.4);
    ctx.beginPath();
    ctx.moveTo(w * 0.3, h * 0.2);
    ctx.quadraticCurveTo(w * 0.5, h * 0.5, w * 0.35, h * 0.85);
    ctx.moveTo(w * 0.62, h * 0.25);
    ctx.lineTo(w * 0.55, h * 0.5);
    ctx.stroke();
  }
  ctx.restore();
  roughStroke(ctx, body, 2.8);
  const lid = new Path2D();
  lid.ellipse(w / 2, 8, w / 2, 7, 0, 0, TAU);
  wash(ctx, lid, C.ink, null);
  line(ctx, C.ash, 1.6);
  ctx.beginPath();
  ctx.ellipse(w / 2, 8, w / 2 - 5, 4.5, 0, 0, TAU);
  ctx.stroke();
  // Wire handle.
  line(ctx, C.ink, 2);
  ctx.beginPath();
  ctx.moveTo(2, 14);
  ctx.quadraticCurveTo(w / 2, -16, w - 2, 14);
  ctx.stroke();
}

function block(ctx, b) {
  const spr = cached(`st:tin:${b.x}:${b.y}:${b.w}:${b.h}:${b.breakable}`, b.w + 10, b.h + 10, (c) =>
    paintTin(c, b.w, b.h, b.x + b.y, b.breakable),
  );
  ctx.drawImage(spr.canvas, b.x - 5, b.y - 5, spr.w, spr.h);
}

function crumble(ctx, c) {
  // A sheet of paper laid across the gap: it tears if you linger.
  const spr = cached(`st:paper:${c.w}`, c.w + 12, 40, (k) => {
    const r = rng(c.w + 2);
    k.translate(6, 6);
    const p = new Path2D();
    p.moveTo(0, 0);
    p.lineTo(c.w, 0);
    p.lineTo(c.w, 10);
    for (let x = c.w; x > 0; x -= 10) p.lineTo(x, 10 + r.range(0, 3));
    p.closePath();
    wash(k, p, C.paper, C.ash, { dir: "down", strength: 0.5, x: 0, y: 0, w: 1, h: 12 });
    roughStroke(k, p, 2);
    // Pencil line along the sheet and a dotted tear.
    line(k, C.ash, 1);
    k.beginPath();
    k.moveTo(8, 5);
    k.lineTo(c.w - 8, 5);
    k.stroke();
    line(k, C.ink, 1.4);
    k.setLineDash([3, 3]);
    k.beginPath();
    k.moveTo(c.w * 0.5, 0);
    k.lineTo(c.w * 0.47, 6);
    k.lineTo(c.w * 0.53, 12);
    k.stroke();
    k.setLineDash([]);
    // Tape at both ends.
    k.fillStyle = "rgba(207,203,195,0.85)";
    k.fillRect(-4, -4, 18, 14);
    k.fillRect(c.w - 14, -4, 18, 14);
  });
  ctx.drawImage(spr.canvas, -c.w / 2 - 6, -6, spr.w, spr.h);
}

function hook(ctx, k, g) {
  // An enamel pendant lamp; the hero grabs its pull-ring.
  const sw = Math.sin(g.time * 1.4 + k.x) * 3;
  const ly = k.y - 64;
  line(ctx, C.ink, 2.4);
  ctx.beginPath();
  ctx.moveTo(k.x, -20);
  ctx.lineTo(k.x + sw * 0.7, ly - 30);
  ctx.stroke();
  const cx = k.x + sw * 0.7;
  const glow = ctx.createRadialGradient(cx, ly + 10, 4, cx, ly + 40, 120);
  glow.addColorStop(0, "rgba(248,246,240,0.5)");
  glow.addColorStop(1, "rgba(248,246,240,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.moveTo(cx - 30, ly);
  ctx.lineTo(cx + 30, ly);
  ctx.lineTo(cx + 110, ly + 160);
  ctx.lineTo(cx - 110, ly + 160);
  ctx.closePath();
  ctx.fill();
  const spr = cached("st:pendant", 100, 60, (c) => {
    const shade = new Path2D();
    shade.moveTo(50, 4);
    shade.lineTo(60, 10);
    shade.quadraticCurveTo(66, 26, 92, 42);
    shade.lineTo(8, 42);
    shade.quadraticCurveTo(34, 26, 40, 10);
    shade.closePath();
    wash(c, shade, C.silver, C.ink, { dir: "right", strength: 0.6, x: 8, y: 0, w: 84, h: 1 });
    roughStroke(c, shade, 2.4);
    c.fillStyle = C.paper;
    c.beginPath();
    c.ellipse(50, 44, 18, 9, 0, 0, Math.PI);
    c.fill();
    line(c, C.ink, 1.6);
    c.stroke();
  });
  ctx.drawImage(spr.canvas, cx - 50, ly - 32, 100, 60);
  // Bead chain to the pull ring.
  ctx.fillStyle = C.ink;
  for (let y = ly + 22; y < k.y - 13; y += 6) {
    const u = (y - ly) / (k.y - ly);
    ctx.beginPath();
    ctx.arc(cx + (k.x + sw - cx) * u, y, 1.8, 0, TAU);
    ctx.fill();
  }
  const ring = new Path2D();
  ring.arc(k.x + sw, k.y, 13, 0, TAU);
  ring.arc(k.x + sw, k.y, 7, 0, TAU, true);
  wash(ctx, ring, C.ash, C.ink, { dir: "right", strength: 0.6, x: k.x - 13, y: k.y - 13, w: 26, h: 26 });
  roughStroke(ctx, ring, 2.4);
}

function lift(ctx, l) {
  // A painter's palette hoisted on two cords.
  for (const cx of [l.x + 20, l.x + l.w - 20]) rope(ctx, [[cx, -20], [cx, l.y]], 3);
  const spr = cached(`st:palette:${l.w}`, l.w + 12, 40, (c) => {
    const r = rng(l.w + 5);
    c.translate(6, 6);
    const p = new Path2D();
    p.moveTo(10, 0);
    p.lineTo(l.w - 10, 0);
    p.quadraticCurveTo(l.w + 4, 2, l.w, 14);
    p.quadraticCurveTo(l.w * 0.6, 30, l.w * 0.3, 24);
    p.quadraticCurveTo(0, 22, 0, 10);
    p.quadraticCurveTo(0, 0, 10, 0);
    p.closePath();
    wash(c, p, C.ash, C.ink, { dir: "down", strength: 0.5, x: 0, y: 0, w: 1, h: 28 });
    c.save();
    c.clip(p);
    woodGrain(c, 0, 0, l.w, 28, r, C.slate);
    c.restore();
    roughStroke(c, p, 2.4);
    c.fillStyle = C.charcoal;
    c.beginPath();
    c.ellipse(l.w * 0.22, 12, 9, 6, 0, 0, TAU);
    c.fill();
    for (let i = 0; i < 4; i++) {
      c.fillStyle = [C.ink, C.paper, C.slate, C.silver][i];
      c.beginPath();
      c.ellipse(l.w * (0.42 + i * 0.13), 8 + (i % 2) * 6, 8, 5, r.range(-0.4, 0.4), 0, TAU);
      c.fill();
      line(c, C.ink, 1.2);
      c.stroke();
    }
  });
  ctx.drawImage(spr.canvas, l.x - 6, l.y - 6, spr.w, spr.h);
}

function ghost(ctx, o, g) {
  // A living ink blot that oozes back and forth.
  const t = g.time;
  ctx.save();
  ctx.globalAlpha = o.stun > 0 ? 0.35 : 1;
  ctx.translate(o.x, o.cy);
  const p = new Path2D();
  const n = 12;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * TAU;
    const rr = 26 + Math.sin(a * 3 + t * 4) * 4 + (i % 2) * 5;
    const x = Math.cos(a) * rr;
    const y = Math.sin(a) * rr * 0.9;
    if (i === 0) p.moveTo(x, y);
    else p.lineTo(x, y);
  }
  p.closePath();
  ctx.fillStyle = C.ink;
  ctx.fill(p);
  // Drips falling off it.
  for (let i = 0; i < 3; i++) {
    const k = (t * 1.2 + i / 3) % 1;
    ctx.beginPath();
    ctx.arc(-12 + i * 12, 24 + k * 40, 3.5 * (1 - k * 0.5), 0, TAU);
    ctx.globalAlpha = (o.stun > 0 ? 0.35 : 1) * (1 - k);
    ctx.fill();
  }
  ctx.globalAlpha = o.stun > 0 ? 0.35 : 1;
  ctx.fillStyle = "rgba(248,246,240,0.5)";
  ctx.beginPath();
  ctx.ellipse(-10, -14, 8, 3, -0.5, 0, TAU);
  ctx.fill();
  ctx.fillStyle = C.paper;
  if (o.stun > 0) {
    line(ctx, C.paper, 2);
    for (const ex of [-9, 9]) {
      ctx.beginPath();
      ctx.arc(ex, -4, 4, Math.PI + 0.3, -0.3);
      ctx.stroke();
    }
  } else {
    for (const ex of [-9, 9]) {
      ctx.beginPath();
      ctx.ellipse(ex, -4, 6, 8, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = C.ink;
      ctx.beginPath();
      ctx.arc(ex + 2, -2, 3, 0, TAU);
      ctx.fill();
      ctx.fillStyle = C.paper;
    }
  }
  ctx.restore();
}

// ---------------------------------------------------------------- decos

function decoEasel(ctx, d) {
  const spr = cached("st:easel", 150, 240, (c) => {
    const r = rng(23);
    c.translate(75, 236);
    line(c, C.ink, 7);
    c.beginPath();
    c.moveTo(-50, 0);
    c.lineTo(-6, -230);
    c.moveTo(50, 0);
    c.lineTo(6, -230);
    c.moveTo(0, -10);
    c.lineTo(0, -220);
    c.stroke();
    line(c, C.ash, 3);
    c.stroke();
    plank(c, -56, -86, 112, 10, r, { fill: C.ash, line: 1.6, nails: false });
    // Canvas with a half-finished river landscape.
    const cv = new Path2D();
    cv.rect(-54, -200, 108, 112);
    wash(c, cv, C.paper, C.silver, { dir: "down", strength: 0.4, x: 0, y: -200, w: 1, h: 112 });
    roughStroke(c, cv, 2.4);
    c.save();
    c.clip(cv);
    brush(c, [[-60, -130], [-20, -150], [20, -136], [60, -156]], r, { w: 10, color: C.ash });
    brush(c, [[-60, -108], [0, -116], [60, -104]], r, { w: 14, color: C.slate });
    c.fillStyle = C.charcoal;
    c.beginPath();
    c.arc(26, -176, 10, 0, TAU);
    c.fill();
    line(c, C.ash, 1.2);
    c.beginPath();
    c.moveTo(-30, -170);
    c.lineTo(-10, -186);
    c.lineTo(10, -170);
    c.stroke();
    c.restore();
  });
  ctx.drawImage(spr.canvas, d.x - 75, d.y - 236, 150, 240);
}

function decoInkwell(ctx, d, g) {
  const spr = cached("st:inkwell", 130, 200, (c) => {
    const r = rng(43);
    c.translate(65, 196);
    const bottle = new Path2D();
    bottle.moveTo(-46, 0);
    bottle.quadraticCurveTo(-56, -60, -30, -86);
    bottle.lineTo(-16, -100);
    bottle.lineTo(-16, -120);
    bottle.lineTo(16, -120);
    bottle.lineTo(16, -100);
    bottle.lineTo(30, -86);
    bottle.quadraticCurveTo(56, -60, 46, 0);
    bottle.closePath();
    wash(c, bottle, C.ink, null);
    roughStroke(c, bottle, 2.6);
    c.fillStyle = "rgba(248,246,240,0.4)";
    c.beginPath();
    c.ellipse(-28, -54, 6, 22, 0.2, 0, TAU);
    c.fill();
    const label = new Path2D();
    label.rect(-30, -60, 60, 34);
    wash(c, label, C.paper, C.silver, { dir: "down", strength: 0.4, x: 0, y: -60, w: 1, h: 34 });
    roughStroke(c, label, 1.6);
    c.fillStyle = C.ink;
    c.font = 'bold 15px Georgia, "Times New Roman", serif';
    c.textAlign = "center";
    c.fillText("INK", 0, -38);
    // Quill feather.
    brush(c, [[6, -116], [24, -150], [40, -180], [52, -192]], r, { w: 3, color: C.ink });
    const feather = new Path2D();
    feather.moveTo(14, -130);
    feather.quadraticCurveTo(20, -190, 56, -194);
    feather.quadraticCurveTo(48, -150, 14, -130);
    wash(c, feather, C.paper, C.ash, { dir: "right", strength: 0.5, x: 14, y: 0, w: 42, h: 1 });
    roughStroke(c, feather, 1.8);
    line(c, C.ash, 1);
    for (let k = 0; k < 7; k++) {
      c.beginPath();
      c.moveTo(20 + k * 4.6, -140 - k * 7);
      c.lineTo(28 + k * 4.6, -146 - k * 7);
      c.stroke();
    }
  });
  ctx.drawImage(spr.canvas, d.x - 65, d.y - 196, 130, 200);
  // A slow drip from the lip.
  const k = (g.time * 0.6 + d.x * 0.01) % 1;
  ctx.fillStyle = C.ink;
  ctx.beginPath();
  ctx.arc(d.x - 16, d.y - 76 + k * 70, 3 + k, 0, TAU);
  ctx.fill();
}

function decoJar(ctx, d) {
  const spr = cached("st:jar", 90, 150, (c) => {
    const r = rng(47);
    c.translate(45, 146);
    // Brushes and pencils first, then the jar in front.
    for (let i = 0; i < 6; i++) {
      const a = -0.35 + i * 0.14 + r.range(-0.04, 0.04);
      c.save();
      c.translate(-10 + i * 4, -50);
      c.rotate(a);
      c.fillStyle = i % 2 ? C.charcoal : C.ash;
      c.fillRect(-3, -80, 6, 80);
      line(c, C.ink, 1.2);
      c.strokeRect(-3, -80, 6, 80);
      c.fillStyle = C.ink;
      c.beginPath();
      if (i % 2) {
        c.moveTo(-3, -80);
        c.lineTo(0, -92);
        c.lineTo(3, -80);
      } else {
        c.moveTo(-4, -80);
        c.quadraticCurveTo(0, -102, 4, -80);
      }
      c.fill();
      c.restore();
    }
    const jar = new Path2D();
    jar.rect(-30, -60, 60, 60);
    c.fillStyle = "rgba(207,203,195,0.6)";
    c.fill(jar);
    roughStroke(c, jar, 2.4);
    c.fillStyle = "rgba(92,89,85,0.6)";
    c.fillRect(-28, -26, 56, 26);
    c.fillStyle = "rgba(248,246,240,0.5)";
    c.fillRect(-24, -54, 6, 48);
  });
  ctx.drawImage(spr.canvas, d.x - 45, d.y - 146, 90, 150);
}

function decoLamp(ctx, d, g) {
  // A tall studio floor lamp with a hooded shade.
  const spr = cached("st:floorlamp", 140, 260, (c) => {
    c.translate(40, 256);
    const base = new Path2D();
    base.ellipse(0, -6, 30, 8, 0, 0, TAU);
    wash(c, base, C.charcoal, C.ink, { dir: "right", strength: 0.5, x: -30, y: 0, w: 60, h: 1 });
    roughStroke(c, base, 2);
    line(c, C.ink, 5);
    c.beginPath();
    c.moveTo(0, -10);
    c.lineTo(0, -220);
    c.quadraticCurveTo(0, -244, 40, -240);
    c.stroke();
    const shade = new Path2D();
    shade.moveTo(30, -250);
    shade.lineTo(66, -250);
    shade.lineTo(92, -214);
    shade.lineTo(10, -214);
    shade.closePath();
    wash(c, shade, C.slate, C.ink, { dir: "down", strength: 0.6, x: 0, y: -250, w: 1, h: 36 });
    roughStroke(c, shade, 2.4);
  });
  ctx.drawImage(spr.canvas, d.x - 40, d.y - 256, 140, 260);
  const cx = d.x + 51;
  const glow = ctx.createLinearGradient(0, d.y - 42, 0, d.y);
  glow.addColorStop(0, "rgba(248,246,240,0.4)");
  glow.addColorStop(1, "rgba(248,246,240,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.moveTo(cx - 40, d.y - 42);
  ctx.lineTo(cx + 40, d.y - 42);
  ctx.lineTo(cx + 90, d.y);
  ctx.lineTo(cx - 90, d.y);
  ctx.closePath();
  ctx.fill();
}

function decoReams(ctx, d) {
  const spr = cached(`st:reams:${d.flip}`, 150, 130, (c) => {
    const r = rng(d.flip ? 61 : 59);
    let y = 126;
    for (let i = 0; i < 5; i++) {
      const w = r.range(100, 130);
      const h = r.range(18, 26);
      const x = 75 - w / 2 + r.range(-8, 8);
      y -= h;
      const p = new Path2D();
      p.rect(x, y, w, h);
      wash(c, p, i % 2 ? C.paper : C.silver, C.ash, { dir: "down", strength: 0.5, x: 0, y, w: 1, h });
      roughStroke(c, p, 2);
      line(c, C.ash, 0.8);
      for (let yy = y + 3; yy < y + h; yy += 3) {
        c.beginPath();
        c.moveTo(x + 2, yy);
        c.lineTo(x + w - 2, yy);
        c.stroke();
      }
      c.fillStyle = C.charcoal;
      c.fillRect(x + w * 0.4, y, 14, h);
    }
  });
  ctx.drawImage(spr.canvas, d.x - 75, d.y - 126, 150, 130);
}

function decoCamera(ctx, d) {
  // The way out: a rostrum camera stand beside the screening-room door.
  const spr = cached("st:screening", 320, 300, (c) => {
    const r = rng(53);
    c.translate(10, 296);
    const door = new Path2D();
    door.rect(130, -240, 150, 240);
    wash(c, door, C.slate, C.ink, { dir: "right", strength: 0.5, x: 130, y: 0, w: 150, h: 1 });
    roughStroke(c, door, 3);
    for (let k = 0; k < 2; k++) {
      line(c, C.ink, 1.8);
      c.strokeRect(146, -224 + k * 110, 118, 92);
    }
    c.fillStyle = C.paper;
    c.fillRect(150, -270, 110, 28);
    line(c, C.ink, 2);
    c.strokeRect(150, -270, 110, 28);
    c.fillStyle = C.ink;
    c.font = 'bold 13px Georgia, "Times New Roman", serif';
    c.textAlign = "center";
    c.fillText("SCREENING", 205, -251);
    c.beginPath();
    c.arc(250, -120, 6, 0, TAU);
    c.fill();
    // The camera stand.
    line(c, C.ink, 6);
    c.beginPath();
    c.moveTo(20, 0);
    c.lineTo(20, -250);
    c.moveTo(100, 0);
    c.lineTo(100, -250);
    c.stroke();
    plank(c, 0, -60, 120, 12, r, { fill: C.ash, line: 1.6, nails: false });
    const cam = new Path2D();
    cam.rect(30, -230, 60, 50);
    wash(c, cam, C.charcoal, C.ink, { dir: "right", strength: 0.5, x: 30, y: 0, w: 60, h: 1 });
    roughStroke(c, cam, 2.4);
    for (const mx of [42, 78]) {
      c.fillStyle = C.ink;
      c.beginPath();
      c.arc(mx, -252, 20, 0, TAU);
      c.fill();
      line(c, C.ash, 2);
      c.stroke();
      c.beginPath();
      for (let k = 0; k < 3; k++) {
        c.moveTo(mx, -252);
        c.lineTo(mx + Math.cos((k * TAU) / 3) * 14, -252 + Math.sin((k * TAU) / 3) * 14);
      }
      c.stroke();
    }
    c.fillStyle = C.ink;
    c.fillRect(52, -180, 16, 20);
  });
  ctx.drawImage(spr.canvas, d.x - 10, d.y - 296, 320, 300);
}

function pigeon(ctx, x, y, t, fly, gx = 0, gy = 0) {
  ctx.save();
  if (fly) {
    ctx.translate(x + gx, y - 24 + gy);
    const f = Math.sin(fly * 16) * 9;
    ctx.fillStyle = C.slate;
    ctx.beginPath();
    ctx.moveTo(-26, -f);
    ctx.quadraticCurveTo(-10, -8 - f * 0.4, 0, 0);
    ctx.quadraticCurveTo(10, -8 - f * 0.4, 26, -f);
    ctx.quadraticCurveTo(10, 3, 0, 7);
    ctx.quadraticCurveTo(-10, 3, -26, -f);
    ctx.fill();
    line(ctx, C.ink, 1.6);
    ctx.stroke();
    ctx.restore();
    return;
  }
  // A plump studio pigeon pecking at crumbs.
  const peck = Math.max(0, Math.sin(t * 5 + x)) * 4;
  ctx.translate(x, y + 26);
  line(ctx, C.ink, 2);
  ctx.beginPath();
  ctx.moveTo(-3, -8);
  ctx.lineTo(-4, 0);
  ctx.moveTo(4, -8);
  ctx.lineTo(5, 0);
  ctx.stroke();
  const body = new Path2D();
  body.moveTo(-22, -16);
  body.bezierCurveTo(-18, -32, 10, -32, 14, -18);
  body.bezierCurveTo(14, -6, -6, -4, -14, -8);
  body.closePath();
  wash(ctx, body, C.ash, C.ink, { dir: "down", strength: 0.5, x: -22, y: -32, w: 36, h: 28 });
  roughStroke(ctx, body, 2);
  const head = new Path2D();
  head.arc(12, -28 + peck, 7, 0, TAU);
  wash(ctx, head, C.slate, null);
  roughStroke(ctx, head, 1.8);
  ctx.fillStyle = C.ink;
  ctx.beginPath();
  ctx.moveTo(18, -29 + peck);
  ctx.lineTo(25, -26 + peck);
  ctx.lineTo(18, -25 + peck);
  ctx.fill();
  ctx.fillStyle = C.paper;
  ctx.beginPath();
  ctx.arc(14, -30 + peck, 1.8, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function decoPigeon(ctx, d, g) {
  if (d.fly && d.fly > 4) return;
  pigeon(ctx, d.x, d.y, g.time, d.fly, d.gx, d.gy);
}

// ---------------------------------------------------------------- the steam paint roller

class PaintRoller extends Chaser {
  smokeOrigins() {
    return [[-330, -270]];
  }

  paint(ctx, g) {
    const t = g.time;
    // A freshly painted stripe trailing behind on the ink.
    ctx.fillStyle = C.charcoal;
    ctx.fillRect(-900, -8, 900, 10);
    const spr = cached("st:roller", 540, 330, paintRollerBody);
    ctx.drawImage(spr.canvas, -500, -310, 540, 330);
    captain(ctx, -300, -170, t, 1.1);
    // The big front roller turns and drips paint.
    ctx.save();
    ctx.translate(-60, -62);
    const roller = new Path2D();
    roller.arc(0, 0, 62, 0, TAU);
    wash(ctx, roller, C.slate, C.ink, { dir: "down", strength: 0.6, x: 0, y: -62, w: 1, h: 124 });
    roughStroke(ctx, roller, 3.4);
    ctx.rotate(this.wheel * 0.5);
    line(ctx, C.ink, 2.4);
    for (let k = 0; k < 6; k++) {
      ctx.beginPath();
      ctx.moveTo(Math.cos((k * TAU) / 6) * 20, Math.sin((k * TAU) / 6) * 20);
      ctx.lineTo(Math.cos((k * TAU) / 6) * 56, Math.sin((k * TAU) / 6) * 56);
      ctx.stroke();
    }
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, TAU);
    ctx.fill();
    ctx.restore();
    // Rear drive wheel.
    ctx.save();
    ctx.translate(-380, -40);
    ctx.rotate(this.wheel);
    const wh = new Path2D();
    wh.arc(0, 0, 40, 0, TAU);
    wash(ctx, wh, C.charcoal, null);
    roughStroke(ctx, wh, 3);
    line(ctx, C.ash, 3);
    ctx.beginPath();
    for (let k = 0; k < 8; k++) {
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos((k * TAU) / 8) * 34, Math.sin((k * TAU) / 8) * 34);
    }
    ctx.stroke();
    ctx.restore();
    // Paint drips flicked off the roller.
    ctx.fillStyle = C.ink;
    for (let i = 0; i < 5; i++) {
      const k = (t * 2.2 + i / 5) % 1;
      ctx.beginPath();
      ctx.arc(-10 + k * 50 + i * 3, -100 - Math.sin(k * Math.PI) * 50 + k * 90, 4 * (1 - k * 0.4), 0, TAU);
      ctx.fill();
    }
    if (this.tootT > 0) {
      const k = 1 - this.tootT / 0.7;
      ctx.fillStyle = C.paper;
      ctx.strokeStyle = C.ash;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(-300 - i * 14, -330 - k * 40 - i * 10, 10 + k * 16, 0, TAU);
        ctx.fill();
        ctx.stroke();
      }
    }
  }
}

function paintRollerBody(c) {
  const r = rng(83);
  c.translate(500, 310);
  // Canopy on posts.
  const can = new Path2D();
  can.moveTo(-460, -280);
  can.quadraticCurveTo(-330, -310, -200, -280);
  can.lineTo(-200, -266);
  can.lineTo(-460, -266);
  can.closePath();
  wash(c, can, C.ash, C.ink, { dir: "down", strength: 0.5, x: 0, y: -300, w: 1, h: 34 });
  roughStroke(c, can, 2.6);
  line(c, C.ink, 5);
  c.beginPath();
  c.moveTo(-450, -266);
  c.lineTo(-450, -110);
  c.moveTo(-210, -266);
  c.lineTo(-210, -110);
  c.stroke();
  // Firebox and boiler body.
  const box = new Path2D();
  box.rect(-470, -120, 280, 70);
  wash(c, box, C.slate, C.ink, { dir: "down", strength: 0.5, x: 0, y: -120, w: 1, h: 70 });
  roughStroke(c, box, 3);
  const boiler = new Path2D();
  boiler.moveTo(-200, -170);
  boiler.lineTo(-60, -170);
  boiler.quadraticCurveTo(-36, -140, -60, -110);
  boiler.lineTo(-200, -110);
  boiler.closePath();
  wash(c, boiler, C.silver, C.ink, { dir: "down", strength: 0.6, x: 0, y: -170, w: 1, h: 60 });
  roughStroke(c, boiler, 3);
  line(c, C.ash, 2);
  for (const bx of [-170, -130, -90]) {
    c.beginPath();
    c.moveTo(bx, -170);
    c.lineTo(bx, -110);
    c.stroke();
  }
  // Tall stack.
  c.fillStyle = C.ink;
  c.fillRect(-342, -270, 24, 150);
  c.fillRect(-352, -280, 44, 14);
  // Yoke holding the front roller.
  line(c, C.ink, 8);
  c.beginPath();
  c.moveTo(-120, -110);
  c.lineTo(-60, -62);
  c.moveTo(-60, -150);
  c.lineTo(-60, -62);
  c.stroke();
  // A giant brush mounted as a hood ornament.
  brush(c, [[-60, -170], [-40, -210], [-24, -228]], r, { w: 6, color: C.ink });
  c.fillStyle = C.ink;
  c.beginPath();
  c.moveTo(-30, -224);
  c.quadraticCurveTo(-30, -258, -6, -262);
  c.quadraticCurveTo(-10, -232, -18, -220);
  c.fill();
}

registerChaser("roller", PaintRoller);

export default {
  id: "studio",
  name: "Inkwell Studio",
  decoKinds: ["easel", "inkwell", "jar", "lamp"],
  perch: "pigeon",
  landingSign: "THE SCREENING ROOM",
  fall: { fx: "splash", text: "SPLAT!" },
  chaser: "roller",
  drawBackground,
  drawForeground,
  skins: { ledge, block, crumble, hook, lift, ghost },
  decos: {
    easel: decoEasel,
    inkwell: decoInkwell,
    jar: decoJar,
    lamp: decoLamp,
    stack: decoReams,
    shed: decoCamera,
    pigeon: decoPigeon,
  },
};
