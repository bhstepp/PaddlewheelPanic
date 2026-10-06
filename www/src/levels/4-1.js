// Level 4-1 · Pencil Test: paint-stroke steps that keep time with the band.
export default {
  id: "4-1",
  name: "Pencil Test",
  seed: 401,
  chunks: [
    ["start"],
    ["warmup", 0.4],
    ["hint", 0, { text: "BE IN THE AIR WHEN THE STEPS BLINK" }],
    ["beatSteps", 0.2],
    ["crateSteps", 0.5],
    ["beatSteps", 0.4],
    ["hint", 0, { text: "SPRINGBOARDS LAUNCH YOU HIGH" }],
    ["springWall", 0.4],
    ["reelSpring"],
    ["critterDock", 0.6],
    ["beatSteps", 0.6],
    ["hookSwing", 0.6],
    ["critterCrate", 0.6],
  ],
};
