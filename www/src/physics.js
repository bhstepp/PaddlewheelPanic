// Hero movement and collisions, run at a fixed step: running, variable
// jumps, landing on platforms, rubber-hose swinging from hooks, and the
// movement effects of instrument power-ups.
import { CONFIG } from "./config.js";

export function createHero(x, y) {
  return {
    x,
    y,
    vy: 0,
    boost: 0, // extra horizontal speed from a swing fling
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
    swing: null, // { hook, L, theta, omega, t }
    grabCD: 0,
    power: null, // { kind, t, uses }
    airT: 0,
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
  h.airT = 0;
  events.jump?.(h);
}

// How far above the feet the hero hangs from a hook (the raised hand).
export const GRIP = 62;

function tryGrab(h, hooks, events) {
  if (h.grabCD > 0 || h.ground || h.state !== "run") return false;
  const cx = h.x;
  const cy = h.y - GRIP;
  for (const k of hooks) {
    if (k.x < h.x - 30) continue;
    const dx = cx - k.x;
    const dy = cy - k.y;
    const d = Math.hypot(dx, dy);
    if (d > CONFIG.hookReach || dy < 30) continue;
    const L = Math.max(CONFIG.hookMinLength, Math.min(CONFIG.hookMaxLength, d));
    const theta = Math.atan2(dx, dy);
    const vx = h.speed + h.boost;
    // Project the current velocity onto the swing's tangent.
    let omega = (vx * Math.cos(theta) - h.vy * Math.sin(theta)) / L;
    omega = Math.max(omega, CONFIG.hookMinOmega);
    h.swing = { hook: k, L, theta, omega, t: 0 };
    h.vy = 0;
    h.boost = 0;
    h.holding = false;
    k.grabbed = 1;
    events.grab?.(h, k);
    return true;
  }
  return false;
}

function stepSwing(h, dt, held, platforms, events) {
  const s = h.swing;
  s.t += dt;
  // Pendulum, with a little pump so the swing always carries forward.
  s.omega += -(CONFIG.gravity / s.L) * Math.sin(s.theta) * dt;
  if (s.omega > 0) s.omega *= 1 + CONFIG.hookPump * dt;
  s.theta += s.omega * dt;
  const prevY = h.y;
  h.x = s.hook.x + Math.sin(s.theta) * s.L;
  h.y = s.hook.y + Math.cos(s.theta) * s.L + GRIP;
  const release = !held || s.theta > CONFIG.hookAutoRelease || s.t > CONFIG.hookMaxTime;
  if (release) {
    const v = s.omega * s.L;
    h.boost = Math.max(-h.speed * 0.4, v * Math.cos(s.theta) - h.speed);
    h.vy = -v * Math.sin(s.theta);
    h.swing = null;
    h.grabCD = 0.35;
    h.holding = false;
    h.squash = 1.2;
    h.airT = 0;
    events.release?.(h);
    return;
  }
  // Landing on something while swinging down ends the swing.
  if (h.y > prevY) {
    for (const p of platforms) {
      if (!p.solid || !overlapsX(h, p)) continue;
      if (prevY <= p.y + 3 && h.y >= p.y) {
        h.y = p.y;
        h.vy = 0;
        h.swing = null;
        h.ground = p;
        h.boost = 0;
        h.grabCD = 0.35;
        events.land?.(h, p);
        return;
      }
    }
  }
}

/**
 * Advance the hero by dt.
 * held: is the jump input held. platforms: solid things. hooks: grab points.
 * events: { jump(h), land(h, p), grab(h, hook), release(h) } callbacks.
 */
export function stepHero(h, dt, held, platforms, landingX, events, hooks = []) {
  const c = CONFIG;
  h.squash += (1 - h.squash) * Math.min(1, dt * 11);
  h.invuln = Math.max(0, h.invuln - dt);
  h.hurtT = Math.max(0, h.hurtT - dt);
  h.whistleT = Math.max(0, h.whistleT - dt);
  h.whistleCD = Math.max(0, h.whistleCD - dt);
  h.buffer = Math.max(0, h.buffer - dt);
  h.coyote = Math.max(0, h.coyote - dt);
  h.grabCD = Math.max(0, h.grabCD - dt);
  h.stateT += dt;

  if (h.state === "won") {
    h.speed = Math.max(0, h.speed - 700 * dt);
  } else if (h.state === "caught") {
    h.speed = 0;
  } else {
    h.speed = runSpeed(h.x, landingX) * (h.power?.kind === "washboard" ? c.dashMultiplier : 1);
  }

  if (h.swing) {
    stepSwing(h, dt, held, platforms, events);
    return;
  }

  // Ride moving platforms.
  if (h.ground) {
    h.x += h.ground.dx;
    h.y = h.ground.y;
  }

  // Horizontal: auto-run, plus any swing fling while airborne.
  const prevX = h.x;
  h.x += (h.speed + (h.ground ? 0 : h.boost)) * dt;
  if (!h.ground) h.boost *= Math.exp(-c.boostDecay * dt);
  h.blocked = false;
  for (const p of platforms) {
    if (p.solid !== "full") continue;
    if (!overlapsX(h, p)) continue;
    const feetInside = h.y > p.y + 6;
    const headInside = h.y - c.heroHeight < p.y + p.h;
    if (feetInside && headInside && prevX + c.heroHalfWidth <= p.x + 2) {
      h.x = p.x - c.heroHalfWidth; // bumped into the side
      h.blocked = true;
      h.boost = 0;
      events.bump?.(h, p);
    }
  }
  if (h.ground) h.phase += dt * h.speed * c.strideRate;

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
      h.airT = 0;
    } else {
      if (h.ground.safe) {
        h.lastSafe = h.ground;
        h.safeX = h.x;
      }
      return;
    }
  }

  h.airT += dt;
  // Airborne: variable jump height while held.
  let gScale = 1;
  if (h.holding) {
    h.holdT += dt;
    if (!held || h.holdT >= c.jumpHoldMax || h.vy >= 0) h.holding = false;
    else gScale = c.jumpHoldGravity;
  }
  // Trombone: hold to glide on the way down.
  const gliding = h.power?.kind === "trombone" && held && h.vy > 0;
  h.gliding = gliding;
  if (gliding) gScale = c.glideGravity;
  h.vy = Math.min(gliding ? c.glideMaxFall : c.maxFallSpeed, h.vy + c.gravity * gScale * dt);
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
        h.boost = 0;
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

  if (held) tryGrab(h, hooks, events);
}
