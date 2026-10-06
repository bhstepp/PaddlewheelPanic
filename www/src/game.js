// One run of a level: world state, rules, and world rendering.
import { CONFIG } from "./config.js";
import { loadLevel } from "./level.js";
import { createHero, stepHero, heroRect, startJump } from "./physics.js";
import { createChaser } from "./entities/chasers.js";
import { POWER_NAMES, POWER_TIPS, instrument } from "./entities/mechanics.js";
import { FX } from "./fx.js";
import { drawHero } from "./art/hero.js";
import { drawPaperFinish } from "./art/scenery.js";
import { getTheme } from "./art/themes/index.js";
import { zoneOf } from "./zones/index.js";
import { SONGS } from "./music/songs.js";

const W = CONFIG.width;

export const POSES = ["run", "jump", "fall", "swing", "hurt", "dance", "caught", "stand"];

export class Game {
  constructor(hooks) {
    this.hooks = hooks; // { sfx(name), haptic(kind), win(result), lose(result), musicTime() }
    this.fx = new FX();
  }

  // def: a level definition. opts.zone overrides the zone (daily matinee);
  // opts.ghost is a recorded run to race against.
  load(def, opts = {}) {
    this.def = def;
    this.mode = opts.mode ?? "level";
    this.zone = opts.zone ?? zoneOf(def.id);
    this.theme = getTheme(this.zone.theme);
    this.songId = this.zone.song;
    this.bpm = SONGS[this.songId].bpm;
    this.boat = createChaser(this.theme.chaser);
    this.ghostRun = opts.ghost ?? null;
    this.reset();
  }

  reset() {
    this.level = loadLevel(this.def, this.theme, { bpm: this.bpm });
    const first = this.level.platforms.find((p) => p.type === "dock");
    this.hero = createHero(first.x + 80, first.y);
    this.hero.ground = first;
    this.hero.lastSafe = first;
    this.camX = 0;
    this.boss = this.level.boss;
    this.meter = this.boss ? CONFIG.boss.meterStart : CONFIG.meterStart;
    this.notes = 0;
    this.bonus = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.totalNotes = this.level.notes.length;
    this.falls = 0;
    this.hits = 0;
    this.reel = false;
    this.time = 0;
    this.runTime = 0;
    this.state = "play"; // play | won | caught | done
    this.endT = 0;
    this.hint = null;
    this.beat = 0;
    this.beatPhase = 0;
    this.beatCount = 0;
    this.musicT = 0;
    this.boat.reset();
    this.fx.reset();
    // Ghost recording (20 samples a second).
    this.record = [];
    this.recT = 0;
  }

  get distanceFt() {
    return Math.floor(Math.min(this.hero.x, this.level.landing.x) / this.level.pxPerFt);
  }

  // Beat helpers driven by the music clock.
  setMusicTime(t) {
    const beatLen = 60 / this.bpm;
    const b = t / beatLen;
    this.beatCount = b;
    this.beatPhase = b - Math.floor(b);
    const k = Math.max(0, 1 - this.beatPhase * 3.5);
    this.beat = k * k;
    this.musicT = t;
  }

  onBeat() {
    const beatLen = 60 / this.bpm;
    const b = this.musicT / beatLen;
    return Math.abs(b - Math.round(b)) * beatLen <= CONFIG.beatWindow;
  }

  showHint(text, desktop = text) {
    this.hint = { hint: { text, desktop }, t: 0 };
  }

  press() {
    if (this.state === "play" && this.hero.state === "run") this.hero.buffer = CONFIG.jumpBuffer;
  }

  // Swipe up: a whistle, or a BOOM while carrying the bass drum.
  whistle() {
    const h = this.hero;
    if (this.state !== "play" || h.state !== "run") return;
    if (h.power?.kind === "drum" && h.power.uses > 0) {
      this.drumBoom();
      return;
    }
    if (h.whistleCD > 0) return;
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
    for (const s of this.level.switches) {
      if (!s.used && s.x > lo && s.x < hi + 120) this.flipSwitch(s);
    }
  }

