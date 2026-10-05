# Paddlewheel Panic: Demo Build Spec

This document is the build brief for Claude Code. Read all of it before writing code. Build the demo described here as a static web game hosted on GitHub Pages. Structure it so the same code can later be wrapped as a native iOS app with Capacitor, without a rewrite.

---

## 1. What we're building

**Paddlewheel Panic** is a side-scrolling auto-runner set on a 1928 river. The hero has jumped ship, and the steamboat Captain is chasing him downriver. The player runs automatically, taps to jump between barrels, crates and docks, and swipes up to whistle at river critters. The goal is to reach the landing before the Captain catches up.

The demo is **one river leg, about 60 to 90 seconds long**, with:

- a title screen styled as a silent-film intertitle card
- one hand-authored level
- a win screen ("You made the landing!") and a lose screen ("The Captain caught you!")
- a restart loop

Success means a friend can open the GitHub Pages link on an iPhone, turn it sideways, play a full run, and want to play again.

---

## 2. Hard constraints

1. **No build step for the web version.** Plain HTML, CSS and JavaScript (ES modules). No frameworks, no bundler, no npm packages needed to run the game. A static file server must be enough.
2. **All game files live in `www/`.** GitHub Pages deploys `www/`. Capacitor will later use `www/` as its `webDir`. Do not put game files anywhere else.
3. **No external network requests at runtime.** No CDNs, no web fonts from Google, no analytics. Everything ships in the repo so it works offline and inside an iOS app.
4. **Canvas 2D rendering.** One `<canvas>`, drawn by code. Art is drawn procedurally with vector paths (no image files required for the demo).
5. **Grayscale only.** Use only the palette in section 6. No color anywhere.
6. **Respect the iPhone silent switch.** When the ringer switch is on silent, the game must be silent (see section 9).
7. **Target 60 fps on a recent iPhone in Safari.**

---

## 3. Intellectual property guardrails (must follow)

The hero is intended to be the 1928 *Steamboat Willie* version of the character, which entered the US public domain in January 2024. Later versions of the character are still copyrighted, and the name and likeness are still Disney trademarks.

For this demo:

- **Draw the hero as a stand-in character:** a small rubber-hose deckhand in a straw boater hat (light round head with dot eyes, black bean-shaped body, bendy black limbs, black hands, big black shoes). Isolate all hero drawing in `www/src/art/hero.js` behind a single `drawHero(ctx, state)` function so final art can be swapped in later.
- Do not use the character's name in the game title, UI text, file names, page title, or metadata.
- Do not use any Disney names, logos, fonts, sounds, music recordings or audio from any film.
- The Captain is drawn only as a dark silhouette in the steamboat's wheelhouse.
- Music must be original or an original arrangement of a pre-1929 public-domain melody (for example "Turkey in the Straw"), synthesized in code. No recordings.

---

## 4. Repository layout

```
paddlewheel-panic/
├── README.md                  # how to run locally, deploy, and play
├── CLAUDE.md                  # copy of this spec (or a pointer to it)
├── .github/workflows/pages.yml
├── www/
│   ├── index.html
│   ├── manifest.webmanifest
│   ├── icons/                 # 180, 192, 512 px PNG app icons (generated from code, grayscale)
│   ├── styles.css
│   └── src/
│       ├── main.js            # boot, resize, game loop
│       ├── config.js          # all tunable numbers in one place
│       ├── input.js           # tap, hold, swipe detection
│       ├── physics.js         # hero movement, collisions
│       ├── level.js           # loads and spawns level data
│       ├── levels/leg1.js     # the demo level, as data
│       ├── entities/          # barrel.js, crate.js, dock.js, critter.js, note.js, steamboat.js
│       ├── art/               # hero.js, scenery.js, palette.js, film.js (grain, scratches, vignette)
│       ├── audio.js           # Web Audio synth: music loop + sound effects
│       ├── ui.js              # title, HUD, win/lose screens, rotate-device prompt
│       ├── storage.js         # best score and stars
│       └── platform.js        # web vs native adapter (haptics, storage, game center)
```

