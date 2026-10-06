// The Captain's sidewheel steamboat, chasing from the left edge.
// Drawn in screen space; it slides further on as the Captain meter rises.
// The Captain appears only as a dark silhouette in the wheelhouse.
import { PALETTE as C } from "../art/palette.js";
import { TAU, roundRect, fillStroke, puff } from "../art/draw.js";
import { rng, cached, pen, brush, hatch, woodGrain } from "../art/ink.js";

// Boat-local coordinates: x = 0 at the bow, y = 0 at the waterline.
const BODY_X = 920;
const BODY_Y = 440;
const BODY_W = 960;
const BODY_H = 480;
const HX = -370; // wheelhouse left edge
const WX = -450; // paddlewheel hub
const WY = -30;
const R = 92;
import { CONFIG } from "../config.js";

export class Steamboat {
  constructor() {
    this.bow = CONFIG.boatBowMin;
    this.wheel = 0;
    this.smoke = [];
    this.smokeT = 0;
    this.tootT = 0;
    this.extra = 0; // extra slide used for the caught animation
    this.knockT = 0;
  }

  reset() {
    this.bow = CONFIG.boatBowMin;
    this.smoke = [];
    this.tootT = 0;
    this.extra = 0;
    this.knockT = 0;
  }

  // Hit by cargo from a boss-chase switch: falls back for a moment.
  knock() {
    this.knockT = 1;
  }

  toot() {
    this.tootT = 0.7;
  }

  update(dt, meter, time, beat) {
    const target =
      CONFIG.boatBowMin + (CONFIG.boatBowMax - CONFIG.boatBowMin) * Math.min(1, meter / 100) + this.extra - this.knockT * 260;
    this.knockT = Math.max(0, this.knockT - dt * 0.7);
    this.bow += (target - this.bow) * Math.min(1, dt * 3);
    this.wheel += dt * 3.2;
    this.tootT = Math.max(0, this.tootT - dt);

    // Smoke from the two stacks.
    this.smokeT -= dt;
    if (this.smokeT <= 0) {
      this.smokeT = 0.16;
      for (const sx of [-240, -195]) {
        this.smoke.push({ x: this.bow + sx, y: CONFIG.waterY - 410, r: 12 + beat * 6, life: 0, vx: -60 - Math.random() * 40, vy: -50 - Math.random() * 20 });
      }
    }
    for (const p of this.smoke) {
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.r += dt * 18;
    }
    this.smoke = this.smoke.filter((p) => p.life < 2.2 && p.y > -80);
  }

