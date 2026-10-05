// Docks: long, solid, safe. The landing dock carries the flag post.
import { PALETTE as C, SERIF } from "../art/palette.js";
import { roundRect, fillStroke } from "../art/draw.js";
import { CONFIG } from "../config.js";

const DECK = 22;

export class Dock {
  constructor(o) {
    this.type = "dock";
    this.x = o.x;
    this.y = o.y;
    this.w = o.w;
    this.h = CONFIG.height - o.y;
    this.solid = "full";
    this.safe = true;
    this.landing = !!o.landing;
    this.dx = 0;
    this.dy = 0;
  }

  update() {}

  draw(ctx, g) {
    const { x, y, w } = this;
    const water = CONFIG.waterY;
    // Pilings.
    const n = Math.max(2, Math.round(w / 130) + 1);
    for (let i = 0; i < n; i++) {
      const px = x + 14 + ((w - 28) * i) / (n - 1);
      roundRect(ctx, px - 9, y + DECK - 4, 18, water - y - DECK + 40, 5);
      fillStroke(ctx, C.charcoal, 4);
    }
    // Deck boards.
    roundRect(ctx, x, y, w, DECK, 6);
    fillStroke(ctx, C.silver, 5);
    ctx.strokeStyle = C.ash;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let bx = x + 38; bx < x + w - 10; bx += 38) {
      ctx.moveTo(bx, y + 5);
      ctx.lineTo(bx, y + DECK - 5);
    }
    ctx.stroke();
    ctx.strokeStyle = C.paper;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 8, y + 5);
    ctx.lineTo(x + w - 8, y + 5);
    ctx.stroke();
    // Mooring posts at each end bounce on the beat.
    for (const px of [x + 16, x + w - 16]) {
      const s = 1 + g.beat * 0.12;
      ctx.save();
      ctx.translate(px, y);
      ctx.scale(1 / Math.sqrt(s), s);
      roundRect(ctx, -8, -26, 16, 28, 6);
      fillStroke(ctx, C.charcoal, 4);
      ctx.beginPath();
      ctx.ellipse(0, -26, 10, 4, 0, 0, Math.PI * 2);
      fillStroke(ctx, C.ash, 3);
      ctx.restore();
    }
    if (this.landing) this.drawFlag(ctx, g);
  }

  drawFlag(ctx, g) {
    const fx = g.level.landing.x;
    const top = this.y - 230;
    // Sign board.
    ctx.save();
    ctx.translate(fx - 150, this.y - 98);
    ctx.rotate(-0.03);
    roundRect(ctx, -6, 30, 12, 70, 3);
    fillStroke(ctx, C.charcoal, 3);
    roundRect(ctx, -92, -16, 184, 54, 10);
    fillStroke(ctx, C.paper, 5);
    roundRect(ctx, -84, -9, 168, 40, 6);
    ctx.lineWidth = 2;
    ctx.strokeStyle = C.ink;
    ctx.stroke();
    ctx.fillStyle = C.ink;
    ctx.font = `bold 21px ${SERIF}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("THE LANDING", 0, 12);
    ctx.restore();
    // Pole.
    roundRect(ctx, fx - 6, top, 12, this.y - top + 2, 5);
    fillStroke(ctx, C.charcoal, 4);
    ctx.beginPath();
    ctx.arc(fx, top - 4, 10, 0, Math.PI * 2);
    fillStroke(ctx, C.paper, 4);
    // Waving pennant.
    const t = g.time;
    ctx.beginPath();
    ctx.moveTo(fx + 6, top + 8);
    for (let i = 0; i <= 10; i++) {
      const u = i / 10;
      ctx.lineTo(fx + 6 + u * 110, top + 8 + u * 30 + Math.sin(t * 6 - u * 5) * 8 * u);
    }
    for (let i = 10; i >= 0; i--) {
      const u = i / 10;
      ctx.lineTo(fx + 6 + u * 110, top + 68 - u * 30 + Math.sin(t * 6 - u * 5) * 8 * u);
    }
    ctx.closePath();
    fillStroke(ctx, C.paper, 4);
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    ctx.arc(fx + 40, top + 38 + Math.sin(t * 6 - 1.8) * 3, 9, 0, Math.PI * 2);
    ctx.fill();
  }
}
