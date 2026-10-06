// Dock dressing: lantern posts, life rings, rope coils, stacked cargo,
// perched gulls that take off as the hero runs by, and the dockhouse at the
// landing. None of it is solid; it sits behind the hero.
import { PALETTE as C } from "../art/palette.js";
import { rng, cached, wash, woodGrain } from "../art/ink.js";
import { gull } from "../art/scenery.js";

const TAU = Math.PI * 2;
// Perched birds that take off as the hero runs past.
const BIRDS = new Set(["gull", "crow", "pigeon", "bat"]);

function stroke(ctx, color, w) {
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
}

export class Deco {
  constructor(o) {
    this.type = "deco";
    this.kind = o.kind;
    this.x = o.x;
    this.y = o.y ?? 520; // the surface it stands on
    this.flip = !!o.flip;
    // Gull state.
    this.fly = 0;
    this.gx = 0;
    this.gy = 0;
  }

  get w() {
    return { lamp: 120, lifering: 60, coil: 60, stack: 140, shed: 300, gull: 40, crow: 40, pigeon: 40, bat: 40 }[this.kind] ?? 300;
  }

  update(dt, g) {
    if (!BIRDS.has(this.kind)) return;
    if (!this.fly && g.hero.x > this.x - 230 && g.hero.x < this.x + 60) {
      this.fly = 0.0001;
      g.hooks.sfx("gull");
    }
    if (this.fly) {
      this.fly += dt;
      this.gx += (90 + this.fly * 120) * dt;
      this.gy -= (160 + this.fly * 40) * dt;
    }
  }

  draw(ctx, g) {
    const td = g.theme?.decos?.[this.kind];
    if (td) return td(ctx, this, g);
    const { x, y } = this;
    switch (this.kind) {
      case "lamp": {
        const spr = cached("deco:lamp", 130, 190, paintLampPost);
        ctx.drawImage(spr.canvas, x - 20, y - 182, 130, 190);
        // The lantern swings gently from the arm.
        const sw = Math.sin(g.time * 1.6 + x) * 0.08;
        ctx.save();
        ctx.translate(x + 76, y - 156);
        ctx.rotate(sw);
        const lan = cached("deco:lantern", 44, 70, paintLantern);
        ctx.drawImage(lan.canvas, -22, -4, 44, 70);
        ctx.restore();
        break;
      }
      case "lifering": {
        const spr = cached("deco:lifering", 70, 110, paintLifePost);
        ctx.drawImage(spr.canvas, x - 35, y - 104, 70, 110);
        break;
      }
      case "coil": {
        const spr = cached("deco:coil", 64, 30, paintCoil);
        ctx.drawImage(spr.canvas, x - 32, y - 26, 64, 30);
        break;
      }
      case "stack": {
        const spr = cached(`deco:stack:${this.flip}`, 150, 130, (c) => paintStack(c, this.flip));
        ctx.drawImage(spr.canvas, x - 75, y - 124, 150, 130);
        break;
      }
      case "shed": {
        const spr = cached("deco:shed", 320, 280, paintShed);
        ctx.drawImage(spr.canvas, x - 10, y - 272, 320, 280);
        break;
      }
      case "gull": {
        if (!this.fly) {
          drawPerchedGull(ctx, x, y, g.time);
        } else if (this.fly < 4) {
          gull(ctx, x + this.gx, y - 24 + this.gy, 1.15, Math.sin(this.fly * 16));
        }
        break;
      }
    }
  }
}

// ---------------------------------------------------------------- painted props