  draw(ctx, g) {
    const bx = this.bow;
    const W = CONFIG.waterY;
    const t = g.time;
    const bob = Math.sin(t * 1.7) * 3;

    // Smoke behind the boat.
    for (const p of this.smoke) {
      ctx.globalAlpha = Math.max(0, 1 - p.life / 2.2) * 0.9;
      puff(ctx, [[p.x, p.y, p.r], [p.x + p.r * 0.7, p.y + p.r * 0.2, p.r * 0.7]], p.life < 0.7 ? C.slate : C.ash, 1.5);
    }
    ctx.globalAlpha = 1;

    ctx.save();
    ctx.translate(bx, W + bob);
    const body = cached("boat:body", BODY_W, BODY_H, paintBody, 64);
    ctx.drawImage(body.canvas, -BODY_X, -BODY_Y, BODY_W, BODY_H);

    // The Captain at the wheelhouse window.
    ctx.save();
    roundRect(ctx, HX + 10, -290, 90, 50, 5);
    ctx.clip();
    this.drawCaptain(ctx, HX + 58, -240, g);
    ctx.restore();
    if (this.tootT > 0) {
      const k = this.tootT / 0.7;
      puff(ctx, [[HX + 93, -350 - (1 - k) * 30, 10 + (1 - k) * 18], [HX + 110, -360 - (1 - k) * 40, 8 + (1 - k) * 14]], C.paper, 2);
    }

    // Sidewheel: the wheel turns behind the paddle box.
    ctx.save();
    ctx.beginPath();
    ctx.arc(WX, WY, R + 6, 0, TAU);
    ctx.clip();
    ctx.fillStyle = C.charcoal;
    ctx.fillRect(WX - R - 6, WY - R - 6, 2 * R + 12, 2 * R + 12);
    for (let i = 0; i < 10; i++) {
      const a = this.wheel + (i * TAU) / 10;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      ctx.strokeStyle = C.ash;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(WX, WY);
      ctx.lineTo(WX + ca * R, WY + sa * R);
      ctx.stroke();
      ctx.save();
      ctx.translate(WX + ca * (R - 10), WY + sa * (R - 10));
      ctx.rotate(a);
      roundRect(ctx, -12, -9, 24, 18, 3);
      fillStroke(ctx, C.silver, 3);
      ctx.restore();
    }
    ctx.restore();
    const box = cached("boat:box", 260, 140, paintPaddleBox, 64);
    ctx.drawImage(box.canvas, WX - 130, WY - 130, 260, 140);

    // Foam at the bow and under the wheel.
    ctx.fillStyle = C.paper;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 6; i++) {
      const fx = WX - R + i * 36 + Math.sin(t * 9 + i) * 6;
      const fr = 12 + Math.sin(t * 11 + i * 2) * 4;
      ctx.beginPath();
      ctx.arc(fx, 4, fr, Math.PI, 0);
      ctx.fill();
      ctx.stroke();
    }
    for (let i = 0; i < 3; i++) {
      const fr = 10 + i * 6 + Math.sin(t * 8 + i) * 3;
      ctx.beginPath();
      ctx.arc(-30 - i * 26, 2, fr, Math.PI, 0);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  drawCaptain(ctx, x, y, g) {
    // Burly silhouette: broad shoulders, jowly head, peaked cap, pipe.
    const sway = Math.sin(g.time * Math.PI * 2 * (CONFIG.bpm / 120)) * 2;
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    ctx.ellipse(x + sway * 0.5, y + 6, 40, 22, 0, Math.PI, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 2 + sway, y - 22, 17, 16, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 17 + sway, y - 18, 8, 6, 0.2, 0, TAU);
    ctx.fill();
    // Cap.
    ctx.beginPath();
    ctx.moveTo(x - 16 + sway, y - 30);
    ctx.lineTo(x - 12 + sway, y - 46);
    ctx.lineTo(x + 18 + sway, y - 44);
    ctx.lineTo(x + 22 + sway, y - 33);
    ctx.lineTo(x + 34 + sway, y - 30);
    ctx.lineTo(x + 18 + sway, y - 28);
    ctx.closePath();
    ctx.fill();
    // Pipe.
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + 22 + sway, y - 14);
    ctx.lineTo(x + 34 + sway, y - 10);
    ctx.stroke();
    ctx.fillRect(x + 31 + sway, y - 18, 7, 9);
    // Glaring eye glint.
    ctx.fillStyle = C.paper;
    ctx.beginPath();
    ctx.ellipse(x + 11 + sway, y - 26, 3, 1.6, -0.3, 0, TAU);
    ctx.fill();
  }
}

// ---------------------------------------------------------------- painted parts

