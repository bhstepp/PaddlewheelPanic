// Level 4-3 · Roller Rampage: the Captain flattens everything with a steam roller.
export default {
  id: "4-3",
  name: "Roller Rampage",
  seed: 403,
  boss: true,
  chunks: [
    ["start"],
    ["hint", 0, { text: "THE CAPTAIN WON'T QUIT! WHISTLE AT LEVERS TO KNOCK HIM BACK", desktop: "THE CAPTAIN WON'T QUIT! PRESS W AT LEVERS TO KNOCK HIM BACK" }],
    ["bossSwitch", 0.3],
    ["beatSteps", 0.6],
    ["springWall", 0.6],
    ["bossSwitch", 0.5],
    ["hookChain", 0.7],
    ["dashRun"],
    ["reelBounce"],
    ["beatSteps", 0.8],
    ["bossSwitch", 0.7],
    ["crumbleRun", 0.9],
    ["ghostHall", 0.9],
    ["bossSwitch", 0.9],
    ["beatSteps", 0.9],
  ],
};
