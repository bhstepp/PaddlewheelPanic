// Barrels float and bob on a sine wave. Solid on top. A whistle pops them.
import { PALETTE as C } from "../art/palette.js";
import { fillStroke } from "../art/draw.js";

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
    ctx.save();
    ctx.translate(x + w / 2, y);
    ctx.rotate(tilt);
    const hw = w / 2;
    // Bulging staves.
    ctx.beginPath();
    ctx.moveTo(-hw + 4, 4);
    ctx.bezierCurveTo(-hw - 8, h * 0.35, -hw - 8, h * 0.65, -hw + 4, h);
    ctx.lineTo(hw - 4, h);
    ctx.bezierCurveTo(hw + 8, h * 0.65, hw + 8, h * 0.35, hw - 4, 4);
    ctx.closePath();
    fillStroke(ctx, C.silver, 5);
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = C.ash;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (const sx of [-hw * 0.5, 0, hw * 0.5]) {
      ctx.moveTo(sx, 0);
      ctx.quadraticCurveTo(sx * 1.25, h / 2, sx, h);
    }
    ctx.stroke();
    // Iron hoops.
    ctx.fillStyle = C.charcoal;
    for (const hy of [h * 0.22, h * 0.7]) {
      ctx.fillRect(-hw - 10, hy, w + 20, 9);
    }
    ctx.fillStyle = C.paper;
    ctx.globalAlpha = 0.7;
    ctx.fillRect(-hw * 0.7, 8, 5, h - 16);
    ctx.globalAlpha = 1;
    ctx.restore();
    // Lid.
    ctx.beginPath();
    ctx.ellipse(0, 4, hw - 4, 8, 0, 0, Math.PI * 2);
    fillStroke(ctx, C.paper, 4);
    ctx.beginPath();
    ctx.ellipse(0, 4, hw - 14, 4, 0, 0, Math.PI * 2);
    ctx.strokeStyle = C.ash;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
}
