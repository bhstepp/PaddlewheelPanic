// Title card, HUD, pause screen, win and lose cards, hint pop-ups.
// Everything is drawn in code in the silent-film intertitle style.
import { PALETTE as C, SERIF } from "./art/palette.js";
import { TAU, roundRect, spacedText, star, noteGlyph } from "./art/draw.js";
import { drawHero } from "./art/hero.js";
import { drawBackground } from "./art/scenery.js";
import { CONFIG } from "./config.js";

const W = CONFIG.width;
const H = CONFIG.height;

// ---------------------------------------------------------------- frames

function flourish(ctx, x, y, sx, sy) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sx, sy);
  ctx.strokeStyle = C.paper;
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 46);
  ctx.bezierCurveTo(0, 18, 18, 0, 46, 0);
  ctx.moveTo(14, 60);
  ctx.bezierCurveTo(10, 30, 30, 10, 60, 14);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(22, 22, 7, 0, TAU);
  ctx.stroke();
  ctx.fillStyle = C.paper;
  ctx.beginPath();
  ctx.arc(22, 22, 2.5, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function diamond(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r, y);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r, y);
  ctx.closePath();
  ctx.fillStyle = C.paper;
  ctx.fill();
}

export function divider(ctx, x, y, half) {
  ctx.strokeStyle = C.paper;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - half, y);
  ctx.lineTo(x - 18, y);
  ctx.moveTo(x + 18, y);
  ctx.lineTo(x + half, y);
  ctx.stroke();
  diamond(ctx, x, y, 8);
  diamond(ctx, x - half - 8, y, 4);
  diamond(ctx, x + half + 8, y, 4);
}

// Double ornate border around a card.
export function ornateFrame(ctx, x, y, w, h) {
  ctx.strokeStyle = C.paper;
  ctx.lineWidth = 4;
  roundRect(ctx, x, y, w, h, 10);
  ctx.stroke();
  ctx.lineWidth = 1.5;
  roundRect(ctx, x + 12, y + 12, w - 24, h - 24, 6);
  ctx.stroke();
  flourish(ctx, x + 22, y + 22, 1, 1);
  flourish(ctx, x + w - 22, y + 22, -1, 1);
  flourish(ctx, x + 22, y + h - 22, 1, -1);
  flourish(ctx, x + w - 22, y + h - 22, -1, -1);
  diamond(ctx, x + w / 2, y, 9);
  diamond(ctx, x + w / 2, y + h, 9);
  diamond(ctx, x, y + h / 2, 7);
  diamond(ctx, x + w, y + h / 2, 7);
}

function blink(t) {
  return Math.floor(t * 1.6) % 2 === 0 ? 1 : 0.35;
}

// ---------------------------------------------------------------- title

