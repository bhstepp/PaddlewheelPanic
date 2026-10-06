# Paddlewheel Panic

A side-scrolling auto-runner set in 1928. Our deckhand hero has jumped ship, and the steamboat Captain is chasing him on a journey through five zones. Tap to jump, swipe up to whistle, and reach each landing before the Captain catches up.

## The journey

Fifteen levels in five zones. Each zone has its own hand-drawn scenery, an original song, a new trick to learn, and a vehicle for the Captain. The third level of every zone is a chase in which the Captain never lets up.

| Zone | Levels | New here | The Captain rides |
|---|---|---|---|
| The River | 1-1 The Levee · 1-2 Cargo Run · 1-3 Paddlewheel Pursuit | barrels, rafts, river critters | his steamboat |
| Switchback Mountains | 2-1 Foothill Trail · 2-2 Mine Shaft · 2-3 Runaway Cart | rope swings, crumbling ledges, mine lifts | a runaway mine cart |
| Creaky Manor | 3-1 The Front Hall · 3-2 The Long Gallery · 3-3 Phantom Express | ghosts, chandelier swings | a phantom train |
| Inkwell Studio | 4-1 Pencil Test · 4-2 Ink & Paint · 4-3 Roller Rampage | paint steps that blink on the beat, springboards | a steam paint roller |
| Jubilee Pier | 5-1 The Midway · 5-2 Under the Big Top · 5-3 The Grand Finale | balloons, trapezes | a roller-coaster car |

## Play

| Action | Touch | Desktop |
|---|---|---|
| Jump | Tap anywhere | Space or click |
| Higher jump | Hold the tap | Hold Space |
| Grab a hook, rope or trapeze | Keep holding as you jump past it; let go to fling | Hold Space |
| Whistle (stuns critters and ghosts, pops barrels, pulls levers) | Swipe up | W or Up arrow |
| Pause | Pause button, top right | Escape or P |

- **The Captain meter** (top right) rises when a critter hits you (25%) or you fall (35%), and drains slowly while you run cleanly. At 100% the Captain catches you. In chase levels it keeps rising; whistle at levers to send cargo crashing into him.
- **Rhythm.** Land on the beat for bonus notes. Chain on-beat landings for a combo of up to ×8. Paint steps blink out for the last half beat of each bar, so be in the air then.
- **Instruments.** Pick one up for a power: the trombone lets you hold to glide, the bass drum booms walls apart (swipe up), the tuba bubble saves you from one fall, and the washboard is a dash that nothing can stop.
- **Stars.** Reach the landing, collect 80% of the notes, and finish without a spill or a bump.

## Between runs

- **Film reels.** Every level hides one. Each reel you find shows that level's lobby card in the **projection booth**. Five reels unlock the Nickelodeon film look and ten unlock the Iris look. The booth's **jukebox** plays the song of any zone you've reached.
- **Daily matinee.** A new course every day, the same for everyone, built from the zones you've unlocked.
- **Ghost replays.** Your best run of each level, and of today's matinee, races alongside you as a flickering film ghost.

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
    main.js             boot, canvas scaling, screen flow, fixed-step loop
    config.js           every tunable number
    game.js             one run: rules, meter, combos, power-ups, rendering
    physics.js          running, jumping, swinging, collisions
    input.js            tap / hold / swipe-up from one pointer, plus keys
    level.js            turns level data into entities
    levels/             one file per level (plain data) and chunks.js, the
                        building blocks that chunk-list levels are made from
    zones/              the five zones: names, songs, themes, level lists
    entities/           docks, crates, critters, mechanics (hooks, springs,
                        lifts, beat steps, balloons, ghosts, levers, reels,
                        instruments) and the Captain's vehicles
    art/                hero, palette, film effects, draw and ink helpers
    art/themes/         per-zone scenery, prop styles and vehicles
    music/songs.js      the five zone songs as note data
    screens/            map, intro and result cards, projection booth, daily
    fx.js               particles and pop-up text
    audio.js            Web Audio synth for songs and effects
    ui.js               title, HUD and pause
    storage.js          progress, reels, daily results, ghosts, settings
    platform.js         web vs native adapter (haptics, storage, Game Center)
tools/                  dev-only preview pages, the level checker and the
                        icon generator (serve from the repo root)
```

### Making levels

A level is either hand-placed objects (`levels/1-1.js`) or a list of chunks with a difficulty from 0 to 1 (`levels/2-1.js`). The chunks live in `levels/chunks.js`. Serve the repo root and open `tools/level-check.html` to have the planning bot play every level and a week of daily matinees. Each one should be won.

## Art and audio

All art is drawn in code with Canvas 2D vector paths, in a six-color grayscale palette with film grain, scratches, flicker and a vignette. The hero is the 1928 public-domain riverboat-deckhand design. The game doesn't use the character's name, and contains no later-era design elements, no studio branding, and no film audio.

The five zone songs (a rag, a hoedown, a waltz, a two-step and a calliope waltz) are original tunes synthesized live with the Web Audio API. There are no audio files.

## Toward iOS

The `www/` folder is ready to be wrapped with Capacitor (`webDir: "www"`). Haptics and Game Center hooks already go through `platform.js`, so the native build only needs to fill them in.
