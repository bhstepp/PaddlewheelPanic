// Hero movement and collisions, run at a fixed step.
import { CONFIG } from "./config.js";

export function createHero(x, y) {
  return {
    x,
    y,
    vy: 0,
    ground: null,
    coyote: 0,
    buffer: 0,
    holding: false,
    holdT: 0,
    squash: 1,
    invuln: 0,
    hurtT: 0,
    whistleT: 0,
    whistleCD: 0,
    phase: 0,
    state: "run", // run | splash | won | caught
    stateT: 0,
    speed: 0,
    lastSafe: null,
    safeX: x,
  };
}

export function heroRect(h) {
  return { x: h.x - CONFIG.heroHalfWidth, y: h.y - CONFIG.heroHeight, w: CONFIG.heroHalfWidth * 2, h: CONFIG.heroHeight };
}

function overlapsX(h, p) {
  return h.x + CONFIG.heroHalfWidth > p.x && h.x - CONFIG.heroHalfWidth < p.x + p.w;
}

export function runSpeed(x, landingX) {
  const p = Math.max(0, x / landingX);
  const c = CONFIG;
  if (p < c.dashAt) return c.runSpeedStart + (c.runSpeedMid - c.runSpeedStart) * (p / c.dashAt);
  return c.runSpeedMid + (c.runSpeedDash - c.runSpeedMid) * Math.min(1, (p - c.dashAt) / 0.08);
}

export function startJump(h, events, vy = CONFIG.jumpVelocity) {
  h.vy = -vy;
  h.ground = null;
  h.coyote = 0;
  h.buffer = 0;
  h.holding = true;
  h.holdT = 0;
  h.squash = 1.28;
  events.jump?.(h);
}

/**
 * Advance the hero by dt.
 * held: is the jump input held. platforms: solid things.
 * events: { jump(h), land(h, p) } callbacks.
 */
export function stepHero(h, dt, held, platforms, landingX, events) {
  const c = CONFIG;
  h.squash += (1 - h.squash) * Math.min(1, dt * 11);
  h.invuln = Math.max(0, h.invuln - dt);
  h.hurtT = Math.max(0, h.hurtT - dt);
  h.whistleT = Math.max(0, h.whistleT - dt);
  h.whistleCD = Math.max(0, h.whistleCD - dt);
  h.buffer = Math.max(0, h.buffer - dt);
  h.coyote = Math.max(0, h.coyote - dt);
  h.stateT += dt;

  // Ride moving platforms.
  if (h.ground) {
    h.x += h.ground.dx;
    h.y = h.ground.y;
  }

  // Horizontal: auto-run, slowing to a stop at the landing.
  if (h.state === "won") {
    h.speed = Math.max(0, h.speed - 700 * dt);
  } else if (h.state === "caught") {
    h.speed = 0;
  } else {
    h.speed = runSpeed(h.x, landingX);
  }
  const prevX = h.x;
  h.x += h.speed * dt;
  h.blocked = false;
  for (const p of platforms) {
    if (p.solid !== "full") continue;
    if (!overlapsX(h, p)) continue;
    const feetInside = h.y > p.y + 6;
    const headInside = h.y - c.heroHeight < p.y + p.h;
    if (feetInside && headInside && prevX + c.heroHalfWidth <= p.x + 2) {
      h.x = p.x - c.heroHalfWidth; // bumped into the side
      h.blocked = true;
    }
  }
  if (h.ground) h.phase += (dt * h.speed) / 20;

  // Jump (buffered, with coyote time).
  if (h.buffer > 0 && (h.ground || h.coyote > 0) && h.state === "run") {
    startJump(h, events);
  }

  if (h.ground) {
    // Still supported?
    if (!h.ground.solid || !overlapsX(h, h.ground)) {
      h.ground = null;
      h.coyote = c.coyoteTime;
      h.vy = 0;
    } else {
      if (h.ground.safe) {
        h.lastSafe = h.ground;
        h.safeX = h.x;
      }
      return;
    }
  }

  // Airborne: variable jump height while held.
  let gScale = 1;
  if (h.holding) {
    h.holdT += dt;
    if (!held || h.holdT >= c.jumpHoldMax || h.vy >= 0) h.holding = false;
    else gScale = c.jumpHoldGravity;
  }
  h.vy = Math.min(c.maxFallSpeed, h.vy + c.gravity * gScale * dt);
  const prevY = h.y;
  h.y += h.vy * dt;

  for (const p of platforms) {
    if (!p.solid || !overlapsX(h, p)) continue;
    if (h.vy >= 0) {
      const prevTop = p.y - p.dy;
      if (prevY <= prevTop + 3 && h.y >= p.y) {
        h.y = p.y;
        h.vy = 0;
        h.ground = p;
        h.holding = false;
        events.land?.(h, p);
        return;
      }
    } else if (p.solid === "full") {
      const bottom = p.y + p.h;
      if (prevY - c.heroHeight >= bottom - 1 && h.y - c.heroHeight < bottom) {
        h.y = bottom + c.heroHeight;
        h.vy = 0;
        h.holding = false;
      }
    }
  }
}
