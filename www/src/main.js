// Boot, canvas scaling, the screen flow and the fixed-step game loop.
import { CONFIG } from "./config.js";
import { PALETTE as C } from "./art/palette.js";
import { Input } from "./input.js";
import { audio } from "./audio.js";
import { platform } from "./platform.js";
import * as store from "./storage.js";
import { Game } from "./game.js";
import { drawFilm, drawIris } from "./art/film.js";
import { drawTitle, drawHUD, drawHint, drawPause, pauseButtonRect, pauseButtons } from "./ui.js";
import { levelDef } from "./levels/index.js";
import { zoneOf, nextLevel } from "./zones/index.js";
import { drawMap, mapTap, isUnlocked } from "./screens/map.js";
import { drawIntro, introButtons, drawResultCard, resultButtons } from "./screens/cards.js";
import { inside } from "./screens/common.js";
import { extraScreens } from "./screens/extras.js";
import { registerBooth } from "./screens/booth.js";
import { registerDaily } from "./screens/daily.js";

const W = CONFIG.width;
const H = CONFIG.height;

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d", { alpha: false });
const rotateCard = document.getElementById("rotate");
const safeProbe = document.getElementById("safe-probe");

let view = { scale: 1, left: 0, top: 0, dpr: 1 };
let safe = { top: 0, right: 0, bottom: 0, left: 0 };
// title | map | intro | play | paused | result | (extra screens: booth, daily...)
let screen = "title";
let portrait = false;
let screenT = 0;
let acc = 0;
let last = performance.now();
let wallT = 0;

// The level being played.
let current = { id: "1-1", def: null, zone: null, opts: {} };
let lastResult = null;
let newBest = false;
let mapFocus = "1-1";

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

// ---------------------------------------------------------------- flow

const game = new Game({
  sfx: (n) => audio.sfx(n),
  haptic: (k) => platform.haptic(k),
  musicTime: () => audio.musicTime(),
  win: (r) => finish(r),
  lose: (r) => finish(r),
});

function go(next) {
  screen = next;
  screenT = 0;
}

function firstOpenLevel() {
  let id = "1-1";
  for (let k = 0; k < 15 && id; k++) {
    if (!isUnlocked(id)) break;
    mapFocus = id;
    if (!store.isDone(id)) break;
    id = nextLevel(id);
  }
  return mapFocus;
}

function openMap() {
  audio.stopMusic();
  if (!mapFocus) firstOpenLevel();
  go("map");
}

// Show a level's intro card. opts: { def, zone, mode, kicker, blurb, lines } for
// non-standard runs such as the daily matinee.
export function openLevel(id, opts = {}) {
  const def = opts.def ?? levelDef(id);
  if (!def) return;
  current = { id, def, zone: opts.zone ?? zoneOf(id), opts };
  mapFocus = opts.mode === "daily" ? mapFocus : id;
  go("intro");
  // Race your best run of this level as a film ghost.
  if (!opts.mode) {
    store.loadGhost(id).then((g) => {
      if (g && current.opts === opts) opts.ghost = g;
    });
  }
}

function startRun() {
  audio.unlock();
  audio.setMuted(store.getSettings().muted);
  audio.resume();
  game.load(current.def, { zone: current.zone, mode: current.opts.mode ?? "level", ghost: current.opts.ghost });
  input.reset();
  audio.startMusic(current.zone.song);
  go("play");
  acc = 0;
}

function finish(r) {
  audio.stopMusic();
  audio.sfx(r.won ? "win" : "lose");
  lastResult = r;
  if (current.opts.onFinish) {
    newBest = current.opts.onFinish(r);
  } else {
    const hadReel = store.hasReel(current.id);
    newBest = store.recordLevel(current.id, { won: r.won, stars: r.stars, notes: r.notes, timeSec: r.timeSec, reel: r.reel });
    r.reelNew = r.reel && !hadReel;
    if (newBest && r.ghost) {
      store.saveGhost(current.id, r.ghost);
      current.opts.ghost = r.ghost;
    }
    if (r.won) platform.submitScore({ board: `level.${current.id}`, value: r.notes, timeSec: r.timeSec, stars: r.stars });
  }
  go("result");
}

