// River critters: small black round creatures with white eyes.
// Touching one hurts; a whistle flips them over for a couple of seconds,
// and a flipped critter makes a springy bounce pad.
import { PALETTE as C } from "../art/palette.js";
import { TAU, star } from "../art/draw.js";
import { CONFIG } from "../config.js";

export class Critter {
  constructor(o) {
    this.type = "critter";
    this.x = o.x;
    this.groundY = o.y;
    this.r = CONFIG.critterRadius;
    this.stun = 0;
    this.squish = 0;
    this.hop = 0;
  }

  get cy() {
    return this.groundY - this.r - this.hop;
  }

  update(dt, g) {
    if (this.stun > 0) this.stun = Math.max(0, this.stun - dt);
    this.squish = Math.max(0, this.squish - dt * 4);
    // Little hop on every beat while awake.
    this.hop = this.stun > 0 ? 0 : Math.max(0, Math.sin(g.beatPhase * Math.PI)) * 6;
  }

  whistled() {
    this.stun = CONFIG.critterStun;
  }

  draw(ctx, g) {
    const r = this.r;
    const x = this.x;
    const cy = this.cy;
    const stunned = this.stun > 0;
    ctx.save();
    ctx.translate(x, cy);
    const s = 1 - this.squish * 0.35;
    ctx.scale(1 / s, s);
    if (stunned) ctx.rotate(Math.PI);
    ctx.lineCap = "round";

    // Feet (kicking when flipped).
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 4;
    const kick = stunned ? Math.sin(g.time * 24) * 5 : 0;
    ctx.beginPath();
    ctx.moveTo(-8, r - 4);
    ctx.lineTo(-12 + kick, r + 6);
    ctx.moveTo(8, r - 4);
    ctx.lineTo(12 - kick, r + 6);
    ctx.stroke();
    ctx.fillStyle = C.ink;
    for (const fx of [-14 + kick, 14 - kick]) {
      ctx.beginPath();
      ctx.ellipse(fx, r + 7, 6, 3.5, 0, 0, TAU);
      ctx.fill();
    }
    // Pointy ears and a curly antenna.
    ctx.beginPath();
    ctx.moveTo(-r * 0.8, -r * 0.4);
    ctx.lineTo(-r * 0.75, -r * 1.25);
    ctx.lineTo(-r * 0.2, -r * 0.85);
    ctx.moveTo(r * 0.8, -r * 0.4);
    ctx.lineTo(r * 0.75, -r * 1.25);
    ctx.lineTo(r * 0.2, -r * 0.85);
    ctx.fill();
    // Body.
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = C.slate;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-4, -4, r * 0.7, 3.6, 4.4);
    ctx.stroke();

    // Eyes.
    if (stunned) {
      ctx.strokeStyle = C.paper;
      ctx.lineWidth = 2.5;
      for (const ex of [-7, 7]) {
        ctx.beginPath();
        ctx.moveTo(ex - 4, -2 - 4);
        ctx.lineTo(ex + 4, -2 + 4);
        ctx.moveTo(ex + 4, -2 - 4);
        ctx.lineTo(ex - 4, -2 + 4);
        ctx.stroke();
      }
    } else {
      // Big white eyes looking at the hero, with angry brows.
      for (const ex of [-6.5, 7.5]) {
        ctx.fillStyle = C.paper;
        ctx.beginPath();
        ctx.ellipse(ex, -3, 5.5, 7, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = C.ink;
        ctx.beginPath();
        ctx.ellipse(ex - 2, -1, 2.6, 3.6, 0, 0, TAU);
        ctx.fill();
      }
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-13, -12);
      ctx.lineTo(-2, -8);
      ctx.moveTo(14, -12);
      ctx.lineTo(3, -8);
      ctx.stroke();
      // Toothy grin.
      ctx.fillStyle = C.paper;
      ctx.beginPath();
      ctx.moveTo(-8, 8);
      ctx.quadraticCurveTo(0, 15, 8, 8);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Dizzy stars circling a stunned critter.
    if (stunned) {
      for (let i = 0; i < 3; i++) {
        const a = g.time * 5 + (i * TAU) / 3;
        star(ctx, x + Math.cos(a) * 22, cy - r - 10 + Math.sin(a) * 6, 6, true, 2);
      }
    }
  }
}