function paintLampPost(ctx) {
  const r = rng(12);
  ctx.translate(20, 182);
  // Square post with a gallows arm and a diagonal brace.
  const post = new Path2D();
  post.rect(-9, -176, 18, 176);
  wash(ctx, post, C.ash, C.ink, { dir: "right", strength: 0.6, x: -9, y: -176, w: 18, h: 176 });
  woodGrain(ctx, -9, -170, 18, 160, r, C.slate);
  stroke(ctx, C.ink, 3);
  ctx.stroke(post);
  const arm = new Path2D();
  arm.rect(-14, -172, 100, 14);
  wash(ctx, arm, C.ash, C.ink, { dir: "down", strength: 0.5, x: -14, y: -172, w: 100, h: 14 });
  ctx.stroke(arm);
  const brace = new Path2D();
  brace.moveTo(9, -110);
  brace.lineTo(52, -158);
  brace.lineTo(62, -158);
  brace.lineTo(9, -98);
  brace.closePath();
  wash(ctx, brace, C.ash, null);
  ctx.stroke(brace);
  // Rope lashing and a cap.
  stroke(ctx, C.silver, 2);
  ctx.beginPath();
  for (let k = 0; k < 4; k++) {
    ctx.moveTo(-10, -150 + k * 4);
    ctx.lineTo(10, -154 + k * 4);
  }
  ctx.stroke();
  const cap = new Path2D();
  cap.ellipse(-2, -176, 15, 6, 0, 0, TAU);
  wash(ctx, cap, C.charcoal, null);
  stroke(ctx, C.ink, 2.5);
  ctx.stroke(cap);
  // Hook for the lantern.
  stroke(ctx, C.ink, 2.5);
  ctx.beginPath();
  ctx.moveTo(76, -158);
  ctx.lineTo(76, -150);
  ctx.stroke();
}

function paintLantern(ctx) {
  ctx.translate(22, 4);
  stroke(ctx, C.ink, 2.2);
  // Bail handle.
  ctx.beginPath();
  ctx.arc(0, 8, 9, Math.PI, 0);
  ctx.stroke();
  // Hood.
  const hood = new Path2D();
  hood.moveTo(-12, 16);
  hood.lineTo(-6, 6);
  hood.lineTo(6, 6);
  hood.lineTo(12, 16);
  hood.closePath();
  wash(ctx, hood, C.charcoal, null);
  ctx.stroke(hood);
  // Glass globe with frame bars and a glowing flame.
  const glass = new Path2D();
  glass.moveTo(-12, 16);
  glass.bezierCurveTo(-18, 30, -16, 44, -11, 52);
  glass.lineTo(11, 52);
  glass.bezierCurveTo(16, 44, 18, 30, 12, 16);
  glass.closePath();
  wash(ctx, glass, C.paper, C.silver, { dir: "right", strength: 0.8, x: -16, y: 16, w: 32, h: 36 });
  ctx.stroke(glass);
  ctx.fillStyle = C.paper;
  ctx.beginPath();
  ctx.ellipse(0, 36, 4, 8, 0, 0, TAU);
  ctx.fill();
  stroke(ctx, C.ash, 1.2);
  ctx.stroke();
  stroke(ctx, C.ink, 1.8);
  ctx.beginPath();
  ctx.moveTo(-6, 17);
  ctx.lineTo(-6, 51);
  ctx.moveTo(6, 17);
  ctx.lineTo(6, 51);
  ctx.stroke();
  const base = new Path2D();
  base.rect(-13, 52, 26, 7);
  wash(ctx, base, C.charcoal, null);
  stroke(ctx, C.ink, 2);
  ctx.stroke(base);
}