function paintBody(ctx) {
  const r = rng(404);
  ctx.translate(BODY_X, BODY_Y);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Smokestacks with feathered crowns, hatched round shading and a brace.
  for (const sx of [-240, -195]) {
    const stack = new Path2D();
    stack.rect(sx - 13, -400, 26, 190);
    ctx.fillStyle = C.charcoal;
    ctx.fill(stack);
    ctx.save();
    ctx.clip(stack);
    ctx.fillStyle = C.ink;
    ctx.fillRect(sx + 3, -400, 10, 190);
    ctx.strokeStyle = C.slate;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(sx - 7, -396);
    ctx.lineTo(sx - 7, -214);
    ctx.stroke();
    ctx.restore();
    pen(ctx, [[sx - 13, -210], [sx - 13, -400], [sx + 13, -400], [sx + 13, -210]], r, { w: 3, amp: 0.6 });
    ctx.fillStyle = C.paper;
    ctx.fillRect(sx - 13, -340, 26, 6);
    ctx.fillRect(sx - 13, -300, 26, 3);
    // Crown.
    ctx.beginPath();
    for (let i = 0; i <= 8; i++) {
      const px = sx - 24 + (48 * i) / 8;
      ctx.lineTo(px, -404 - (i % 2 === 0 ? 22 : 6));
    }
    ctx.lineTo(sx + 17, -398);
    ctx.lineTo(sx - 17, -398);
    ctx.closePath();
    ctx.fillStyle = C.ink;
    ctx.fill();
    ctx.strokeStyle = C.slate;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  brush(ctx, [[-240, -300], [-195, -300]], r, { w: 4, taper: 0.1 });
  brush(ctx, [[-240, -360], [-215, -330], [-195, -360]], r, { w: 2, taper: 0.1 });

  // Hull: planked, with a hatched belly and a white rub rail.
  const hull = new Path2D();
  hull.moveTo(-900, -62);
  hull.lineTo(-40, -62);
  hull.quadraticCurveTo(-4, -64, 10, -84);
  hull.quadraticCurveTo(-4, -10, -50, 24);
  hull.lineTo(-900, 24);
  hull.closePath();
  ctx.fillStyle = C.silver;
  ctx.fill(hull);
  ctx.save();
  ctx.clip(hull);
  for (let y = -56; y < 24; y += 11) woodGrain(ctx, -900, y, 920, 9, r, C.ash);
  ctx.strokeStyle = C.slate;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let y = -51; y < 24; y += 11) {
    ctx.moveTo(-900, y);
    ctx.lineTo(0, y + 1);
  }
  ctx.stroke();
  hatch(ctx, -900, -14, 930, 40, r, { gap: 3, lw: 1, color: C.slate, angle: -0.2 });
  hatch(ctx, -900, 0, 930, 30, r, { gap: 3, lw: 1, color: C.charcoal, angle: 0.5 });
  ctx.fillStyle = C.charcoal;
  ctx.fillRect(-900, -36, 930, 10);
  ctx.fillStyle = C.paper;
  ctx.fillRect(-900, -58, 930, 4);
  ctx.restore();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 4.5;
  ctx.stroke(hull);

  // Main cabin: clapboard walls, arched windows, pilasters, shade under the eaves.
  const cabin = new Path2D();
  cabin.rect(-700, -150, 540, 90);
  ctx.fillStyle = C.paper;
  ctx.fill(cabin);
  ctx.save();
  ctx.clip(cabin);
  ctx.strokeStyle = C.silver;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let y = -146; y < -60; y += 6) {
    ctx.moveTo(-700, y);
    ctx.lineTo(-160, y);
  }
  ctx.stroke();
  hatch(ctx, -700, -150, 540, 18, r, { gap: 3, lw: 1, color: C.ash, angle: 0.1 });
  ctx.restore();
  for (let x = -680; x < -190; x += 42) {
    ctx.beginPath();
    ctx.moveTo(x, -82);
    ctx.lineTo(x, -118);
    ctx.arc(x + 11, -118, 11, Math.PI, 0);
    ctx.lineTo(x + 22, -82);
    ctx.closePath();
    ctx.fillStyle = C.charcoal;
    ctx.fill();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = C.slate;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x + 11, -128);
    ctx.lineTo(x + 11, -82);
    ctx.moveTo(x, -104);
    ctx.lineTo(x + 22, -104);
    ctx.stroke();
    // Pilaster between windows.
    ctx.fillStyle = C.silver;
    ctx.fillRect(x + 28, -146, 6, 84);
    ctx.strokeStyle = C.ash;
    ctx.strokeRect(x + 28, -146, 6, 84);
  }
  pen(ctx, [[-700, -60], [-700, -150], [-160, -150], [-160, -60]], r, { w: 3, amp: 0.6 });
  // Overhanging deck with gingerbread scallops.
  ctx.fillStyle = C.silver;
  ctx.fillRect(-720, -162, 580, 14);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 3;
  ctx.strokeRect(-720, -162, 580, 14);
  ctx.fillStyle = C.paper;
  ctx.lineWidth = 1.5;
  for (let x = -716; x < -146; x += 16) {
    ctx.beginPath();
    ctx.arc(x + 8, -148, 7, 0, Math.PI);
    ctx.fill();
    ctx.stroke();
  }
  // Deck posts and railing at the bow.
  for (let x = -150; x <= -40; x += 18) brush(ctx, [[x, -88], [x, -62]], r, { w: 2.4, taper: 0.1, amp: 0.3 });
  brush(ctx, [[-152, -88], [-40, -88]], r, { w: 3, taper: 0.1, amp: 0.3 });
  brush(ctx, [[-152, -76], [-40, -76]], r, { w: 1.8, taper: 0.1, amp: 0.3 });
  // Bell on a post, and a pennant on the jackstaff.
  ctx.fillStyle = C.charcoal;
  ctx.fillRect(-92, -128, 6, 66);
  ctx.beginPath();
  ctx.moveTo(-101, -120);
  ctx.quadraticCurveTo(-89, -148, -77, -120);
  ctx.closePath();
  ctx.fillStyle = C.ash;
  ctx.fill();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  brush(ctx, [[0, -80], [-6, -170]], r, { w: 4, taper: 0.2 });
  ctx.beginPath();
  ctx.moveTo(-6, -170);
  ctx.quadraticCurveTo(20, -166, 44, -160);
  ctx.quadraticCurveTo(20, -154, -5, -148);
  ctx.closePath();
  ctx.fillStyle = C.paper;
  ctx.fill();
  ctx.stroke();

  // Upper (texas) deck.
  const upper = new Path2D();
  upper.rect(-610, -215, 330, 55);
  ctx.fillStyle = C.paper;
  ctx.fill(upper);
  ctx.save();
  ctx.clip(upper);
  hatch(ctx, -610, -215, 330, 14, r, { gap: 3, lw: 1, color: C.ash, angle: 0.1 });
  ctx.restore();
  for (let x = -590; x < -300; x += 36) {
    roundRect(ctx, x, -202, 20, 26, 5);
    ctx.fillStyle = C.charcoal;
    ctx.fill();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
  pen(ctx, [[-610, -160], [-610, -215], [-280, -215], [-280, -160]], r, { w: 3, amp: 0.6 });
  ctx.fillStyle = C.silver;
  ctx.fillRect(-625, -226, 360, 13);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 3;
  ctx.strokeRect(-625, -226, 360, 13);
  // Upper railing.
  for (let x = -270; x <= -170; x += 14) brush(ctx, [[x, -184], [x, -162]], r, { w: 2, taper: 0.1, amp: 0.3 });
  brush(ctx, [[-272, -184], [-168, -184]], r, { w: 2.5, taper: 0.1, amp: 0.3 });

  // Wheelhouse with a big window (the Captain is drawn live).
  const house = new Path2D();
  roundRectPath(house, HX, -300, 110, 76, 6);
  ctx.fillStyle = C.silver;
  ctx.fill(house);
  ctx.save();
  ctx.clip(house);
  hatch(ctx, HX + 70, -300, 40, 76, r, { gap: 3, lw: 1, color: C.ash, angle: 1.2 });
  ctx.restore();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 3.5;
  ctx.stroke(house);
  roundRect(ctx, HX + 10, -290, 90, 50, 5);
  ctx.fillStyle = C.paper;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.stroke();
  // Domed roof, finial, and a steam whistle.
  ctx.beginPath();
  ctx.moveTo(HX - 10, -300);
  ctx.quadraticCurveTo(HX + 55, -336, HX + 120, -300);
  ctx.closePath();
  ctx.fillStyle = C.ink;
  ctx.fill();
  ctx.strokeStyle = C.slate;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let x = HX; x < HX + 112; x += 10) {
    ctx.moveTo(x, -302);
    ctx.lineTo(HX + 55, -330);
  }
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(HX + 55, -322, 7, 0, TAU);
  ctx.fillStyle = C.paper;
  ctx.fill();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 3;
  ctx.stroke();
  roundRect(ctx, HX + 88, -334, 10, 26, 3);
  ctx.fillStyle = C.ash;
  ctx.fill();
  ctx.stroke();
}

