// Musical notes: collectibles floating in arcs.
import { noteGlyph } from "../art/draw.js";

export class Note {
  constructor(o) {
    this.type = "note";
    this.x = o.x;
    this.y = o.y;
    this.collected = false;
    this.phase = (o.x * 0.021) % (Math.PI * 2);
  }

  update() {}

  draw(ctx, g) {
    if (this.collected) return;
    const bob = Math.sin(g.time * 3 + this.phase) * 4;
    const s = 30 * (1 + g.beat * 0.12);
    ctx.save();
    ctx.translate(this.x, this.y + bob);
    ctx.rotate(Math.sin(g.time * 2 + this.phase) * 0.15);
    noteGlyph(ctx, 0, 0, s);
    ctx.restore();
  }
}