---

## 5. Gameplay

### Core loop
- The hero runs right automatically at a steady speed that increases slightly over the leg.
- The camera follows the hero, keeping him about one third from the left edge.
- The steamboat is drawn on the left edge of the screen, chasing.

### Controls (touch first, keyboard and mouse for desktop testing)

| Action | Touch | Desktop |
|---|---|---|
| Jump | Tap anywhere | Space or click |
| Higher jump | Hold the tap (variable jump height, up to about 0.25 s) | Hold Space |
| Whistle | Swipe up (at least 60 px upward within 250 ms) | W or Up arrow |
| Pause | Pause button, top right | Escape or P |

- Allow a **coyote time** of 100 ms (can still jump just after leaving a platform) and a **jump buffer** of 120 ms (a tap just before landing still jumps).
- The whistle has a 1.5 s cooldown, shown as a small ring around the notes counter.

### The Captain meter
- A meter at the top right shows how close the Captain is (0 to 100%).
- It slowly drains while the player runs cleanly.
- It rises when the hero:
  - hits a critter without whistling it first (+25%)
  - falls into the water (+35%, then the hero respawns on the last safe platform after a short splash animation)
- At 100% the Captain catches the hero, and the lose screen plays.
- Visually, the steamboat slides further onto the screen as the meter rises. At high levels it fills a third of the screen.

### Platforms and objects
- **Docks:** long, solid, safe.
- **Crates:** solid boxes, can be stacked to form steps.
- **Barrels:** float in the water and bob up and down on a sine wave. Solid on top. A whistle pops them (they burst into splinters), which can be useful or harmful.
- **Rafts:** drift slowly up and down the river current (small horizontal movement).
- **Critters:** small black round creatures with white eyes that sit on platforms. Touching one hurts. A whistle stuns them for 2 s (they flip over), and while stunned they can be bounced on for a higher jump.
- **Musical notes:** collectibles floating in arcs. Each is worth 1 note.

### Beat bonus
- The music has a fixed tempo (default 120 BPM, set in `config.js`).
- If the hero **lands** within ±90 ms of a beat, award a bonus note and show a small "♪ ON BEAT" pop.
- Scenery (trees, clouds, dock posts) does a subtle squash-and-stretch on each beat.

### Scoring and stars
At the landing, show up to three stars:
1. Reached the landing
2. Collected at least 80% of notes
3. Finished without falling in the water or getting hit

Store the best result in `storage.js`.

---

## 6. Visual style

### Palette (use only these; define them in `art/palette.js`)

| Name | Hex | Use |
|---|---|---|
| Ink | `#171614` | Outlines, hero body, silhouettes |
| Charcoal | `#2e2c29` | Shadows, deep water, HUD backing |
| Slate | `#5c5955` | Water, smoke |
| Ash | `#9a968f` | Distant hills, far scenery |
| Silver | `#cfcbc3` | Surfaces, barrels |
| Paper | `#f8f6f0` | Highlights, sun, clouds |

### Look and feel
- 1920s rubber-hose cartoon style: thick black outlines (4 to 6 px at logical resolution), round shapes, no straight-edged realism.
- **Parallax layers** (back to front): sky gradient, sun, clouds, far hills, tree line, river, gameplay layer, foreground ripples.
- **Squash and stretch:** the hero stretches vertically on takeoff, squashes on landing, and his limbs bend like hoses while running (use sine-driven curves for the arms and legs).
- **Film effects** (`art/film.js`), drawn on top of everything:
  - grain: a small pre-generated noise tile, redrawn at a random offset each frame at low opacity
  - scratches: 0 to 2 thin vertical lines that appear for a few frames at random positions
  - flicker: overall brightness varies by ±3% each frame
  - vignette: a radial gradient that darkens the corners
  - all four can be toggled in `config.js` for performance testing