function paintLifePost(ctx) {
  ctx.translate(35, 104);
  const post = new Path2D();
  post.rect(-8, -96, 16, 96);
  wash(ctx, post, C.ash, C.ink, { dir: "right", strength: 0.6, x: -8, y: -96, w: 16, h: 96 });
  stroke(ctx, C.ink, 2.5);
  ctx.stroke(post);
  // Life ring with rope ties, like the one on the dockhouse in the reference.
  const cy = -62;
  const ring = new Path2D();
  ring.arc(0, cy, 28, 0, TAU);
  ring.arc(0, cy, 13, 0, TAU, true);
  wash(ctx, ring, C.paper, C.ash, { dir: "right", strength: 0.7, x: -28, y: cy - 28, w: 56, h: 56 });
  stroke(ctx, C.ink, 2.8);
  ctx.stroke(ring);
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * TAU) / 4;
    ctx.save();
    ctx.translate(Math.cos(a) * 20.5, cy + Math.sin(a) * 20.5);
    ctx.rotate(a);
    const band = new Path2D();
    band.rect(-8, -5, 16, 10);
    wash(ctx, band, C.silver, C.slate, { dir: "right", strength: 0.5, x: -8, y: -5, w: 16, h: 10 });
    stroke(ctx, C.ink, 1.6);
    ctx.stroke(band);
    stroke(ctx, C.ash, 1);
    ctx.beginPath();
    for (let t = -6; t < 8; t += 3.5) {
      ctx.moveTo(t, -5);
      ctx.lineTo(t + 2, 5);
    }
    ctx.stroke();
    ctx.restore();
  }
}

function paintCoil(ctx) {
  ctx.translate(32, 26);
  for (let k = 0; k < 4; k++) {
    const rx = 28 - k * 5;
    const ry = 9 - k * 1.2;
    const y = -k * 3.2;
    const p = new Path2D();
    p.ellipse(0, y, rx, ry, 0, 0, TAU);
    wash(ctx, p, C.silver, C.slate, { dir: "down", strength: 0.6, x: -rx, y: y - ry, w: rx * 2, h: ry * 2 });
    stroke(ctx, C.ink, 2);
    ctx.stroke(p);
    stroke(ctx, C.ash, 1);
    ctx.beginPath();
    for (let a = 0; a < TAU; a += 0.5) {
      ctx.moveTo(Math.cos(a) * rx * 0.85, y + Math.sin(a) * ry * 0.85);
      ctx.lineTo(Math.cos(a + 0.2) * rx, y + Math.sin(a + 0.2) * ry);
    }
    ctx.stroke();
  }
}

function barrelShape(ctx, x, base, w, h, r) {
  const p = new Path2D();
  p.moveTo(x + 4, base - h);
  p.bezierCurveTo(x - 4, base - h * 0.65, x - 4, base - h * 0.35, x + 4, base);
  p.lineTo(x + w - 4, base);
  p.bezierCurveTo(x + w + 4, base - h * 0.35, x + w + 4, base - h * 0.65, x + w - 4, base - h);
  p.closePath();
  wash(ctx, p, C.silver, C.ink, { dir: "right", strength: 0.55, x, y: base - h, w, h });
  ctx.save();
  ctx.clip(p);
  woodGrain(ctx, x, base - h, w, h, r, C.ash);
  ctx.fillStyle = C.charcoal;
  ctx.fillRect(x - 6, base - h * 0.8, w + 12, 6);
  ctx.fillRect(x - 6, base - h * 0.3, w + 12, 6);
  ctx.restore();
  stroke(ctx, C.ink, 2.5);
  ctx.stroke(p);
  const lid = new Path2D();
  lid.ellipse(x + w / 2, base - h, w / 2 - 4, 5, 0, 0, TAU);
  wash(ctx, lid, C.paper, null);
  ctx.stroke(lid);
}

function crateShape(ctx, x, base, s, r) {
  const p = new Path2D();
  p.rect(x, base - s, s, s);
  wash(ctx, p, C.silver, C.ink, { dir: "right", strength: 0.45, x, y: base - s, w: s, h: s });
  ctx.save();
  ctx.clip(p);
  woodGrain(ctx, x, base - s, s, s, r, C.ash);
  ctx.restore();
  stroke(ctx, C.ink, 2.5);
  ctx.stroke(p);
  stroke(ctx, C.charcoal, 4);
  ctx.strokeRect(x + 5, base - s + 5, s - 10, s - 10);
  ctx.beginPath();
  ctx.moveTo(x + 6, base - s + 6);
  ctx.lineTo(x + s - 6, base - 6);
  ctx.moveTo(x + s - 6, base - s + 6);
  ctx.lineTo(x + 6, base - 6);
  ctx.stroke();
}

