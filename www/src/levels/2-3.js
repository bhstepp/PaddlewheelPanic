// Level 2-3 · Runaway Cart: the Captain rides the rails right behind you.
export default {
  id: "2-3",
  name: "Runaway Cart",
  seed: 203,
  boss: true,
  chunks: [
    ["start"],
    ["hint", 0, { text: "THE CAPTAIN WON'T QUIT! WHISTLE AT LEVERS TO KNOCK HIM BACK", desktop: "THE CAPTAIN WON'T QUIT! PRESS W AT LEVERS TO KNOCK HIM BACK" }],
    ["bossSwitch", 0.2],
    ["hookSwing", 0.5],
    ["crumbleRun", 0.6],
    ["bossSwitch", 0.4],
    ["liftHop", 0.6],
    ["hookChain", 0.6],
    ["reelBounce"],
    ["bossSwitch", 0.6],
    ["drumWall"],
    ["crumbleRun", 0.9],
    ["bossSwitch", 0.8],
    ["hookChain", 0.9],
    ["critterDock", 0.8],
  ],
};