- Fonts: use system serif fonts only (`Georgia, "Times New Roman", serif`). Title cards use letter-spaced capitals with ornamental borders drawn in code.

### Screens
- **Title card:** black screen with a double ornate border, "PADDLEWHEEL PANIC" in large type, the subtitle "Leg 1 · The Levee", and "TAP TO START". Projector flicker and grain run here too.
- **HUD:** notes counter top left in a dark pill, distance in feet top center, Captain meter and pause button top right.
- **Win / lose cards:** same intertitle style, showing the result, notes collected, stars, best result, and "TAP TO PLAY AGAIN".
- **Rotate prompt:** in portrait, show a full-screen card reading "Turn your phone sideways" with a simple rotating-phone drawing. Pause the game while it shows.

---

## 7. The demo level (`levels/leg1.js`)

Write the level as plain data so new legs can be added later without code changes. Example shape:

```js
export default {
  name: "Leg 1 · The Levee",
  lengthFt: 1500,
  bpm: 120,
  objects: [
    { type: "dock",    x: 0,    y: 520, w: 600 },
    { type: "note",    x: 420,  y: 440 },
    { type: "barrel",  x: 700,  y: 540, bob: 12 },
    { type: "crate",   x: 900,  y: 500, w: 100, h: 90 },
    { type: "critter", x: 1300, y: 500 },
    // ...
  ],
  landing: { x: 14800 }
};
```

Design the leg in four parts, easy to hard:
1. **Warm-up (0–20%):** long docks, short gaps, a trail of notes teaching the jump.
2. **Barrels (20–45%):** bobbing barrels over water, which teach timing and the held jump.
3. **Critters (45–70%):** the first critter sits alone on a dock, with a hint popup "SWIPE UP TO WHISTLE". Then mix critters with crates.
4. **Final dash (70–100%):** faster speed, rafts, stacked crates, a final note arc, then the landing dock with a flag post.

---

## 8. Technical details

### Resolution and scaling
- Logical resolution: **1280 × 720**. All game coordinates use this space.
- Scale the canvas to fit the screen while keeping the aspect ratio, letterboxing with Ink color.
- Multiply the canvas backing size by `devicePixelRatio` (cap at 3) for sharp lines.
- Respect iPhone safe areas: keep HUD elements inside `env(safe-area-inset-*)`. Use `viewport-fit=cover` in the viewport meta tag.

### Game loop
- `requestAnimationFrame` with a **fixed physics step** of 1/120 s and an accumulator. Render with the latest state.
- Pause automatically on `visibilitychange` (app backgrounded) and when the rotate prompt is shown.

### Page setup (`index.html`)
- `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">`
- `apple-mobile-web-app-capable` set to yes, black status bar, a 180 px apple-touch-icon.
- CSS: `touch-action: none`, `overscroll-behavior: none`, `user-select: none`, `-webkit-touch-callout: none`. The page must never scroll, zoom, or show a text-selection popup while playing.
- `manifest.webmanifest` with `"display": "fullscreen"` and `"orientation": "landscape"`.

### Input
- Use Pointer Events. Treat the first pointer only.
- Distinguish tap, hold, and swipe-up from the same touch. A swipe should not also trigger a jump.

---

## 9. Audio (`audio.js`)

- Use the Web Audio API only. Synthesize everything; no audio files are required for the demo.
- **Music:** a looping ragtime-style tune at the level's BPM, with a plucky square or triangle lead, an oom-pah bass, and a light percussion tick. Expose the current beat time so the beat bonus and scenery bounce stay in sync.
- **Sound effects:** jump (short upward slide whistle), land (soft thud), note pickup (bright blip), whistle (shrill two-tone), barrel pop, splash (filtered noise), critter hit, win jingle, lose "wah-wah" trombone.
- Start audio on the first tap (iOS requires a user gesture to start audio).
- **Silent switch:** where supported, set `navigator.audioSession.type = "ambient"` before creating the AudioContext so the iPhone silent switch mutes the game. Wrap it in a feature check.
- Include a mute toggle on the pause screen, saved in storage.

