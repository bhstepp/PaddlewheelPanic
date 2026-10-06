// Mechanic objects introduced across the zones. Platforms share the
// platform interface (x, y top, w, h, solid, safe, dx, dy, update, draw,
// optional onLand). Themes can restyle any of them through theme.skins.
import { PALETTE as C } from "../art/palette.js";
import { TAU, rng, cached, wash, plank, rope, roughStroke } from "../art/ink.js";
import { CONFIG } from "../config.js";

function stroke(ctx, color, w) {
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
}

function skin(g, name) {
  return g.theme?.skins?.[name];
}

// ---------------------------------------------------------------- springboard

export class Spring {
  constructor(o) {
    this.type = "spring";
    this.x = o.x;
    this.base = o.y ?? 520;
    this.w = 64;
    this.h = 24;
    this.y = this.base - this.h;
    this.solid = "top";
    this.safe = false;
    this.dx = 0;
    this.dy = 0;
    this.squish = 0;
  }

  update(dt, g) {
    this.squish = Math.max(0, this.squish - dt * 5);
    // Running onto the springboard fires it too.
    const h = g.hero;
    if (h.ground && h.ground !== this && h.state === "run" && h.x > this.x + 8 && h.x < this.x + this.w - 8 && this.squish < 0.2) {
      this.onLand(h, g);
    }
  }

  onLand(h, g) {
    this.squish = 1;
    g.bounce(CONFIG.springVelocity, this.x + this.w / 2, this.y, "BOING!");
  }

  draw(ctx, g) {
    const sk = skin(g, "spring");
    if (sk) return sk(ctx, this, g);
    const { x, base } = this;
    const top = this.y + this.squish * 12;
    ctx.save();
    // Base plate.
    ctx.fillStyle = C.charcoal;
    ctx.fillRect(x + 4, base - 6, this.w - 8, 6);
    stroke(ctx, C.ink, 2);
    ctx.strokeRect(x + 4, base - 6, this.w - 8, 6);
    // Coil.
    stroke(ctx, C.ink, 3.5);
    ctx.beginPath();
    const n = 5;
    for (let i = 0; i <= n; i++) {
      const yy = base - 6 - ((base - 6 - (top + 8)) * i) / n;
      ctx.lineTo(x + this.w / 2 + (i % 2 ? 14 : -14), yy);
    }
    ctx.stroke();
    stroke(ctx, C.silver, 1.4);
    ctx.stroke();
    // Paddle.
    plank(ctx, x, top, this.w, 9, rng(7), { fill: C.paper, line: 2.2, nails: false });
    ctx.restore();
  }
}

// ---------------------------------------------------------------- crumbling ledge

export class Crumble {
  constructor(o) {
    this.type = "crumble";
    this.x = o.x;
    this.baseY = o.y ?? 520;
    this.y = this.baseY;
    this.w = o.w ?? 180;
    this.h = 30;
    this.solid = "top";
    this.safe = false;
    this.dx = 0;
    this.dy = 0;
    this.reset();
  }

  reset() {
    this.t = -1; // -1 = untouched
    this.fallV = 0;
    this.y = this.baseY;
    this.solid = "top";
    this.rot = 0;
  }

  onLand(h, g) {
    if (this.t < 0) {
      this.t = 0;
      g.hooks.sfx("creak");
    }
  }

  update(dt, g) {
    const prev = this.y;
    if (this.t >= 0) {
      this.t += dt;
      if (this.t > CONFIG.crumbleDelay) {
        if (this.solid) g.fx.debris(this.x + this.w / 2, this.y);
        this.solid = null;
        this.fallV += 1800 * dt;
        this.y += this.fallV * dt;
        this.rot += dt * 0.8;
      }
    }
    this.dy = this.y - prev;
  }

  draw(ctx, g) {
    if (this.y > 900) return;
    const shake = this.t >= 0 && this.solid ? Math.sin(this.t * 80) * 2 : 0;
    ctx.save();
    ctx.translate(this.x + this.w / 2 + shake, this.y);
    ctx.rotate(this.rot);
    const sk = skin(g, "crumble");
    if (sk) sk(ctx, this, g);
    else {
      const spr = cached(`crumble:${this.w}`, this.w + 8, this.h + 40, (c) => paintCrumble(c, this.w, this.h));
      ctx.drawImage(spr.canvas, -this.w / 2 - 4, -4, spr.w, spr.h);
    }
    ctx.restore();
  }
}

