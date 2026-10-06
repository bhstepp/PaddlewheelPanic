// Scenery and prop styles per zone.
import river from "./river.js";
import mountains from "./mountains.js";

const THEMES = { river, mountains };

export function getTheme(id) {
  return THEMES[id] ?? river;
}
