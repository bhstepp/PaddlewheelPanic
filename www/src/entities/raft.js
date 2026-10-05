// Rafts drift slowly up and down the river current.
import { PALETTE as C } from "../art/palette.js";
import { roundRect, fillStroke } from "../art/draw.js";

export class Raft {
  constructor(o) {
    this.type = "raft";
    this.baseX = o.x;
    this.x = o.x;
    this.y = o.y ?? 570;
    this.baseY = this.y;
    this.w = o.w ?? 170;
    this.h = 40;
    this.drift = o.drift ?? 36;
    this.phase = o.phase ?? 0;
    this.speed = o.speed ?? 0.9;
    this.solid = "top";
    this.safe = false;
    this.dx = 0;
    this.dy = 0;
  }

  update(dt, g) {
    const nx = this.baseX + Math.sin(g.time * this.speed + this.phase) * this.drift;
    const ny = this.baseY + Math.sin(g.time * 2.1 + this.phase) * 2.5;
    this.dx = nx - this.x;
    this.dy = ny - this.y;
    this.x = nx;
    this.y = ny;
  }

  draw(ctx) {
    const { x, y, w } = this;
    // Two rows of logs seen from the side; front logs end in round cut faces.
    roundRect(ctx, x + 4, y + 8, w - 8, 24, 12);
    fillStroke(ctx, C.ash, 4);
    roundRect(ctx, x, y, w, 22, 11);
    fillStroke(ctx, C.silver, 5);
    ctx.strokeStyle = C.ash;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 16, y + 11);
    ctx.lineTo(x + w * 0.45, y + 11);
    ctx.moveTo(x + w * 0.55, y + 8);
    ctx.lineTo(x + w - 18, y + 8);
    ctx.stroke();
    for (const ex of [x + 11, x + w - 11]) {
      ctx.beginPath();
      ctx.arc(ex, y + 11, 9, 0, Math.PI * 2);
      fillStroke(ctx, C.paper, 3);
      ctx.beginPath();
      ctx.arc(ex, y + 11, 4, 0, Math.PI * 2);
      ctx.strokeStyle = C.ash;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    // Rope lashings.
    ctx.strokeStyle = C.charcoal;
    ctx.lineWidth = 4;
    for (const lx of [x + w * 0.3, x + w * 0.7]) {
      ctx.beginPath();
      ctx.moveTo(lx - 4, y - 1);
      ctx.lineTo(lx + 4, y + 30);
      ctx.moveTo(lx + 4, y - 1);
      ctx.lineTo(lx - 4, y + 30);
      ctx.stroke();
    }
  }
}
