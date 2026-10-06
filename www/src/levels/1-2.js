// Level 1-2 · Cargo Run: longer barrel runs, stacked cargo and rafts.
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
    ["crateStack", 0.6],
    ["barrelRun", 0.7],
    ["critterCrate", 0.6],
    ["raftHop", 0.7],
    ["critterDock", 0.8],
  ],
};
