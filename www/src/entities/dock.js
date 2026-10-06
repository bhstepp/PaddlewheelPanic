// Docks: long, solid, safe. The landing dock carries the flag post.
import { PALETTE as C, SERIF } from "../art/palette.js";
import { roundRect, fillStroke } from "../art/draw.js";
import { CONFIG } from "../config.js";
import { rng, cached, plank, piling, rope, roughStroke } from "../art/ink.js";


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
    const sk = g.theme?.skins?.ledge;
    if (sk) {
      sk(ctx, this, g);
      if (this.landing) this.drawFlag(ctx, g);
      return;
    }
    const { x, y, w } = this;
    const water = CONFIG.waterY;
    const sh = water + 60 - y + 6;
    const spr = cached(`dock:${x}:${w}`, w + 12, sh, (c) => paintDock(c, w, water - y, x));
    ctx.drawImage(spr.canvas, x - 6, y - 6, spr.w, spr.h);
    // Mooring bollards at each end bounce on the beat.
    const bol = cached("dock:bollard", 40, 48, paintBollard);
    for (const px of [x + 16, x + w - 16]) {
      const s = 1 + g.beat * 0.1;
      ctx.save();
      ctx.translate(px, y + 4);
      ctx.scale(1 / Math.sqrt(s), s);
      ctx.drawImage(bol.canvas, -20, -44, 40, 48);
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
    ctx.fillText(g.theme?.landingSign ?? "THE LANDING", 0, 12);
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

// Paint a dock once: pilings, bracing, a shadowed underside, and a deck of
// weathered boards. Local coordinates: deck top at y = 6, x offset 6.
function paintDock(ctx, w, waterDepth, seed) {
  const r = rng(seed + 17);
  const ox = 6;
  const top = 6;
  const water = top + waterDepth;
  const bottom = water + 54;
  const n = Math.max(2, Math.round(w / 110) + 1);
  const posts = [];
  for (let i = 0; i < n; i++) posts.push(ox + 14 + ((w - 28) * i) / (n - 1));

  // Deep shadow under the deck.
  const sh = ctx.createLinearGradient(0, top + 20, 0, water + 10);
  sh.addColorStop(0, "rgba(23,22,20,0.75)");
  sh.addColorStop(0.5, "rgba(23,22,20,0.35)");
  sh.addColorStop(1, "rgba(23,22,20,0.1)");
  ctx.fillStyle = sh;
  ctx.fillRect(ox + 2, top + 20, w - 4, water - top - 10);

  // Back row of pilings, smaller and darker for depth.
  for (let i = 0; i < posts.length - 1; i++) {
    const cx = (posts[i] + posts[i + 1]) / 2;
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = C.charcoal;
    ctx.fillRect(cx - 7, top + 22, 14, water - top - 18);
    ctx.globalAlpha = 1;
  }
  // Cross-bracing boards between the front pilings.
  for (let i = 0; i < posts.length - 1; i++) {
    const a = posts[i];
    const b = posts[i + 1];
    for (const [x0, y0, x1, y1] of [[a, top + 28, b, top + 66], [a, top + 66, b, top + 28]]) {
      const len = Math.hypot(x1 - x0, y1 - y0);
      ctx.save();
      ctx.translate(x0, y0);
      ctx.rotate(Math.atan2(y1 - y0, x1 - x0));
      plank(ctx, 0, -4, len, 8, r, { fill: C.ash, nails: false, line: 1.6 });
      ctx.restore();
    }
  }
  // Front pilings: round logs with rope, barnacles and a foam ring.
  for (const px of posts) {
    piling(ctx, px, top + 18, bottom, 22, r, { cap: false });
    if (r() < 0.55) {
      for (let k = 0; k < 3; k++) {
        const ry = top + 36 + k * 6;
        rope(ctx, [[px - 12, ry], [px, ry + 3], [px + 12, ry]], 4);
      }
    }
    ctx.fillStyle = C.ash;
    for (let k = 0; k < 9; k++) {
      ctx.beginPath();
      ctx.arc(px + r.range(-9, 9), water - r.range(-2, 14), r.range(1, 2.6), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = C.charcoal;
      ctx.lineWidth = 0.7;
      ctx.stroke();
    }
    // Dark waterline stain.
    ctx.fillStyle = "rgba(23,22,20,0.45)";
    ctx.fillRect(px - 11, water - 18, 22, 18);
    ctx.strokeStyle = C.paper;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(px, water + 4, 18, 4, 0, 0.15, Math.PI - 0.15);
    ctx.stroke();
  }

  // Stringer beam under the deck.
  plank(ctx, ox + 2, top + 22, w - 4, 8, r, { fill: C.slate, nails: false, line: 1.8 });

  // Deck top: board ends seen in slight perspective.
  ctx.fillStyle = C.silver;
  ctx.fillRect(ox, top, w, 6);
  ctx.strokeStyle = C.ash;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let bx = ox + r.range(8, 16); bx < ox + w - 4; bx += r.range(14, 22)) {
    ctx.moveTo(bx, top + 0.5);
    ctx.lineTo(bx - 1.5, top + 5.5);
  }
  ctx.stroke();
  // Front fascia: two rows of boards with staggered joints.
  for (const [y, hgt, fill] of [[top + 5, 9, C.ash], [top + 13, 10, C.slate]]) {
    let x = ox;
    while (x < ox + w - 1) {
      const bw = Math.min(ox + w - x, r.range(70, 190));
      plank(ctx, x, y, bw, hgt, r, { fill, line: 1.6 });
      x += bw;
    }
  }
  const outline = new Path2D();
  outline.rect(ox, top, w, 23);
  roughStroke(ctx, outline, 3.2);
}

function paintBollard(ctx) {
  const r = rng(5);
  piling(ctx, 20, 8, 44, 20, r);
  for (let k = 0; k < 3; k++) rope(ctx, [[9, 20 + k * 5], [20, 23 + k * 5], [31, 20 + k * 5]], 3.5);
}
