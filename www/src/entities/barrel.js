// Barrels float and bob on a sine wave. Solid on top. A whistle pops them.
import { PALETTE as C } from "../art/palette.js";
import { rng, cached, pen, hatch, woodGrain } from "../art/ink.js";

export class Barrel {
  constructor(o) {
    this.type = "barrel";
    this.baseX = o.x;
    this.baseY = o.y ?? 540;
    this.x = o.x;
    this.y = this.baseY;
    this.w = o.w ?? 66;
    this.h = 90;
    this.bob = o.bob ?? 12;
    this.phase = o.phase ?? (o.x * 0.013) % (Math.PI * 2);
    this.freq = o.freq ?? 2.4;
    this.solid = "top";
    this.safe = false;
    this.popped = false;
    this.dx = 0;
    this.dy = 0;
  }

  update(dt, g) {
    if (this.popped) return;
    const ny = this.baseY + Math.sin(g.time * this.freq + this.phase) * this.bob;
    this.dy = ny - this.y;
    this.y = ny;
  }

  pop(g) {
    if (this.popped) return;
    this.popped = true;
    this.solid = null;
    g.fx.splinters(this.x + this.w / 2, this.y + 20);
    g.fx.splash(this.x + this.w / 2, 0.6);
  }

  draw(ctx, g) {
    if (this.popped) return;
    const { x, y, w, h } = this;
    const tilt = Math.sin(g.time * this.freq + this.phase + 1) * 0.05;
    const spr = cached(`barrel:${w}:${this.baseX % 3}`, w + 24, h + 20, (c) => paintBarrel(c, w, h, this.baseX));
    ctx.save();
    ctx.translate(x + w / 2, y);
    ctx.rotate(tilt);
    ctx.drawImage(spr.canvas, -w / 2 - 12, -12, spr.w, spr.h);
    ctx.restore();
  }
}

function paintBarrel(ctx, w, h, seed) {
  const r = rng(seed);
  ctx.translate(w / 2 + 12, 12);
  const hw = w / 2;
  const body = new Path2D();
  body.moveTo(-hw + 4, 4);
  body.bezierCurveTo(-hw - 8, h * 0.35, -hw - 8, h * 0.65, -hw + 4, h);
  body.lineTo(hw - 4, h);
  body.bezierCurveTo(hw + 8, h * 0.65, hw + 8, h * 0.35, hw - 4, 4);
  body.closePath();
  ctx.fillStyle = C.silver;
  ctx.fill(body);
  ctx.save();
  ctx.clip(body);
  // Curved staves with grain.
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  for (let k = -2; k <= 2; k++) {
    const sx = (k * hw) / 2.6;
    ctx.moveTo(sx, 0);
    ctx.quadraticCurveTo(sx * 1.3, h / 2, sx, h);
  }
  ctx.stroke();
  ctx.strokeStyle = C.ash;
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  for (let i = 0; i < 14; i++) {
    const sx = r.range(-hw, hw);
    const y0 = r.range(4, h * 0.6);
    ctx.moveTo(sx, y0);
    ctx.quadraticCurveTo(sx * 1.2, y0 + 12, sx + r.range(-1, 1), y0 + r.range(14, 30));
  }
  ctx.stroke();
  // Round shading: hatch the right third, cross-hatch the edge.
  ctx.beginPath();
  ctx.rect(hw * 0.25, 0, hw, h);
  ctx.clip();
  hatch(ctx, -hw, 0, w + 10, h, r, { gap: 3, lw: 1, color: C.slate, angle: 1.35 });
  ctx.restore();
  ctx.save();
  ctx.clip(body);
  ctx.beginPath();
  ctx.rect(hw * 0.65, 0, hw, h);
  ctx.clip();
  hatch(ctx, -hw, 0, w + 10, h, r, { gap: 3, lw: 1, color: C.slate, angle: -0.6 });
  ctx.restore();
  // Paper highlight on the left.
  ctx.save();
  ctx.clip(body);
  ctx.fillStyle = C.paper;
  ctx.beginPath();
  ctx.ellipse(-hw * 0.55, h * 0.5, 4, h * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();
  // Iron hoops with rivets.
  for (const hy of [h * 0.18, h * 0.72]) {
    ctx.fillStyle = C.charcoal;
    ctx.beginPath();
    ctx.moveTo(-hw - 10, hy);
    ctx.quadraticCurveTo(0, hy + 4, hw + 10, hy);
    ctx.lineTo(hw + 10, hy + 9);
    ctx.quadraticCurveTo(0, hy + 13, -hw - 10, hy + 9);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = C.ash;
    for (let k = -2; k <= 2; k++) {
      ctx.beginPath();
      ctx.arc((k * hw) / 2.5, hy + 5 + 2, 1.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
  pen(ctx, [[-hw + 4, 4], [-hw - 6, h * 0.35], [-hw - 6, h * 0.65], [-hw + 4, h]], r, { w: 3.5, color: C.ink, amp: 0.5 });
  pen(ctx, [[hw - 4, 4], [hw + 6, h * 0.35], [hw + 6, h * 0.65], [hw - 4, h]], r, { w: 3.5, color: C.ink, amp: 0.5 });
  // Lid with a bung hole.
  ctx.beginPath();
  ctx.ellipse(0, 4, hw - 3, 8, 0, 0, Math.PI * 2);
  ctx.fillStyle = C.paper;
  ctx.fill();
  ctx.save();
  ctx.clip();
  woodGrain(ctx, -hw, -3, w, 14, r, C.silver);
  ctx.restore();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, 4, hw - 12, 4, 0, 0, Math.PI * 2);
  ctx.strokeStyle = C.ash;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = C.ink;
  ctx.beginPath();
  ctx.ellipse(hw * 0.35, 4, 3, 1.6, 0, 0, Math.PI * 2);
  ctx.fill();
}
