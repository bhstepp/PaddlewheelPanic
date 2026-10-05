// Crates: solid boxes; stack them to make steps.
import { PALETTE as C } from "../art/palette.js";
import { roundRect, fillStroke } from "../art/draw.js";

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
    const { x, y, w, h } = this;
    roundRect(ctx, x, y, w, h, 6);
    fillStroke(ctx, C.silver, 5);
    // Frame boards.
    const b = 11;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2.5;
    roundRect(ctx, x + b, y + b, w - 2 * b, h - 2 * b, 3);
    ctx.stroke();
    // Diagonal brace.
    ctx.fillStyle = C.ash;
    ctx.beginPath();
    ctx.moveTo(x + b, y + h - b - 10);
    ctx.lineTo(x + w - b - 10, y + b);
    ctx.lineTo(x + w - b, y + b);
    ctx.lineTo(x + w - b, y + b + 10);
    ctx.lineTo(x + b + 10, y + h - b);
    ctx.lineTo(x + b, y + h - b);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Nails and a highlight.
    ctx.fillStyle = C.ink;
    for (const [nx, ny] of [[x + 6, y + 6], [x + w - 6, y + 6], [x + 6, y + h - 6], [x + w - 6, y + h - 6]]) {
      ctx.beginPath();
      ctx.arc(nx, ny, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = C.paper;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 6, y + 4);
    ctx.lineTo(x + w - 10, y + 4);
    ctx.stroke();
  }
}