function roundRectPath(p, x, y, w, h, rr) {
  p.moveTo(x + rr, y);
  p.arcTo(x + w, y, x + w, y + h, rr);
  p.arcTo(x + w, y + h, x, y + h, rr);
  p.arcTo(x, y + h, x, y, rr);
  p.arcTo(x, y, x + w, y, rr);
  p.closePath();
}

// The sunburst paddle box, drawn over the turning wheel.
function paintPaddleBox(ctx) {
  const r = rng(505);
  ctx.translate(130, 130);
  const cy = -10;
  const box = new Path2D();
  box.moveTo(-R - 14, cy);
  box.arc(0, cy, R + 14, Math.PI, 0);
  box.closePath();
  ctx.fillStyle = C.silver;
  ctx.fill(box);
  ctx.save();
  ctx.clip(box);
  for (let i = 0; i < 10; i++) {
    const a0 = Math.PI + (i * Math.PI) / 10;
    const a1 = Math.PI + ((i + 1) * Math.PI) / 10;
    if (i % 2 === 0) {
      ctx.beginPath();
      ctx.moveTo(0, cy);
      ctx.arc(0, cy, R + 14, a0, a1);
      ctx.closePath();
      ctx.fillStyle = C.paper;
      ctx.fill();
    }
  }
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  for (let i = 1; i < 10; i++) {
    const a = Math.PI + (i * Math.PI) / 10;
    ctx.moveTo(Math.cos(a) * 30, cy + Math.sin(a) * 30);
    ctx.lineTo(Math.cos(a) * (R + 14), cy + Math.sin(a) * (R + 14));
  }
  ctx.stroke();
  ctx.beginPath();
  ctx.rect(R * 0.2, cy - R - 20, R, R + 20);
  ctx.clip();
  hatch(ctx, 0, cy - R - 20, R + 20, R + 20, r, { gap: 3, lw: 1, color: C.ash, angle: 1.1 });
  ctx.restore();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 4.5;
  ctx.stroke(box);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, cy, R + 4, Math.PI, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, cy, 28, Math.PI, 0);
  ctx.closePath();
  ctx.fillStyle = C.paper;
  ctx.fill();
  ctx.lineWidth = 3.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, cy, 10, Math.PI, 0);
  ctx.closePath();
  ctx.fillStyle = C.ink;
  ctx.fill();
}