  drumBoom() {
    const h = this.hero;
    h.power.uses--;
    if (h.power.uses <= 0) h.power = null;
    h.whistleT = 0.3;
    this.hooks.sfx("boom");
    this.hooks.haptic("heavy");
    if (!h.ground && !h.swing) h.vy = Math.max(h.vy, 900);
    this.fx.shockwave(h.x, h.y - 20);
    this.fx.pop(h.x, h.y - 130, "BOOM!");
    const R = CONFIG.drumRadius;
    for (const c of this.level.critters) if (Math.abs(c.x - h.x) < R) c.whistled();
    for (const p of this.level.platforms) {
      if (p.breakable && !p.broken && Math.abs(p.x - h.x) < R) this.smash(p);
    }
    for (const s of this.level.switches) if (!s.used && Math.abs(s.x - h.x) < R) this.flipSwitch(s);
  }

  smash(p) {
    p.broken = true;
    p.solid = null;
    this.fx.debris(p.x + p.w / 2, p.y + p.h / 2);
    this.hooks.sfx("pop");
  }

  flipSwitch(s) {
    s.used = true;
    this.addMeter(-CONFIG.boss.switchKnock);
    this.boat.knock?.();
    this.boat.toot();
    this.hooks.sfx("crash");
    this.hooks.haptic("success");
    this.fx.pop(s.x, s.y - 110, "CRASH! TAKE THAT, CAPTAIN!");
  }

  // Launch the hero upward. Balloons give a fixed arc (no hold extension).
  bounce(v, x, y, text, allowHold = true) {
    startJump(this.hero, {}, v);
    this.hero.holding = allowHold;
    this.hooks.sfx("bounce");
    this.hooks.haptic("light");
    this.fx.pop(x, y - 40, text);
  }

  addMeter(v) {
    this.meter = Math.max(0, Math.min(100, this.meter + v));
  }

  breakCombo() {
    this.combo = 0;
  }