function paintStack(ctx, flip) {
  const r = rng(flip ? 31 : 17);
  if (flip) {
    ctx.translate(150, 0);
    ctx.scale(-1, 1);
  }
  const base = 124;
  crateShape(ctx, 6, base, 62, r);
  crateShape(ctx, 18, base - 62, 44, r);
  barrelShape(ctx, 74, base, 40, 58, r);
  barrelShape(ctx, 112, base, 34, 50, r);
  // A loose coil of rope at the foot.
  stroke(ctx, C.ink, 4);
  ctx.beginPath();
  ctx.moveTo(66, base - 2);
  ctx.bezierCurveTo(80, base - 12, 96, base - 2, 110, base - 6);
  ctx.stroke();
  stroke(ctx, C.silver, 2);
  ctx.stroke();
}

function paintShed(ctx) {
  const r = rng(77);
  ctx.translate(10, 272);
  const w = 230;
  const h = 170;
  // Plank walls.
  const wall = new Path2D();
  wall.rect(0, -h, w, h);
  wash(ctx, wall, C.silver, C.ink, { dir: "right", strength: 0.5, x: 0, y: -h, w, h });
  ctx.save();
  ctx.clip(wall);
  stroke(ctx, C.ash, 1.3);
  ctx.beginPath();
  for (let px = 18; px < w; px += 18) {
    ctx.moveTo(px + r.range(-0.6, 0.6), -h);
    ctx.lineTo(px + r.range(-0.6, 0.6), 0);
  }
  ctx.stroke();
  for (let px = 0; px < w; px += 18) woodGrain(ctx, px + 3, -h, 12, h, r, C.ash);
  ctx.restore();
  stroke(ctx, C.ink, 3.5);
  ctx.stroke(wall);
  // Door with cross-braces.
  const door = new Path2D();
  door.rect(26, -110, 56, 110);
  wash(ctx, door, C.ash, C.ink, { dir: "right", strength: 0.5, x: 26, y: -110, w: 56, h: 110 });
  stroke(ctx, C.ink, 2.5);
  ctx.stroke(door);
  ctx.beginPath();
  ctx.moveTo(26, -80);
  ctx.lineTo(82, -80);
  ctx.moveTo(26, -30);
  ctx.lineTo(82, -30);
  ctx.moveTo(26, -30);
  ctx.lineTo(82, -80);
  ctx.stroke();
  ctx.fillStyle = C.ink;
  ctx.beginPath();
  ctx.arc(74, -56, 3, 0, TAU);
  ctx.fill();
  // Window with shutters.
  const win = new Path2D();
  win.rect(120, -128, 60, 46);
  wash(ctx, win, C.slate, C.ink, { dir: "down", strength: 0.4, x: 120, y: -128, w: 60, h: 46 });
  ctx.fillStyle = C.ash;
  ctx.fillRect(150, -126, 26, 18);
  stroke(ctx, C.ink, 2.5);
  ctx.stroke(win);
  ctx.beginPath();
  ctx.moveTo(150, -128);
  ctx.lineTo(150, -82);
  ctx.moveTo(120, -105);
  ctx.lineTo(180, -105);
  ctx.stroke();
  for (const sx of [104, 182]) {
    const sh = new Path2D();
    sh.rect(sx, -130, 14, 50);
    wash(ctx, sh, C.ash, null);
    ctx.stroke(sh);
  }
  // Life ring hung on the wall.
  ctx.save();
  ctx.translate(196, -40);
  const ring = new Path2D();
  ring.arc(0, 0, 22, 0, TAU);
  ring.arc(0, 0, 10, 0, TAU, true);
  wash(ctx, ring, C.paper, C.ash, { dir: "right", strength: 0.7, x: -22, y: -22, w: 44, h: 44 });
  stroke(ctx, C.ink, 2.5);
  ctx.stroke(ring);
  ctx.restore();
  // Gable roof with overhang and shingles.
  const roof = new Path2D();
  roof.moveTo(-18, -h + 4);
  roof.lineTo(w / 2, -h - 74);
  roof.lineTo(w + 18, -h + 4);
  roof.closePath();
  wash(ctx, roof, C.ash, C.ink, { dir: "down", strength: 0.5, x: -18, y: -h - 74, w: w + 36, h: 78 });
  ctx.save();
  ctx.clip(roof);
  stroke(ctx, C.slate, 1.2);
  ctx.beginPath();
  for (let yy = -h - 70; yy < -h + 4; yy += 10) {
    ctx.moveTo(-20, yy);
    ctx.lineTo(w + 20, yy);
    for (let xx = -20 + ((yy / 10) % 2) * 9; xx < w + 20; xx += 18) {
      ctx.moveTo(xx, yy);
      ctx.lineTo(xx, yy + 10);
    }
  }
  ctx.stroke();
  ctx.restore();
  stroke(ctx, C.ink, 3.5);
  ctx.stroke(roof);
  // Wall lamp on a bracket.
  stroke(ctx, C.ink, 3);
  ctx.beginPath();
  ctx.moveTo(w, -140);
  ctx.lineTo(w + 34, -140);
  ctx.lineTo(w + 34, -132);
  ctx.stroke();
  const shade = new Path2D();
  shade.moveTo(w + 18, -122);
  shade.quadraticCurveTo(w + 34, -136, w + 50, -122);
  shade.closePath();
  wash(ctx, shade, C.charcoal, null);
  ctx.stroke(shade);
  ctx.beginPath();
  ctx.arc(w + 34, -120, 5, 0, Math.PI);
  ctx.fillStyle = C.paper;
  ctx.fill();
  stroke(ctx, C.ink, 1.5);
  ctx.stroke();
}

