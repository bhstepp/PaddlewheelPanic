# CLAUDE.md

The full build brief is [`PADDLEWHEEL PANIC SPEC.md`](PADDLEWHEEL%20PANIC%20SPEC.md). Read it before changing code.

Key rules:

- Everything the game needs lives in `www/`, with relative paths. No build step, no npm packages at runtime, no network requests.
- Canvas 2D, drawn in code. Only the six palette colors in `www/src/art/palette.js`.
- All tunable numbers live in `www/src/config.js`. Platform-specific behavior goes through `www/src/platform.js`.
- Levels are plain data in `www/src/levels/`.

## Hero art

The hero's final art is the 1928 riverboat-deckhand design (public domain in the US since January 2024), drawn in `www/src/art/hero.js` behind `drawHero(ctx, state)`. Use only 1928 design traits: pie-cut eyes, round bulb-nosed snout, round black ears, bare black hands (no gloves), two-button shorts, thin tail.

The character's name and likeness are still trademarks. Never put the character's name, or any Disney name, logo, font, sound or music, in the game title, UI text, file names, page title, metadata, code or comments.

## Dev tools (not shipped)

`tools/` holds preview pages for art review and the icon generator. They import from `www/src/` and must be served from the repo root:

```sh
python3 -m http.server 8123
# http://localhost:8123/tools/art-preview.html     hero poses
# http://localhost:8123/tools/scene-preview.html?x=8000&meter=60
# http://localhost:8123/tools/card-preview.html    win card
node tools/make-icons.cjs                         # regenerate www/icons (needs Playwright)
```
