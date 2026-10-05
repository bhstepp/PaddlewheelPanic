// Crates: solid boxes; stack them to make steps.
import { PALETTE as C, SERIF } from "../art/palette.js";
import { rng, cached, pen, hatch, woodGrain } from "../art/ink.js";

const LABELS = ["COTTON", "MOLASSES", "N.O. LA.", "FRAGILE", "SUGAR", "THIS SIDE UP"];

export class Crate {
  constructor(o) {
    this.type = "crate";
    this.x = o.x;
    this.y = o.y - (o.h ?? 80); // level data gives the bottom (what it rests on)
    this.w = o.w ?? 80;
    this.h = o.h ?? 80;
    this.solid = "full";
    this.safe = true;
    this.dx = 0;
    this.dy = 0;
  }

  update() {}

  draw(ctx) {
    const spr = cached(`crate:${this.x}:${this.y}`, this.w + 8, this.h + 8, (c) => paintCrate(c, this.w, this.h, this.x * 7 + this.y));
    ctx.drawImage(spr.canvas, this.x - 4, this.y - 4, spr.w, spr.h);
  }
}

function paintCrate(ctx, w, h, seed) {
  const r = rng(seed);
  ctx.translate(4, 4);
  // Horizontal boards with gaps.
  const boards = Math.max(3, Math.round(h / 22));
  const bh = h / boards;
  for (let i = 0; i < boards; i++) {
    const y = i * bh;
    ctx.fillStyle = i % 2 ? C.silver : C.paper;
    ctx.fillRect(0, y, w, bh);
    woodGrain(ctx, 0, y + 2, w, bh - 4, r, C.ash);
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, y + bh);
    ctx.lineTo(w, y + bh + r.range(-0.6, 0.6));
    ctx.stroke();
  }
  // Shadow on the right side.
  ctx.save();
  ctx.beginPath();
  ctx.rect(w * 0.62, 0, w * 0.38, h);
  ctx.clip();
  hatch(ctx, 0, 0, w, h, r, { gap: 3.2, lw: 0.9, color: C.ash, angle: 1.1 });
  ctx.restore();
  // Stencilled label.
  if (r() < 0.75 && w >= 70) {
    const label = r.pick(LABELS);
    ctx.save();
    ctx.translate(w / 2, h / 2 + 2);
    ctx.rotate(r.range(-0.06, 0.06));
    ctx.font = `bold ${label.length > 8 ? 9 : 11}px ${SERIF}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = C.slate;
    ctx.fillText(label, 0, 0);
    ctx.restore();
  }
  // Frame boards and a diagonal brace.
  const f = 9;
  ctx.fillStyle = C.ash;
  ctx.fillRect(0, 0, f, h);
  ctx.fillRect(w - f, 0, f, h);
  ctx.fillRect(0, 0, w, f);
  ctx.fillRect(0, h - f, w, f);
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 1.4;
  ctx.strokeRect(f, f, w - 2 * f, h - 2 * f);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(f, h - f - 9);
  ctx.lineTo(w - f - 9, f);
  ctx.lineTo(w - f, f);
  ctx.lineTo(w - f, f + 9);
  ctx.lineTo(f + 9, h - f);
  ctx.lineTo(f, h - f);
  ctx.closePath();
  ctx.fillStyle = C.ash;
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  // Nails.
  ctx.fillStyle = C.ink;
  for (const [nx, ny] of [[4.5, 4.5], [w - 4.5, 4.5], [4.5, h - 4.5], [w - 4.5, h - 4.5], [w / 2, 4.5], [w / 2, h - 4.5]]) {
    ctx.beginPath();
    ctx.arc(nx, ny, 1.7, 0, Math.PI * 2);
    ctx.fill();
  }
  pen(ctx, [[0, 0], [w, 0], [w, h], [0, h], [0, 0]], r, { w: 4, color: C.ink, amp: 0.7 });
}
