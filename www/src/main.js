// Boot, canvas scaling, screens and the fixed-step game loop.
import { CONFIG } from "./config.js";
import { PALETTE as C } from "./art/palette.js";
import { Input } from "./input.js";
import { audio } from "./audio.js";
import { platform } from "./platform.js";
import { initStorage, getBest, recordResult, getSettings, setSetting } from "./storage.js";
import { Game } from "./game.js";
import { drawFilm } from "./art/film.js";
import { drawTitle, drawHUD, drawHint, drawPause, drawResult, pauseButtonRect, pauseButtons } from "./ui.js";
import leg1 from "./levels/leg1.js";

const W = CONFIG.width;
const H = CONFIG.height;

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d", { alpha: false });
const rotateCard = document.getElementById("rotate");
const safeProbe = document.getElementById("safe-probe");

let view = { scale: 1, left: 0, top: 0, dpr: 1 };
let safe = { top: 0, right: 0, bottom: 0, left: 0 };
let screen = "title"; // title | play | paused | result
let portrait = false;
let lastResult = null;
let newBest = false;
let screenT = 0;
let acc = 0;
let last = performance.now();
let wallT = 0;

// ---------------------------------------------------------------- sizing

function resize() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const scale = Math.min(vw / W, vh / H);
  const cssW = Math.floor(W * scale);
  const cssH = Math.floor(H * scale);
  const dpr = Math.min(window.devicePixelRatio || 1, CONFIG.dprCap);
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  canvas.style.left = `${Math.floor((vw - cssW) / 2)}px`;
  canvas.style.top = `${Math.floor((vh - cssH) / 2)}px`;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  view = { scale: cssW / W, left: (vw - cssW) / 2, top: (vh - cssH) / 2, dpr };

  // Safe-area insets, converted to logical units relative to the canvas.
  const cs = getComputedStyle(safeProbe);
  const px = (v) => parseFloat(v) || 0;
  const s = view.scale;
  safe = {
    top: Math.max(0, px(cs.paddingTop) - view.top) / s,
    right: Math.max(0, px(cs.paddingRight) - view.left) / s,
    bottom: Math.max(0, px(cs.paddingBottom) - view.top) / s,
    left: Math.max(0, px(cs.paddingLeft) - view.left) / s,
  };

  const nowPortrait = vh > vw * 1.05;
  if (nowPortrait !== portrait) {
    portrait = nowPortrait;
    rotateCard.hidden = !portrait;
    if (portrait && screen === "play") pause();
  }
}

function toLogical(cx, cy) {
  return { x: (cx - view.left) / view.scale, y: (cy - view.top) / view.scale };
}

// ---------------------------------------------------------------- game

const game = new Game(leg1, {
  sfx: (n) => audio.sfx(n),
  haptic: (k) => platform.haptic(k),
  musicTime: () => audio.musicTime(),
  win: (r) => finish(r),
  lose: (r) => finish(r),
});

function startRun() {
  audio.unlock();
  audio.setMuted(getSettings().muted);
  audio.resume();
  game.reset();
  input.reset();
  audio.startMusic(leg1.bpm);
  screen = "play";
  screenT = 0;
  acc = 0;
}

function finish(r) {
  audio.stopMusic();
  audio.sfx(r.won ? "win" : "lose");
  lastResult = r;
  newBest = r.won ? recordResult({ stars: r.stars, notes: r.notes, totalNotes: r.totalNotes, timeSec: r.timeSec }) : false;
  if (r.won) platform.submitScore({ notes: r.notes, timeSec: r.timeSec, stars: r.stars });
  screen = "result";
  screenT = 0;
}

function pause() {
  if (screen !== "play") return;
  screen = "paused";
  input.reset();
  audio.suspend();
}

function resume() {
  if (portrait) return;
  screen = "play";
  audio.unlock();
  audio.resume();
  last = performance.now();
}

const inside = (x, y, r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

// Taps the UI handles before they can become jumps. Keyboard taps arrive as (-1, -1).
function onScreenTap(x, y) {
  if (portrait) return true;
  const key = x < 0;
  switch (screen) {
    case "title":
      startRun();
      return true;
    case "result":
      if (screenT > 0.8) startRun();
      return true;
    case "paused": {
      if (key) {
        resume();
        return true;
      }
      for (const b of pauseButtons()) {
        if (!inside(x, y, b)) continue;
        if (b.id === "resume") resume();
        else if (b.id === "restart") startRun();
        else if (b.id === "sound") {
          const m = !getSettings().muted;
          setSetting("muted", m);
          audio.unlock();
          audio.setMuted(m);
        }
      }
      return true;
    }
    case "play": {
      if (key) return false;
      const pb = pauseButtonRect(safe);
      const pad = 14;
      if (inside(x, y, { x: pb.x - pad, y: pb.y - pad, w: pb.w + pad * 2, h: pb.h + pad * 2 })) {
        pause();
        return true;
      }
      return false;
    }
  }
  return false;
}

const input = new Input(canvas, toLogical);
input.onScreenTap = onScreenTap;

// ---------------------------------------------------------------- loop

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(CONFIG.maxFrame, Math.max(0, (now - last) / 1000));
  last = now;
  wallT += dt;
  screenT += dt;

  input.update();
  for (const ev of input.take()) {
    if (ev === "pause") {
      if (screen === "play") pause();
      else if (screen === "paused") resume();
    } else if (screen === "play") {
      if (ev === "jump") game.press();
      else if (ev === "whistle") game.whistle();
    }
  }

  if (screen === "play") {
    audio.update(dt);
    game.setMusicTime(audio.musicTime());
    acc += dt;
    while (acc >= CONFIG.step) {
      game.step(CONFIG.step, input.held);
      acc -= CONFIG.step;
    }
  } else if (screen === "title") {
    game.setMusicTime(wallT);
  }

  render(dt);
}

function render(dt) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = C.ink;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const k = canvas.width / W;
  ctx.setTransform(k, 0, 0, k, 0, 0);

  if (screen === "title") {
    drawTitle(ctx, wallT, game.beat, getBest());
  } else if (screen === "result") {
    drawResult(ctx, lastResult, getBest(), newBest, screenT);
  } else {
    game.draw(ctx);
    drawHint(ctx, game.hint, input.coarse);
    drawHUD(ctx, game, safe);
    if (screen === "paused") drawPause(ctx, getSettings().muted);
  }
  drawFilm(ctx, dt);
}

// ---------------------------------------------------------------- boot

// Start or revive audio on every real user gesture (needed on iPhone).
for (const ev of ["touchend", "pointerup", "click", "keydown"]) {
  window.addEventListener(ev, () => audio.gesture(), { capture: true, passive: true });
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) pause();
});
window.addEventListener("resize", resize);
window.addEventListener("orientationchange", () => setTimeout(resize, 120));

await initStorage();
resize();
requestAnimationFrame((t) => {
  last = t;
  frame(t);
});
