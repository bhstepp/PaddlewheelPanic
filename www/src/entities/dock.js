// Docks: long, solid, safe. The landing dock carries the flag post.
import { PALETTE as C, SERIF } from "../art/palette.js";
import { roundRect, fillStroke } from "../art/draw.js";
import { CONFIG } from "../config.js";
import { rng, cached, pen, brush, hatch, woodGrain } from "../art/ink.js";


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
    const sh = water + 60 - y + 6;
    const spr = cached(`dock:${x}:${w}`, w + 12, sh, (c) => paintDock(c, w, water - y, x));
    ctx.drawImage(spr.canvas, x - 6, y - 6, spr.w, spr.h);
    // Mooring posts at each end bounce on the beat.
    for (const px of [x + 16, x + w - 16]) {
      const s = 1 + g.beat * 0.12;
      ctx.save();
      ctx.translate(px, y);
      ctx.scale(1 / Math.sqrt(s), s);
      roundRect(ctx, -8, -26, 16, 28, 6);
      fillStroke(ctx, C.charcoal, 3.5);
      ctx.strokeStyle = C.ash;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-8, -12);
      ctx.lineTo(8, -16);
      ctx.moveTo(-8, -7);
      ctx.lineTo(8, -11);
      ctx.stroke();
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

// Paint a dock once: pilings, cross-bracing, and a weathered plank deck.
// Local coordinates: deck top at y = 6, x offset 6.
function paintDock(ctx, w, waterDepth, seed) {
  const r = rng(seed + 17);
  const ox = 6;
  const top = 6;
  const bottom = top + waterDepth + 54;
  const n = Math.max(2, Math.round(w / 120) + 1);
  const posts = [];
  for (let i = 0; i < n; i++) posts.push(ox + 14 + ((w - 28) * i) / (n - 1));

  // Cross-bracing between pilings.
  for (let i = 0; i < posts.length - 1; i++) {
    const a = posts[i];
    const b = posts[i + 1];
    for (const [x0, y0, x1, y1] of [[a, top + 26, b, top + 70], [a, top + 70, b, top + 26]]) {
      brush(ctx, [[x0, y0], [x1, y1]], r, { w: 7, color: C.ink, taper: 0.1 });
      brush(ctx, [[x0, y0], [x1, y1]], r, { w: 4, color: C.ash, taper: 0.1 });
    }
  }
  // Pilings: round logs with bark hatching, rope wraps and a waterline stain.
  for (const px of posts) {
    const pw = 18;
    ctx.fillStyle = C.charcoal;
    ctx.fillRect(px - pw / 2, top + 18, pw, bottom - top - 18);
    ctx.save();
    ctx.beginPath();
    ctx.rect(px - pw / 2, top + 18, pw, bottom - top - 18);
    ctx.clip();
    ctx.strokeStyle = C.slate;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let k = 0; k < 4; k++) {
      const lx = px - 6 + k * 4 + r.range(-1, 1);
      ctx.moveTo(lx, top + 20);
      ctx.lineTo(lx + r.range(-1, 1), bottom);
    }
    ctx.stroke();
    ctx.fillStyle = C.ink;
    ctx.fillRect(px + 2, top + 18, pw / 2 - 2, bottom - top - 18);
    ctx.restore();
    pen(ctx, [[px - pw / 2, top + 18], [px - pw / 2, bottom]], r, { w: 2.5, color: C.ink, amp: 0.6 });
    pen(ctx, [[px + pw / 2, top + 18], [px + pw / 2, bottom]], r, { w: 2.5, color: C.ink, amp: 0.6 });
    // Rope wrap.
    ctx.strokeStyle = C.silver;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let k = 0; k < 4; k++) {
      ctx.moveTo(px - pw / 2, top + 40 + k * 4);
      ctx.lineTo(px + pw / 2, top + 36 + k * 4);
    }
    ctx.stroke();
    // Barnacles near the waterline.
    ctx.fillStyle = C.ash;
    for (let k = 0; k < 6; k++) {
      ctx.beginPath();
      ctx.arc(px + r.range(-7, 7), top + waterDepth - r.range(0, 12), r.range(1, 2.4), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Under-deck shadow beam.
  ctx.fillStyle = C.charcoal;
  ctx.fillRect(ox + 4, top + 20, w - 8, 9);

  // Deck fascia: a long weathered board with grain, plank seams and nails.
  const deck = new Path2D();
  deck.rect(ox, top, w, 22);
  ctx.fillStyle = C.silver;
  ctx.fill(deck);
  ctx.save();
  ctx.clip(deck);
  woodGrain(ctx, ox, top + 4, w, 16, r, C.ash);
  ctx.fillStyle = C.paper;
  ctx.fillRect(ox, top, w, 4);
  hatch(ctx, ox, top + 14, w, 8, r, { gap: 3, lw: 0.9, color: C.ash, angle: 0.25, density: 0.8 });
  ctx.restore();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (let bx = ox + r.range(30, 60); bx < ox + w - 20; bx += r.range(46, 90)) {
    ctx.moveTo(bx, top + 3);
    ctx.lineTo(bx + r.range(-1, 1), top + 21);
  }
  ctx.stroke();
  ctx.fillStyle = C.ink;
  for (let bx = ox + 10; bx < ox + w - 6; bx += 23) {
    ctx.beginPath();
    ctx.arc(bx + r.range(-2, 2), top + 8, 1.4, 0, Math.PI * 2);
    ctx.arc(bx + r.range(-2, 2), top + 16, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
  pen(ctx, [[ox, top], [ox + w, top], [ox + w, top + 22], [ox, top + 22], [ox, top]], r, { w: 3.5, color: C.ink, amp: 0.7 });
}