function paintCrumble(ctx, w, h) {
  const r = rng(w * 3);
  ctx.translate(4, 4);
  // Rotten boards with a big crack and dangling splinters.
  let x = 0;
  while (x < w - 1) {
    const bw = Math.min(w - x, r.range(40, 70));
    plank(ctx, x, 0, bw, 14, r, { fill: C.ash, line: 1.6 });
    x += bw;
  }
  plank(ctx, 6, 14, w - 12, 10, r, { fill: C.slate, nails: false, line: 1.6 });
  stroke(ctx, C.ink, 2);
  ctx.beginPath();
  ctx.moveTo(w * 0.45, 0);
  ctx.lineTo(w * 0.5, 8);
  ctx.lineTo(w * 0.42, 14);
  ctx.lineTo(w * 0.52, 24);
  ctx.stroke();
  for (let i = 0; i < 4; i++) {
    const sx = r.range(10, w - 10);
    ctx.beginPath();
    ctx.moveTo(sx, 24);
    ctx.lineTo(sx + r.range(-4, 4), 24 + r.range(6, 14));
    ctx.stroke();
  }
}

// ---------------------------------------------------------------- beat platform

// A platform that is only there on certain beats: solid while
// (beat + offset) % period < on. The level hint teaches the rhythm.
export class BeatPlatform {
  constructor(o) {
    this.type = "beat";
    this.x = o.x;
    this.y = o.y ?? 520;
    this.w = o.w ?? 170;
    this.h = 22;
    this.period = o.period ?? 2;
    this.on = o.on ?? 1;
    this.offset = o.offset ?? 0;
    this.solid = "top";
    this.safe = false;
    this.dx = 0;
    this.dy = 0;
    this.vis = 1;
  }

  update(dt, g) {
    const b = Math.floor(g.beatCount ?? 0) + this.offset;
    const lit = ((b % this.period) + this.period) % this.period < this.on;
    this.solid = lit ? "top" : null;
    this.vis += ((lit ? 1 : 0) - this.vis) * Math.min(1, dt * 18);
  }

  draw(ctx, g) {
    const sk = skin(g, "beat");
    if (sk) return sk(ctx, this, g);
    const { x, y, w } = this;
    // Ghost outline always shows where it will be.
    ctx.save();
    stroke(ctx, C.ink, 2);
    ctx.setLineDash([8, 7]);
    ctx.strokeRect(x, y, w, 18);
    ctx.setLineDash([]);
    if (this.vis > 0.02) {
      ctx.globalAlpha = this.vis;
      const spr = cached(`beat:${w}`, w + 16, 40, (c) => paintStroke(c, w));
      const s = 0.85 + this.vis * 0.15;
      ctx.translate(x + w / 2, y + 9);
      ctx.scale(s, s);
      ctx.drawImage(spr.canvas, -w / 2 - 8, -17, spr.w, spr.h);
    }
    ctx.restore();
  }
}

function paintStroke(ctx, w) {
  // A fat, dry-brush paint stroke with bristle streaks.
  const r = rng(w);
  ctx.translate(8, 6);
  const p = new Path2D();
  p.moveTo(0, 6);
  p.bezierCurveTo(w * 0.3, -2, w * 0.7, 2, w, 4);
  p.lineTo(w - 4, 22);
  p.bezierCurveTo(w * 0.6, 26, w * 0.3, 20, 4, 24);
  p.closePath();
  ctx.fillStyle = C.charcoal;
  ctx.fill(p);
  ctx.save();
  ctx.clip(p);
  stroke(ctx, C.slate, 1.2);
  for (let i = 0; i < 9; i++) {
    const yy = 4 + i * 2.4;
    ctx.beginPath();
    ctx.moveTo(r.range(0, 20), yy);
    ctx.lineTo(w - r.range(0, 30), yy + r.range(-1, 1));
    ctx.stroke();
  }
  ctx.fillStyle = C.paper;
  ctx.globalAlpha = 0.5;
  ctx.fillRect(6, 6, w - 20, 2.5);
  ctx.restore();
  roughStroke(ctx, p, 2.4);
}

// ---------------------------------------------------------------- lift (vertical mover)

export class Lift {
  constructor(o) {
    this.type = "lift";
    this.x = o.x;
    this.baseY = o.y ?? 480;
    this.y = this.baseY;
    this.w = o.w ?? 150;
    this.h = 22;
    this.range = o.range ?? 90;
    this.speed = o.speed ?? 1.4;
    this.phase = o.phase ?? 0;
    this.solid = "top";
    this.safe = false;
    this.dx = 0;
    this.dy = 0;
  }

  update(dt, g) {
    const ny = this.baseY + Math.sin(g.time * this.speed + this.phase) * this.range;
    this.dy = ny - this.y;
    this.y = ny;
  }

