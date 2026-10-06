// Level 2-1 · Foothill Trail: rope swings and crumbly ledges.
export default {
  id: "2-1",
  name: "Foothill Trail",
  seed: 201,
  chunks: [
    ["start"],
    ["warmup", 0.2],
    ["hint", 0, { text: "HOLD TO GRAB A HOOK, LET GO TO FLING", desktop: "HOLD SPACE TO GRAB, LET GO TO FLING" }],
    ["hookSwing", 0.1],
    ["crateSteps", 0.3],
    ["hint", 0, { text: "CRUMBLY LEDGES: KEEP MOVING!" }],
    ["crumbleRun", 0.2],
    ["hookSwing", 0.4],
    ["critterDock", 0.4],
    ["reelHook"],
    ["crumbleRun", 0.5],
    ["warmup", 0.6],
    ["hookSwing", 0.7],
    ["critterCrate", 0.5],
  ],
};
