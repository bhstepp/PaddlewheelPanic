// Level 3-1 · The Front Hall: chandeliers, rotten floorboards and the first ghosts.
export default {
  id: "3-1",
  name: "The Front Hall",
  seed: 301,
  chunks: [
    ["start"],
    ["warmup", 0.4],
    ["hint", 0, { text: "GHOSTS CAN'T BE STOMPED. SWIPE UP TO SPOOK THEM", desktop: "GHOSTS CAN'T BE STOMPED. PRESS W TO SPOOK THEM" }],
    ["ghostHall", 0.2],
    ["hookSwing", 0.4],
    ["crumbleRun", 0.5],
    ["tubaPickup"],
    ["critterCrate", 0.5],
    ["ghostHall", 0.6],
    ["reelHook"],
    ["hookChain", 0.5],
    ["crateStack", 0.6],
    ["ghostHall", 0.8],
  ],
};
