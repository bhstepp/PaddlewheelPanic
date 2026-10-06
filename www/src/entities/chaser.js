// Base class for the Captain's zone vehicles (the river steamboat has its
// own class). Handles sliding in from the left with the Captain meter,
// smoke, toots and knock-backs; subclasses paint the vehicle.
import { PALETTE as C } from "../art/palette.js";
import { puff } from "../art/draw.js";
import { CONFIG } from "../config.js";

const TAU = Math.PI * 2;

export class Chaser {
  constructor() {
    this.wheel = 0;
    this.reset();
  }

  reset() {
    this.bow = CONFIG.boatBowMin;
    this.smoke = [];
    this.smokeT = 0;
    this.tootT = 0;
    this.extra = 0;
    this.knockT = 0;
  }

  toot() {
    this.tootT = 0.7;
  }

  knock() {
    this.knockT = 1;
  }

  // Points (relative to the bow, y relative to the ground line) that puff smoke.
  smokeOrigins() {
    return [];
  }

  update(dt, meter, time, beat) {
    const target =
      CONFIG.boatBowMin + (CONFIG.boatBowMax - CONFIG.boatBowMin) * Math.min(1, meter / 100) + this.extra - this.knockT * 260;
    this.knockT = Math.max(0, this.knockT - dt * 0.7);
    this.bow += (target - this.bow) * Math.min(1, dt * 3);
    this.wheel += dt * 9;
    this.tootT = Math.max(0, this.tootT - dt);
    this.smokeT -= dt;
    if (this.smokeT <= 0) {
      this.smokeT = 0.16;
      for (const [sx, sy] of this.smokeOrigins()) {
        this.smoke.push({ x: this.bow + sx, y: CONFIG.waterY + sy, r: 10 + beat * 6, life: 0, vx: -70 - Math.random() * 40, vy: -50 - Math.random() * 20 });
      }
    }
    for (const p of this.smoke) {
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.r += dt * 16;
    }
    this.smoke = this.smoke.filter((p) => p.life < 2 && p.y > -80);
  }

  draw(ctx, g) {
    for (const p of this.smoke) {
      ctx.globalAlpha = Math.max(0, 1 - p.life / 2) * 0.85;
      puff(ctx, [[p.x, p.y, p.r], [p.x + p.r * 0.7, p.y + p.r * 0.2, p.r * 0.7]], this.smokeColor?.(p) ?? (p.life < 0.6 ? C.slate : C.ash), 1.5);
    }
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.translate(this.bow, CONFIG.waterY + Math.sin(g.time * 9) * 1.5);
    this.paint(ctx, g);
    ctx.restore();
  }
}

// The Captain as a dark silhouette: broad shoulders, peaked cap, pipe.
export function captain(ctx, x, y, t, s = 1) {
  const sway = Math.sin(t * Math.PI * 2) * 2;
  ctx.save();
  ctx.translate(x + sway, y);
  ctx.scale(s, s);
  ctx.fillStyle = C.ink;
  ctx.beginPath();
  ctx.ellipse(0, 6, 40, 22, 0, Math.PI, 0);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(2, -22, 17, 16, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(17, -18, 8, 6, 0.2, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-16, -30);
  ctx.lineTo(-12, -46);
  ctx.lineTo(18, -44);
  ctx.lineTo(22, -33);
  ctx.lineTo(34, -30);
  ctx.lineTo(18, -28);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(22, -14);
  ctx.lineTo(34, -10);
  ctx.stroke();
  ctx.fillRect(31, -18, 7, 9);
  ctx.fillStyle = C.paper;
  ctx.beginPath();
  ctx.ellipse(11, -26, 3, 1.6, -0.3, 0, TAU);
  ctx.fill();
  ctx.restore();
}