export function drawTitle(ctx, t, beat, stats) {
  ctx.fillStyle = C.ink;
  ctx.fillRect(0, 0, W, H);
  ornateFrame(ctx, 40, 36, W - 80, H - 72);

  spacedText(ctx, "PADDLEWHEEL PANIC", W / 2, 168, 78, 9);
  divider(ctx, W / 2, 230, 240);
  spacedText(ctx, "A River Journey in Five Reels", W / 2, 272, 32, 2, { italic: true, weight: "normal" });

  // An iris opening onto a miniature of the levee, with the hero dancing.
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(W / 2, 440, 190, 108, 0, 0, TAU);
  ctx.clip();
  ctx.save();
  ctx.translate(W / 2 - 200, 300);
  ctx.scale(0.4, 0.4);
  drawBackground(ctx, t * 60, { beat, time: t });
  ctx.restore();
  ctx.fillStyle = C.charcoal;
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.ellipse(W / 2, 532, 52, 8, 0, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;
  drawHero(ctx, { x: W / 2 - 8, y: 538, pose: "dance", t, scale: 0.78, beat, shadow: false });
  for (let i = 0; i < 3; i++) {
    const k = (t * 0.5 + i / 3) % 1;
    noteGlyph(ctx, W / 2 + (i - 1) * 130 + Math.sin(k * 6 + i) * 12, 500 - k * 150, 26, C.ink, C.paper);
  }
  ctx.restore();
  ctx.strokeStyle = C.paper;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(W / 2, 440, 190, 108, 0, 0, TAU);
  ctx.stroke();

  ctx.globalAlpha = blink(t);
  spacedText(ctx, "TAP TO START", W / 2, 600, 34, 8);
  ctx.globalAlpha = 1;
  if (stats && stats.stars > 0) {
    spacedText(ctx, `\u2605 ${stats.stars} / 45  ·  REELS ${stats.reels} / 15`, W / 2, 646, 18, 4, { color: C.ash, weight: "normal" });
  }
}

function starText(n) {
  return "★".repeat(n) + "☆".repeat(3 - n);
}

// ---------------------------------------------------------------- HUD

function pill(ctx, x, y, w, h) {
  ctx.globalAlpha = 0.92;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = C.charcoal;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.lineWidth = 3;
  ctx.strokeStyle = C.paper;
  ctx.stroke();
}

export function pauseButtonRect(safe) {
  return { x: W - safe.right - 24 - 56, y: safe.top + 16, w: 56, h: 56 };
}

export function drawHUD(ctx, game, safe) {
  const top = safe.top + 16;
  const h = game.hero;

  // Notes counter with the whistle cooldown ring.
  const lx = safe.left + 24;
  pill(ctx, lx, top, 176, 56);
  const ix = lx + 30;
  const iy = top + 28;
  ctx.lineWidth = 5;
  ctx.strokeStyle = C.slate;
  ctx.beginPath();
  ctx.arc(ix, iy, 19, 0, TAU);
  ctx.stroke();
  const ready = 1 - h.whistleCD / CONFIG.whistleCooldown;
  ctx.strokeStyle = C.paper;
  ctx.beginPath();
  ctx.arc(ix, iy, 19, -Math.PI / 2, -Math.PI / 2 + TAU * ready);
  ctx.stroke();
  noteGlyph(ctx, ix + 1, iy + 1, 24 * (1 + game.beat * 0.1), C.paper, C.charcoal);
  ctx.font = `bold 30px ${SERIF}`;
  ctx.fillStyle = C.paper;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(`× ${game.notes + game.bonus}`, lx + 62, iy + 2);

  // Distance.
  const dist = `${game.distanceFt} FT`;
  pill(ctx, W / 2 - 90, top, 180, 56);
  spacedText(ctx, dist, W / 2, top + 29, 28, 3);

  // Captain meter.
  const pb = pauseButtonRect(safe);
  const mw = 270;
  const mx = pb.x - 16 - mw;
  pill(ctx, mx, top, mw, 56);
  spacedText(ctx, "CAPTAIN", mx + 22, top + 29, 15, 2.5, { align: "left" });
  const bx = mx + 118;
  const bw = mw - 118 - 22;
  roundRect(ctx, bx, top + 18, bw, 20, 10);
  ctx.fillStyle = C.ink;
  ctx.fill();
  const m = game.meter / 100;
  const danger = m > 0.75 && Math.floor(game.time * 6) % 2 === 0;
  if (m > 0.01) {
    roundRect(ctx, bx, top + 18, Math.max(20, bw * m), 20, 10);
    ctx.fillStyle = danger ? C.silver : C.paper;
    ctx.fill();
  }
  roundRect(ctx, bx, top + 18, bw, 20, 10);
  ctx.lineWidth = 2;
  ctx.strokeStyle = C.paper;
  ctx.stroke();

  // Pause button.
  ctx.beginPath();
  ctx.arc(pb.x + 28, pb.y + 28, 26, 0, TAU);
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = C.charcoal;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.lineWidth = 3;
  ctx.strokeStyle = C.paper;
  ctx.stroke();
  ctx.fillStyle = C.paper;
  roundRect(ctx, pb.x + 18, pb.y + 16, 7, 24, 2);
  ctx.fill();
  roundRect(ctx, pb.x + 31, pb.y + 16, 7, 24, 2);
  ctx.fill();
}

export function drawHint(ctx, hintState, coarse) {
  if (!hintState) return;
  const t = hintState.t;
  const a = Math.min(1, t * 5, (3.2 - t) * 4);
  if (a <= 0) return;
  const text = coarse ? hintState.hint.text : hintState.hint.desktop;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.font = `bold 30px ${SERIF}`;
  const tw = ctx.measureText(text).width + text.length * 4;
  const w = tw + 110;
  const x = W / 2 - w / 2;
  const y = 120;
  roundRect(ctx, x, y, w, 76, 10);
  ctx.fillStyle = C.ink;
  ctx.fill();
  ctx.strokeStyle = C.paper;
  ctx.lineWidth = 3;
  ctx.stroke();
  roundRect(ctx, x + 8, y + 8, w - 16, 60, 6);
  ctx.lineWidth = 1.2;
  ctx.stroke();
  diamond(ctx, x + 30, y + 38, 6);
  diamond(ctx, x + w - 30, y + 38, 6);
  spacedText(ctx, text, W / 2, y + 40, 30, 4);
  ctx.restore();
}

// ---------------------------------------------------------------- pause

const PAUSE_BUTTONS = [
  { id: "resume", y: 270 },
  { id: "sound", y: 342 },
  { id: "restart", y: 414 },
  { id: "map", y: 486 },
];

export function pauseButtons() {
  return PAUSE_BUTTONS.map((b) => ({ id: b.id, x: W / 2 - 170, y: b.y, w: 340, h: 56 }));
}

export function drawPause(ctx, muted) {
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = C.ink;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;
  ctx.fillStyle = C.ink;
  roundRect(ctx, W / 2 - 300, 90, 600, 530, 12);
  ctx.fill();
  ornateFrame(ctx, W / 2 - 300, 90, 600, 530);
  spacedText(ctx, "INTERMISSION", W / 2, 168, 44, 8);
  divider(ctx, W / 2, 216, 150);
  const labels = { resume: "RESUME", sound: muted ? "SOUND: OFF" : "SOUND: ON", restart: "RESTART", map: "MAP" };
  for (const b of pauseButtons()) {
    roundRect(ctx, b.x, b.y, b.w, b.h, 30);
    ctx.lineWidth = 3;
    ctx.strokeStyle = C.paper;
    ctx.stroke();
    spacedText(ctx, labels[b.id], W / 2, b.y + 31, 26, 4);
  }
}
