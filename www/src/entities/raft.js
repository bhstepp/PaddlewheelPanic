// Rafts drift slowly up and down the river current.
import { PALETTE as C } from "../art/palette.js";
import { rng, cached, pen, hatch } from "../art/ink.js";

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
    const spr = cached(`raft:${this.w}:${this.baseX}`, this.w + 12, this.h + 12, (c) => paintRaft(c, this.w, this.baseX));
    ctx.drawImage(spr.canvas, this.x - 6, this.y - 6, spr.w, spr.h);
  }
}

function paintRaft(ctx, w, seed) {
  const r = rng(seed);
  ctx.translate(6, 6);
  // Back row of logs.
  const back = new Path2D();
  back.roundRect ? back.roundRect(4, 9, w - 8, 24, 12) : back.rect(4, 9, w - 8, 24);
  ctx.fillStyle = C.ash;
  ctx.fill(back);
  ctx.save();
  ctx.clip(back);
  hatch(ctx, 0, 9, w, 24, r, { gap: 3, lw: 1, color: C.slate, angle: 0.1 });
  ctx.restore();
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 2.5;
  ctx.stroke(back);
  // Front log with bark texture and cut ends.
  const log = new Path2D();
  log.roundRect ? log.roundRect(0, 0, w, 22, 11) : log.rect(0, 0, w, 22);
  ctx.fillStyle = C.silver;
  ctx.fill(log);
  ctx.save();
  ctx.clip(log);
  ctx.strokeStyle = C.slate;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  for (let i = 0; i < w / 6; i++) {
    const x = r.range(12, w - 16);
    const y = r.range(4, 18);
    ctx.moveTo(x, y);
    ctx.lineTo(x + r.range(8, 22), y + r.range(-1.5, 1.5));
  }
  ctx.stroke();
  hatch(ctx, 0, 12, w, 10, r, { gap: 2.6, lw: 0.9, color: C.slate, angle: 0.2 });
  ctx.fillStyle = C.paper;
  ctx.fillRect(10, 3, w - 20, 3);
  ctx.restore();
  pen(ctx, [[11, 0], [w - 11, 0]], r, { w: 3.5, amp: 0.5 });
  pen(ctx, [[11, 22], [w - 11, 22]], r, { w: 3.5, amp: 0.5 });
  for (const ex of [11, w - 11]) {
    ctx.beginPath();
    ctx.arc(ex, 11, 10, 0, Math.PI * 2);
    ctx.fillStyle = C.paper;
    ctx.fill();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = C.ash;
    ctx.lineWidth = 1.1;
    for (const rr of [3, 6]) {
      ctx.beginPath();
      ctx.arc(ex, 11, rr, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  // Rope lashings.
  for (const lx of [w * 0.28, w * 0.72]) {
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(lx - 5, -1);
    ctx.lineTo(lx + 5, 31);
    ctx.moveTo(lx + 5, -1);
    ctx.lineTo(lx - 5, 31);
    ctx.stroke();
    ctx.strokeStyle = C.silver;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }
}
