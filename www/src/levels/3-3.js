// Level 3-3 · Phantom Express: the Captain's ghost train thunders through the manor.
export default {
  id: "3-3",
  name: "Phantom Express",
  seed: 303,
  boss: true,
  chunks: [
    ["start"],
    ["hint", 0, { text: "THE CAPTAIN WON'T QUIT! WHISTLE AT LEVERS TO KNOCK HIM BACK", desktop: "THE CAPTAIN WON'T QUIT! PRESS W AT LEVERS TO KNOCK HIM BACK" }],
    ["bossSwitch", 0.3],
    ["ghostHall", 0.6],
    ["hookChain", 0.6],
    ["bossSwitch", 0.5],
    ["crumbleRun", 0.8],
    ["tubaPickup"],
    ["reelSpring"],
    ["liftHop", 0.7],
    ["bossSwitch", 0.7],
    ["ghostHall", 0.9],
    ["hookChain", 0.9],
    ["bossSwitch", 0.9],
    ["critterCrate", 0.8],
  ],
};
