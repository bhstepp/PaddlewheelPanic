// Level 2-2 · Mine Shaft: elevator cages, a bass drum and swing after swing.
export default {
  id: "2-2",
  name: "Mine Shaft",
  seed: 202,
  chunks: [
    ["start"],
    ["warmup", 0.4],
    ["hint", 0, { text: "RIDE THE LIFTS. JUMP AT THE TOP" }],
    ["liftHop", 0.2],
    ["drumWall"],
    ["hookChain", 0.3],
    ["crumbleRun", 0.5],
    ["reelSpring"],
    ["liftHop", 0.6],
    ["critterDock", 0.6],
    ["hookChain", 0.7],
    ["crateStack", 0.6],
    ["crumbleRun", 0.8],
    ["liftHop", 0.8],
  ],
};
