# Paddlewheel Panic

A side-scrolling auto-runner set on a 1928 river. Our deckhand hero has jumped ship, and the steamboat Captain is chasing him downriver. Tap to jump between docks, crates, barrels and rafts. Swipe up to whistle at river critters. Reach the landing before the Captain catches up.

This demo is one river leg, **Leg 1 · The Levee**. A clean run takes about 64 seconds.

## Play

| Action | Touch | Desktop |
|---|---|---|
| Jump | Tap anywhere | Space or click |
| Higher jump | Hold the tap | Hold Space |
| Whistle (stuns critters, pops barrels) | Swipe up | W or Up arrow |
| Pause | Pause button, top right | Escape or P |

- The **Captain meter** (top right) rises by 25% when a critter hits you and by 35% when you fall in the river. It drains slowly while you run cleanly. At 100% the Captain catches you.
- A whistled critter flips over for 2 seconds. Land on it for a big bounce.
- Land right on the music's beat for a bonus note ("♪ ON BEAT").
- Stars: reach the landing, collect 80% of the notes, and finish without a spill or a bump.

On iPhone, turn the phone sideways. The game respects the silent switch where Safari supports it.

## Run locally

ES modules don't load from `file://`, so serve the `www/` folder:

```sh
python3 -m http.server --directory www 8000
```

Then open <http://localhost:8000>. There's no build step and nothing to install.

## Deploy to GitHub Pages

Every push to `main` deploys `www/` using `.github/workflows/pages.yml`.

One-time setup: in the repo's **Settings → Pages**, set **Source** to **GitHub Actions**. The site will be at `https://<user>.github.io/<repo>/`. All asset paths are relative, so it works under that subpath.

## Project layout

```
www/                    everything that ships (also Capacitor's future webDir)
  index.html            page shell, viewport and home-screen settings
  manifest.webmanifest  fullscreen, landscape
  icons/                180, 192, 512 px icons, drawn by tools/make-icons.html
  styles.css
  src/
    main.js             boot, canvas scaling, screens, fixed-step loop
    config.js           every tunable number
    game.js             one run: rules, meter, scoring, world rendering
    physics.js          hero movement, jumping, collisions
    input.js            tap / hold / swipe-up from one pointer, plus keys
    level.js            turns level data into entities
    levels/leg1.js      the demo level, as plain data
    entities/           dock, crate, barrel, raft, critter, note, steamboat
    art/                hero, scenery, palette, film effects, draw helpers
    fx.js               particles and pop-up text
    audio.js            Web Audio synth: original ragtime loop + effects
    ui.js               title, HUD, pause, win and lose cards
    storage.js          best result and settings
    platform.js         web vs native adapter (haptics, storage, Game Center)
tools/                  dev-only preview pages and the icon generator
```

## Art and audio

All art is drawn in code with Canvas 2D vector paths, in a six-color grayscale palette with film grain, scratches, flicker and a vignette. The hero is the 1928 public-domain riverboat-deckhand design. The game doesn't use the character's name, and contains no later-era design elements, no studio branding, and no film audio.

The music, "The Levee Rag", is an original ragtime tune synthesized live with the Web Audio API. There are no audio files.

## Toward iOS

The `www/` folder is ready to be wrapped with Capacitor (`webDir: "www"`). Haptics and Game Center hooks already go through `platform.js`, so the native build only needs to fill them in.
