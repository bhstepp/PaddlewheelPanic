// Level 1-2 · Cargo Run: longer barrel runs, stacked cargo, rafts and a tuba.
export default {
  id: "1-2",
  name: "Cargo Run",
  seed: 102,
  chunks: [
    ["start"],
    ["warmup", 0.3],
    ["crateSteps", 0.5],
    ["barrelRun", 0.4],
    ["critterDock", 0.4],
    ["raftHop", 0.5],
    ["tubaPickup"],
    ["crateStack", 0.6],
    ["barrelRun", 0.7],
    ["reelBounce"],
    ["critterCrate", 0.6],
    ["raftHop", 0.7],
    ["critterDock", 0.8],
  ],
};
