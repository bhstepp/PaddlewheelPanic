// The Captain's sidewheel steamboat, chasing from the left edge.
// Drawn in screen space; it slides further on as the Captain meter rises.
// The Captain appears only as a dark silhouette in the wheelhouse.
import { PALETTE as C } from "../art/palette.js";
import { TAU, roundRect, fillStroke, puff } from "../art/draw.js";
import { CONFIG } from "../config.js";

export class Steamboat {
  constructor() {
    this.bow = CONFIG.boatBowMin;
    this.wheel = 0;
    this.smoke = [];
    this.smokeT = 0;
    this.tootT = 0;
    this.extra = 0; // extra slide used for the caught animation
  }

  reset() {
    this.bow = CONFIG.boatBowMin;
    this.smoke = [];
    this.tootT = 0;
    this.extra = 0;
  }

  toot() {
    this.tootT = 0.7;
  }

  update(dt, meter, time, beat) {
    const target =
      CONFIG.boatBowMin + (CONFIG.boatBowMax - CONFIG.boatBowMin) * Math.min(1, meter / 100) + this.extra;
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
    ctx.translate(0, bob);
    ctx.lineJoin = "round";

    // Smokestacks with feathered crowns and a brace.
    for (const sx of [-240, -195]) {
      const x = bx + sx;
      roundRect(ctx, x - 13, W - 400, 26, 190, 4);
      fillStroke(ctx, C.ink, 4);
      ctx.beginPath();
      for (let i = 0; i <= 6; i++) {
        const px = x - 22 + (44 * i) / 6;
        ctx.lineTo(px, W - 404 - (i % 2 === 0 ? 18 : 4));
      }
      ctx.lineTo(x + 16, W - 398);
      ctx.lineTo(x - 16, W - 398);
      ctx.closePath();
      fillStroke(ctx, C.ink, 3);
      ctx.fillStyle = C.paper;
      ctx.fillRect(x - 13, W - 340, 26, 6);
    }
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(bx - 240, W - 300);
    ctx.lineTo(bx - 195, W - 300);
    ctx.stroke();

    // Hull.
    ctx.beginPath();
    ctx.moveTo(bx - 900, W - 62);
    ctx.lineTo(bx - 40, W - 62);
    ctx.quadraticCurveTo(bx - 4, W - 64, bx + 10, W - 84);
    ctx.quadraticCurveTo(bx - 4, W - 10, bx - 50, W + 24);
    ctx.lineTo(bx - 900, W + 24);
    ctx.closePath();
    fillStroke(ctx, C.silver, 5);
    ctx.fillStyle = C.charcoal;
    ctx.fillRect(bx - 900, W - 34, 870, 10);
    ctx.strokeStyle = C.paper;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(bx - 900, W - 54);
    ctx.lineTo(bx - 44, W - 54);
    ctx.stroke();

    // Main cabin with arched windows and deck posts.
    roundRect(ctx, bx - 700, W - 150, 540, 90, 4);
    fillStroke(ctx, C.paper, 4);
    ctx.fillStyle = C.charcoal;
    for (let x = bx - 680; x < bx - 190; x += 42) {
      ctx.beginPath();
      ctx.moveTo(x, W - 82);
      ctx.lineTo(x, W - 120);
      ctx.arc(x + 11, W - 120, 11, Math.PI, 0);
      ctx.lineTo(x + 22, W - 82);
      ctx.closePath();
      ctx.fill();
    }
    roundRect(ctx, bx - 720, W - 162, 580, 14, 4);
    fillStroke(ctx, C.silver, 4);
    // Railing along the main deck.
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(bx - 150, W - 88);
    ctx.lineTo(bx - 40, W - 88);
    for (let x = bx - 150; x <= bx - 40; x += 18) {
      ctx.moveTo(x, W - 88);
      ctx.lineTo(x, W - 62);
    }
    ctx.stroke();
    // A bell on a post at the bow.
    roundRect(ctx, bx - 92, W - 128, 6, 66, 2);
    fillStroke(ctx, C.charcoal, 2);
    ctx.beginPath();
    ctx.moveTo(bx - 101, W - 120);
    ctx.quadraticCurveTo(bx - 89, W - 146, bx - 77, W - 120);
    ctx.closePath();
    fillStroke(ctx, C.ash, 3);

    // Upper deck.
    roundRect(ctx, bx - 610, W - 215, 330, 55, 4);
    fillStroke(ctx, C.paper, 4);
    ctx.fillStyle = C.charcoal;
    for (let x = bx - 590; x < bx - 300; x += 36) {
      roundRect(ctx, x, W - 202, 20, 26, 5);
      ctx.fill();
    }
    roundRect(ctx, bx - 625, W - 226, 360, 13, 4);
    fillStroke(ctx, C.silver, 4);

    // Wheelhouse with the Captain's silhouette.
    const hx = bx - 370;
    roundRect(ctx, hx, W - 300, 110, 76, 6);
    fillStroke(ctx, C.silver, 4);
    roundRect(ctx, hx + 10, W - 290, 90, 50, 5);
    fillStroke(ctx, C.paper, 3);
    ctx.save();
    roundRect(ctx, hx + 10, W - 290, 90, 50, 5);
    ctx.clip();
    this.drawCaptain(ctx, hx + 58, W - 240, g);
    ctx.restore();
    // Window mullion and roof.
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(hx + 55, W - 290);
    ctx.lineTo(hx + 55, W - 278);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(hx - 10, W - 300);
    ctx.quadraticCurveTo(hx + 55, W - 336, hx + 120, W - 300);
    ctx.closePath();
    fillStroke(ctx, C.ink, 3);
    ctx.beginPath();
    ctx.arc(hx + 55, W - 322, 7, 0, TAU);
    fillStroke(ctx, C.paper, 3);
    // Steam whistle on the roof.
    roundRect(ctx, hx + 88, W - 334, 10, 26, 3);
    fillStroke(ctx, C.ash, 3);
    if (this.tootT > 0) {
      const k = this.tootT / 0.7;
      puff(ctx, [[hx + 93, W - 350 - (1 - k) * 30, 10 + (1 - k) * 18], [hx + 110, W - 360 - (1 - k) * 40, 8 + (1 - k) * 14]], C.paper, 2);
    }

    // Sidewheel: the wheel turns behind a sunburst paddle box.
    const wx = bx - 450;
    const wy = W - 30;
    const R = 92;
    ctx.save();
    ctx.beginPath();
    ctx.arc(wx, wy, R + 6, 0, TAU);
    ctx.clip();
    ctx.fillStyle = C.charcoal;
    ctx.fillRect(wx - R - 6, wy - R - 6, 2 * R + 12, 2 * R + 12);
    for (let i = 0; i < 10; i++) {
      const a = this.wheel + (i * TAU) / 10;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      ctx.strokeStyle = C.ash;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(wx, wy);
      ctx.lineTo(wx + ca * R, wy + sa * R);
      ctx.stroke();
      ctx.save();
      ctx.translate(wx + ca * (R - 10), wy + sa * (R - 10));
      ctx.rotate(a);
      roundRect(ctx, -12, -9, 24, 18, 3);
      fillStroke(ctx, C.silver, 3);
      ctx.restore();
    }
    ctx.restore();
    // Paddle box covers the upper half.
    ctx.beginPath();
    ctx.moveTo(wx - R - 14, wy - 10);
    ctx.arc(wx, wy - 10, R + 14, Math.PI, 0);
    ctx.closePath();
    fillStroke(ctx, C.silver, 5);
    ctx.strokeStyle = C.ash;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 1; i < 10; i++) {
      const a = Math.PI + (i * Math.PI) / 10;
      ctx.moveTo(wx + Math.cos(a) * 30, wy - 10 + Math.sin(a) * 30);
      ctx.lineTo(wx + Math.cos(a) * (R + 6), wy - 10 + Math.sin(a) * (R + 6));
    }
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(wx, wy - 10, 28, Math.PI, 0);
    ctx.closePath();
    fillStroke(ctx, C.paper, 4);
    ctx.beginPath();
    ctx.arc(wx, wy - 10, 10, Math.PI, 0);
    ctx.closePath();
    fillStroke(ctx, C.ink, 2);

    // Foam at the bow and under the wheel.
    ctx.fillStyle = C.paper;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 6; i++) {
      const fx = wx - R + i * 36 + Math.sin(t * 9 + i) * 6;
      const fr = 12 + Math.sin(t * 11 + i * 2) * 4;
      ctx.beginPath();
      ctx.arc(fx, W + 4, fr, Math.PI, 0);
      ctx.fill();
      ctx.stroke();
    }
    for (let i = 0; i < 3; i++) {
      const fr = 10 + i * 6 + Math.sin(t * 8 + i) * 3;
      ctx.beginPath();
      ctx.arc(bx - 30 - i * 26, W + 2, fr, Math.PI, 0);
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