---

## 10. Platform adapter (`platform.js`)

All features that differ between the web and the future iOS app go through this one module. Game code must never call browser-only or Capacitor-only APIs directly.

```js
export const platform = {
  isNative: false,          // true when running inside Capacitor
  haptic(kind) {},          // "light" | "medium" | "heavy" | "success" | "error"; no-op on web
  async saveBest(data) {},  // localStorage on web
  async loadBest() {},
  submitScore(score) {},    // no-op on web; Game Center later
};
```

On the web, `haptic()` does nothing (iPhone Safari does not support vibration). Call it anyway in the right places: jump (light), land on beat (medium), hit (heavy), win (success), caught (error). That way the iOS build gets haptics for free.

---

## 11. GitHub Pages deployment

Create `.github/workflows/pages.yml` that, on every push to `main`:
1. checks out the repo
2. uploads `www/` with `actions/upload-pages-artifact`
3. deploys with `actions/deploy-pages`

The README must explain the one-time setup: in the repo's Settings → Pages, set Source to "GitHub Actions". All asset paths in the game must be **relative** (no leading `/`) so the site works under `https://<user>.github.io/paddlewheel-panic/`.

Local testing: `python3 -m http.server --directory www 8000`, then open `http://localhost:8000`. Note in the README that ES modules do not work from `file://`.

---

## 12. Path to the iOS app (do not build yet; just keep it possible)

Later, the plan is to wrap `www/` with **Capacitor** (`webDir: "www"`), producing an Xcode project. To avoid App Store rejection for being "just a website in a wrapper" (Guideline 4.2, minimum functionality), the native version will add:

- haptics via `@capacitor/haptics`, wired through `platform.haptic()`
- Game Center leaderboards for best time and notes, through `platform.submitScore()`
- fully offline play (already true by design)
- landscape lock, hidden status bar, and proper safe-area handling
- more content: several river legs, unlockable songs, and a stage-select screen

Rules for now that keep this path open:
- Everything stays inside `www/`, with relative paths.
- No dependency on a server, cookies, or URL routing.
- All platform-specific behavior goes through `platform.js`.
- All tuning numbers live in `config.js`.

---

## 13. Build order (milestones)

Work through these in order. Commit after each and keep the game runnable at every step.

1. **Skeleton:** repo layout, `index.html`, canvas scaling, game loop, rotate prompt, Pages workflow.
2. **Movement:** hero runs on flat docks, tap and hold jump, coyote time, jump buffer, camera follow. Hero drawn as simple shapes first.
3. **Level data:** loader, docks, crates, barrels, water and falling, respawn.
4. **Art pass:** parallax scenery, rubber-hose hero with squash and stretch, steamboat, film effects.
5. **Threats:** critters, whistle, Captain meter, steamboat sliding in.
6. **Audio:** music loop, sound effects, beat sync, beat bonus, scenery bounce, silent-switch handling.
7. **Screens:** title, HUD, pause, win and lose cards, stars, saved best.
8. **Polish and tuning:** full leg layout per section 7, difficulty pass, performance check with film effects on.

---

## 14. Acceptance checklist

- [ ] Opens from the GitHub Pages URL on iPhone Safari with no console errors.
- [ ] Portrait shows the rotate prompt; landscape plays.
- [ ] No page scroll, zoom, or text selection during play.
- [ ] Tap, hold and swipe-up all work reliably and never trigger each other by mistake.
- [ ] A full run takes 60 to 90 seconds and can be won and lost.
- [ ] Captain meter, notes, distance and stars all work; the best result persists after reload.
- [ ] Music and effects play after the first tap and are muted by the silent switch where supported.
- [ ] Holds about 60 fps on a recent iPhone with film effects on.
- [ ] Only the six palette colors appear on screen.
- [ ] No character name, Disney branding, or copyrighted audio anywhere in the code, assets or metadata.
- [ ] All paths relative; everything lives in `www/`.