function drawPerchedGull(ctx, x, y, t) {
  const bob = Math.sin(t * 2 + x) * 1.2;
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  // Legs.
  stroke(ctx, C.ink, 2);
  ctx.beginPath();
  ctx.moveTo(-3, -10);
  ctx.lineTo(-4, 0);
  ctx.moveTo(4, -10);
  ctx.lineTo(4, 0);
  ctx.stroke();
  // Body and folded wing.
  const body = new Path2D();
  body.moveTo(-18, -18);
  body.bezierCurveTo(-14, -30, 8, -32, 14, -22);
  body.bezierCurveTo(16, -14, 6, -8, -6, -9);
  body.bezierCurveTo(-14, -10, -20, -12, -24, -14);
  body.closePath();
  wash(ctx, body, C.paper, C.ash, { dir: "down", strength: 0.6, x: -24, y: -32, w: 40, h: 24 });
  stroke(ctx, C.ink, 2);
  ctx.stroke(body);
  const wing = new Path2D();
  wing.moveTo(-14, -22);
  wing.bezierCurveTo(-6, -26, 6, -22, 4, -15);
  wing.bezierCurveTo(-4, -14, -14, -16, -26, -16);
  wing.closePath();
  wash(ctx, wing, C.silver, null);
  ctx.stroke(wing);
  // Head with eye, beak and a little tuft.
  const head = new Path2D();
  head.arc(12, -32, 8, 0, TAU);
  wash(ctx, head, C.paper, null);
  ctx.stroke(head);
  ctx.fillStyle = C.ink;
  ctx.beginPath();
  ctx.arc(14, -34, 1.8, 0, TAU);
  ctx.fill();
  const beak = new Path2D();
  beak.moveTo(19, -33);
  beak.lineTo(29, -30);
  beak.lineTo(19, -28);
  beak.closePath();
  wash(ctx, beak, C.ash, null);
  ctx.stroke(beak);
  ctx.beginPath();
  ctx.moveTo(9, -39);
  ctx.quadraticCurveTo(8, -46, 13, -45);
  ctx.moveTo(11, -40);
  ctx.quadraticCurveTo(14, -47, 17, -43);
  ctx.stroke();
  ctx.restore();
}
