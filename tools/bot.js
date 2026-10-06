// Planning bot that plays levels to check they can be finished. It reads
// the level and simulates jumps ahead to pick when to jump and how long to
// hold. Used by tools/level-check.html (serve from the repo root).
export async function runBot(spec, opts = {}) {
  const { Game } = await import("../www/src/game.js");
  const { CONFIG } = await import("../www/src/config.js");
  const { levelDef } = await import("../www/src/levels/index.js");
  const { ZONES } = await import("../www/src/zones/index.js");
  const def = typeof spec === "string" ? levelDef(spec) : spec;
  const zone = opts.zone ? ZONES.find((z) => z.id === opts.zone) : undefined;
  let res = null;
  const log = [];
  const g = new Game({ sfx() {}, haptic() {}, musicTime() { return 0; }, win(r) { res = r; }, lose(r) { res = r; } });
  g.load(def, zone ? { zone } : {});
  const dt = CONFIG.step;
  let t = 0, held = false, holdFor = 0, holdT = 0, mode = null;
  const beatLen = 60 / g.bpm;
  const jit = opts.jit ?? 0;
  const solidAt = (p, tau) => {
    if (p.type === "beat") {
      const b = (g.musicT + tau) / beatLen + p.offset;
      return ((b % p.period) + p.period) % p.period < p.on;
    }
    if (p.type === "crumble") return p.t < 0;
    if (p.type === "balloon") return p.popT <= 0;
    return !!p.solid || p.type === "barrel";
  };
  const topAt = (p, tau) => {
    if (p.type === "lift") return p.baseY + Math.sin((g.time + tau) * p.speed + p.phase) * p.range;
    if (p.type === "barrel") return p.baseY;
    return p.y;
  };
  const xAt = (p, tau) => (p.type === "raft" ? p.baseX + Math.sin((g.time + tau) * p.speed + p.phase) * p.drift : p.x);
  // Simulate a jump from the current state: returns landing {x, tau} at height y.
  function sim(hf, glide, targetY, v0 = CONFIG.jumpVelocity) {
    const h = g.hero;
    let x = h.x, y = h.y, vy = -v0, ht = 0, tt = 0;
    const sp = h.speed;
    while (tt < 3) {
      tt += dt; ht += dt;
      let gs = ht < hf && vy < 0 ? CONFIG.jumpHoldGravity : 1;
      let cap = CONFIG.maxFallSpeed;
      if (glide && vy > 0) { gs = CONFIG.glideGravity; cap = CONFIG.glideMaxFall; }
      vy = Math.min(cap, vy + CONFIG.gravity * gs * dt); x += sp * dt; y += vy * dt;
      if (vy > 0 && y >= targetY) return { x, tau: tt };
    }
    return null;
  }
  function nextTarget(cur) {
    const end = cur.x + cur.w;
    return g.level.platforms
      .filter((q) => q !== cur && q.solid !== undefined && xAt(q, 0) + q.w > end + 4 && q.type !== "crate" && q.type !== "spring")
      .sort((a, b) => xAt(a, 0) - xAt(b, 0))[0];
  }
  while (!res && t < 240) {
    t += dt;
    g.setMusicTime(t);
    const h = g.hero;
    const hooksAhead = g.level.hooks.filter((k) => k.x > h.x - 10 && k.x - h.x < 420);
    if (h.swing) {
      held = h.swing.theta < (opts.release ?? 0.72);
      mode = "hook";
    } else if (h.ground && h.state === "run") {
      mode = null;
      const p = h.ground;
      const edge = p.x + p.w - h.x;
      const wall = g.level.platforms.find((q) => q.solid === "full" && q.type === "crate" && q.x > h.x && q.x - h.x < 30 + h.speed * 0.06 && q.y < h.y - 5);
      const next = nextTarget(p);
      const gap = next ? xAt(next, 0) - (p.x + p.w) : 999;
      if (p.type === "beat" && !solidAt(p, 0.05) && next) {
        // About to blink out under us: hop now.
        g.press(); held = true; holdFor = 0.26; holdT = 0;
      } else if (wall && !(h.power?.kind === "drum" && wall.breakable)) {
        g.press(); held = true; holdFor = 0.26; holdT = 0;
      } else if (next && gap > 2 && p.type !== "spring") {
        const glide = h.power?.kind === "trombone";
        const hookJump = gap > 270 && hooksAhead.length > 0;
        if (hookJump && edge < 20 + jit) {
          g.press(); held = true; mode = "hook"; holdFor = 99; holdT = 0;
        } else if (!hookJump && edge < 130) {
          // Pick a hold time whose landing lands on the target while it is solid.
          let best = null;
          const ty = topAt(next, 0.6);
          for (let hf = 0; hf <= 0.26; hf += 0.02) {
            const L = sim(hf, glide, ty);
            if (!L) continue;
            const tx = xAt(next, L.tau);
            // Stay solid from touchdown until we can run off its far end.
            const cross = next.type === "beat" ? (opts.cross ?? 0.15) : 0.4;
            let ok = L.x > tx + 10 && L.x < tx + next.w - 10;
            for (let k = -0.08; ok && k <= cross; k += 0.05) ok = solidAt(next, L.tau + k);
            const err = Math.abs(L.x - (tx + next.w * 0.4));
            if (ok && (!best || err < best.err)) best = { hf, err };
          }
          if (best && (edge < 14 + jit || next.type === "beat" || next.type === "lift")) {
            g.press(); held = true; holdFor = glide ? 99 : best.hf; holdT = 0; mode = glide ? "glide" : null;
          } else if (edge < 6) {
            g.press(); held = true; holdFor = glide ? 99 : 0.26; holdT = 0; mode = glide ? "glide" : null;
          }
        }
      }
    } else if (!h.ground) {
      if (mode === "hook" || mode === "glide") held = mode === "glide" || hooksAhead.some((k) => k.x - h.x < 300) || held;
      if (mode === "hook" && !hooksAhead.length) held = false;
      if (h.vy < -890 && h.vy > -1200 && h.airT < 0.05) {
        // Fresh bounce: plan the hold toward the next platform ahead.
        const ahead = g.level.platforms.filter((q) => q.solid && xAt(q, 0) > h.x + 40 && q.type !== "crate").sort((a, b) => xAt(a, 0) - xAt(b, 0))[0];
        let best = 0.26, err = 1e9;
        if (ahead) for (let hf = 0; hf <= 0.26; hf += 0.02) {
          const L = sim(hf, false, topAt(ahead, 0.6), -h.vy);
          if (!L) continue;
          const e = Math.abs(L.x - (xAt(ahead, L.tau) + ahead.w / 2));
          if (e < err) { err = e; best = hf; }
        }
        held = true; holdFor = best; holdT = 0;
      }
    }
    if (held && mode !== "hook" && mode !== "glide") { holdT += dt; if (holdT > holdFor) held = false; }
    // Whistle at critters, ghosts and switches; boom walls with the drum.
    const c = g.level.critters.find((c) => c.stun <= 0 && c.x - h.x > 90 && c.x - h.x < 260);
    const sw = g.level.switches.find((s) => !s.used && s.x - h.x > 0 && s.x - h.x < 400);
    const wallB = g.level.platforms.find((q) => q.breakable && !q.broken && q.x - h.x > 0 && q.x - h.x < 200);
    if ((c || sw) && h.whistleCD <= 0 && !(h.power?.kind === "washboard")) g.whistle();
    if (wallB && h.power?.kind === "drum") g.whistle();
    const f0 = g.falls, h0 = g.hits;
    g.step(dt, held);
    if (opts.trace && h.x > opts.trace[0] && h.x < opts.trace[1] && Math.round(t * 120) % (opts.every ?? 6) === 0)
      log.push(`\n${t.toFixed(2)} x${Math.round(h.x)} y${Math.round(h.y)} vy${Math.round(h.vy)} b${Math.round(h.boost)} ${h.ground ? h.ground.type + "@" + Math.round(h.ground.x) : "-"} ${h.swing ? "sw" + h.swing.theta.toFixed(2) + "/" + Math.round(h.swing.L) : ""} ${held ? "H" : ""} ${mode || ""}`);
    if (g.falls > f0) log.push("fall@" + Math.round(h.x));
    if (g.hits > h0) log.push("hit@" + Math.round(h.x));
  }
  if (!res) return { error: "timeout", x: Math.round(g.hero.x), log: log.join(" ") };
  return { won: res.won, stars: res.stars, notes: `${res.collected}/${res.totalNotes}+${res.bonus}`, reel: res.reel, ft: res.distanceFt, time: res.timeSec, meter: Math.round(g.meter), log: log.join(" ") };
}
