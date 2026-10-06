// Web Audio synth: an original ragtime loop ("The Levee Rag") plus sound
// effects. Everything is synthesized; there are no audio files.
import { CONFIG } from "./config.js";

const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

// Note names to MIDI numbers, e.g. "C#5".
const NAMES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function n(name) {
  if (name === "R") return null;
  const m = /^([A-G])(#|b)?(\d)$/.exec(name);
  let v = NAMES[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
  return v + (Number(m[3]) + 1) * 12;
}

// Melody bars: [note, eighths]. Each bar is 8 eighths.
const A1 = [
  [["E5", 1], ["G5", 2], ["E5", 1], ["C5", 1], ["D5", 1], ["E5", 1], ["G5", 1]],
  [["A5", 2], ["G5", 1], ["E5", 1], ["G5", 3], ["R", 1]],
  [["C#5", 1], ["E5", 1], ["A5", 1], ["G5", 2], ["E5", 1], ["C#5", 1], ["E5", 1]],
  [["G5", 2], ["E5", 1], ["C#5", 1], ["A4", 3], ["R", 1]],
  [["D5", 1], ["F#5", 1], ["A5", 1], ["F#5", 2], ["D5", 1], ["E5", 1], ["F#5", 1]],
  [["G5", 1], ["F5", 1], ["D5", 1], ["B4", 2], ["D5", 1], ["F5", 1], ["G5", 1]],
];
const A_END1 = [
  [["E5", 2], ["C5", 1], ["G4", 1], ["C5", 1], ["E5", 1], ["D5", 1], ["C5", 1]],
  [["B4", 1], ["D5", 1], ["G5", 1], ["F5", 2], ["D5", 1], ["B4", 1], ["G4", 1]],
];
const A_END2 = [
  [["E5", 1], ["D5", 1], ["C5", 2], ["G4", 2], ["C5", 2]],
  [["C5", 1], ["E5", 1], ["G5", 1], ["C6", 3], ["R", 2]],
];
const B = [
  [["A5", 1], ["C6", 2], ["A5", 1], ["F5", 1], ["G5", 1], ["A5", 1], ["C6", 1]],
  [["D6", 2], ["C6", 1], ["A5", 1], ["F5", 3], ["R", 1]],
  [["G5", 1], ["E5", 1], ["C5", 1], ["E5", 2], ["G5", 1], ["E5", 1], ["C5", 1]],
  [["C#5", 1], ["E5", 1], ["G5", 1], ["A5", 2], ["G5", 1], ["E5", 1], ["C#5", 1]],
  [["D5", 1], ["F#5", 1], ["A5", 1], ["C6", 2], ["A5", 1], ["F#5", 1], ["D5", 1]],
  [["G5", 2], ["F5", 1], ["D5", 1], ["B4", 2], ["G4", 2]],
  [["C5", 1], ["E5", 1], ["G5", 1], ["E5", 2], ["C5", 1], ["D5", 1], ["E5", 1]],
  [["D5", 1], ["B4", 1], ["G4", 1], ["B4", 2], ["D5", 1], ["F5", 1], ["G5", 1]],
];
const MELODY = [...A1, ...A_END1, ...A1, ...A_END2, ...B];

const CHORDS = {
  C: { bass: ["C2", "G2"], stab: ["G3", "C4", "E4"] },
  F: { bass: ["F2", "C2"], stab: ["A3", "C4", "F4"] },
  A7: { bass: ["A2", "E2"], stab: ["G3", "C#4", "E4"] },
  D7: { bass: ["D2", "A2"], stab: ["F#3", "A3", "C4"] },
  G7: { bass: ["G2", "D2"], stab: ["F3", "G3", "B3"] },
};
const A_CH = ["C", "C", "A7", "A7", "D7", "G7"];
const PROGRESSION = [
  ...A_CH, "C", "G7",
  ...A_CH, "C", "C",
  "F", "F", "C", "A7", "D7", "G7", "C", "G7",
];

// Flatten into a step list (eighth notes).
const STEPS_PER_BAR = 8;
const SONG_STEPS = MELODY.length * STEPS_PER_BAR;
const LEAD = new Array(SONG_STEPS).fill(null);
MELODY.forEach((bar, b) => {
  let s = b * STEPS_PER_BAR;
  for (const [name, len] of bar) {
    const m = n(name);
    if (m !== null) LEAD[s] = { m, len };
    s += len;
  }
});

class Audio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicBus = null;
    this.sfxBus = null;
    this.muted = false;
    this.paused = false;
    this.musicOn = false;
    this.musicStart = 0;
    this.nextStep = 0;
    this.nextTime = 0;
    this.noise = null;
    this.fallbackClock = 0;
    this.bpm = CONFIG.bpm;
  }

  // Called from every tap, click and key press. iOS Safari only lets audio
  // start from a real user-activation event (touchend, click, keydown), so
  // keep retrying until the context is actually running.
  gesture() {
    this.unlock();
    if (!this.ctx || this.paused || this.ctx.state === "running") return;
    this.prime();
    this.ctx.resume().catch(() => {});
  }

  // Play one silent sample: iOS needs a sound started inside the gesture.
  prime() {
    try {
      const src = this.ctx.createBufferSource();
      src.buffer = this.ctx.createBuffer(1, 1, this.ctx.sampleRate);
      src.connect(this.ctx.destination);
      src.start(0);
    } catch {}
  }

  // Creates the audio context (once). Safe to call outside a gesture;
  // gesture() is what actually starts sound on iOS.
  unlock() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    // Let the iPhone silent switch mute the game.
    try {
      if (navigator.audioSession && "type" in navigator.audioSession) {
        navigator.audioSession.type = "ambient";
      }
    } catch {}
    try {
      this.ctx = new AC({ latencyHint: "interactive" });
    } catch {
      try {
        this.ctx = new AC();
      } catch {
        return;
      }
    }
    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.8;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    this.master.connect(comp).connect(ctx.destination);
    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = 0.42;
    this.musicBus.connect(this.master);
    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = 0.7;
    this.sfxBus.connect(this.master);

    // One second of white noise, reused by percussion and splashes.
    const len = ctx.sampleRate;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    this.prime();
    if (ctx.state !== "running") ctx.resume().catch(() => {});
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) {
      this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ctx.currentTime, 0.02);
    }
  }

  suspend() {
    this.paused = true;
    if (this.ctx && this.ctx.state === "running") this.ctx.suspend().catch(() => {});
  }

  resume() {
    this.paused = false;
    // iOS can also report "interrupted" (after a call or backgrounding).
    if (this.ctx && this.ctx.state !== "running" && this.ctx.state !== "closed") this.ctx.resume().catch(() => {});
  }

  get stepDur() {
    return 60 / this.bpm / 2;
  }

  startMusic(bpm = CONFIG.bpm) {
    this.bpm = bpm;
    this.fallbackClock = 0;
    this.musicOn = true;
    if (!this.ctx) return;
    this.musicStart = this.ctx.currentTime + 0.08;
    this.nextTime = this.musicStart;
    this.nextStep = 0;
  }

  stopMusic() {
    this.musicOn = false;
  }

  // Seconds since the music started, as heard (latency compensated).
  musicTime() {
    if (this.ctx && this.ctx.state === "running") {
      const lat = (this.ctx.outputLatency || 0) + (this.ctx.baseLatency || 0);
      return this.ctx.currentTime - this.musicStart - lat;
    }
    return this.fallbackClock;
  }

  // Called every frame with the frame delta.
  update(dt) {
    this.fallbackClock += dt;
    if (!this.ctx || !this.musicOn || this.ctx.state !== "running") return;
    const now = this.ctx.currentTime;
    // If audio started late, skip the missed steps instead of playing them all at once.
    if (this.nextTime < now - 0.05) {
      this.nextStep = Math.ceil((now - this.musicStart) / this.stepDur);
      this.nextTime = this.musicStart + this.nextStep * this.stepDur;
    }
    const ahead = now + 0.2;
    while (this.nextTime < ahead) {
      this.scheduleStep(this.nextStep % SONG_STEPS, this.nextTime);
      this.nextStep++;
      this.nextTime = this.musicStart + this.nextStep * this.stepDur;
    }
  }

  scheduleStep(step, t) {
    const sd = this.stepDur;
    const bar = Math.floor(step / STEPS_PER_BAR);
    const inBar = step % STEPS_PER_BAR;
    const chord = CHORDS[PROGRESSION[bar]];

    const lead = LEAD[step];
    if (lead) this.tone(this.musicBus, "square", midiHz(lead.m), t, lead.len * sd * 0.9, 0.11, 2600);

    // Oom (bass on beats 1 and 3) and pah (chord on 2 and 4).
    if (inBar === 0 || inBar === 4) {
      const b = n(chord.bass[inBar === 0 ? 0 : 1]);
      this.tone(this.musicBus, "triangle", midiHz(b), t, sd * 1.6, 0.5, 900);
    }
    if (inBar === 2 || inBar === 6) {
      for (const s of chord.stab) this.tone(this.musicBus, "triangle", midiHz(n(s)), t, sd * 0.7, 0.13, 1800);
      this.hit(this.musicBus, t, 0.09, 0.16, 2200, "bandpass");
    }
    // Light percussion tick on every eighth.
    this.hit(this.musicBus, t, 0.025, inBar % 2 === 0 ? 0.09 : 0.05, 7000, "highpass");
  }

  // ---- synth building blocks

  tone(bus, type, freq, t, dur, vol, cutoff = 4000, slideTo = null) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    f.type = "lowpass";
    f.frequency.value = cutoff;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f).connect(g).connect(bus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  hit(bus, t, dur, vol, freq, type = "bandpass", freqEnd = null) {
    const ctx = this.ctx;
    const s = ctx.createBufferSource();
    s.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(bus);
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur + 0.05);
  }

  // ---- sound effects

  sfx(name) {
    if (!this.ctx || this.ctx.state !== "running") return;
    const t = this.ctx.currentTime + 0.005;
    const bus = this.sfxBus;
    switch (name) {
      case "jump": // slide whistle up
        this.tone(bus, "sine", 520, t, 0.16, 0.35, 5000, 1150);
        break;
      case "land":
        this.tone(bus, "sine", 140, t, 0.09, 0.45, 800, 60);
        this.hit(bus, t, 0.05, 0.12, 400, "lowpass");
        break;
      case "note":
        this.tone(bus, "square", 1318, t, 0.06, 0.12, 6000);
        this.tone(bus, "square", 1976, t + 0.06, 0.1, 0.12, 6000);
        break;
      case "beat":
        this.tone(bus, "triangle", 1568, t, 0.08, 0.25, 6000);
        this.tone(bus, "triangle", 2093, t + 0.07, 0.14, 0.25, 6000);
        break;
      case "whistle": {
        // Shrill two-tone with a little vibrato.
        for (const [f, d] of [[1760, 0], [2349, 0.13]]) {
          const o = this.ctx.createOscillator();
          const g = this.ctx.createGain();
          const lfo = this.ctx.createOscillator();
          const lg = this.ctx.createGain();
          lfo.frequency.value = 14;
          lg.gain.value = 22;
          lfo.connect(lg).connect(o.frequency);
          o.frequency.value = f;
          g.gain.setValueAtTime(0.0001, t + d);
          g.gain.exponentialRampToValueAtTime(0.22, t + d + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.14);
          o.connect(g).connect(bus);
          o.start(t + d);
          lfo.start(t + d);
          o.stop(t + d + 0.16);
          lfo.stop(t + d + 0.16);
        }
        break;
      }
      case "pop":
        this.hit(bus, t, 0.18, 0.5, 900, "bandpass");
        this.tone(bus, "square", 220, t, 0.12, 0.2, 1200, 70);
        break;
      case "splash":
        this.hit(bus, t, 0.6, 0.6, 3000, "lowpass", 250);
        this.tone(bus, "sine", 300, t, 0.25, 0.25, 1000, 90);
        break;
      case "hit": // bonk
        this.tone(bus, "square", 330, t, 0.22, 0.25, 1600, 95);
        this.hit(bus, t, 0.06, 0.3, 1500, "bandpass");
        break;
      case "bounce":
        this.tone(bus, "triangle", 300, t, 0.2, 0.4, 3000, 900);
        break;
      case "gull": // two squawks
        this.tone(bus, "square", 1400, t, 0.12, 0.06, 2600, 900);
        this.tone(bus, "square", 1300, t + 0.15, 0.14, 0.05, 2600, 760);
        break;
      case "toot": // the Captain's steam whistle
        this.tone(bus, "sawtooth", 233, t, 0.55, 0.12, 900);
        this.tone(bus, "sawtooth", 294, t, 0.55, 0.1, 900);
        this.hit(bus, t, 0.55, 0.08, 1800, "bandpass");
        break;
      case "win": {
        const seq = ["C5", "E5", "G5", "C6", "G5", "C6"];
        seq.forEach((s, i) => this.tone(bus, "square", midiHz(n(s)), t + i * 0.11, i === 5 ? 0.5 : 0.12, 0.16, 4000));
        for (const s of ["C4", "E4", "G4"]) this.tone(bus, "triangle", midiHz(n(s)), t + 0.55, 0.6, 0.18, 2000);
        break;
      }
      case "lose": {
        // Wah-wah trombone: sawtooth through a swept lowpass.
        const seq = [["G3", 0.32], ["F#3", 0.32], ["F3", 0.32], ["E3", 1.0]];
        let at = t;
        for (const [s, d] of seq) {
          const o = this.ctx.createOscillator();
          const f = this.ctx.createBiquadFilter();
          const g = this.ctx.createGain();
          o.type = "sawtooth";
          o.frequency.value = midiHz(n(s));
          if (d > 0.5) {
            const lfo = this.ctx.createOscillator();
            const lg = this.ctx.createGain();
            lfo.frequency.value = 5;
            lg.gain.value = 4;
            lfo.connect(lg).connect(o.frequency);
            lfo.start(at);
            lfo.stop(at + d);
          }
          f.type = "lowpass";
          f.Q.value = 6;
          f.frequency.setValueAtTime(300, at);
          f.frequency.linearRampToValueAtTime(1400, at + d * 0.35);
          f.frequency.linearRampToValueAtTime(350, at + d);
          g.gain.setValueAtTime(0.0001, at);
          g.gain.exponentialRampToValueAtTime(0.3, at + 0.04);
          g.gain.setValueAtTime(0.3, at + d - 0.06);
          g.gain.exponentialRampToValueAtTime(0.0001, at + d);
          o.connect(f).connect(g).connect(bus);
          o.start(at);
          o.stop(at + d + 0.02);
          at += d;
        }
        break;
      }
    }
  }
}

export const audio = new Audio();