  draw(ctx, g) {
    const sk = skin(g, "lift");
    if (sk) return sk(ctx, this, g);
    const { x, y, w } = this;
    // Chains up out of frame.
    stroke(ctx, C.ink, 2);
    for (const cx of [x + 14, x + w - 14]) {
      ctx.beginPath();
      for (let yy = y; yy > -20; yy -= 10) {
        ctx.moveTo(cx - 3, yy);
        ctx.ellipse(cx, yy - 5, 3, 5, 0, 0, TAU);
      }
      ctx.stroke();
    }
    const spr = cached(`lift:${w}`, w + 8, 34, (c) => {
      const r = rng(w);
      c.translate(4, 4);
      plank(c, 0, 0, w, 12, r, { fill: C.silver, line: 2 });
      plank(c, 6, 12, w - 12, 10, r, { fill: C.ash, line: 1.8, nails: false });
    });
    ctx.drawImage(spr.canvas, x - 4, y - 4, spr.w, spr.h);
  }
}

// ---------------------------------------------------------------- balloon bouncer

export class Balloon {
  constructor(o) {
    this.type = "balloon";
    this.x = o.x;
    this.baseY = o.y ?? 420;
    this.y = this.baseY;
    this.w = 56;
    this.h = 60;
    this.solid = "top";
    this.safe = false;
    this.dx = 0;
    this.dy = 0;
    this.popT = 0;
    this.seed = o.x;
  }

  reset() {
    this.popT = 0;
    this.solid = "top";
  }

  onLand(h, g) {
    g.bounce(CONFIG.balloonVelocity, this.x + this.w / 2, this.y, "POP!");
    g.fx.splinters(this.x + this.w / 2, this.y + 20, true);
    this.popT = 3;
    this.solid = null;
  }

  update(dt, g) {
    const prev = this.y;
    this.y = this.baseY + Math.sin(g.time * 2 + this.seed) * 8;
    this.dy = this.y - prev;
    if (this.popT > 0) {
      this.popT -= dt;
      if (this.popT <= 0) this.solid = "top";
    }
  }

  draw(ctx, g) {
    if (this.popT > 0) return;
    const sk = skin(g, "balloon");
    if (sk) return sk(ctx, this, g);
    const cx = this.x + this.w / 2;
    const cy = this.y + 30;
    stroke(ctx, C.ink, 1.6);
    ctx.beginPath();
    ctx.moveTo(cx, cy + 32);
    ctx.bezierCurveTo(cx - 8, cy + 50, cx + 8, cy + 66, cx, cy + 86);
    ctx.stroke();
    const b = new Path2D();
    b.ellipse(cx, cy, 28, 32, 0, 0, TAU);
    wash(ctx, b, this.seed % 2 ? C.paper : C.silver, C.slate, { dir: "right", strength: 0.6, x: cx - 28, y: cy - 32, w: 56, h: 64 });
    roughStroke(ctx, b, 3);
    ctx.fillStyle = C.paper;
    ctx.beginPath();
    ctx.ellipse(cx - 10, cy - 14, 5, 9, -0.4, 0, TAU);
    ctx.fill();
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    ctx.moveTo(cx - 5, cy + 36);
    ctx.lineTo(cx + 5, cy + 36);
    ctx.lineTo(cx, cy + 30);
    ctx.closePath();
    ctx.fill();
  }
}

// ---------------------------------------------------------------- swing hook

export class Hook {
  constructor(o) {
    this.type = "hook";
    this.x = o.x;
    this.y = o.y ?? 300;
    this.grabbed = 0;
    this.sway = 0;
  }

  update(dt) {
    this.grabbed = Math.max(0, this.grabbed - dt * 2);
  }

