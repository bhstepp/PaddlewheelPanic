// Tap, hold and swipe-up detection from one pointer, plus desktop keys.
// A swipe never also fires a jump: a touch only commits to a jump after a
// short delay (or on release) unless it is already moving upward.
import { CONFIG } from "./config.js";

export class Input {
  constructor(canvas, toLogical) {
    this.canvas = canvas;
    this.toLogical = toLogical;
    this.events = [];       // "jump" | "whistle" | "pause"
    this.held = false;      // jump is being held
    this.pointer = null;    // the one tracked pointer
    this.keyJump = false;
    this.onScreenTap = null; // (x, y) => true if the UI consumed the tap
    this.coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;

    canvas.addEventListener("pointerdown", (e) => this.down(e));
    window.addEventListener("pointermove", (e) => this.move(e));
    window.addEventListener("pointerup", (e) => this.up(e));
    window.addEventListener("pointercancel", (e) => this.up(e, true));
    window.addEventListener("keydown", (e) => this.key(e, true));
    window.addEventListener("keyup", (e) => this.key(e, false));
    // Block long-press menus and double-tap gestures.
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    document.addEventListener("gesturestart", (e) => e.preventDefault());
  }

  down(e) {
    e.preventDefault();
    if (this.pointer) return; // first pointer only
    if (e.pointerType === "touch") this.coarse = true;
    const p = this.toLogical(e.clientX, e.clientY);
    if (this.onScreenTap && this.onScreenTap(p.x, p.y)) return;
    this.pointer = {
      id: e.pointerId,
      sx: e.clientX,
      sy: e.clientY,
      t0: performance.now(),
      maxUp: 0,
      committed: false,
      swiped: false,
    };
    try {
      this.canvas.setPointerCapture(e.pointerId);
    } catch {}
  }

  move(e) {
    const p = this.pointer;
    if (!p || e.pointerId !== p.id || p.swiped) return;
    const up = p.sy - e.clientY;
    p.maxUp = Math.max(p.maxUp, up);
    const dt = performance.now() - p.t0;
    if (!p.committed && up >= CONFIG.swipeMinPx && dt <= CONFIG.swipeMaxMs) {
      p.swiped = true;
      this.events.push("whistle");
    }
  }

  up(e, cancelled = false) {
    const p = this.pointer;
    if (!p || e.pointerId !== p.id) return;
    if (!p.committed && !p.swiped && !cancelled) {
      // A quick tap: jump now, released straight away (short hop).
      this.events.push("jump");
    }
    this.pointer = null;
    this.held = this.keyJump;
  }

  // Called once per frame to resolve pending touches.
  update() {
    const p = this.pointer;
    if (!p || p.committed || p.swiped) return;
    const dt = performance.now() - p.t0;
    const suspicious = p.maxUp >= CONFIG.swipeSuspectPx;
    if ((!suspicious && dt >= CONFIG.tapCommitMs) || dt > CONFIG.swipeMaxMs) {
      p.committed = true;
      this.held = true;
      this.events.push("jump");
    }
  }

  key(e, isDown) {
    const k = e.code;
    if (k === "Space") {
      e.preventDefault();
      if (isDown && !e.repeat) {
        if (this.onScreenTap && this.onScreenTap(-1, -1)) return;
        this.keyJump = true;
        this.held = true;
        this.events.push("jump");
      } else if (!isDown) {
        this.keyJump = false;
        this.held = !!(this.pointer && this.pointer.committed);
      }
    } else if (k === "Enter" && isDown && !e.repeat) {
      if (this.onScreenTap) this.onScreenTap(-1, -1);
    } else if ((k === "KeyW" || k === "ArrowUp") && isDown && !e.repeat) {
      e.preventDefault();
      this.events.push("whistle");
    } else if ((k === "Escape" || k === "KeyP") && isDown && !e.repeat) {
      this.events.push("pause");
    }
  }

  take() {
    const ev = this.events;
    this.events = [];
    return ev;
  }

  reset() {
    this.events = [];
    this.held = false;
    this.keyJump = false;
    this.pointer = null;
  }
}
