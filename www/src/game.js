// One run of a river leg: world state, rules, and world rendering.
import { CONFIG } from "./config.js";
import { loadLevel } from "./level.js";
import { createHero, stepHero, heroRect, startJump } from "./physics.js";
import { Steamboat } from "./entities/steamboat.js";
import { FX } from "./fx.js";
import { drawHero } from "./art/hero.js";
import { drawBackground, drawForeground, drawPaperFinish } from "./art/scenery.js";

const W = CONFIG.width;

export class Game {
  constructor(levelData, hooks) {
    this.data = levelData;
    this.hooks = hooks; // { sfx(name), haptic(kind), win(result), lose(result), musicTime() }
    this.boat = new Steamboat();
    this.fx = new FX();
    this.reset();
  }

  reset() {
    this.level = loadLevel(this.data);
    const first = this.level.platforms.find((p) => p.type === "dock");
    this.hero = createHero(first.x + 80, first.y);
    this.hero.ground = first;
    this.hero.lastSafe = first;
    this.camX = 0;
    this.meter = CONFIG.meterStart;
    this.notes = 0;
    this.bonus = 0;
    this.totalNotes = this.level.notes.length;
    this.falls = 0;
    this.hits = 0;
    this.time = 0;
    this.runTime = 0;
    this.state = "play"; // play | won | caught | done
    this.endT = 0;
    this.hint = null;
    this.beat = 0;
    this.beatPhase = 0;
    this.boat.reset();
    this.fx.reset();
  }

  get distanceFt() {
    return Math.floor(Math.min(this.hero.x, this.level.landing.x) / this.level.pxPerFt);
  }

  // Beat helpers driven by the music clock.
  setMusicTime(t) {
    const beatLen = 60 / this.level.bpm;
    const b = t / beatLen;
    this.beatPhase = b - Math.floor(b);
    const k = Math.max(0, 1 - this.beatPhase * 3.5);
    this.beat = k * k;
    this.musicT = t;
  }

  onBeat() {
    const beatLen = 60 / this.level.bpm;
    const b = this.musicT / beatLen;
    return Math.abs(b - Math.round(b)) * beatLen <= CONFIG.beatWindow;
  }

  press() {
    if (this.state === "play" && this.hero.state === "run") this.hero.buffer = CONFIG.jumpBuffer;
  }

  whistle() {
    const h = this.hero;
    if (this.state !== "play" || h.state !== "run" || h.whistleCD > 0) return;
    h.whistleCD = CONFIG.whistleCooldown;
    h.whistleT = 0.45;
    this.hooks.sfx("whistle");
    this.fx.whistle(h.x + 30, h.y - 80);
    const lo = h.x - CONFIG.whistleRangeBehind;
    const hi = h.x + CONFIG.whistleRangeAhead;
    for (const c of this.level.critters) {
      if (c.x > lo && c.x < hi) c.whistled();
    }
    for (const p of this.level.platforms) {
      if (p.type === "barrel" && !p.popped && p.x + p.w > lo && p.x < hi) {
        p.pop(this);
        this.hooks.sfx("pop");
      }
    }
  }

  addMeter(v) {
    this.meter = Math.max(0, Math.min(100, this.meter + v));
  }

