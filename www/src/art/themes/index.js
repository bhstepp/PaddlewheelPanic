// Scenery and prop styles per zone.
import river from "./river.js";
import mountains from "./mountains.js";
import haunted from "./haunted.js";

const THEMES = { river, mountains, haunted };

export function getTheme(id) {
  return THEMES[id] ?? river;
}