  draw(ctx, g) {
    const sk = skin(g, "hook");
    if (sk) return sk(ctx, this, g);
    const { x, y } = this;
    const sw = Math.sin(g.time * 1.5 + x) * 3;
    rope(ctx, [[x + sw * 0.2, -10], [x + sw * 0.6, y * 0.5], [x + sw, y - 12]], 5);
    const ring = new Path2D();
    ring.arc(x + sw, y, 13, 0, TAU);
    ring.arc(x + sw, y, 7, 0, TAU, true);
    wash(ctx, ring, C.ash, C.ink, { dir: "right", strength: 0.6, x: x - 13, y: y - 13, w: 26, h: 26 });
    roughStroke(ctx, ring, 2.4);
    if (!g.hero.swing && g.hero.x < x && x - g.hero.x < 420) {
      // A gentle glint so players notice it.
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(g.time * 6);
      stroke(ctx, C.paper, 2);
      ctx.beginPath();
      ctx.arc(x + sw, y, 18, -2.4, -1.2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
}

// ---------------------------------------------------------------- instrument power-up

export const POWER_NAMES = { trombone: "SLIDE TROMBONE", drum: "BASS DRUM", tuba: "TUBA", washboard: "WASHBOARD" };
export const POWER_TIPS = {
  trombone: "HOLD TO GLIDE",
  drum: "SWIPE UP TO BOOM",
  tuba: "A BUBBLE SAVES ONE SPILL",
  washboard: "DASH! NOTHING CAN STOP YOU",
};

export class Power {
  constructor(o) {
    this.type = "power";
    this.kind = o.kind;
    this.x = o.x;
    this.y = o.y ?? 430;
    this.taken = false;
  }

  draw(ctx, g) {
    if (this.taken) return;
    const bob = Math.sin(g.time * 3 + this.x) * 5;
    const s = 1 + g.beat * 0.1;
    ctx.save();
    ctx.translate(this.x, this.y + bob);
    ctx.scale(s, s);
    // Badge.
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, TAU);
    ctx.fillStyle = C.paper;
    ctx.fill();
    stroke(ctx, C.ink, 3);
    ctx.stroke();
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, TAU);
    stroke(ctx, C.ash, 1.5);
    ctx.stroke();
    ctx.setLineDash([]);
    instrument(ctx, this.kind, 0, 0, 1);
    // Sparkle rays.
    stroke(ctx, C.ink, 2);
    for (let i = 0; i < 4; i++) {
      const a = g.time * 2 + (i * TAU) / 4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 36, Math.sin(a) * 36);
      ctx.lineTo(Math.cos(a) * 44, Math.sin(a) * 44);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// Small instrument glyphs, centred on (x, y) at scale s (about 40 px wide).
export function instrument(ctx, kind, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  stroke(ctx, C.ink, 2.4);
  ctx.fillStyle = C.ink;
  if (kind === "trombone") {
    ctx.beginPath();
    ctx.moveTo(-18, -6);
    ctx.lineTo(10, -6);
    ctx.moveTo(-18, 2);
    ctx.lineTo(14, 2);
    ctx.moveTo(-18, -6);
    ctx.quadraticCurveTo(-24, -2, -18, 2);
    ctx.moveTo(10, -6);
    ctx.lineTo(10, 8);
    ctx.lineTo(-6, 8);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(14, 2);
    ctx.lineTo(22, -6);
    ctx.lineTo(22, 10);
    ctx.closePath();
    ctx.fill();
  } else if (kind === "drum") {
    ctx.beginPath();
    ctx.ellipse(0, -8, 16, 5, 0, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-16, -8);
    ctx.lineTo(-16, 10);
    ctx.moveTo(16, -8);
    ctx.lineTo(16, 10);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, 10, 16, 5, 0, 0, Math.PI);
    ctx.stroke();
    ctx.beginPath();
    for (let k = 0; k < 4; k++) {
      ctx.moveTo(-16 + k * 10, -4);
      ctx.lineTo(-10 + k * 10, 12);
    }
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(6, -14);
    ctx.lineTo(18, -22);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(19, -23, 3, 0, TAU);
    ctx.fill();
  } else if (kind === "tuba") {
    ctx.beginPath();
    ctx.arc(-2, 4, 11, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(4, -6);
    ctx.lineTo(10, -14);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(4, -18);
    ctx.lineTo(18, -18);
    ctx.lineTo(16, -10);
    ctx.lineTo(6, -10);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(-6, -2, 3, 9);
    ctx.fillRect(-1, -2, 3, 9);
  } else if (kind === "washboard") {
    ctx.strokeRect(-12, -16, 24, 32);
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      ctx.moveTo(-9, -10 + k * 4.5);
      ctx.quadraticCurveTo(0, -13 + k * 4.5, 9, -10 + k * 4.5);
    }
    ctx.stroke();
    ctx.fillRect(-14, -20, 28, 5);
  }
  ctx.restore();
}

// ---------------------------------------------------------------- film reel collectible

export class Reel {
  constructor(o) {
    this.type = "reel";
    this.x = o.x;
    this.y = o.y ?? 300;
    this.taken = false;
  }

  draw(ctx, g) {
    if (this.taken) return;
    filmReel(ctx, this.x, this.y + Math.sin(g.time * 2.5) * 4, 22, g.time * 2);
  }
}

export function filmReel(ctx, x, y, r, spin = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(spin);
  const disc = new Path2D();
  disc.arc(0, 0, r, 0, TAU);
  for (let i = 0; i < 5; i++) {
    const a = (i * TAU) / 5;
    disc.moveTo(Math.cos(a) * r * 0.55 + r * 0.2, Math.sin(a) * r * 0.55);
    disc.arc(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, r * 0.2, 0, TAU, true);
  }
  ctx.fillStyle = C.ink;
  ctx.fill(disc, "evenodd");
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.14, 0, TAU);
  ctx.fillStyle = C.paper;
  ctx.fill();
  stroke(ctx, C.paper, 1.5);
  ctx.beginPath();
  ctx.arc(0, 0, r + 2, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------- boss-chase switch

export class Switch {
  constructor(o) {
    this.type = "switch";
    this.x = o.x;
    this.y = o.y ?? 520;
    this.flipped = 0;
    this.used = false;
  }

  update(dt) {
    if (this.used) this.flipped = Math.min(1, this.flipped + dt * 6);
  }

  draw(ctx, g) {
    const sk = skin(g, "switch");
    if (sk) return sk(ctx, this, g);
    const { x, y } = this;
    // Lever box.
    const box = new Path2D();
    box.rect(x - 22, y - 34, 44, 34);
    wash(ctx, box, C.ash, C.ink, { dir: "right", strength: 0.5, x: x - 22, y: y - 34, w: 44, h: 34 });
    roughStroke(ctx, box, 2.5);
    const a = -0.7 + this.flipped * 1.4;
    stroke(ctx, C.ink, 5);
    ctx.beginPath();
    ctx.moveTo(x, y - 30);
    ctx.lineTo(x + Math.sin(a) * 40, y - 30 - Math.cos(a) * 40);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + Math.sin(a) * 40, y - 30 - Math.cos(a) * 40, 7, 0, TAU);
    ctx.fillStyle = C.paper;
    ctx.fill();
    stroke(ctx, C.ink, 2.5);
    ctx.stroke();
    if (!this.used && g.hero.x < x && x - g.hero.x < 500) {
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(g.time * 8);
      ctx.font = 'bold 15px Georgia, "Times New Roman", serif';
      ctx.textAlign = "center";
      ctx.fillStyle = C.ink;
      ctx.fillText("WHISTLE!", x, y - 90);
      ctx.globalAlpha = 1;
    }
  }
}

// ---------------------------------------------------------------- ghost

export class Ghost {
  constructor(o) {
    this.type = "ghost";
    this.x0 = o.x;
    this.x = o.x;
    this.y0 = o.y ?? 440;
    this.cy = this.y0;
    this.r = 24;
    this.stun = 0;
    this.squish = 0;
    this.range = o.range ?? 40;
  }

  whistled() {
    this.stun = 2.5;
  }

  update(dt, g) {
    this.stun = Math.max(0, this.stun - dt);
    this.x = this.x0 + Math.sin(g.time * 1.3 + this.x0) * this.range;
    this.cy = this.y0 + Math.sin(g.time * 2.6 + this.x0 * 0.1) * 18;
  }

  draw(ctx, g) {
    const sk = skin(g, "ghost");
    if (sk) return sk(ctx, this, g);
    const { x, cy } = this;
    ctx.save();
    ctx.globalAlpha = this.stun > 0 ? 0.25 : 0.95;
    ctx.translate(x, cy);
    const t = g.time;
    const p = new Path2D();
    p.moveTo(-22, 22);
    p.bezierCurveTo(-26, -10, -16, -32, 0, -32);
    p.bezierCurveTo(16, -32, 26, -10, 22, 22);
    for (let i = 0; i <= 4; i++) {
      const xx = 22 - i * 11;
      p.quadraticCurveTo(xx - 5.5, 30 + Math.sin(t * 8 + i) * 4, xx - 11, 22);
    }
    p.closePath();
    wash(ctx, p, C.paper, C.ash, { dir: "right", strength: 0.7, x: -26, y: -32, w: 52, h: 62 });
    roughStroke(ctx, p, 2.6);
    ctx.fillStyle = C.ink;
    if (this.stun > 0) {
      stroke(ctx, C.ink, 2);
      ctx.beginPath();
      ctx.arc(-8, -10, 4, 0.2, Math.PI - 0.2);
      ctx.arc(8, -10, 4, 0.2, Math.PI - 0.2);
      ctx.stroke();
    } else {
      for (const ex of [-8, 8]) {
        ctx.beginPath();
        ctx.ellipse(ex, -12, 4.5, 7, 0, 0, TAU);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.ellipse(0, 6, 7, 6 + Math.sin(t * 5) * 2, 0, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}
