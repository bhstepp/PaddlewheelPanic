// Scenery and prop styles per zone.
import river from "./river.js";
import mountains from "./mountains.js";
import haunted from "./haunted.js";
import studio from "./studio.js";

const THEMES = { river, mountains, haunted, studio };

export function getTheme(id) {
  return THEMES[id] ?? river;
}