  step(dt, held) {
    this.time += dt;
    const h = this.hero;
    const L = this.level;

    for (const p of L.platforms) p.update(dt, this);
    for (const c of L.critters) c.update(dt, this);
    for (const d of L.decos) d.update(dt, this);
    for (const k of L.hooks) k.update(dt, this);
    for (const s of L.switches) s.update(dt, this);
    this.fx.update(dt);

    if (this.state === "play") this.runTime += dt;

    // Power-up timer.
    if (h.power) {
      h.power.t -= dt;
      if (h.power.t <= 0) h.power = null;
    }

    if (h.state === "splash") {
      h.stateT += dt;
      if (h.stateT > CONFIG.splashTime) this.respawn();
    } else {
      const wasGround = !!h.ground;
      const airT = h.airT;
      stepHero(
        h,
        dt,
        held,
        L.platforms,
        L.landing.x,
        {
          jump: () => {
            this.hooks.sfx("jump");
            this.hooks.haptic("light");
          },
          grab: () => {
            this.hooks.sfx("grab");
            this.hooks.haptic("light");
          },
          release: () => this.hooks.sfx("jump"),
          bump: (hero, p) => {
            if (hero.power?.kind === "washboard" && p.breakable && !p.broken) this.smash(p);
          },
          land: (hero, p) => {
            hero.squash = 0.72;
            this.fx.dust(hero.x, hero.y);
            this.hooks.sfx("land");
            if (!wasGround && this.state === "play" && airT > 0.2) this.landedOnBeat(hero);
            p.onLand?.(hero, this);
          },
        },
        L.hooks,
      );

      // Fell off into the hazard below.
      if (h.y > CONFIG.waterY + CONFIG.drownDepth && this.state === "play") this.fell();
    }

    if (this.state === "play" && h.state === "run") {
      this.collide();
      if (this.boss) {
        // The Captain keeps coming; only switches and clean running hold him off.
        this.addMeter((h.blocked ? 10 : CONFIG.boss.meterRise) * dt);
      } else if (h.blocked) this.addMeter(10 * dt);
      else this.addMeter(-CONFIG.meterDrainPerSec * (h.power?.kind === "washboard" ? 3 : 1) * dt);
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
        h.swing = null;
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
        // The Captain surges forward to scoop the hero up.
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

    // Record the run for ghost replays.
    if (this.state === "play") {
      this.recT += dt;
      if (this.recT >= 0.05) {
        this.recT -= 0.05;
        this.record.push(Math.round(h.x), Math.round(h.y), POSES.indexOf(this.heroPose()));
      }
    }

    // Camera keeps the hero a third of the way in.
    const target = Math.max(0, h.x - W * CONFIG.cameraLead);
    if (h.state !== "splash") this.camX += (target - this.camX) * Math.min(1, dt * 8);

    this.boat.update(dt, this.meter, this.time, this.beat);
  }

  landedOnBeat(hero) {
    if (this.onBeat()) {
      this.combo = Math.min(CONFIG.comboMax, this.combo + 1);
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      this.bonus += this.combo;
      this.fx.pop(hero.x, hero.y - 110, this.combo > 1 ? `♪ ON BEAT ×${this.combo}` : "♪ ON BEAT");
      this.hooks.sfx("beat");
      this.hooks.haptic("medium");
    } else {
      this.breakCombo();
    }
  }

  fell() {
    const h = this.hero;
    // The tuba blows a bubble that floats you back to safety, once.
    if (h.power?.kind === "tuba") {
      h.power = null;
      this.hooks.sfx("bubble");
      this.fx.pop(h.x, CONFIG.waterY - 120, "SAVED BY THE TUBA!");
      this.respawn(true);
      return;
    }
    h.state = "splash";
    h.stateT = 0;
    h.vy = 0;
    h.ground = null;
    h.swing = null;
    this.falls++;
    this.breakCombo();
    this.addMeter(CONFIG.meterFall);
    const fall = this.theme.fall;
    if (fall.fx === "splash") this.fx.splash(h.x, 1.2);
    else this.fx.dust(h.x, CONFIG.waterY);
    this.fx.pop(h.x, CONFIG.waterY - 120, fall.text);
    this.hooks.sfx(fall.fx === "splash" ? "splash" : "hit");
    this.hooks.haptic("heavy");
    this.boat.toot();
    this.hooks.sfx("toot");
  }

  collide() {
    const h = this.hero;
    const r = heroRect(h);
    const near = (x, y, pad) => x > r.x - pad && x < r.x + r.w + pad && y > r.y - pad && y < r.y + r.h + pad;
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
    // Instrument power-ups.
    for (const p of this.level.powers) {
      if (p.taken || !near(p.x, p.y, 26)) continue;
      p.taken = true;
      h.power = { kind: p.kind, t: CONFIG.powerTime[p.kind], uses: p.kind === "drum" ? CONFIG.drumUses : 1 };
      this.hooks.sfx("power");
      this.hooks.haptic("success");
      this.fx.sparkle(p.x, p.y);
      this.fx.pop(p.x, p.y - 60, POWER_NAMES[p.kind]);
      this.showHint(POWER_TIPS[p.kind]);
    }
    // The hidden film reel.
    for (const k of this.level.reels) {
      if (k.taken || !near(k.x, k.y, 22)) continue;
      k.taken = true;
      this.reel = true;
      this.hooks.sfx("reel");
      this.hooks.haptic("success");
      this.fx.sparkle(k.x, k.y);
      this.fx.pop(k.x, k.y - 50, "FILM REEL!");
    }
    // Critters and ghosts.
    for (const c of this.level.critters) {
      const cx = Math.max(r.x, Math.min(c.x, r.x + r.w));
      const cy = Math.max(r.y, Math.min(c.cy, r.y + r.h));
      const d = Math.hypot(cx - c.x, cy - c.cy);
      if (d > c.r - 2) continue;
      if (h.power?.kind === "washboard" && c.stun <= 0) {
        c.whistled();
        this.fx.pop(c.x, c.cy - 50, "WHAM!");
        this.hooks.sfx("hit");
        continue;
      }
      if (c.stun > 0) {
        if (c.type !== "ghost" && h.vy > 0 && h.y < c.cy + 4) {
          // Bounce off a flipped critter for a higher jump.
          startJump(h, {}, CONFIG.critterBounceVelocity);
          c.squish = 1;
          this.hooks.sfx("bounce");
          this.hooks.haptic("light");
          this.fx.pop(c.x, c.cy - 50, "BOING!");
        }
      } else if (h.invuln <= 0) {
        this.hits++;
        this.breakCombo();
        h.invuln = CONFIG.invulnerableTime;
        h.hurtT = 0.45;
        if (h.swing) h.swing = null;
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

  respawn(saved = false) {
    const h = this.hero;
    const p = h.lastSafe;
    const lo = p.x + 30;
    const hi = p.x + p.w - 60;
    let x = lo > hi ? p.x + p.w / 2 : Math.max(lo, Math.min(h.safeX - 160, hi));
    // Don't respawn inside a crate.
    for (const q of this.level.platforms) {
      if (q !== p && q.solid === "full" && x + 20 > q.x && x - 20 < q.x + q.w && q.y < p.y) x = q.x - 24;
    }
    // Popped barrels, crumbled ledges and balloons come back so the way
    // ahead is always passable.
    for (const q of this.level.platforms) {
      if (q.type === "barrel" && q.popped) {
        q.popped = false;
        q.solid = "top";
      }
      if (q.x > x - 200) q.reset?.();
    }
    h.x = x;
    h.y = p.y;
    h.vy = 0;
    h.boost = 0;
    h.swing = null;
    h.ground = p;
    h.state = "run";
    h.stateT = 0;
    h.invuln = 1.5;
    h.squash = 0.7;
    if (saved) this.fx.bubble(h.x, h.y - 50);
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
      bestCombo: this.bestCombo,
      totalNotes: this.totalNotes,
      ratio,
      clean: this.falls === 0 && this.hits === 0,
      reel: this.reel,
      distanceFt: this.distanceFt,
      progress: Math.min(1, this.hero.x / this.level.landing.x),
      timeSec: Math.round(this.runTime * 10) / 10,
      ghost: won ? this.record.slice() : null,
    };
  }

  heroPose() {
    const h = this.hero;
    if (h.state === "caught") return "caught";
    if (h.state === "won") return h.speed > 20 ? "run" : "dance";
    if (h.hurtT > 0) return "hurt";
    if (h.state === "splash") return "fall";
    if (h.swing) return "swing";
    if (h.ground) return "run";
    return h.vy < 0 ? "jump" : "fall";
  }

  draw(ctx) {
    const cam = Math.round(this.camX * 2) / 2;
    const L = this.level;
    const left = cam - 200;
    const right = cam + W + 200;
    const vis = (x, w = 0) => x + w > left && x < right;
    this.theme.drawBackground(ctx, cam, this);

    ctx.save();
    ctx.translate(-cam, 0);
    for (const d of L.decos) if (vis(d.x - 60, d.w + 60)) d.draw(ctx, this);
    for (const p of L.platforms) if (vis(p.x, p.w)) p.draw(ctx, this);
    for (const k of L.hooks) if (vis(k.x - 40, 80)) k.draw(ctx, this);
    for (const s of L.switches) if (vis(s.x - 40, 80)) s.draw(ctx, this);
    for (const n of L.notes) if (vis(n.x)) n.draw(ctx, this);
    for (const p of L.powers) if (vis(p.x - 40, 80)) p.draw(ctx, this);
    for (const k of L.reels) if (vis(k.x - 30, 60)) k.draw(ctx, this);
    for (const c of L.critters) if (vis(c.x - 40, 80)) c.draw(ctx, this);
    ctx.restore();

    this.boat.draw(ctx, this);

    ctx.save();
    ctx.translate(-cam, 0);
    this.drawGhost(ctx);
    const h = this.hero;
    const flicker = h.invuln > 0 && h.state === "run" && Math.floor(this.time * 14) % 2 === 0;
    if (!flicker) {
      let y = h.y;
      if (h.state === "splash") y = CONFIG.waterY + CONFIG.drownDepth + h.stateT * 120;
      const reach = h.swing ? { dx: h.swing.hook.x - h.x, dy: h.swing.hook.y - h.y } : null;
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
        reach,
      });
      if (h.power && h.state === "run") {
        // The instrument floats beside him while it lasts.
        const blink = h.power.t < 2 && Math.floor(this.time * 8) % 2 === 0;
        if (!blink) instrument(ctx, h.power.kind, h.x - 78, h.y - 150 + Math.sin(this.time * 6) * 4, 0.85);
        if (h.gliding) this.fx.glideTrail(h.x, h.y - 100);
      }
    }
    this.fx.draw(ctx);
    ctx.restore();

    this.theme.drawForeground(ctx, cam, this);
    drawPaperFinish(ctx);
  }

  // A flickering film-ghost of your best run, if one was loaded.
  drawGhost(ctx) {
    const g = this.ghostRun;
    if (!g || this.state !== "play") return;
    const i = Math.min(Math.floor(this.runTime / 0.05), g.length / 3 - 1) * 3;
    if (i < 0) return;
    ctx.save();
    ctx.globalAlpha = 0.28 + Math.random() * 0.08;
    drawHero(ctx, {
      x: g[i],
      y: g[i + 1],
      pose: POSES[g[i + 2]] ?? "run",
      t: this.time,
      phase: this.time * 22,
      scale: CONFIG.heroScale,
      shadow: false,
    });
    ctx.restore();
  }
}
