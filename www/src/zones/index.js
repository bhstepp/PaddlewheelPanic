// The five zones of the river journey and their levels. Each zone brings
// its own scenery theme, song, Captain vehicle and a new mechanic.
export const ZONES = [
  {
    id: "river",
    name: "The River",
    blurb: "Docks, barrels and river critters.",
    song: "river",
    theme: "river",
    levels: ["1-1", "1-2", "1-3"],
  },
  {
    id: "mountains",
    name: "Switchback Mountains",
    blurb: "Grab and swing. Ledges that crumble.",
    song: "mountains",
    theme: "mountains",
    levels: ["2-1", "2-2", "2-3"],
  },
  {
    id: "haunted",
    name: "Creaky Manor",
    blurb: "Ghosts, chandeliers and a long way down.",
    song: "haunted",
    theme: "haunted",
    levels: ["3-1", "3-2", "3-3"],
  },
  {
    id: "studio",
    name: "Inkwell Studio",
    blurb: "Paint strokes that come and go on the beat.",
    song: "studio",
    theme: "studio",
    levels: ["4-1", "4-2", "4-3"],
  },
  {
    id: "park",
    name: "Jubilee Pier",
    blurb: "Springboards, balloons and the big coaster.",
    song: "park",
    theme: "park",
    levels: ["5-1", "5-2", "5-3"],
  },
];

export function zoneOf(levelId) {
  return ZONES[Number(levelId.split("-")[0]) - 1];
}

export function nextLevel(levelId) {
  const [z, l] = levelId.split("-").map(Number);
  if (l < 3) return `${z}-${l + 1}`;
  if (z < ZONES.length) return `${z + 1}-1`;
  return null;
}