  step(dt, held) {
    this.time += dt;
    const h = this.hero;
    const L = this.level;

    for (const p of L.platforms) p.update(dt, this);
    for (const c of L.critters) c.update(dt, this);
    for (const d of L.decos) d.update(dt, this);
    this.fx.update(dt);

    if (this.state === "play") this.runTime += dt;

    if (h.state === "splash") {
      h.stateT += dt;
      if (h.stateT > CONFIG.splashTime) this.respawn();
    } else {
      const wasGround = !!h.ground;
      stepHero(h, dt, held, L.platforms, L.landing.x, {
        jump: () => {
          this.hooks.sfx("jump");
          this.hooks.haptic("light");
        },
        land: (hero) => {
          hero.squash = 0.72;
          this.fx.dust(hero.x, hero.y);
          this.hooks.sfx("land");
          if (!wasGround && this.state === "play" && this.onBeat()) {
            this.bonus++;
            this.fx.pop(hero.x, hero.y - 110, "♪ ON BEAT");
            this.hooks.sfx("beat");
            this.hooks.haptic("medium");
          }
        },
      });

      // Fell in the river.
      if (h.y > CONFIG.waterY + CONFIG.drownDepth && this.state === "play") {
        h.state = "splash";
        h.stateT = 0;
        h.vy = 0;
        h.ground = null;
        this.falls++;
        this.addMeter(CONFIG.meterFall);
        this.fx.splash(h.x, 1.2);
        this.fx.pop(h.x, CONFIG.waterY - 120, "SPLASH!");
        this.hooks.sfx("splash");
        this.hooks.haptic("heavy");
        this.boat.toot();
        this.hooks.sfx("toot");
      }
    }

    if (this.state === "play" && h.state === "run") {
      this.collide();
      // The Captain falls behind while you run cleanly, gains while you're stuck.
      if (h.blocked) this.addMeter(10 * dt);
      else this.addMeter(-CONFIG.meterDrainPerSec * dt);
    }

    // Hints.
    for (const hint of L.hints) {
      if (!hint.shown && h.x >= hint.x) {
        hint.shown = true;
        this.hint = { hint, t: 0 };
      }
    }
    if (this.hint) {
      this.hint.t += dt;
      if (this.hint.t > 3.2) this.hint = null;
    }

    // Win and lose.
    if (this.state === "play") {
      if (this.meter >= 100) {
        this.state = "caught";
        this.endT = 0;
        if (h.state === "splash") this.respawn();
        h.state = "caught";
        this.hooks.sfx("toot");
        this.hooks.haptic("error");
        this.boat.toot();
      } else if (h.x >= L.landing.x && h.ground) {
        this.state = "won";
        this.endT = 0;
        h.state = "won";
        this.hooks.haptic("success");
      }
    } else if (this.state === "won" || this.state === "caught") {
      this.endT += dt;
      if (this.state === "caught") {
        // The boat surges forward to scoop the hero up.
        const heroScreen = h.x - this.camX;
        this.boat.extra = Math.min(heroScreen + 60 - CONFIG.boatBowMax, this.boat.extra + dt * 260);
      }
      if (this.endT > 1.8) {
        const result = this.result();
        this.state = "done";
        if (result.won) this.hooks.win(result);
        else this.hooks.lose(result);
      }
    }

    // Camera keeps the hero a third of the way in.
    const target = Math.max(0, h.x - W * CONFIG.cameraLead);
    if (h.state !== "splash") this.camX += (target - this.camX) * Math.min(1, dt * 8);

    this.boat.update(dt, this.meter, this.time, this.beat);
  }

  collide() {
    const h = this.hero;
    const r = heroRect(h);
    // Notes.
    for (const n of this.level.notes) {
      if (n.collected) continue;
      if (n.x > r.x - 16 && n.x < r.x + r.w + 16 && n.y > r.y - 16 && n.y < r.y + r.h + 10) {
        n.collected = true;
        this.notes++;
        this.fx.sparkle(n.x, n.y);
        this.hooks.sfx("note");
      }
    }
    // Critters.
    for (const c of this.level.critters) {
      const cx = Math.max(r.x, Math.min(c.x, r.x + r.w));
      const cy = Math.max(r.y, Math.min(c.cy, r.y + r.h));
      const d = Math.hypot(cx - c.x, cy - c.cy);
      if (d > c.r - 2) continue;
      if (c.stun > 0) {
        if (h.vy > 0 && h.y < c.cy + 4) {
          // Bounce off a flipped critter for a higher jump.
          startJump(h, {}, CONFIG.critterBounceVelocity);
          c.squish = 1;
          this.hooks.sfx("bounce");
          this.hooks.haptic("light");
          this.fx.pop(c.x, c.cy - 50, "BOING!");
        }
      } else if (h.invuln <= 0) {
        this.hits++;
        h.invuln = CONFIG.invulnerableTime;
        h.hurtT = 0.45;
        if (h.ground) {
          h.ground = null;
          h.vy = -420;
        }
        this.addMeter(CONFIG.meterHit);
        this.fx.pop(h.x, h.y - 120, "OUCH!");
        this.hooks.sfx("hit");
        this.hooks.haptic("heavy");
        this.boat.toot();
        this.hooks.sfx("toot");
      }
    }
  }

