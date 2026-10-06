// Level 5-1 · The Midway: balloons, springboards and the trapeze.
export default {
  id: "5-1",
  name: "The Midway",
  seed: 501,
  chunks: [
    ["start"],
    ["warmup", 0.4],
    ["hint", 0, { text: "BOUNCE ON BALLOONS. HOLD FOR EXTRA HEIGHT", desktop: "BOUNCE ON BALLOONS. HOLD SPACE FOR EXTRA HEIGHT" }],
    ["balloonHop", 0.2],
    ["springWall", 0.5],
    ["beatSteps", 0.5],
    ["hookSwing", 0.6],
    ["balloonHop", 0.5],
    ["reelBounce"],
    ["liftHop", 0.6],
    ["critterDock", 0.7],
    ["balloonHop", 0.7],
    ["hookChain", 0.7],
  ],
};
