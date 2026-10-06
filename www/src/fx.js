// Particles and pop-up text in world space.
import { PALETTE as C, SERIF } from "./art/palette.js";
import { TAU, noteGlyph, roundRect } from "./art/draw.js";
import { CONFIG } from "./config.js";

export class FX {
  constructor() {
    this.parts = [];
    this.pops = [];
    this.rings = [];
  }

  reset() {
    this.parts = [];
    this.pops = [];
    this.rings = [];
  }

  splash(x, size = 1) {
    for (let i = 0; i < 16 * size; i++) {
      this.parts.push({
        kind: "drop", x: x + (Math.random() - 0.5) * 40, y: CONFIG.waterY,
        vx: (Math.random() - 0.5) * 260, vy: -250 - Math.random() * 420 * size,
        r: 4 + Math.random() * 6, life: 0, max: 0.9, g: 1400,
      });
    }
    this.rings.push({ x, y: CONFIG.waterY + 6, r: 10, life: 0, max: 0.7, kind: "ripple" });
  }

  splinters(x, y, quiet = false) {
    for (let i = 0; i < 14; i++) {
      this.parts.push({
        kind: "splinter", x, y, vx: (Math.random() - 0.5) * 520, vy: -200 - Math.random() * 380,
        r: 6 + Math.random() * 10, rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 20,
        life: 0, max: 1.1, g: 1500,
      });
    }
    if (!quiet) this.pop(x, y - 30, "POP!");
  }

  debris(x, y) {
    for (let i = 0; i < 16; i++) {
      this.parts.push({
        kind: "rock", x: x + (Math.random() - 0.5) * 60, y, vx: (Math.random() - 0.5) * 360, vy: -150 - Math.random() * 300,
        r: 4 + Math.random() * 8, rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 12, life: 0, max: 1.2, g: 1600,
      });
    }
    this.dust(x, y);
  }

  shockwave(x, y) {
    this.rings.push({ x, y, r: 20, life: 0, max: 0.6, kind: "shock" });
    this.rings.push({ x, y, r: 10, life: -0.08, max: 0.6, kind: "shock" });
  }

  bubble(x, y) {
    this.rings.push({ x, y, r: 60, life: 0, max: 0.9, kind: "bubble" });
  }

  glideTrail(x, y) {
    if (Math.random() < 0.3) this.parts.push({ kind: "dust", x: x - 20, y, vx: -60, vy: 20, r: 3, life: 0, max: 0.5, g: 0 });
  }

  dust(x, y) {
    for (let i = 0; i < 6; i++) {
      this.parts.push({
        kind: "dust", x: x + (Math.random() - 0.5) * 30, y: y - 4, vx: (Math.random() - 0.5) * 140, vy: -30 - Math.random() * 50,
        r: 4 + Math.random() * 4, life: 0, max: 0.4, g: 0,
      });
    }
  }

  sparkle(x, y) {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      this.parts.push({ kind: "spark", x, y, vx: Math.cos(a) * 180, vy: Math.sin(a) * 180, r: 4, life: 0, max: 0.35, g: 0 });
    }
  }

  whistle(x, y) {
    this.rings.push({ x, y, r: 12, life: 0, max: 0.55, kind: "whistle" });
    for (let i = 0; i < 3; i++) {
      this.parts.push({ kind: "note", x, y, vx: 120 + i * 60, vy: -120 - i * 50, r: 18, rot: 0, vr: 2, life: -i * 0.06, max: 0.9, g: 0 });
    }
  }

  pop(x, y, text) {
    this.pops.push({ x, y, text, life: 0, max: 0.9 });
  }

  update(dt) {
    for (const p of this.parts) {
      p.life += dt;
      if (p.life < 0) continue;
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.vr) p.rot += p.vr * dt;
    }
    this.parts = this.parts.filter((p) => p.life < p.max && !(p.kind === "drop" && p.y > CONFIG.waterY + 30 && p.vy > 0));
    for (const r of this.rings) r.life += dt;
    this.rings = this.rings.filter((r) => r.life < r.max);
    for (const p of this.pops) p.life += dt;
    this.pops = this.pops.filter((p) => p.life < p.max);
  }

  draw(ctx) {
    for (const r of this.rings) {
      if (r.life < 0) continue;
      const k = r.life / r.max;
      if (r.kind === "shock" || r.kind === "bubble") {
        ctx.globalAlpha = 1 - k;
        ctx.strokeStyle = r.kind === "shock" ? C.ink : C.paper;
        ctx.lineWidth = r.kind === "shock" ? 5 : 4;
        ctx.beginPath();
        if (r.kind === "shock") ctx.ellipse(r.x, r.y, r.r + k * 520, 20 + k * 90, 0, 0, TAU);
        else ctx.arc(r.x, r.y - k * 40, r.r * (0.8 + k * 0.4), 0, TAU);
        ctx.stroke();
        continue;
      }
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = r.kind === "whistle" ? C.ink : C.paper;
      ctx.lineWidth = r.kind === "whistle" ? 4 : 3;
      ctx.beginPath();
      if (r.kind === "whistle") {
        for (let i = 0; i < 3; i++) {
          const rr = r.r + k * 260 - i * 40;
          if (rr > 0) {
            ctx.moveTo(r.x + Math.cos(-0.6) * rr, r.y + Math.sin(-0.6) * rr);
            ctx.arc(r.x, r.y, rr, -0.6, 0.6);
          }
        }
      } else {
        ctx.ellipse(r.x, r.y, r.r + k * 70, 6 + k * 8, 0, 0, TAU);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (const p of this.parts) {
      if (p.life < 0) continue;
      const a = 1 - p.life / p.max;
      ctx.globalAlpha = Math.min(1, a * 1.5);
      if (p.kind === "drop") {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, TAU);
        ctx.fillStyle = C.paper;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = C.ink;
        ctx.stroke();
      } else if (p.kind === "rock") {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.beginPath();
        ctx.moveTo(-p.r, 0);
        ctx.lineTo(-p.r * 0.3, -p.r * 0.8);
        ctx.lineTo(p.r * 0.8, -p.r * 0.4);
        ctx.lineTo(p.r * 0.6, p.r * 0.6);
        ctx.closePath();
        ctx.fillStyle = C.ash;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = C.ink;
        ctx.stroke();
        ctx.restore();
      } else if (p.kind === "splinter") {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        roundRect(ctx, -p.r, -3, p.r * 2, 6, 2);
        ctx.fillStyle = C.silver;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = C.ink;
        ctx.stroke();
        ctx.restore();
      } else if (p.kind === "dust") {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * (1 + p.life * 3), 0, TAU);
        ctx.fillStyle = C.paper;
        ctx.fill();
      } else if (p.kind === "spark") {
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04);
        ctx.stroke();
      } else if (p.kind === "note") {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(Math.sin(p.life * 10) * 0.3);
        noteGlyph(ctx, 0, 0, p.r);
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
    for (const p of this.pops) {
      const k = p.life / p.max;
      ctx.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
      const y = p.y - k * 50;
      ctx.font = `bold 26px ${SERIF}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineWidth = 6;
      ctx.lineJoin = "round";
      ctx.strokeStyle = C.paper;
      ctx.strokeText(p.text, p.x, y);
      ctx.fillStyle = C.ink;
      ctx.fillText(p.text, p.x, y);
    }
    ctx.globalAlpha = 1;
  }
}