  respawn() {
    const h = this.hero;
    const p = h.lastSafe;
    const lo = p.x + 30;
    const hi = p.x + p.w - 60;
    let x = lo > hi ? p.x + p.w / 2 : Math.max(lo, Math.min(h.safeX - 160, hi));
    // Don't respawn inside a crate.
    for (const q of this.level.platforms) {
      if (q !== p && q.solid === "full" && x + 20 > q.x && x - 20 < q.x + q.w && q.y < p.y) x = q.x - 24;
    }
    // Barrels come back so the way ahead is always passable.
    for (const q of this.level.platforms) {
      if (q.type === "barrel" && q.popped) {
        q.popped = false;
        q.solid = "top";
      }
    }
    h.x = x;
    h.y = p.y;
    h.vy = 0;
    h.ground = p;
    h.state = "run";
    h.stateT = 0;
    h.invuln = 1.5;
    h.squash = 0.7;
  }

  result() {
    const won = this.state === "won" || (this.state === "done" && this.hero.state === "won");
    const ratio = this.totalNotes ? this.notes / this.totalNotes : 1;
    const stars = won ? 1 + (ratio >= 0.8 ? 1 : 0) + (this.falls === 0 && this.hits === 0 ? 1 : 0) : 0;
    return {
      won,
      stars,
      notes: this.notes + this.bonus,
      collected: this.notes,
      bonus: this.bonus,
      totalNotes: this.totalNotes,
      ratio,
      clean: this.falls === 0 && this.hits === 0,
      distanceFt: this.distanceFt,
      progress: Math.min(1, this.hero.x / this.level.landing.x),
      timeSec: Math.round(this.runTime * 10) / 10,
    };
  }

  heroPose() {
    const h = this.hero;
    if (h.state === "caught") return "caught";
    if (h.state === "won") return h.speed > 20 ? "run" : "dance";
    if (h.hurtT > 0) return "hurt";
    if (h.state === "splash") return "fall";
    if (h.ground) return "run";
    return h.vy < 0 ? "jump" : "fall";
  }

  draw(ctx) {
    const cam = Math.round(this.camX * 2) / 2;
    const L = this.level;
    drawBackground(ctx, cam, this);

    ctx.save();
    ctx.translate(-cam, 0);
    const left = cam - 200;
    const right = cam + W + 200;
    for (const d of L.decos) {
      if (d.x + d.w > left && d.x - 60 < right) d.draw(ctx, this);
    }
    for (const p of L.platforms) {
      if (p.x + p.w > left && p.x < right) p.draw(ctx, this);
    }
    for (const n of L.notes) {
      if (n.x > left && n.x < right) n.draw(ctx, this);
    }
    for (const c of L.critters) {
      if (c.x > left && c.x < right) c.draw(ctx, this);
    }
    ctx.restore();

    this.boat.draw(ctx, this);

    ctx.save();
    ctx.translate(-cam, 0);
    const h = this.hero;
    const flicker = h.invuln > 0 && h.state === "run" && Math.floor(this.time * 14) % 2 === 0;
    if (!flicker) {
      let y = h.y;
      if (h.state === "splash") y = CONFIG.waterY + CONFIG.drownDepth + h.stateT * 120;
      drawHero(ctx, {
        x: h.x,
        y,
        pose: this.heroPose(),
        t: this.time,
        phase: h.phase,
        squash: h.squash,
        whistle: h.whistleT > 0 ? 1 : 0,
        scale: CONFIG.heroScale,
        beat: this.beat,
        shadow: !!h.ground,
      });
    }
    this.fx.draw(ctx);
    ctx.restore();

    drawForeground(ctx, cam, this);
    drawPaperFinish(ctx);
  }
}