function pause() {
  if (screen !== "play") return;
  go("paused");
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

function toggleSound() {
  const m = !store.getSettings().muted;
  store.setSetting("muted", m);
  audio.unlock();
  audio.setMuted(m);
}

const hasNext = () => !current.opts.mode && !!nextLevel(current.id) && isUnlocked(nextLevel(current.id));

// Screens added by other modules (booth, daily matinee...).
const extras = extraScreens({ go, openLevel, openMap, toggleSound, audio, store, platform, getScreenT: () => screenT });
registerBooth(extras);
registerDaily(extras);

// Taps the UI handles before they can become jumps. Keyboard taps arrive as
// (-1, -1) for Enter/Space and (-2, -2) for Escape.
function onScreenTap(x, y) {
  if (portrait) return true;
  const key = x < 0;
  const esc = x === -2;
  switch (screen) {
    case "title":
      if (!esc) openMap();
      return true;
    case "map": {
      if (key) {
        if (!esc) openLevel(mapFocus);
        else go("title");
        return true;
      }
      const hit = mapTap(x, y);
      if (hit?.level) openLevel(hit.level);
      else if (hit?.button === "sound") toggleSound();
      else if (hit?.button) extras.open(hit.button);
      return true;
    }
    case "intro": {
      if (key) {
        if (esc) current.opts.onBack ? current.opts.onBack() : openMap();
        else startRun();
        return true;
      }
      for (const b of introButtons()) {
        if (!inside(x, y, b)) continue;
        if (b.id === "play") startRun();
        else current.opts.onBack ? current.opts.onBack() : openMap();
      }
      return true;
    }
    case "result": {
      if (screenT < 0.6) return true;
      const bs = resultButtons(lastResult, hasNext());
      let id = null;
      if (key) id = esc ? "map" : bs.find((b) => b.primary)?.id;
      else id = bs.find((b) => inside(x, y, b))?.id;
      if (id === "next") openLevel(nextLevel(current.id));
      else if (id === "retry") startRun();
      else if (id === "map") current.opts.onBack ? current.opts.onBack() : openMap();
      return true;
    }
    case "paused": {
      if (key) {
        resume();
        return true;
      }
      for (const b of pauseButtons()) {
        if (!inside(x, y, b)) continue;
        if (b.id === "resume") resume();
        else if (b.id === "restart") startRun();
        else if (b.id === "sound") toggleSound();
        else if (b.id === "map") {
          audio.resume();
          current.opts.onBack ? current.opts.onBack() : openMap();
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
    default:
      return extras.tap(screen, x, y);
  }
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
      else onScreenTap(-2, -2);
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
  } else {
    audio.update(dt);
    extras.update(screen, dt);
  }

  render(dt);
}

function render(dt) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = C.ink;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const k = canvas.width / W;
  ctx.setTransform(k, 0, 0, k, 0, 0);

  const beat = Math.max(0, 1 - ((wallT * 2) % 1) * 3.5) ** 2;
  switch (screen) {
    case "title":
      drawTitle(ctx, wallT, beat, { stars: store.totalStars(), reels: store.totalReels() });
      break;
    case "map":
      drawMap(ctx, wallT, store.getSettings().muted, mapFocus);
      break;
    case "intro":
      drawIntro(ctx, current.def, current.zone, current.opts.record ?? store.levelRecord(current.id), screenT, current.opts);
      break;
    case "result":
      drawResultCard(ctx, lastResult, current.opts.record ?? store.levelRecord(current.id), newBest, screenT, hasNext());
      break;
    case "play":
    case "paused":
      game.draw(ctx);
      drawIris(ctx, store.getSettings().filter);
      drawHint(ctx, game.hint, input.coarse);
      drawHUD(ctx, game, safe);
      if (screen === "paused") drawPause(ctx, store.getSettings().muted);
      break;
    default:
      extras.draw(screen, ctx, wallT);
  }
  drawFilm(ctx, dt, store.getSettings().filter);
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

await store.initStorage();
firstOpenLevel();
resize();
requestAnimationFrame((t) => {
  last = t;
  frame(t);
});
